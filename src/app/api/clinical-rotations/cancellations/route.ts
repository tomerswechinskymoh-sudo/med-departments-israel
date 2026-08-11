import { NextResponse } from "next/server";
import {
  requireClinicalRotationStudentApiSession,
  requestClinicalRotationCancellation
} from "@/lib/clinical-rotations";
import { clinicalRotationCancellationRequestSchema } from "@/lib/clinical-rotations-validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "clinical-rotations:cancellations", { limit: 8, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfter);

  const auth = await requireClinicalRotationStudentApiSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = clinicalRotationCancellationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const result = await requestClinicalRotationCancellation({
    session: auth.session,
    applicationId: parsed.data.applicationId,
    reasonCategory: parsed.data.reasonCategory,
    note: parsed.data.note
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, cancellationId: result.cancellation.id });
}
