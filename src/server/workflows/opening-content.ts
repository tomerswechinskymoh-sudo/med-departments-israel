import { ContentStatus, Prisma } from "@prisma/client";
import { storeUploadedFile } from "@/lib/uploads";
import { openingEditorSchema } from "@/lib/validation";

type PrismaLike = Prisma.TransactionClient;
type OpeningDraftInput = Prisma.JsonValue;

function parseOpeningPayload(payload: OpeningDraftInput) {
  const parsed = openingEditorSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "פרטי התקן הפתוח אינם תקינים.");
  }

  return parsed.data;
}

function toOpeningData(payload: ReturnType<typeof parseOpeningPayload>) {
  return {
    departmentId: payload.departmentId,
    title: payload.title,
    summary: payload.summary,
    openingType: payload.openingType,
    isImmediate: payload.isImmediate,
    openingsCount: payload.openingsCount ?? null,
    topApplicantsToEmail: payload.topApplicantsToEmail,
    status: payload.status,
    committeeDate: payload.committeeDate ? new Date(payload.committeeDate) : null,
    applicationDeadline: payload.applicationDeadline ? new Date(payload.applicationDeadline) : null,
    expectedStartDate: payload.expectedStartDate ? new Date(payload.expectedStartDate) : null,
    notes: payload.notes,
    supportingInfo: payload.supportingInfo,
    topMatchesDeliveredAt: null,
    topMatchesLastError: null
  };
}

function toAcceptanceCriteriaData(payload: ReturnType<typeof parseOpeningPayload>) {
  return payload.acceptanceCriteria;
}

