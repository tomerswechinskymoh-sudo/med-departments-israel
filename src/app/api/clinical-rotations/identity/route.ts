import { NextResponse } from "next/server";
import { requireClinicalRotationStudentApiSession } from "@/lib/clinical-rotations";
import { submitClinicalRotationIdentityVerification } from "@/lib/clinical-rotations-privacy";
import { clinicalRotationIdentitySubmissionSchema } from "@/lib/clinical-rotations-validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import { readOptionalFormFile } from "@/lib/uploads";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "clinical-rotations:identity", { limit: 4, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfter);

  const auth = await requireClinicalRotationStudentApiSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "קלט לא תקין." }, { status: 400 });
  }

  const parsed = clinicalRotationIdentitySubmissionSchema.safeParse({
    israeliId: formData.get("israeliId")
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const document = readOptionalFormFile(formData.get("document"));
  if (!document) {
    return NextResponse.json({ error: "יש לצרף מסמך אימות." }, { status: 400 });
  }

  await submitClinicalRotationIdentityVerification({
    session: auth.session,
    rawIsraeliId: parsed.data.israeliId,
    document
  });

  return NextResponse.json({ ok: true });
}
