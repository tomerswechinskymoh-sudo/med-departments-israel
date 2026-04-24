import { ContentStatus, OpeningApplicationStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { evaluateApplicantMatchWithOpenAI } from "@/lib/services/openai-applicant-matching";
import { sendOpeningTopMatchesEmail } from "@/lib/services/opening-top-matches-email";

export async function processExpiredOpenings() {
  const now = new Date();
  const openings = await prisma.residencyOpening.findMany({
    where: {
      contentStatus: ContentStatus.PUBLISHED,
      applicationDeadline: {
        lte: now
      },
      topMatchesDeliveredAt: null
    },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      department: {
        include: {
          institution: true,
          specialty: true
        }
      },
      acceptanceCriteria: true,
      applications: {
        where: {
          status: {
            in: [
              OpeningApplicationStatus.SUBMITTED,
              OpeningApplicationStatus.UNDER_REVIEW,
              OpeningApplicationStatus.CONTACTED
            ]
          }
        },
        include: {
          files: {
            select: {
              category: true,
              originalName: true
            }
          }
        }
      }
    },
    orderBy: {
      applicationDeadline: "asc"
    }
  });

  const processed: Array<{
    openingId: string;
    openingTitle: string;
    totalApplicants: number;
    topMatches: number;
    delivered: boolean;
    message?: string;
  }> = [];

  for (const opening of openings) {
    const evaluations = [];

    for (const application of opening.applications) {
      // TODO: add secure text extraction for PDF/DOCX CV files if we decide to
      // include private document contents in the ranking payload. Keep privacy-first defaults.
      const evaluation = await evaluateApplicantMatchWithOpenAI(opening, application);

      await prisma.openingApplication.update({
        where: {
          id: application.id
        },
        data: {
          matchScore: evaluation.score,
          matchShortSummary: evaluation.shortSummary,
          matchStrengths: evaluation.strengths,
          matchConcerns: evaluation.concerns,
          matchEngine: evaluation.engine,
          matchEvaluatedAt: now,
          matchEvaluationError: evaluation.evaluationError ?? null,
          isTopMatch: false
        }
      });

      evaluations.push({
        applicationId: application.id,
        fullName: application.fullName,
        score: evaluation.score,
        summary: evaluation.shortSummary
      });
    }

    const sortedApplications = evaluations.sort((left, right) => right.score - left.score);
    const topMatches = sortedApplications.slice(0, opening.topApplicantsToEmail);
    const topMatchIds = topMatches.map((application) => application.applicationId);

    await prisma.$transaction([
      prisma.openingApplication.updateMany({
        where: {
          openingId: opening.id
        },
        data: {
          isTopMatch: false
        }
      }),
      ...(topMatchIds.length > 0
        ? [
            prisma.openingApplication.updateMany({
              where: {
                id: {
                  in: topMatchIds
                }
              },
              data: {
                isTopMatch: true
              }
            })
          ]
        : [])
    ]);

    if (!opening.createdBy?.email) {
      const message = "לא נמצא אימייל לבעל/ת התקן, לכן לא נשלח תקציר התאמות.";

      await prisma.residencyOpening.update({
        where: {
          id: opening.id
        },
        data: {
          topMatchesLastError: message
        }
      });

      await createAuditLog({
        actorUserId: null,
        action: "opening.matching.skipped_no_owner_email",
        entityType: "ResidencyOpening",
        entityId: opening.id,
        metadata: {
          totalApplicants: opening.applications.length
        }
      });

      processed.push({
        openingId: opening.id,
        openingTitle: opening.title,
        totalApplicants: opening.applications.length,
        topMatches: topMatches.length,
        delivered: false,
        message
      });
      continue;
    }

    try {
      const emailResult = await sendOpeningTopMatchesEmail({
        ownerEmail: opening.createdBy.email,
        ownerName: opening.createdBy.fullName,
        opening,
        totalApplicants: opening.applications.length,
        selectedApplicants: topMatches.map((application) => ({
          id: application.applicationId,
          fullName: application.fullName,
          matchScore: application.score,
          matchShortSummary: application.summary
        }))
      });

      if (!emailResult.delivered) {
        const message =
          "שליחת התקציר דולגה כי ספק האימייל לא הוגדר. יש להוסיף RESEND_API_KEY ו-EMAIL_FROM.";

        await prisma.residencyOpening.update({
          where: {
            id: opening.id
          },
          data: {
            topMatchesLastError: message
          }
        });

        processed.push({
          openingId: opening.id,
          openingTitle: opening.title,
          totalApplicants: opening.applications.length,
          topMatches: topMatches.length,
          delivered: false,
          message
        });
        continue;
      }

      await prisma.residencyOpening.update({
        where: {
          id: opening.id
        },
        data: {
          topMatchesDeliveredAt: now,
          topMatchesLastError: null
        }
      });

      await createAuditLog({
        actorUserId: null,
        action: "opening.matching.delivered",
        entityType: "ResidencyOpening",
        entityId: opening.id,
        metadata: {
          totalApplicants: opening.applications.length,
          deliveredTopMatches: topMatches.length
        }
      });

      processed.push({
        openingId: opening.id,
        openingTitle: opening.title,
        totalApplicants: opening.applications.length,
        topMatches: topMatches.length,
        delivered: true
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "שליחת תקציר ההתאמות נכשלה.";

      await prisma.residencyOpening.update({
        where: {
          id: opening.id
        },
        data: {
          topMatchesLastError: message
        }
      });

      await createAuditLog({
        actorUserId: null,
        action: "opening.matching.delivery_failed",
        entityType: "ResidencyOpening",
        entityId: opening.id,
        metadata: {
          error: message
        }
      });

      processed.push({
        openingId: opening.id,
        openingTitle: opening.title,
        totalApplicants: opening.applications.length,
        topMatches: topMatches.length,
        delivered: false,
        message
      });
    }
  }

  return {
    processedCount: processed.length,
    processed
  };
}
