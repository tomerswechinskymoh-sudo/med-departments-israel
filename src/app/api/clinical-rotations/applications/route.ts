import { NextResponse } from "next/server";
import {
  parseClinicalRotationDate,
  requireClinicalRotationStudentApiSession,
  submitClinicalRotationApplication
} from "@/lib/clinical-rotations";
import { clinicalRotationApplicationSubmissionSchema } from "@/lib/clinical-rotations-validation";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const auth = await requireClinicalRotationStudentApiSession();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = clinicalRotationApplicationSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const requestedStartAt = parseClinicalRotationDate(parsed.data.requestedStartAt);
  const requestedEndAt = parseClinicalRotationDate(parsed.data.requestedEndAt);

  if (!requestedStartAt || !requestedEndAt) {
    return NextResponse.json({ error: "תאריכים לא תקינים." }, { status: 400 });
  }

  const result = await submitClinicalRotationApplication({
    session: auth.session,
    offeringId: parsed.data.offeringId,
    requestedStartAt,
    requestedEndAt,
    studentNotes: parsed.data.studentNotes
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    applicationId: result.application.id,
    warning: result.warning
  });
}
