import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { canUserPublishDepartment } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { readOptionalFormFile } from "@/lib/uploads";
import { openingEditorSchema } from "@/lib/validation";
import { submitOpeningForReview } from "@/server/workflows/opening-content";

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
  const session = await getSession();

  if (!session || session.role !== "representative") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const { openingId } = await params;
  const existingOpening = await prisma.residencyOpening.findUnique({
    where: { id: openingId }
  });

  if (!existingOpening) {
    return NextResponse.json({ error: "הפתיחה לא נמצאה." }, { status: 404 });
  }

  const canAccessCurrentDepartment = await canUserPublishDepartment(
    session.userId,
    existingOpening.departmentId
  );

  if (!canAccessCurrentDepartment) {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const formData = await request.formData();
  const attachment = readOptionalFormFile(formData.get("attachment"));

  const parsed = openingEditorSchema.safeParse({
    departmentId: getString(formData, "departmentId"),
    title: getString(formData, "title"),
    summary: getString(formData, "summary"),
    openingType: getString(formData, "openingType"),
    isImmediate: getBoolean(formData, "isImmediate"),
    openingsCount: getString(formData, "openingsCount"),
    topApplicantsToEmail: getString(formData, "topApplicantsToEmail") ?? "5",
    status: getString(formData, "status"),
    committeeDate: getString(formData, "committeeDate"),
    applicationDeadline: getString(formData, "applicationDeadline"),
    expectedStartDate: getString(formData, "expectedStartDate"),
    notes: getString(formData, "notes"),
    supportingInfo: getString(formData, "supportingInfo"),
    acceptanceCriteria: {
      researchImportance: getString(formData, "acceptanceCriteria.researchImportance"),
      departmentElectiveImportance: getString(
        formData,
        "acceptanceCriteria.departmentElectiveImportance"
      ),
      departmentInternshipImportance: getString(
        formData,
        "acceptanceCriteria.departmentInternshipImportance"
      ),
      residentSelectionInfluence: getString(
        formData,
        "acceptanceCriteria.residentSelectionInfluence"
      ),
      specialistSelectionInfluence: getString(
        formData,
        "acceptanceCriteria.specialistSelectionInfluence"
      ),
      departmentHeadInfluence: getString(formData, "acceptanceCriteria.departmentHeadInfluence"),
      medicalSchoolInfluence: getString(formData, "acceptanceCriteria.medicalSchoolInfluence"),
      recommendationsImportance: getString(
        formData,
        "acceptanceCriteria.recommendationsImportance"
      ),
      personalFitImportance: getString(formData, "acceptanceCriteria.personalFitImportance"),
      previousDepartmentExperienceImportance: getString(
        formData,
        "acceptanceCriteria.previousDepartmentExperienceImportance"
      ),
      notes: getString(formData, "acceptanceCriteria.notes"),
      whatWeAreLookingFor: getString(formData, "acceptanceCriteria.whatWeAreLookingFor")
    }
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין." },
      { status: 400 }
    );
  }

  const canPublishToTargetDepartment = await canUserPublishDepartment(
    session.userId,
    parsed.data.departmentId
  );

  if (!canPublishToTargetDepartment) {
    return NextResponse.json(
      { error: "אי אפשר לנהל תקן פתוח במחלקה שלא שויכה לחשבון הזה." },
      { status: 403 }
    );
  }

  if (existingOpening.contentStatus === "PUBLISHED" && parsed.data.departmentId !== existingOpening.departmentId) {
    return NextResponse.json(
      { error: "כדי לשייך תקן למחלקה אחרת צריך ליצור תקן פתוח חדש." },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    return submitOpeningForReview(tx, {
      openingId,
      authorUserId: session.userId,
      payload: parsed.data,
      attachment
    });
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "opening.updated_pending_review",
    entityType: "ResidencyOpening",
    entityId: result.openingId,
    metadata: {
      sourceOpeningId: openingId
    }
  });

  return NextResponse.json({ message: result.message, openingId: result.openingId });
}
