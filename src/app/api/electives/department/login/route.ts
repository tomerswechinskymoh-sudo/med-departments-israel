import { NextResponse } from "next/server";
import {
  authenticateElectiveDepartmentAccount,
  isElectiveDepartmentPortalEnabled,
  setElectiveDepartmentSessionCookie
} from "@/lib/elective-department-auth";
import { hasValidSameOrigin } from "@/lib/security";
import { electiveDepartmentPortalLoginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isElectiveDepartmentPortalEnabled()) {
    return NextResponse.json({ error: "פורטל המחלקות לא פעיל כרגע." }, { status: 404 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = electiveDepartmentPortalLoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const result = await authenticateElectiveDepartmentAccount(parsed.data.username, parsed.data.password);

  if (result.status === "disabled") {
    return NextResponse.json({ error: "פורטל המחלקות לא פעיל כרגע." }, { status: 404 });
  }

  if (result.status !== "ok") {
    return NextResponse.json({ error: "שם משתמש או סיסמה אינם תקינים." }, { status: 401 });
  }

  await setElectiveDepartmentSessionCookie(result.session);

  return NextResponse.json({
    ok: true,
    redirectTo: "/electives/department"
  });
}
