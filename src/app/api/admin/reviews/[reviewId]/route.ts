import { NextResponse } from "next/server";
import { SubmissionStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { reviewSubmissionModerationSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const { reviewId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = reviewSubmissionModerationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const submission = await prisma.reviewSubmission.findUnique({
    where: {
      id: reviewId
    }
  });

  if (!submission) {
    return NextResponse.json({ error: "הגשת הביקורת לא נמצאה." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const nextStatus =
      parsed.data.status === "APPROVED" ? SubmissionStatus.PUBLISHED : SubmissionStatus.REJECTED;

    await tx.reviewSubmission.update({
      where: {
        id: reviewId
      },
      data: {
        status: nextStatus,
        adminNote: parsed.data.adminNote,
        reviewedAt: new Date(),
        reviewedByUserId: session.userId
      }
    });

    if (parsed.data.status === "APPROVED") {
      await tx.review.upsert({
        where: {
          submissionId: submission.id
        },
        update: {
          reviewerType: submission.reviewerType,
          displayName: submission.isAnonymous ? null : submission.fullName,
          isAnonymous: submission.isAnonymous,
          teachingQuality: submission.teachingQuality,
          workAtmosphere: submission.workAtmosphere,
          seniorsApproachability: submission.seniorsApproachability,
          researchExposure: submission.researchExposure,
          lifestyleBalance: submission.lifestyleBalance,
          overallRecommendation: submission.overallRecommendation,
          pros: submission.pros,
          cons: submission.cons,
          tips: submission.tips,
          publishedAt: new Date()
        },
        create: {
          departmentId: submission.departmentId,
          submissionId: submission.id,
          reviewerType: submission.reviewerType,
          displayName: submission.isAnonymous ? null : submission.fullName,
          isAnonymous: submission.isAnonymous,
          teachingQuality: submission.teachingQuality,
          workAtmosphere: submission.workAtmosphere,
          seniorsApproachability: submission.seniorsApproachability,
          researchExposure: submission.researchExposure,
          lifestyleBalance: submission.lifestyleBalance,
          overallRecommendation: submission.overallRecommendation,
          pros: submission.pros,
          cons: submission.cons,
          tips: submission.tips,
          publishedAt: new Date()
        }
      });
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action:
      parsed.data.status === "APPROVED"
        ? "review_submission.published"
        : "review_submission.rejected",
    entityType: "ReviewSubmission",
    entityId: reviewId
  });

  return NextResponse.json({ message: "סטטוס הגשת הביקורת עודכן." });
}
