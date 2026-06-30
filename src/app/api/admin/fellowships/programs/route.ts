import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { fellowshipProgramSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = fellowshipProgramSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const { id, ...data } = parsed.data;
  const nullableData = {
    ...data,
    baseSpecialtyId: data.baseSpecialtyId ?? null,
    city: data.city ?? null,
    departmentName: data.departmentName ?? null,
    duration: data.duration ?? null,
    requirements: data.requirements ?? null,
    contactName: data.contactName ?? null,
    contactEmail: data.contactEmail ?? null,
    contactPhone: data.contactPhone ?? null,
    websiteUrl: data.websiteUrl ?? null,
    notes: data.notes ?? null
  };
  const program = id
    ? await prisma.fellowshipProgram.update({
        where: { id },
        data: nullableData
      })
    : await prisma.fellowshipProgram.create({
        data: {
          ...nullableData,
          createdByAdminId: session.userId
        }
      });

  await createAuditLog({
    actorUserId: session.userId,
    action: id ? "admin.fellowship_program_updated" : "admin.fellowship_program_created",
    entityType: "FellowshipProgram",
    entityId: program.id
  });

  return NextResponse.json({ message: "תוכנית הפלושיפ נשמרה." });
}
