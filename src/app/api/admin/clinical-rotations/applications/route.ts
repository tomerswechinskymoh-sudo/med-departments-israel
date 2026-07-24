import { NextResponse } from "next/server";
import {
  approveClinicalRotationApplication,
  requireClinicalRotationAdminApiSession,
  updateClinicalRotationApplicationStatus
} from "@/lib/clinical-rotations";
import { clinicalRotationAdminApplicationOverrideSchema } from "@/lib/clinical-rotations-validation";
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
  const parsed = clinicalRotationAdminApplicationOverrideSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const result =
    parsed.data.action === "approve"
      ? await approveClinicalRotationApplication({
          session: auth.session,
          applicationId: parsed.data.applicationId,
          hospitalNotes: parsed.data.notes
        })
      : await updateClinicalRotationApplicationStatus({
          session: auth.session,
          applicationId: parsed.data.applicationId,
          status:
            parsed.data.action === "decline"
              ? "DECLINED"
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
