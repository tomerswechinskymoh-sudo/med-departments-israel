import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { adminSpecialtySchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = adminSpecialtySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const existing = await prisma.specialty.findFirst({
    where: {
      OR: [{ slug: parsed.data.slug }, { name: parsed.data.name }]
    }
  });

  if (existing) {
    return NextResponse.json({ error: "תחום עם שם או מזהה זה כבר קיים." }, { status: 409 });
  }

  const specialty = await prisma.specialty.create({
    data: parsed.data
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.specialty_created",
    entityType: "Specialty",
    entityId: specialty.id
  });

  return NextResponse.json({ message: "התחום נוסף בהצלחה." });
}
