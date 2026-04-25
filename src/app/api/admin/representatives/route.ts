import { RoleKey } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { adminRepresentativeCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = adminRepresentativeCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: {
      email
    },
    select: {
      id: true
    }
  });

  if (existingUser) {
    return NextResponse.json({ error: "כבר קיים חשבון עם האימייל הזה." }, { status: 409 });
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

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        roleKey: RoleKey.REPRESENTATIVE,
        isApprovedPublisher: false
      }
    });

    await tx.representativeProfile.create({
      data: {
        userId: created.id,
        title: parsed.data.profile.title,
        contactDetails: parsed.data.profile.contactDetails,
        note: parsed.data.profile.note
      }
    });

    await tx.representativeAssignment.createMany({
      data: parsed.data.departmentIds.map((departmentId) => ({
        userId: created.id,
        departmentId,
        createdByUserId: session.userId
      }))
    });

    return created;
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.representative_created",
    entityType: "User",
    entityId: user.id,
    metadata: {
      institutionId: parsed.data.institutionId,
      departmentIds: parsed.data.departmentIds
    }
  });

  return NextResponse.json({ message: "נציג/ת המחלקה נוצר/ה ונשויך/ה בהצלחה." });
}
