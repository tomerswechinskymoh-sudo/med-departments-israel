import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { adminDepartmentSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = adminDepartmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const existing = await prisma.department.findFirst({
    where: {
      OR: [
        { slug: parsed.data.slug },
        {
          institutionId: parsed.data.institutionId,
          name: parsed.data.name
        }
      ]
    }
  });

  if (existing) {
    return NextResponse.json(
      { error: "מחלקה עם שם זה כבר קיימת באותו בית חולים, או שהמזהה כבר תפוס." },
      { status: 409 }
    );
  }

  const department = await prisma.department.create({
    data: parsed.data
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.department_created",
    entityType: "Department",
    entityId: department.id
  });

  return NextResponse.json({ message: "המחלקה נוספה בהצלחה." });
}
