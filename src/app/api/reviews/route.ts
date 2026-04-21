import { NextResponse } from "next/server";
import { SubmissionStatus, type ReviewSourceType } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { reviewSubmissionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reviewSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const submission = await prisma.reviewSubmission.create({
    data: {
      departmentId: parsed.data.departmentId,
      reviewerType: parsed.data.reviewerType as ReviewSourceType,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      isAnonymous: parsed.data.isAnonymous,
      teachingQuality: parsed.data.teachingQuality,
      workAtmosphere: parsed.data.workAtmosphere,
      seniorsApproachability: parsed.data.seniorsApproachability,
      researchExposure: parsed.data.researchExposure,
      lifestyleBalance: parsed.data.lifestyleBalance,
      overallRecommendation: parsed.data.overallRecommendation,
      pros: parsed.data.pros,
      cons: parsed.data.cons,
      tips: parsed.data.tips,
      consentToContact: parsed.data.consentToContact,
      consentToTerms: parsed.data.consentToTerms,
      consentNoPatientInfo: parsed.data.consentNoPatientInfo,
      status: SubmissionStatus.PENDING_REVIEW
    }
  });

  await createAuditLog({
    actorUserId: null,
    action: "review_submission.created_public",
    entityType: "ReviewSubmission",
    entityId: submission.id
  });

  return NextResponse.json({ message: "השיתוף נשמר. הוא יעלה רק אחרי בדיקה קצרה." });
}
