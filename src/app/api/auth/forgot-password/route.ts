import { NextResponse } from "next/server";
import {
  createPasswordResetExpiry,
  createPasswordResetToken,
  getPasswordResetUrl,
  sendPasswordResetEmail
} from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import { forgotPasswordSchema } from "@/lib/validation";
import { isDevelopmentEnvironment } from "@/lib/verification";

const genericMessage = "אם קיים חשבון עם האימייל הזה, נשלח קישור לאיפוס סיסמה.";

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const rateLimit = checkRateLimit(request, "auth:forgot-password", {
    limit: 5,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "יש להזין כתובת אימייל תקינה." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: {
      email
    }
  });

  if (!user) {
    return NextResponse.json({ ok: true, message: genericMessage });
  }

  const token = createPasswordResetToken();
  const requestOrigin = new URL(request.url).origin;
  const resetUrl = getPasswordResetUrl(token, requestOrigin);

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      verificationToken: token,
      tokenExpiry: createPasswordResetExpiry()
    }
  });

  const emailDelivery = await sendPasswordResetEmail({
    to: user.email,
    fullName: user.fullName,
    token,
    baseUrl: requestOrigin
  }).catch((error) => {
    console.error("[forgot-password] reset email failed", {
      userId: user.id,
      email: user.email,
      error
    });
    return { delivered: false, skipped: false };
  });

  if (isDevelopmentEnvironment()) {
    console.info(`[forgot-password] Development reset link for ${user.email}: ${resetUrl}`);
  } else if (!emailDelivery.delivered) {
    return NextResponse.json(
      { error: "לא הצלחנו לשלוח קישור איפוס כרגע. נסו שוב בעוד כמה דקות." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: genericMessage,
    resetUrl: isDevelopmentEnvironment() ? resetUrl : undefined
  });
}
