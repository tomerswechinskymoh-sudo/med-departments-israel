import { NextResponse } from "next/server";
import { RoleKey } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import { setSessionCookie } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";
import {
  createTokenExpiry,
  createVerificationToken,
  sendUserVerificationEmail
} from "@/lib/verification";

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const rateLimit = checkRateLimit(request, "auth:signup", {
    limit: 5,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

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
    parsed.data.accountIntent === "resident" ? RoleKey.RESIDENT : RoleKey.STUDENT;
  const verificationToken = createVerificationToken();
  const user = await prisma.user.create({
    data: {
      fullName: parsed.data.fullName,
      email,
      phone: parsed.data.phone,
      passwordHash,
      roleKey,
      verificationToken,
      tokenExpiry: createTokenExpiry()
    }
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "auth.registration",
    entityType: "User",
    entityId: user.id,
    metadata: {
      accountIntent: parsed.data.accountIntent
    }
  });

  const emailDelivery = await sendUserVerificationEmail({
    to: user.email,
    fullName: user.fullName,
    token: verificationToken
  }).catch((error) => {
    console.error("[signup] verification email failed", error);
    return { delivered: false, skipped: false };
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "verification.email_sent",
    entityType: "User",
    entityId: user.id,
    metadata: {
      delivered: emailDelivery.delivered,
      skipped: emailDelivery.skipped
    }
  });

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role:
      roleKey === RoleKey.RESIDENT
          ? "resident"
          : "student",
    isApprovedPublisher: user.isApprovedPublisher
  });

  return NextResponse.json({ ok: true });
}
