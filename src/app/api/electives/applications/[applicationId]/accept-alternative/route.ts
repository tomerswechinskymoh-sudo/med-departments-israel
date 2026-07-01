import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { validateElectiveApplicationRequest } from "@/lib/elective-availability";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { isStudentElectivesPreviewEnabled } from "@/lib/student-electives";

export async function POST(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  if (!isStudentElectivesPreviewEnabled()) {
    return NextResponse.json({ error: "תצוגת אלקטיבים אינה פעילה כרגע." }, { status: 404 });
  }

  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "יש להתחבר כדי לעדכן בקשת אלקטיב." }, { status: 401 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const { applicationId } = await params;
  const application = await prisma.electiveApplication.findFirst({
    where: {
      id: applicationId,
      applicantUserId: session.userId,
      status: "ALTERNATIVE_OFFERED",
      proposedStartDate: { not: null },
      proposedEndDate: { not: null }
    }
  });

  if (!application?.proposedStartDate || !application.proposedEndDate) {
    return NextResponse.json({ error: "הצעת התאריכים לא נמצאה." }, { status: 404 });
  }

  const validation = await validateElectiveApplicationRequest({
    departmentId: application.departmentId,
    requestedStartDate: application.proposedStartDate,
    requestedEndDate: application.proposedEndDate
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const updated = await prisma.electiveApplication.update({
    where: { id: application.id },
    data: {
      requestedStartDate: application.proposedStartDate,
      requestedEndDate: application.proposedEndDate,
      status: "ALTERNATIVE_ACCEPTED"
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "student.elective_alternative_accepted",
    entityType: "ElectiveApplication",
    entityId: updated.id,
    metadata: { departmentId: updated.departmentId }
  });

  return NextResponse.json({ ok: true, message: "התאריכים החלופיים אושרו." });
}
