import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { adminInstitutionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = adminInstitutionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const existing = await prisma.institution.findFirst({
    where: {
      OR: [{ slug: parsed.data.slug }, { name: parsed.data.name }]
    }
  });

  if (existing) {
    return NextResponse.json({ error: "מוסד עם שם או מזהה זה כבר קיים." }, { status: 409 });
  }

  const institution = await prisma.institution.create({
    data: parsed.data
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.institution_created",
    entityType: "Institution",
    entityId: institution.id
  });

  return NextResponse.json({ message: "המוסד נוסף בהצלחה." });
}
