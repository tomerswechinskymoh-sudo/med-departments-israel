import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
