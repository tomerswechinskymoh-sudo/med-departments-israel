import { NextResponse } from "next/server";
import { authenticateUser, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const invalidCredentialsMessage = "שם משתמש או סיסמא לא נכונים";
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: invalidCredentialsMessage }, { status: 400 });
  }

  const session = await authenticateUser(parsed.data.email, parsed.data.password);

  if (!session) {
    return NextResponse.json({ error: invalidCredentialsMessage }, { status: 401 });
  }

  await setSessionCookie(session);
  return NextResponse.json({ ok: true });
}
