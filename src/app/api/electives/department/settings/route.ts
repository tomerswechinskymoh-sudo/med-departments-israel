import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { requireElectiveDepartmentApiSession } from "@/lib/elective-department-auth";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { electiveDepartmentPortalSettingsSchema } from "@/lib/validation";

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

  const settings = await prisma.electiveDepartmentSettings.upsert({
    where: { departmentId: auth.session.departmentId },
    create: {
      departmentId: auth.session.departmentId,
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

  await createAuditLog({
    actorUserId: null,
    action: "elective_department.settings_updated",
    entityType: "ElectiveDepartmentSettings",
    entityId: settings.id,
    metadata: {
      departmentId: auth.session.departmentId,
      accountId: auth.session.accountId
    }
  });

  return NextResponse.json({ message: "הגדרות האלקטיב נשמרו." });
}
