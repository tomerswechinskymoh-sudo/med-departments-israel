import { NextResponse } from "next/server";
import { authenticateUserWithStatus, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const invalidCredentialsMessage = "שם משתמש או סיסמא לא נכונים";
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: invalidCredentialsMessage }, { status: 403 });
  }

  const rateLimit = checkRateLimit(request, "auth:login", {
    limit: 8,
    windowMs: 15 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: invalidCredentialsMessage }, { status: 400 });
  }

  const result = await authenticateUserWithStatus(parsed.data.email, parsed.data.password);

  if (result.status === "email_unverified") {
    return NextResponse.json(
      {
        error: "יש לאמת את כתובת המייל לפני התחברות",
        code: "EMAIL_UNVERIFIED"
      },
      { status: 403 }
    );
  }

  if (result.status === "rejected") {
    return NextResponse.json(
      {
        error: "בקשת האימות נדחתה. יש להירשם מחדש או ליצור קשר עם contact@hitmachut.org.",
        code: "ACCOUNT_REJECTED"
      },
      { status: 403 }
    );
  }

  if (result.status !== "ok") {
    return NextResponse.json({ error: invalidCredentialsMessage }, { status: 401 });
  }

  await setSessionCookie(result.session);
  return NextResponse.json({ ok: true });
}
