import { NextResponse } from "next/server";
import { UploadedFileCategory, VerificationStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import { readOptionalFormFile, storeUploadedFile } from "@/lib/uploads";

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const rateLimit = checkRateLimit(request, "reviews:proof-upload", {
    limit: 6,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "קלט לא תקין." }, { status: 400 });
  }

  const token = String(formData.get("token") ?? "").trim();
  const file = readOptionalFormFile(formData.get("verificationDocument"));

  if (!token || !file) {
    return NextResponse.json({ error: "יש לצרף קובץ אימות." }, { status: 400 });
  }

  const submission = await prisma.reviewSubmission.findUnique({
    where: {
      verificationToken: token
    }
  });

  if (!submission || (submission.tokenExpiry && submission.tokenExpiry < new Date())) {
    return NextResponse.json({ error: "קישור האימות אינו תקף או שפג תוקפו." }, { status: 410 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await storeUploadedFile(tx, {
        file,
        category: UploadedFileCategory.REVIEW_VERIFICATION_PROOF,
        departmentId: submission.departmentId,
        reviewSubmissionId: submission.id,
        isPublic: false
      });

      await tx.reviewSubmission.update({
        where: {
          id: submission.id
        },
        data: {
          verificationStatus: VerificationStatus.PENDING_ADMIN_REVIEW,
          verificationToken: null,
          tokenExpiry: null,
          proofUploadedAt: new Date()
        }
      });
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "העלאת הקובץ נכשלה." },
      { status: 400 }
    );
  }

  await createAuditLog({
    actorUserId: null,
    action: "review.proof_uploaded",
    entityType: "ReviewSubmission",
    entityId: submission.id
  });

  return NextResponse.json({
    message: "האסמכתא נשמרה ונשלחה לבדיקה. השיתוף יפורסם רק לאחר אישור אדמין."
  });
}
