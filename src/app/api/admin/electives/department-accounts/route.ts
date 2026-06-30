import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { electiveDepartmentAccountSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = electiveDepartmentAccountSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const department = await prisma.department.findUnique({
    where: { id: parsed.data.departmentId },
    select: { id: true }
  });

  if (!department) {
    return NextResponse.json({ error: "המחלקה לא נמצאה." }, { status: 404 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const account = await prisma.electiveDepartmentAccount.upsert({
    where: {
      departmentId: parsed.data.departmentId
    },
    create: {
      departmentId: parsed.data.departmentId,
      username: parsed.data.username,
      passwordHash,
      isActive: parsed.data.isActive,
      createdByAdminId: session.userId
    },
    update: {
      username: parsed.data.username,
      passwordHash,
      isActive: parsed.data.isActive
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.elective_department_account_upserted",
    entityType: "ElectiveDepartmentAccount",
    entityId: account.id,
    metadata: {
      departmentId: parsed.data.departmentId
    }
  });

  return NextResponse.json({ message: "חשבון המחלקה נשמר." });
}
