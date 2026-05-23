import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import {
  createTokenExpiry,
  createVerificationToken,
  getUserEmailVerificationUrl,
  isDevelopmentEnvironment,
  sendUserVerificationEmail
} from "@/lib/verification";

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const rateLimit = checkRateLimit(request, "verification:resend", {
    limit: 4,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "יש להזין כתובת מייל." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: {
      email
    }
  });

  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  const token = createVerificationToken();
  const isDevelopment = isDevelopmentEnvironment();
  const requestOrigin = new URL(request.url).origin;
  const verificationUrl = getUserEmailVerificationUrl(token, requestOrigin);
  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      emailVerificationToken: token,
      emailVerificationExpiresAt: createTokenExpiry(24)
    }
  });

  const emailDelivery = await sendUserVerificationEmail({
    to: user.email,
    fullName: user.fullName,
    token,
    baseUrl: requestOrigin
  }).catch((error) => {
    console.error("[verification-resend] email failed", error);
    return { delivered: false, skipped: false, error: true };
  });

  if (isDevelopment) {
    console.info(`[verification-resend] Development verification link for ${user.email}: ${verificationUrl}`);
  } else if (!emailDelivery.delivered) {
    console.error("[verification-resend] verification email was not delivered", {
      userId: user.id,
      email: user.email,
      skipped: emailDelivery.skipped
    });
    return NextResponse.json(
      { error: "לא הצלחנו לשלוח קישור אימות חדש. נסו שוב מאוחר יותר או פנו לתמיכה." },
      { status: 502 }
    );
  }

  await createAuditLog({
    actorUserId: user.id,
    action: "verification.email_resent",
    entityType: "User",
    entityId: user.id,
    metadata: {
      delivered: emailDelivery.delivered,
      skipped: emailDelivery.skipped
    }
  });

  return NextResponse.json({
    ok: true,
    message: isDevelopment
      ? "סביבת פיתוח: ניתן לאמת את המייל דרך הקישור הבא"
      : "נשלח קישור אימות חדש.",
    verificationUrl: isDevelopment ? verificationUrl : undefined
  });
}
