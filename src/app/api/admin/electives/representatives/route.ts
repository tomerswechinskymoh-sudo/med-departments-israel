import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";
import { electiveRepresentativeAccountSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = electiveRepresentativeAccountSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const passwordHash = parsed.data.password ? await hashPassword(parsed.data.password) : null;
  const representative = await prisma.electiveRepresentativeAccount.upsert({
    where: { username: parsed.data.username },
    create: {
      name: parsed.data.name,
      email: parsed.data.email,
      username: parsed.data.username,
      passwordHash: passwordHash ?? await hashPassword(`El-${randomUUID()}-Temp1`),
      phone: parsed.data.phone ?? null,
      isActive: parsed.data.isActive
    },
    update: {
      name: parsed.data.name,
      email: parsed.data.email,
      ...(passwordHash ? { passwordHash } : {}),
      phone: parsed.data.phone ?? null,
      isActive: parsed.data.isActive
    }
  });

  await prisma.electiveRepresentativeDepartmentAssignment.deleteMany({
    where: { representativeAccountId: representative.id }
  });

  await prisma.electiveRepresentativeDepartmentAssignment.createMany({
    data: parsed.data.departmentIds.map((departmentId) => ({
      representativeAccountId: representative.id,
      departmentId,
      role: parsed.data.role,
      receivesApplicationEmails: parsed.data.receivesApplicationEmails
    })),
    skipDuplicates: true
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "admin.elective_representative_upserted",
    entityType: "ElectiveRepresentativeAccount",
    entityId: representative.id,
    metadata: {
      departmentIds: parsed.data.departmentIds
    }
  });

  return NextResponse.json({ message: "נציג/ת אלקטיבים נשמר/ה." });
}
