import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { sendElectiveApplicationSubmittedEmails } from "@/lib/services/elective-emails";
import {
  getElectiveDepartmentBySlug,
  getStudentElectivesAccess,
  parseDateOnly,
  validateElectiveApplicationRequest
} from "@/lib/student-electives";
import { electiveStudentApplicationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const access = await getStudentElectivesAccess();

  if (!access.ok) {
    return NextResponse.json({ error: "תצוגת אלקטיבים אינה פעילה כרגע." }, { status: 404 });
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
      applicantUserId: access.session.userId,
      applicantName: access.session.fullName,
      applicantEmail: access.session.email,
      requestedStartDate,
      requestedEndDate,
      status: "SUBMITTED",
      studentNotes: parsed.data.studentNotes ?? null
    },
    include: {
      department: {
        include: {
          institution: { select: { name: true } },
          specialty: { select: { name: true } },
          electiveRepresentativeAssignments: {
            where: { receivesApplicationEmails: true },
            include: {
              representativeAccount: {
                select: { name: true, email: true, isActive: true }
              }
            }
          }
        }
      }
    }
  });

  const recipients = application.department.electiveRepresentativeAssignments
    .map((assignment) => assignment.representativeAccount)
    .filter((representative) => representative.isActive)
    .map((representative) => ({ name: representative.name, email: representative.email }));

  if (recipients.length > 0) {
    try {
      await sendElectiveApplicationSubmittedEmails({
        application,
        representativeRecipients: recipients
      });
    } catch (error) {
      console.error("[electives] Failed to send representative application email", {
        applicationId: application.id,
        departmentId: department.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  await createAuditLog({
    actorUserId: access.session.userId,
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
