import { UploadedFileCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { readOptionalFormFile, storeUploadedFile } from "@/lib/uploads";
import { openingApplicationSchema } from "@/lib/validation";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function getBoolean(formData: FormData, key: string) {
  return getString(formData, key) === "true";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ openingId: string }> }
) {
  const { openingId } = await params;
  const opening = await prisma.residencyOpening.findFirst({
    where: {
      id: openingId,
      contentStatus: "PUBLISHED",
      status: {
        in: ["OPEN", "UPCOMING"]
      }
    }
  });

  if (!opening) {
    return NextResponse.json({ error: "הפתיחה לא זמינה להגשה כרגע." }, { status: 404 });
  }

  if (opening.applicationDeadline && new Date(opening.applicationDeadline) < new Date()) {
    return NextResponse.json({ error: "מועד ההגשה לפתיחה הזו הסתיים." }, { status: 400 });
  }

  const formData = await request.formData();
  const cvFile = readOptionalFormFile(formData.get("cvFile"));
  const profilePhoto = readOptionalFormFile(formData.get("profilePhoto"));
  const supportingFile = readOptionalFormFile(formData.get("supportingFile"));

  if (!cvFile) {
    return NextResponse.json({ error: "יש לצרף קורות חיים." }, { status: 400 });
  }

  const parsed = openingApplicationSchema.safeParse({
    openingId,
    applicantType: getString(formData, "applicantType"),
    fullName: getString(formData, "fullName"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email"),
    medicalSchool: getString(formData, "medicalSchool"),
    didDepartmentElective: getBoolean(formData, "didDepartmentElective"),
    departmentElectiveDetails: getString(formData, "departmentElectiveDetails"),
    hasResearch: getBoolean(formData, "hasResearch"),
    researchDetails: getString(formData, "researchDetails"),
    didInternshipThere: getBoolean(formData, "didInternshipThere"),
    internshipDetails: getString(formData, "internshipDetails"),
    recommendationDetails: getString(formData, "recommendationDetails"),
    departmentFamiliarityDetails: getString(formData, "departmentFamiliarityDetails"),
    motivationText: getString(formData, "motivationText"),
    relevantExperience: getString(formData, "relevantExperience"),
    additionalNotes: getString(formData, "additionalNotes")
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין." },
      { status: 400 }
    );
  }

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.openingApplication.create({
      data: {
        openingId,
        applicantType: parsed.data.applicantType,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email,
        medicalSchool: parsed.data.medicalSchool,
        didDepartmentElective: parsed.data.didDepartmentElective,
        departmentElectiveDetails: parsed.data.departmentElectiveDetails,
        hasResearch: parsed.data.hasResearch,
        researchDetails: parsed.data.researchDetails,
        didInternshipThere: parsed.data.didInternshipThere,
        internshipDetails: parsed.data.internshipDetails,
        recommendationDetails: parsed.data.recommendationDetails,
        departmentFamiliarityDetails: parsed.data.departmentFamiliarityDetails,
        motivationText: parsed.data.motivationText,
        relevantExperience: parsed.data.relevantExperience,
        additionalNotes: parsed.data.additionalNotes
      }
    });

    await storeUploadedFile(tx, {
      file: cvFile,
      category: UploadedFileCategory.APPLICATION_CV,
      departmentId: opening.departmentId,
      openingId,
      openingApplicationId: created.id,
      isPublic: false
    });

    if (profilePhoto) {
      await storeUploadedFile(tx, {
        file: profilePhoto,
        category: UploadedFileCategory.APPLICATION_PROFILE_PHOTO,
        departmentId: opening.departmentId,
        openingId,
        openingApplicationId: created.id,
        isPublic: false
      });
    }

    if (supportingFile) {
      await storeUploadedFile(tx, {
        file: supportingFile,
        category: UploadedFileCategory.APPLICATION_SUPPORTING,
        departmentId: opening.departmentId,
        openingId,
        openingApplicationId: created.id,
        isPublic: false
      });
    }

    return created;
  });

  await createAuditLog({
    actorUserId: null,
    action: "opening_application.submitted_public",
    entityType: "OpeningApplication",
    entityId: application.id,
    metadata: {
      openingId
    }
  });

  return NextResponse.json({
    message: "המועמדות התקבלה ונשלחה באופן פרטי למחלקה.",
    applicationId: application.id
  });
}
