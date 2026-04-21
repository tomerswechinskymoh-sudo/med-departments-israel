import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "יש להתחבר כדי לשמור מחלקות להשוואה." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { departmentId?: string } | null;
  const departmentId = body?.departmentId;

  if (!departmentId) {
    return NextResponse.json({ error: "מחלקה לא נבחרה." }, { status: 400 });
  }

  const existing = await prisma.favoriteDepartment.findUnique({
    where: {
      userId_departmentId: {
        userId: session.userId,
        departmentId
      }
    }
  });

  if (existing) {
    await prisma.favoriteDepartment.delete({
      where: {
        userId_departmentId: {
          userId: session.userId,
          departmentId
        }
      }
    });

    await createAuditLog({
      actorUserId: session.userId,
      action: "favorite.removed",
      entityType: "Department",
      entityId: departmentId
    });

    return NextResponse.json({ isFavorite: false });
  }

  await prisma.favoriteDepartment.create({
    data: {
      userId: session.userId,
      departmentId
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "favorite.added",
    entityType: "Department",
    entityId: departmentId
  });

  return NextResponse.json({ isFavorite: true });
}
