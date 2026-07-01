import { NextResponse } from "next/server";
import {
  clearElectiveDepartmentSessionCookie,
  isElectiveDepartmentPortalEnabled,
  requireElectiveDepartmentApiSession
} from "@/lib/elective-department-auth";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!isElectiveDepartmentPortalEnabled()) {
    return NextResponse.json({ error: "פורטל המחלקות לא פעיל כרגע." }, { status: 404 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const auth = await requireElectiveDepartmentApiSession();

  if (auth.status === "unauthorized") {
    return NextResponse.json({ error: "יש להתחבר מחדש." }, { status: 401 });
  }

  if (auth.status === "disabled") {
    return NextResponse.json({ error: "פורטל המחלקות לא פעיל כרגע." }, { status: 404 });
  }

  await clearElectiveDepartmentSessionCookie();

  return NextResponse.json({ ok: true, redirectTo: "/electives/department-login" });
}
