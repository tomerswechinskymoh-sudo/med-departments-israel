import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { departmentEditorSchema } from "@/lib/validation";
import { applyDepartmentChangePayload } from "@/server/workflows/department-change-requests";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
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
    },
    select: {
      id: true
    }
  });

  if (!department) {
    return NextResponse.json({ error: "המחלקה לא נמצאה." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await applyDepartmentChangePayload(tx, parsed.data, session.userId);
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.department_updated",
    entityType: "Department",
    entityId: departmentId
  });

  return NextResponse.json({ message: "עמוד המחלקה עודכן ישירות." });
}
