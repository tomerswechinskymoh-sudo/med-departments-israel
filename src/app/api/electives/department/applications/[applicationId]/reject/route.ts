import { NextResponse } from "next/server";
import { requireElectiveDepartmentApiSession } from "@/lib/elective-department-auth";
import { updateRepresentativeApplicationDecision } from "@/lib/elective-representative-applications";
import { hasValidSameOrigin } from "@/lib/security";
import { electiveRepresentativeApplicationActionSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const auth = await requireElectiveDepartmentApiSession();

  if (auth.status === "disabled") {
    return NextResponse.json({ error: "פורטל המחלקות לא פעיל כרגע." }, { status: 404 });
  }

  if (auth.status === "unauthorized") {
    return NextResponse.json({ error: "יש להתחבר מחדש." }, { status: 401 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = electiveRepresentativeApplicationActionSchema.safeParse({ ...(body ?? {}), applicationId: (await params).applicationId });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const result = await updateRepresentativeApplicationDecision({
    session: auth.session,
    applicationId: parsed.data.applicationId,
    status: "REJECTED",
    representativeNotes: parsed.data.representativeNotes
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, message: "המועמדות נדחתה." });
}
