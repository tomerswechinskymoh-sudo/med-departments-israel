import { NextResponse } from "next/server";
import { RoleKey } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { adminUserRoleSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const { userId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = adminUserRoleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    return NextResponse.json({ error: "המשתמש לא נמצא." }, { status: 404 });
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      roleKey: parsed.data.role as RoleKey,
      isApprovedPublisher: parsed.data.isApprovedPublisher
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.user_role_updated",
    entityType: "User",
    entityId: updatedUser.id,
    metadata: {
      role: updatedUser.roleKey,
      isApprovedPublisher: updatedUser.isApprovedPublisher
    }
  });

  return NextResponse.json({ message: "תפקיד המשתמש עודכן." });
}
