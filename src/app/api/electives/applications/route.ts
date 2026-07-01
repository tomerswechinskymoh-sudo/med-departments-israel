import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import {
  getElectiveDepartmentBySlug,
  isStudentElectivesPreviewEnabled,
  parseDateOnly,
  validateElectiveApplicationRequest
} from "@/lib/student-electives";
import { electiveStudentApplicationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isStudentElectivesPreviewEnabled()) {
    return NextResponse.json({ error: "תצוגת אלקטיבים אינה פעילה כרגע." }, { status: 404 });
  }

  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "יש להתחבר כדי להגיש בקשת אלקטיב." }, { status: 401 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = electiveStudentApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const department = await getElectiveDepartmentBySlug(parsed.data.departmentSlug);

  if (!department) {
    return NextResponse.json({ error: "מחלקת אלקטיב לא נמצאה." }, { status: 404 });
  }

  const requestedStartDate = parseDateOnly(parsed.data.requestedStartDate);
  const requestedEndDate = parseDateOnly(parsed.data.requestedEndDate);

  if (!requestedStartDate || !requestedEndDate) {
    return NextResponse.json({ error: "התאריכים אינם תקינים." }, { status: 400 });
  }

  const validation = await validateElectiveApplicationRequest({
    departmentId: department.id,
    requestedStartDate,
    requestedEndDate
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const application = await prisma.electiveApplication.create({
    data: {
      departmentId: department.id,
      applicantUserId: session.userId,
      applicantName: session.fullName,
      applicantEmail: session.email,
      requestedStartDate,
      requestedEndDate,
      status: "SUBMITTED",
      studentNotes: parsed.data.studentNotes ?? null
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "student.elective_application_submitted",
    entityType: "ElectiveApplication",
    entityId: application.id,
    metadata: {
      departmentId: department.id,
      preview: true
    }
  });

  return NextResponse.json({
    ok: true,
    applicationId: application.id,
    message: "בקשת האלקטיב הוגשה ונשלחה לבדיקה."
  });
}
