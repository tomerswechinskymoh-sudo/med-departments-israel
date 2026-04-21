import { UploadedFileCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { canUserPublishDepartment } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { readOptionalFormFile, storeUploadedFile } from "@/lib/uploads";
import { openingEditorSchema } from "@/lib/validation";

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

  if (!session || !["representative", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const { openingId } = await params;
  const existingOpening = await prisma.residencyOpening.findUnique({
    where: { id: openingId }
  });

  if (!existingOpening) {
    return NextResponse.json({ error: "הפתיחה לא נמצאה." }, { status: 404 });
  }

  if (session.role !== "admin") {
    const canPublish = await canUserPublishDepartment(session.userId, existingOpening.departmentId);

    if (!canPublish) {
      return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
    }
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
      personalFitImportance: getString(formData, "acceptanceCriteria.personalFitImportance"),
      previousDepartmentExperienceImportance: getString(
        formData,
        "acceptanceCriteria.previousDepartmentExperienceImportance"
      ),
      notes: getString(formData, "acceptanceCriteria.notes")
    }
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין." },
      { status: 400 }
    );
  }

  if (session.role !== "admin") {
    const canPublishToTargetDepartment = await canUserPublishDepartment(
      session.userId,
      parsed.data.departmentId
    );

    if (!canPublishToTargetDepartment) {
      return NextResponse.json(
        { error: "אי אפשר להעביר או לעדכן פתיחה עבור מחלקה שאין עבורה הרשאת פרסום." },
        { status: 403 }
      );
    }
  }

  const opening = await prisma.$transaction(async (tx) => {
    const updated = await tx.residencyOpening.update({
      where: { id: openingId },
      data: {
        departmentId: parsed.data.departmentId,
        title: parsed.data.title,
        summary: parsed.data.summary,
        openingType: parsed.data.openingType,
        isImmediate: parsed.data.isImmediate,
        openingsCount: parsed.data.openingsCount ?? null,
        status: parsed.data.status,
        committeeDate: parsed.data.committeeDate ? new Date(parsed.data.committeeDate) : null,
        applicationDeadline: parsed.data.applicationDeadline
          ? new Date(parsed.data.applicationDeadline)
          : null,
        expectedStartDate: parsed.data.expectedStartDate
          ? new Date(parsed.data.expectedStartDate)
          : null,
        notes: parsed.data.notes,
        supportingInfo: parsed.data.supportingInfo,
        acceptanceCriteria: {
          upsert: {
            create: parsed.data.acceptanceCriteria,
            update: parsed.data.acceptanceCriteria
          }
        }
      }
    });

    if (attachment) {
      await storeUploadedFile(tx, {
        file: attachment,
        category: UploadedFileCategory.OPENING_ATTACHMENT,
        departmentId: updated.departmentId,
        openingId: updated.id,
        uploadedByUserId: session.userId,
        isPublic: false
      });
    }

    return updated;
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "opening.updated",
    entityType: "ResidencyOpening",
    entityId: opening.id
  });

  return NextResponse.json({ message: "הפתיחה עודכנה בהצלחה.", openingId: opening.id });
}
