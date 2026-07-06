import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { canManageElectiveDepartment, requireElectiveDepartmentApiSession } from "@/lib/elective-department-auth";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { electiveDepartmentPortalSettingsSchema, electiveTrackSettingsSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireElectiveDepartmentApiSession();

  if (auth.status === "disabled") {
    return NextResponse.json({ error: "פורטל המחלקות לא פעיל כרגע." }, { status: 404 });
  }

  if (auth.status === "unauthorized") {
    return NextResponse.json({ error: "יש להתחבר מחדש." }, { status: 401 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = electiveDepartmentPortalSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const requestedDepartmentId = typeof body?.departmentId === "string" ? body.departmentId : auth.session.departmentId;

  if (!canManageElectiveDepartment(auth.session, requestedDepartmentId)) {
    return NextResponse.json({ error: "אין הרשאה למחלקה זו." }, { status: 403 });
  }

  const settings = await prisma.electiveDepartmentSettings.upsert({
    where: { departmentId: requestedDepartmentId },
    create: {
      departmentId: requestedDepartmentId,
      maxStudentsAtOnce: parsed.data.maxStudentsAtOnce,
      availabilityMode: parsed.data.availabilityMode,
      minDurationDays: parsed.data.minDurationDays ?? null,
      maxDurationDays: parsed.data.maxDurationDays ?? null,
      allowApplications: parsed.data.allowApplications,
      contactEmail: parsed.data.contactEmail ?? null,
      contactPhone: parsed.data.contactPhone ?? null,
      instructions: parsed.data.instructions ?? null,
      notes: parsed.data.notes ?? null
    },
    update: {
      maxStudentsAtOnce: parsed.data.maxStudentsAtOnce,
      availabilityMode: parsed.data.availabilityMode,
      minDurationDays: parsed.data.minDurationDays ?? null,
      maxDurationDays: parsed.data.maxDurationDays ?? null,
      allowApplications: parsed.data.allowApplications,
      contactEmail: parsed.data.contactEmail ?? null,
      contactPhone: parsed.data.contactPhone ?? null,
      instructions: parsed.data.instructions ?? null,
      notes: parsed.data.notes ?? null
    }
  });
  const trackSettingsInput = Array.isArray(body?.trackSettings) ? body.trackSettings : [];

  for (const item of trackSettingsInput) {
    const parsedTrack = electiveTrackSettingsSchema.safeParse({
      ...(item ?? {}),
      departmentId: requestedDepartmentId
    });

    if (!parsedTrack.success) {
      return NextResponse.json({ error: parsedTrack.error.issues[0]?.message ?? "קלט סוג סבב לא תקין." }, { status: 400 });
    }

    await prisma.electiveDepartmentTrackSettings.upsert({
      where: {
        departmentId_trackType: {
          departmentId: requestedDepartmentId,
          trackType: parsedTrack.data.trackType
        }
      },
      create: {
        departmentId: requestedDepartmentId,
        trackType: parsedTrack.data.trackType,
        allowApplications: parsedTrack.data.allowApplications,
        maxStudentsAtOnce: parsedTrack.data.maxStudentsAtOnce,
        minDurationDays: parsedTrack.data.minDurationDays ?? null,
        maxDurationDays: parsedTrack.data.maxDurationDays ?? null,
        notes: parsedTrack.data.notes ?? null,
        paymentRequired: parsedTrack.data.paymentRequired,
        paymentAmount: parsedTrack.data.paymentAmount ?? null,
        paymentCurrency: parsedTrack.data.paymentCurrency ?? "ILS",
        paymentLink: parsedTrack.data.paymentLink ?? null,
        paymentInstructions: parsedTrack.data.paymentInstructions ?? null
      },
      update: {
        allowApplications: parsedTrack.data.allowApplications,
        maxStudentsAtOnce: parsedTrack.data.maxStudentsAtOnce,
        minDurationDays: parsedTrack.data.minDurationDays ?? null,
        maxDurationDays: parsedTrack.data.maxDurationDays ?? null,
        notes: parsedTrack.data.notes ?? null,
        paymentRequired: parsedTrack.data.paymentRequired,
        paymentAmount: parsedTrack.data.paymentAmount ?? null,
        paymentCurrency: parsedTrack.data.paymentCurrency ?? "ILS",
        paymentLink: parsedTrack.data.paymentLink ?? null,
        paymentInstructions: parsedTrack.data.paymentInstructions ?? null
      }
    });
  }

  await createAuditLog({
    actorUserId: null,
    action: "elective_department.settings_updated",
    entityType: "ElectiveDepartmentSettings",
    entityId: settings.id,
    metadata: {
      departmentId: requestedDepartmentId,
      accountId: auth.session.accountId
    }
  });

  return NextResponse.json({ message: "הגדרות האלקטיב נשמרו." });
}
