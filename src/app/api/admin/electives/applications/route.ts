import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { electiveApplicationAdminSchema, electiveApplicationStatusUpdateSchema } from "@/lib/validation";

function optionalDate(value?: string) {
  return value ? new Date(value) : null;
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = electiveApplicationAdminSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const application = await prisma.electiveApplication.create({
    data: {
      departmentId: parsed.data.departmentId,
      applicantName: parsed.data.applicantName,
      applicantEmail: parsed.data.applicantEmail,
      applicantPhone: parsed.data.applicantPhone ?? null,
      medicalSchool: parsed.data.medicalSchool ?? null,
      requestedStartDate: optionalDate(parsed.data.requestedStartDate),
      requestedEndDate: optionalDate(parsed.data.requestedEndDate),
      status: parsed.data.status,
      studentNotes: parsed.data.studentNotes ?? null,
      adminNotes: parsed.data.adminNotes ?? null
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.elective_application_created",
    entityType: "ElectiveApplication",
    entityId: application.id,
    metadata: {
      departmentId: parsed.data.departmentId,
      status: parsed.data.status
    }
  });

  return NextResponse.json({ message: "בקשת האלקטיב נשמרה." });
}

export async function PUT(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = electiveApplicationStatusUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const application = await prisma.electiveApplication.update({
    where: { id: parsed.data.applicationId },
    data: { status: parsed.data.status }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.elective_application_status_updated",
    entityType: "ElectiveApplication",
    entityId: application.id,
    metadata: {
      departmentId: application.departmentId,
      status: parsed.data.status
    }
  });

  return NextResponse.json({ message: "סטטוס המועמדות עודכן." });
}
