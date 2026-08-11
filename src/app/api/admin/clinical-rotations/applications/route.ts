import { NextResponse } from "next/server";
import {
  approveClinicalRotationApplication,
  decideClinicalRotationCancellation,
  requireClinicalRotationAdminApiSession,
  updateClinicalRotationApplicationStatus
} from "@/lib/clinical-rotations";
import { clinicalRotationAdminApplicationOverrideSchema } from "@/lib/clinical-rotations-validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "admin:clinical-rotations:applications", { limit: 40, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfter);

  const auth = await requireClinicalRotationAdminApiSession();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = clinicalRotationAdminApplicationOverrideSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  if (!parsed.data.notes?.trim()) {
    return NextResponse.json({ error: "פעולה מנהלית מחייבת סיבה." }, { status: 400 });
  }

  const result =
    parsed.data.action === "approve"
      ? await approveClinicalRotationApplication({
          session: auth.session,
          applicationId: parsed.data.applicationId,
          hospitalNotes: parsed.data.notes
        })
      : parsed.data.action === "approveCancellation" || parsed.data.action === "rejectCancellation"
        ? await decideClinicalRotationCancellation({
            session: auth.session,
            applicationId: parsed.data.applicationId,
            approved: parsed.data.action === "approveCancellation",
            notes: parsed.data.notes
          })
      : await updateClinicalRotationApplicationStatus({
          session: auth.session,
          applicationId: parsed.data.applicationId,
          status:
            parsed.data.action === "decline"
              ? "DECLINED"
              : parsed.data.action === "waitlist"
                ? "WAITLISTED"
              : parsed.data.action === "cancel"
                ? "CANCELLED"
                : "COMPLETED",
          notes: parsed.data.notes,
          adminOverride: true
        });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
