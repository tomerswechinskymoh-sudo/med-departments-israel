import { NextResponse } from "next/server";
import { RoleKey } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { publisherRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "יש להתחבר כדי לבקש הרשאת פרסום." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = publisherRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  if (!parsed.data.departmentId && !parsed.data.institutionId) {
    return NextResponse.json(
      { error: "יש לבחור לפחות מוסד או מחלקה שאליהם מתייחסת בקשת הפרסום." },
      { status: 400 }
    );
  }

  const existing = await prisma.publisherRequest.findFirst({
    where: {
      userId: session.userId,
      departmentId: parsed.data.departmentId ?? null,
      institutionId: parsed.data.institutionId ?? null,
      status: {
        in: ["PENDING", "APPROVED"]
      }
    }
  });

  if (existing) {
    return NextResponse.json({ error: "כבר קיימת בקשה פעילה עבור הבחירה הזו." }, { status: 409 });
  }

  const publisherRequest = await prisma.publisherRequest.create({
    data: {
      userId: session.userId,
      departmentId: parsed.data.departmentId,
      institutionId: parsed.data.institutionId,
      requestedRole: RoleKey.REPRESENTATIVE,
      note: parsed.data.note
    }
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "publisher_request.created",
    entityType: "PublisherRequest",
    entityId: publisherRequest.id
  });

  return NextResponse.json({ message: "בקשת הפרסום נשלחה לאישור אדמין." });
}
