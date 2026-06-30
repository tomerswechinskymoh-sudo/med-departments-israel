import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { fellowshipIsraeliExperienceSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = fellowshipIsraeliExperienceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const { id, ...data } = parsed.data;
  const nullableData = {
    ...data,
    fellowshipProgramId: data.fellowshipProgramId ?? null,
    fellowshipSpecialtyId: data.fellowshipSpecialtyId ?? null,
    physicianName: data.physicianName ?? null,
    roleTitle: data.roleTitle ?? null,
    currentInstitution: data.currentInstitution ?? null,
    contactEmail: data.contactEmail ?? null,
    contactPhone: data.contactPhone ?? null,
    experienceText: data.experienceText ?? null,
    notes: data.notes ?? null
  };
  const experience = id
    ? await prisma.fellowshipIsraeliExperience.update({
        where: { id },
        data: nullableData
      })
    : await prisma.fellowshipIsraeliExperience.create({
        data: {
          ...nullableData,
          createdByAdminId: session.userId
        }
      });

  await createAuditLog({
    actorUserId: session.userId,
    action: id ? "admin.fellowship_experience_updated" : "admin.fellowship_experience_created",
    entityType: "FellowshipIsraeliExperience",
    entityId: experience.id
  });

  return NextResponse.json({ message: "ניסיון הפלושיפ נשמר." });
}
