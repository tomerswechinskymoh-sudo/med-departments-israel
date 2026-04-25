import { NextResponse } from "next/server";
import {
  Prisma,
  SubmissionStatus,
  UploadedFileCategory,
  type ReviewSourceType
} from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { readOptionalFormFile, storeUploadedFile } from "@/lib/uploads";
import { reviewSubmissionSchema } from "@/lib/validation";

export async function POST(request: Request) {
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

  const department = await prisma.department.findUnique({
    where: {
      id: parsed.data.departmentId
    },
    select: {
      id: true
    }
  });

  if (!department) {
    return NextResponse.json({ error: "המחלקה שנבחרה לא נמצאה." }, { status: 404 });
  }

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
        pros: parsed.data.pros ?? "",
        cons: parsed.data.cons ?? "",
        tips: parsed.data.tips ?? "",
        roleDetails: parsed.data.roleDetails as Prisma.InputJsonValue,
        consentToContact: parsed.data.consentToContact,
        consentToTerms: parsed.data.consentToTerms,
        consentNoPatientInfo: parsed.data.consentNoPatientInfo,
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
    action: "review_submission.created_public",
    entityType: "ReviewSubmission",
    entityId: submission.id
  });

  return NextResponse.json({ message: "השיתוף נשמר. הוא יעלה רק אחרי בדיקה קצרה." });
}
