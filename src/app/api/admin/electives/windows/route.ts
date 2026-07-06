import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { electiveAvailabilityWindowSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = electiveAvailabilityWindowSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const window = await prisma.electiveAvailabilityWindow.create({
    data: {
      departmentId: parsed.data.departmentId,
      trackType: parsed.data.trackType ?? null,
      status: parsed.data.status,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      capacityOverride: parsed.data.capacityOverride ?? null,
      reason: parsed.data.reason ?? null,
      note: parsed.data.note ?? null
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.elective_availability_window_created",
    entityType: "ElectiveAvailabilityWindow",
    entityId: window.id,
    metadata: {
      departmentId: parsed.data.departmentId,
      status: parsed.data.status
    }
  });

  return NextResponse.json({ message: "חלון הזמינות נשמר." });
}
