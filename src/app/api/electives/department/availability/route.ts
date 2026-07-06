import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { canManageElectiveDepartment, requireElectiveDepartmentApiSession } from "@/lib/elective-department-auth";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { electiveDepartmentPortalAvailabilitySchema } from "@/lib/validation";

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
  const parsed = electiveDepartmentPortalAvailabilitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const requestedDepartmentId = typeof body?.departmentId === "string" ? body.departmentId : auth.session.departmentId;

  if (!canManageElectiveDepartment(auth.session, requestedDepartmentId)) {
    return NextResponse.json({ error: "אין הרשאה למחלקה זו." }, { status: 403 });
  }

  if (parsed.data.action === "delete") {
    const deleted = await prisma.electiveAvailabilityWindow.deleteMany({
      where: {
        id: parsed.data.id,
        departmentId: requestedDepartmentId
      }
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "חלון הזמינות לא נמצא." }, { status: 404 });
    }

    await createAuditLog({
      actorUserId: null,
      action: "elective_department.availability_window_deleted",
      entityType: "ElectiveAvailabilityWindow",
      entityId: parsed.data.id,
      metadata: {
        departmentId: requestedDepartmentId,
        accountId: auth.session.accountId
      }
    });

    return NextResponse.json({ message: "חלון הזמינות נמחק." });
  }

  const data = {
    trackType: parsed.data.trackType ?? null,
    status: parsed.data.status,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    capacityOverride: parsed.data.capacityOverride ?? null,
    reason: parsed.data.reason ?? null,
    note: parsed.data.note ?? null
  };

  if (parsed.data.action === "update") {
    const updated = await prisma.electiveAvailabilityWindow.updateMany({
      where: {
        id: parsed.data.id,
        departmentId: requestedDepartmentId
      },
      data
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "חלון הזמינות לא נמצא." }, { status: 404 });
    }

    await createAuditLog({
      actorUserId: null,
      action: "elective_department.availability_window_updated",
      entityType: "ElectiveAvailabilityWindow",
      entityId: parsed.data.id,
      metadata: {
        departmentId: requestedDepartmentId,
        accountId: auth.session.accountId
      }
    });

    return NextResponse.json({ message: "חלון הזמינות עודכן." });
  }

  const window = await prisma.electiveAvailabilityWindow.create({
    data: {
      departmentId: requestedDepartmentId,
      ...data
    }
  });

  await createAuditLog({
    actorUserId: null,
    action: "elective_department.availability_window_created",
    entityType: "ElectiveAvailabilityWindow",
    entityId: window.id,
    metadata: {
      departmentId: requestedDepartmentId,
      accountId: auth.session.accountId
    }
  });

  return NextResponse.json({ message: "חלון הזמינות נשמר." });
}
