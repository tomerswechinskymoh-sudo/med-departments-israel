import { NextResponse } from "next/server";
import { RoleKey } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: {
      email
    }
  });

  if (existingUser) {
    return NextResponse.json({ error: "כבר קיים חשבון עם האימייל הזה." }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const roleKey =
    parsed.data.accountIntent === "representative"
      ? RoleKey.REPRESENTATIVE
      : parsed.data.accountIntent === "resident"
        ? RoleKey.RESIDENT
        : RoleKey.STUDENT;
  const user = await prisma.user.create({
    data: {
      fullName: parsed.data.fullName,
      email,
      phone: parsed.data.phone,
      passwordHash,
      roleKey
    }
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "auth.signup",
    entityType: "User",
    entityId: user.id,
    metadata: {
      accountIntent: parsed.data.accountIntent
    }
  });

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role:
      roleKey === RoleKey.REPRESENTATIVE
        ? "representative"
        : roleKey === RoleKey.RESIDENT
          ? "resident"
          : "student",
    isApprovedPublisher: user.isApprovedPublisher
  });

  return NextResponse.json({ ok: true });
}
