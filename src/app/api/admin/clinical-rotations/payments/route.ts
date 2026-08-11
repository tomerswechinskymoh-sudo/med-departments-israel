import { NextResponse } from "next/server";
import {
  requireClinicalRotationAdminApiSession,
  retryClinicalRotationPaymentLink,
  updateClinicalRotationPaymentStatus
} from "@/lib/clinical-rotations";
import { clinicalRotationAdminPaymentOverrideSchema } from "@/lib/clinical-rotations-validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "admin:clinical-rotations:payments", { limit: 40, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfter);

  const auth = await requireClinicalRotationAdminApiSession();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = clinicalRotationAdminPaymentOverrideSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  if (parsed.data.action !== "retryPaymentLink" && !parsed.data.notes?.trim()) {
    return NextResponse.json({ error: "עדכון תשלום מנהלי מחייב סיבה." }, { status: 400 });
  }

  const result = parsed.data.action === "retryPaymentLink"
    ? await retryClinicalRotationPaymentLink({
        session: auth.session,
        paymentId: parsed.data.paymentId,
        adminOverride: true
      })
    : await updateClinicalRotationPaymentStatus({
        session: auth.session,
        paymentId: parsed.data.paymentId,
        status: parsed.data.status!,
        notes: parsed.data.notes,
        adminOverride: true
      });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
