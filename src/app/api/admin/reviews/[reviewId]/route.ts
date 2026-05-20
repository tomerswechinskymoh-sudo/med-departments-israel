import { NextResponse } from "next/server";
import { SubmissionStatus, VerificationStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { reviewSubmissionModerationSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
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
    },
    include: {
      verificationFiles: {
        select: {
          id: true
        }
      }
    }
  });

  if (!submission) {
    return NextResponse.json({ error: "הגשת הביקורת לא נמצאה." }, { status: 404 });
  }

  const hasProof = submission.verificationFiles.length > 0 || Boolean(submission.proofUploadedAt);
  const canPublish =
    submission.verificationStatus === VerificationStatus.VERIFIED ||
    (submission.verificationStatus === VerificationStatus.PENDING_ADMIN_REVIEW && hasProof);

  if (parsed.data.status === "APPROVED" && !canPublish) {
    return NextResponse.json(
      { error: "אי אפשר לפרסם לפני השלמת אימות זהות/אסמכתא." },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const nextStatus =
      parsed.data.status === "APPROVED" ? SubmissionStatus.PUBLISHED : SubmissionStatus.REJECTED;
    const nextVerificationStatus =
      parsed.data.status === "APPROVED" ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;

    await tx.reviewSubmission.update({
      where: {
        id: reviewId
      },
      data: {
        status: nextStatus,
        verificationStatus: nextVerificationStatus,
        verifiedByAdminId: parsed.data.status === "APPROVED" ? session.userId : submission.verifiedByAdminId,
        verifiedAt: parsed.data.status === "APPROVED" ? new Date() : submission.verifiedAt,
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
          verificationStatus: VerificationStatus.VERIFIED,
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
          verificationStatus: VerificationStatus.VERIFIED,
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
    entityId: reviewId,
    metadata: {
      verificationStatus:
        parsed.data.status === "APPROVED" ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED,
      hasProof
    }
  });

  return NextResponse.json({ message: "סטטוס הגשת הביקורת עודכן." });
}
