import { NextResponse } from "next/server";
import {
  createOrUpdateClinicalRotationCoreRule,
  parseClinicalRotationDate,
  requireClinicalRotationAdminApiSession
} from "@/lib/clinical-rotations";
import { clinicalRotationCoreRuleSchema } from "@/lib/clinical-rotations-validation";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const auth = await requireClinicalRotationAdminApiSession();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = clinicalRotationCoreRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const effectiveDate = parseClinicalRotationDate(parsed.data.effectiveDate);

  if (!effectiveDate) {
    return NextResponse.json({ error: "תאריך תחולה לא תקין." }, { status: 400 });
  }

  const rule = await createOrUpdateClinicalRotationCoreRule({
    session: auth.session,
    coreSpecialty: parsed.data.coreSpecialty,
    specialtyId: parsed.data.specialtyId,
    maxWeeks: parsed.data.maxWeeks,
    effectiveDate,
    enforcementMode: parsed.data.enforcementMode,
    isActive: parsed.data.isActive,
    notes: parsed.data.notes
  });

  return NextResponse.json({ ok: true, ruleId: rule.id });
}
