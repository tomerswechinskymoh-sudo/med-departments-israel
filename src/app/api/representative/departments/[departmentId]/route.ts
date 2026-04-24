import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { canUserPublishDepartment } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { departmentEditorSchema } from "@/lib/validation";
import { upsertDepartmentChangeRequest } from "@/server/workflows/department-change-requests";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await getSession();

  if (!session || session.role !== "representative") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const { departmentId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = departmentEditorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין." },
      { status: 400 }
    );
  }

  if (parsed.data.departmentId !== departmentId) {
    return NextResponse.json(
      { error: "חוסר התאמה בין המחלקה לנתונים שנשלחו." },
      { status: 400 }
    );
  }

  const department = await prisma.department.findUnique({
    where: {
      id: departmentId
    }
  });

  if (!department) {
    return NextResponse.json({ error: "המחלקה לא נמצאה." }, { status: 404 });
  }

  const canPublish = await canUserPublishDepartment(session.userId, departmentId);

  if (!canPublish) {
    return NextResponse.json(
      { error: "לחשבון הזה אין שיוך למחלקה שנבחרה." },
      { status: 403 }
    );
  }

  const changeRequest = await prisma.$transaction(async (tx) => {
    return upsertDepartmentChangeRequest(tx, {
      departmentId,
      submittedByUserId: session.userId,
      payload: parsed.data
    });
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "department_change_request.submitted",
    entityType: "DepartmentChangeRequest",
    entityId: changeRequest.id,
    metadata: {
      officialUpdates: parsed.data.officialUpdates.length,
      researchOpportunities: parsed.data.researchOpportunities.length
    }
  });

  return NextResponse.json({
    message: "השינויים נשמרו ונשלחו לאישור אדמין.",
    requestId: changeRequest.id
  });
}
