import { NextResponse } from "next/server";
import {
  Prisma,
  SubmissionStatus,
  UploadedFileCategory,
  VerificationStatus,
  type ReviewSourceType
} from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin, sanitizePlainText } from "@/lib/security";
import { readOptionalFormFile, storeUploadedFile } from "@/lib/uploads";
import { reviewSubmissionSchema } from "@/lib/validation";
import {
  createTokenExpiry,
  createVerificationToken,
  isDevelopmentEnvironment,
  sendReviewProofRequestEmail
} from "@/lib/verification";

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const rateLimit = checkRateLimit(request, "reviews:submit", {
    limit: 4,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: "קלט לא תקין." }, { status: 400 });
  }

  const verificationDocument = readOptionalFormFile(formData.get("verificationDocument"));
  const body = {
    departmentId: formData.get("departmentId"),
    reviewerType: formData.get("reviewerType"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    hasVerificationDocument: Boolean(verificationDocument),
    isAnonymous: formData.get("isAnonymous") === "true",
    teachingQuality: formData.get("teachingQuality"),
    workAtmosphere: formData.get("workAtmosphere"),
    seniorsApproachability: formData.get("seniorsApproachability"),
    researchExposure: formData.get("researchExposure"),
    lifestyleBalance: formData.get("lifestyleBalance"),
    overallRecommendation: formData.get("overallRecommendation"),
    pros: formData.get("pros"),
    cons: formData.get("cons"),
    tips: formData.get("tips"),
    roleDetails: formData.get("roleDetails"),
    consentToContact: formData.get("consentToContact") === "true",
    consentToTerms: formData.get("consentToTerms") === "true",
    consentNoPatientInfo: formData.get("consentNoPatientInfo") === "true"
  };
  const parsed = reviewSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  if (!verificationDocument && !parsed.data.email) {
    return NextResponse.json(
      { error: "כדי להשלים אימות ללא מסמך, צריך להזין כתובת אימייל." },
      { status: 400 }
    );
  }

  const department = await prisma.department.findUnique({
    where: {
      id: parsed.data.departmentId
    },
    select: {
      id: true,
      name: true,
      specialty: {
        select: {
          name: true
        }
      },
      institution: {
        select: {
          name: true
        }
      },
      medicalArray: {
        select: {
          name: true
        }
      }
    }
  });

  if (!department) {
    return NextResponse.json({ error: "המחלקה שנבחרה לא נמצאה." }, { status: 404 });
  }

  const verificationToken = verificationDocument ? null : createVerificationToken();
  const submission = await prisma.$transaction(async (tx) => {
    const createdSubmission = await tx.reviewSubmission.create({
      data: {
        departmentId: parsed.data.departmentId,
        reviewerType: parsed.data.reviewerType as ReviewSourceType,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone ?? "",
        email: parsed.data.email,
        isAnonymous: parsed.data.isAnonymous,
        teachingQuality: parsed.data.teachingQuality,
        workAtmosphere: parsed.data.workAtmosphere,
        seniorsApproachability: parsed.data.seniorsApproachability,
        researchExposure: parsed.data.researchExposure,
        lifestyleBalance: parsed.data.lifestyleBalance,
        overallRecommendation: parsed.data.overallRecommendation,
        pros: sanitizePlainText(parsed.data.pros),
        cons: sanitizePlainText(parsed.data.cons),
        tips: sanitizePlainText(parsed.data.tips),
        roleDetails: parsed.data.roleDetails as Prisma.InputJsonValue,
        consentToContact: parsed.data.consentToContact,
        consentToTerms: parsed.data.consentToTerms,
        consentNoPatientInfo: parsed.data.consentNoPatientInfo,
        verificationStatus: verificationDocument
          ? VerificationStatus.PENDING_ADMIN_REVIEW
          : VerificationStatus.PENDING_PROOF,
        verificationToken,
        tokenExpiry: verificationToken ? createTokenExpiry() : null,
        proofUploadedAt: verificationDocument ? new Date() : null,
        status: SubmissionStatus.PENDING_REVIEW
      }
    });

    if (verificationDocument) {
      await storeUploadedFile(tx, {
        file: verificationDocument,
        category: UploadedFileCategory.REVIEW_VERIFICATION_PROOF,
        departmentId: parsed.data.departmentId,
        reviewSubmissionId: createdSubmission.id,
        isPublic: false
      });
    }

    return createdSubmission;
  });

  await createAuditLog({
    actorUserId: null,
    action: "review.submitted",
    entityType: "ReviewSubmission",
    entityId: submission.id,
    metadata: {
      verificationStatus: verificationDocument ? "PENDING_ADMIN_REVIEW" : "PENDING_PROOF",
      hasProof: Boolean(verificationDocument)
    }
  });

  if (verificationDocument) {
    await createAuditLog({
      actorUserId: null,
      action: "review.proof_uploaded",
      entityType: "ReviewSubmission",
      entityId: submission.id
    });
  } else if (verificationToken && parsed.data.email) {
    const departmentLabel = [
      department.medicalArray?.name ?? department.name,
      department.institution.name,
      department.specialty.name
    ]
      .filter(Boolean)
      .join(" · ");
    const emailDelivery = await sendReviewProofRequestEmail({
      to: parsed.data.email,
      fullName: parsed.data.fullName,
      departmentLabel,
      token: verificationToken,
      baseUrl: new URL(request.url).origin
    }).catch((error) => {
      console.error("[reviews] proof request email failed", error);
      return { delivered: false, skipped: false };
    });

    await createAuditLog({
      actorUserId: null,
      action: "verification.email_sent",
      entityType: "ReviewSubmission",
      entityId: submission.id,
      metadata: {
        delivered: emailDelivery.delivered,
        skipped: emailDelivery.skipped
      }
    });

    if (!isDevelopmentEnvironment() && !emailDelivery.delivered) {
      console.error("[reviews] proof request email was not delivered", {
        submissionId: submission.id,
        email: parsed.data.email,
        skipped: emailDelivery.skipped
      });
      return NextResponse.json(
        {
          error:
            "השיתוף נשמר, אבל לא הצלחנו לשלוח קישור אימות. נסו שוב מאוחר יותר או פנו לתמיכה."
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ message: "השיתוף נשמר. הוא יעלה רק אחרי בדיקה קצרה." });
}
