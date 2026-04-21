import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { canUserPublishDepartment } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { openingApplicationModerationSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ openingId: string; applicationId: string }> }
) {
  const session = await getSession();

  if (!session || !["representative", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const { openingId, applicationId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = openingApplicationModerationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין." },
      { status: 400 }
    );
  }

  const application = await prisma.openingApplication.findUnique({
    where: { id: applicationId },
    include: {
      opening: true
    }
  });

  if (!application || application.openingId !== openingId) {
    return NextResponse.json({ error: "המועמדות לא נמצאה." }, { status: 404 });
  }

  if (session.role !== "admin") {
    const canPublish = await canUserPublishDepartment(session.userId, application.opening.departmentId);

    if (!canPublish) {
      return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
    }
  }

  await prisma.openingApplication.update({
    where: { id: applicationId },
    data: {
      status: parsed.data.status,
      reviewerNote: parsed.data.reviewerNote,
      reviewedAt: new Date(),
      reviewedByUserId: session.userId
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "opening_application.reviewed",
    entityType: "OpeningApplication",
    entityId: applicationId,
    metadata: {
      status: parsed.data.status
    }
  });

  return NextResponse.json({ message: "סטטוס המועמדות עודכן." });
}
