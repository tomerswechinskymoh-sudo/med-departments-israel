import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { electiveDepartmentSettingsSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = electiveDepartmentSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const settings = await prisma.electiveDepartmentSettings.upsert({
    where: {
      departmentId: parsed.data.departmentId
    },
    create: parsed.data,
    update: {
      maxStudentsAtOnce: parsed.data.maxStudentsAtOnce,
      availabilityMode: parsed.data.availabilityMode,
      contactEmail: parsed.data.contactEmail ?? null,
      contactPhone: parsed.data.contactPhone ?? null,
      instructions: parsed.data.instructions ?? null,
      adminNotes: parsed.data.adminNotes ?? null
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.elective_department_settings_upserted",
    entityType: "ElectiveDepartmentSettings",
    entityId: settings.id,
    metadata: {
      departmentId: parsed.data.departmentId
    }
  });

  return NextResponse.json({ message: "הגדרות האלקטיב נשמרו." });
}
