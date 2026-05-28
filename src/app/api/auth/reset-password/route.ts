import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import { resetPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const rateLimit = checkRateLimit(request, "auth:reset-password", {
    limit: 8,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "קלט לא תקין." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      verificationToken: parsed.data.token
    }
  });

  if (!user || !user.tokenExpiry || user.tokenExpiry < new Date()) {
    return NextResponse.json(
      { error: "קישור האיפוס אינו תקין או שפג תוקפו." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      verificationToken: null,
      tokenExpiry: null
    }
  });

  return NextResponse.json({ ok: true });
}
