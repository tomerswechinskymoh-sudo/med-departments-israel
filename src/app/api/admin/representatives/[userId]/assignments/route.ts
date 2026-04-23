import { RoleKey } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { representativeAssignmentUpdateSchema } from "@/lib/validation";

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
  const parsed = representativeAssignmentUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין." },
      { status: 400 }
    );
  }

  const representative = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      roleKey: true
    }
  });

  if (!representative || representative.roleKey !== RoleKey.REPRESENTATIVE) {
    return NextResponse.json({ error: "החשבון שנבחר אינו נציג/ת מחלקה." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.representativeAssignment.deleteMany({
      where: {
        userId
      }
    });

    await tx.representativeAssignment.createMany({
      data: parsed.data.departmentIds.map((departmentId) => ({
        userId,
        departmentId,
        createdByUserId: session.userId
      }))
    });
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.representative_assignments_updated",
    entityType: "User",
    entityId: userId,
    metadata: {
      departmentIds: parsed.data.departmentIds
    }
  });

  return NextResponse.json({ message: "שיוכי המחלקות נשמרו." });
}

