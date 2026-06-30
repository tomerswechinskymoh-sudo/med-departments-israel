import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { fellowshipSpecialtySchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = fellowshipSpecialtySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const { id, ...data } = parsed.data;
  const specialty = id
    ? await prisma.fellowshipSpecialty.update({
        where: { id },
        data: {
          ...data,
          baseSpecialtyId: data.baseSpecialtyId ?? null,
          nameEn: data.nameEn ?? null,
          description: data.description ?? null,
          beforeContent: data.beforeContent ?? null,
          duringContent: data.duringContent ?? null,
          afterContent: data.afterContent ?? null
        }
      })
    : await prisma.fellowshipSpecialty.create({
        data: {
          ...data,
          baseSpecialtyId: data.baseSpecialtyId ?? null,
          nameEn: data.nameEn ?? null,
          description: data.description ?? null,
          beforeContent: data.beforeContent ?? null,
          duringContent: data.duringContent ?? null,
          afterContent: data.afterContent ?? null,
          createdByAdminId: session.userId
        }
      });

  await createAuditLog({
    actorUserId: session.userId,
    action: id ? "admin.fellowship_specialty_updated" : "admin.fellowship_specialty_created",
    entityType: "FellowshipSpecialty",
    entityId: specialty.id
  });

  return NextResponse.json({ message: "תחום הפלושיפ נשמר." });
}
