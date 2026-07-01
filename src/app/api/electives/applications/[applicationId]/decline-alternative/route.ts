import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
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
  const updated = await prisma.electiveApplication.updateMany({
    where: {
      id: applicationId,
      applicantUserId: session.userId,
      status: "ALTERNATIVE_OFFERED"
    },
    data: {
      status: "ALTERNATIVE_DECLINED"
    }
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "הצעת התאריכים לא נמצאה." }, { status: 404 });
  }

  await createAuditLog({
    actorUserId: session.userId,
    action: "student.elective_alternative_declined",
    entityType: "ElectiveApplication",
    entityId: applicationId,
    metadata: {}
  });

  return NextResponse.json({ ok: true, message: "הצעת התאריכים נדחתה." });
}