export async function submitOpeningForReview(
  tx: PrismaLike,
  input: {
    authorUserId: string;
    payload: OpeningDraftInput;
    attachment?: File | null;
    openingId?: string;
  }
) {
  const parsed = parseOpeningPayload(input.payload);
  const openingData = toOpeningData(parsed);
  const acceptanceCriteriaData = toAcceptanceCriteriaData(parsed);

  let targetOpeningId = input.openingId;
  let message = "התקן הפתוח נשלח לאישור אדמין.";

  if (!input.openingId) {
    const created = await tx.residencyOpening.create({
      data: {
        ...openingData,
        createdByUserId: input.authorUserId,
        contentStatus: ContentStatus.PENDING_REVIEW,
        acceptanceCriteria: {
          create: acceptanceCriteriaData
        }
      }
    });

    targetOpeningId = created.id;
  } else {
    const currentOpening = await tx.residencyOpening.findUnique({
      where: {
        id: input.openingId
      },
      include: {
        acceptanceCriteria: true
      }
    });

    if (!currentOpening) {
      throw new Error("התקן הפתוח לא נמצא.");
    }

    if (
      currentOpening.supersedesOpeningId &&
      currentOpening.departmentId !== parsed.departmentId
    ) {
      throw new Error("אי אפשר להעביר טיוטת עדכון למחלקה אחרת.");
    }

    if (
      !currentOpening.supersedesOpeningId &&
      currentOpening.contentStatus === ContentStatus.PUBLISHED &&
      currentOpening.departmentId !== parsed.departmentId
    ) {
      throw new Error("כדי לשייך תקן למחלקה אחרת צריך ליצור תקן פתוח חדש.");
    }

    if (currentOpening.contentStatus === ContentStatus.PENDING_REVIEW) {
      const updated = await tx.residencyOpening.update({
        where: {
          id: currentOpening.id
        },
        data: {
          ...openingData,
          reviewNote: null,
          reviewedAt: null,
          reviewedByUserId: null,
          acceptanceCriteria: {
            upsert: {
              create: acceptanceCriteriaData,
              update: acceptanceCriteriaData
            }
          }
        }
      });

      targetOpeningId = updated.id;
      message = currentOpening.supersedesOpeningId
        ? "טיוטת העדכון נשמרה וממשיכה להמתין לאישור אדמין."
        : "התקן הפתוח נשמר וממשיך להמתין לאישור אדמין.";
    } else {
      const existingRevision = await tx.residencyOpening.findFirst({
        where: {
          supersedesOpeningId: currentOpening.id,
          contentStatus: ContentStatus.PENDING_REVIEW
        },
        include: {
          acceptanceCriteria: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      if (existingRevision) {
        const updatedRevision = await tx.residencyOpening.update({
          where: {
            id: existingRevision.id
          },
          data: {
            ...openingData,
            createdByUserId: input.authorUserId,
            reviewNote: null,
            reviewedAt: null,
            reviewedByUserId: null,
            acceptanceCriteria: {
              upsert: {
                create: acceptanceCriteriaData,
                update: acceptanceCriteriaData
              }
            }
          }
        });

        targetOpeningId = updatedRevision.id;
      } else {
        const createdRevision = await tx.residencyOpening.create({
          data: {
            ...openingData,
            createdByUserId: input.authorUserId,
            supersedesOpeningId: currentOpening.id,
            contentStatus: ContentStatus.PENDING_REVIEW,
            acceptanceCriteria: {
              create: acceptanceCriteriaData
            }
          }
        });

        targetOpeningId = createdRevision.id;
      }

      message = "העדכון לתקן הפתוח נשלח לאישור אדמין.";
    }
  }

  if (!targetOpeningId) {
    throw new Error("לא הצלחנו לשמור את הטיוטה לאישור.");
  }

  if (input.attachment) {
    await storeUploadedFile(tx, {
      file: input.attachment,
      category: "OPENING_ATTACHMENT",
      departmentId: parsed.departmentId,
      openingId: targetOpeningId,
      uploadedByUserId: input.authorUserId,
      isPublic: false
    });
  }

  return {
    openingId: targetOpeningId,
    message
  };
}

export async function reviewPendingOpening(
  tx: PrismaLike,
  input: {
    openingId: string;
    reviewerUserId: string;
    decision: "APPROVE" | "REJECT";
    adminNote?: string;
  }
) {
  const pendingOpening = await tx.residencyOpening.findUnique({
    where: {
      id: input.openingId
    },
    include: {
      acceptanceCriteria: true
    }
  });

  if (!pendingOpening || pendingOpening.contentStatus !== ContentStatus.PENDING_REVIEW) {
    throw new Error("התקן הפתוח הזה לא ממתין כרגע לאישור.");
  }

  if (input.decision === "REJECT") {
    const rejected = await tx.residencyOpening.update({
      where: {
        id: pendingOpening.id
      },
      data: {
        contentStatus: ContentStatus.ARCHIVED,
        reviewNote: input.adminNote,
        reviewedAt: new Date(),
        reviewedByUserId: input.reviewerUserId
      }
    });

    return {
      openingId: rejected.id,
      message: "הטיוטה נדחתה ולא עלתה לציבור."
    };
  }

  if (pendingOpening.supersedesOpeningId) {
    const published = await tx.residencyOpening.update({
      where: {
        id: pendingOpening.supersedesOpeningId
      },
      data: {
        ...toOpeningData(parseOpeningPayload({
          departmentId: pendingOpening.departmentId,
          title: pendingOpening.title,
          summary: pendingOpening.summary,
          openingType: pendingOpening.openingType,
          isImmediate: pendingOpening.isImmediate,
          openingsCount: pendingOpening.openingsCount,
          topApplicantsToEmail: pendingOpening.topApplicantsToEmail,
          status: pendingOpening.status,
          committeeDate: pendingOpening.committeeDate?.toISOString().slice(0, 10),
          applicationDeadline: pendingOpening.applicationDeadline?.toISOString().slice(0, 10),
          expectedStartDate: pendingOpening.expectedStartDate?.toISOString().slice(0, 10),
          notes: pendingOpening.notes,
          supportingInfo: pendingOpening.supportingInfo,
          acceptanceCriteria: {
            researchImportance: pendingOpening.acceptanceCriteria?.researchImportance ?? 3,
            departmentElectiveImportance:
              pendingOpening.acceptanceCriteria?.departmentElectiveImportance ?? 3,
            departmentInternshipImportance:
              pendingOpening.acceptanceCriteria?.departmentInternshipImportance ?? 3,
            residentSelectionInfluence:
              pendingOpening.acceptanceCriteria?.residentSelectionInfluence ?? 3,
            specialistSelectionInfluence:
              pendingOpening.acceptanceCriteria?.specialistSelectionInfluence ?? 3,
            departmentHeadInfluence:
              pendingOpening.acceptanceCriteria?.departmentHeadInfluence ?? 3,
            medicalSchoolInfluence: pendingOpening.acceptanceCriteria?.medicalSchoolInfluence ?? 3,
            recommendationsImportance:
              pendingOpening.acceptanceCriteria?.recommendationsImportance ?? 3,
            personalFitImportance: pendingOpening.acceptanceCriteria?.personalFitImportance ?? 3,
            previousDepartmentExperienceImportance:
              pendingOpening.acceptanceCriteria?.previousDepartmentExperienceImportance ?? 3,
            notes: pendingOpening.acceptanceCriteria?.notes,
            whatWeAreLookingFor: pendingOpening.acceptanceCriteria?.whatWeAreLookingFor
          }
        })),
        publishedAt: new Date(),
        contentStatus: ContentStatus.PUBLISHED,
        reviewNote: input.adminNote,
        reviewedAt: new Date(),
        reviewedByUserId: input.reviewerUserId,
        acceptanceCriteria: {
          upsert: {
            create: {
              researchImportance: pendingOpening.acceptanceCriteria?.researchImportance ?? 3,
              departmentElectiveImportance:
                pendingOpening.acceptanceCriteria?.departmentElectiveImportance ?? 3,
              departmentInternshipImportance:
                pendingOpening.acceptanceCriteria?.departmentInternshipImportance ?? 3,
              residentSelectionInfluence:
                pendingOpening.acceptanceCriteria?.residentSelectionInfluence ?? 3,
              specialistSelectionInfluence:
                pendingOpening.acceptanceCriteria?.specialistSelectionInfluence ?? 3,
              departmentHeadInfluence:
                pendingOpening.acceptanceCriteria?.departmentHeadInfluence ?? 3,
              medicalSchoolInfluence:
                pendingOpening.acceptanceCriteria?.medicalSchoolInfluence ?? 3,
              recommendationsImportance:
                pendingOpening.acceptanceCriteria?.recommendationsImportance ?? 3,
              personalFitImportance:
                pendingOpening.acceptanceCriteria?.personalFitImportance ?? 3,
              previousDepartmentExperienceImportance:
                pendingOpening.acceptanceCriteria?.previousDepartmentExperienceImportance ?? 3,
              notes: pendingOpening.acceptanceCriteria?.notes,
              whatWeAreLookingFor: pendingOpening.acceptanceCriteria?.whatWeAreLookingFor
            },
            update: {
              researchImportance: pendingOpening.acceptanceCriteria?.researchImportance ?? 3,
              departmentElectiveImportance:
                pendingOpening.acceptanceCriteria?.departmentElectiveImportance ?? 3,
              departmentInternshipImportance:
                pendingOpening.acceptanceCriteria?.departmentInternshipImportance ?? 3,
              residentSelectionInfluence:
                pendingOpening.acceptanceCriteria?.residentSelectionInfluence ?? 3,
              specialistSelectionInfluence:
                pendingOpening.acceptanceCriteria?.specialistSelectionInfluence ?? 3,
              departmentHeadInfluence:
                pendingOpening.acceptanceCriteria?.departmentHeadInfluence ?? 3,
              medicalSchoolInfluence:
                pendingOpening.acceptanceCriteria?.medicalSchoolInfluence ?? 3,
              recommendationsImportance:
                pendingOpening.acceptanceCriteria?.recommendationsImportance ?? 3,
              personalFitImportance:
                pendingOpening.acceptanceCriteria?.personalFitImportance ?? 3,
              previousDepartmentExperienceImportance:
                pendingOpening.acceptanceCriteria?.previousDepartmentExperienceImportance ?? 3,
              notes: pendingOpening.acceptanceCriteria?.notes,
              whatWeAreLookingFor: pendingOpening.acceptanceCriteria?.whatWeAreLookingFor
            }
          }
        }
      }
    });

    await tx.uploadedFile.updateMany({
      where: {
        openingId: pendingOpening.id
      },
      data: {
        openingId: published.id,
        departmentId: published.departmentId
      }
    });

    await tx.residencyOpening.update({
      where: {
        id: pendingOpening.id
      },
      data: {
        contentStatus: ContentStatus.ARCHIVED,
        reviewNote: input.adminNote,
        reviewedAt: new Date(),
        reviewedByUserId: input.reviewerUserId
      }
    });

    return {
      openingId: published.id,
      message: "העדכון אושר והוחל על התקן הפתוח."
    };
  }

  const approved = await tx.residencyOpening.update({
    where: {
      id: pendingOpening.id
    },
    data: {
      contentStatus: ContentStatus.PUBLISHED,
      publishedAt: new Date(),
      reviewNote: input.adminNote,
      reviewedAt: new Date(),
      reviewedByUserId: input.reviewerUserId
    }
  });

  return {
    openingId: approved.id,
    message: "התקן הפתוח אושר ועלה לציבור."
  };
}
