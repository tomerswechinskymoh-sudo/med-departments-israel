import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { importClinicalRotationEligibilityList } from "@/lib/clinical-rotations-privacy";
import { clinicalRotationEligibilityImportSchema } from "@/lib/clinical-rotations-validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import { readOptionalFormFile } from "@/lib/uploads";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "admin:clinical-rotations:eligibility-imports", { limit: 6, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfter);

  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "קלט לא תקין." }, { status: 400 });

  const parsed = clinicalRotationEligibilityImportSchema.safeParse({
    sourceLabel: formData.get("sourceLabel"),
    activate: formData.get("activate") !== "false"
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const file = readOptionalFormFile(formData.get("file"));
  if (!file) return NextResponse.json({ error: "יש לצרף קובץ CSV או XLSX." }, { status: 400 });

  const result = await importClinicalRotationEligibilityList({
    session,
    file,
    sourceLabel: parsed.data.sourceLabel,
    activate: parsed.data.activate
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, importId: result.import.id });
}
