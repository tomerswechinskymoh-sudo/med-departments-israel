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

  const institutionDepartments = await prisma.department.findMany({
    where: {
      institutionId: parsed.data.institutionId
    },
    select: {
      id: true
    }
  });
  const institutionDepartmentIds = institutionDepartments.map((department) => department.id);
  const invalidDepartmentIds = parsed.data.departmentIds.filter(
    (departmentId) => !institutionDepartmentIds.includes(departmentId)
  );

  if (invalidDepartmentIds.length > 0) {
    return NextResponse.json(
      { error: "אפשר לשייך רק מחלקות ששייכות למוסד שנבחר." },
      { status: 400 }
    );
  }

  const assignmentsOutsideInstitution = await prisma.representativeAssignment.count({
    where: {
      userId,
      departmentId: {
        notIn: institutionDepartmentIds
      }
    }
  });

  if (assignmentsOutsideInstitution === 0 && parsed.data.departmentIds.length === 0) {
    return NextResponse.json(
      { error: "יש לשייך לפחות מחלקה אחת לנציג/ה." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.representativeAssignment.deleteMany({
      where: {
        userId,
        departmentId: {
          in: institutionDepartmentIds
        }
      }
    });

    if (parsed.data.departmentIds.length === 0) {
      return;
    }

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
      institutionId: parsed.data.institutionId,
      departmentIds: parsed.data.departmentIds
    }
  });

  return NextResponse.json({ message: "שיוכי המחלקות במוסד שנבחר נשמרו." });
}
