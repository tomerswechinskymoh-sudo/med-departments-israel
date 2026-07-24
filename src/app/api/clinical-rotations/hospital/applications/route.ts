import { NextResponse } from "next/server";
import {
  approveClinicalRotationApplication,
  requireClinicalRotationHospitalApiAccess,
  updateClinicalRotationApplicationStatus
} from "@/lib/clinical-rotations";
import { clinicalRotationApplicationActionSchema } from "@/lib/clinical-rotations-validation";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = clinicalRotationApplicationActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const application = await prisma.clinicalRotationApplication.findUnique({
    where: { id: parsed.data.applicationId },
    select: { hospitalId: true }
  });

  if (!application) {
    return NextResponse.json({ error: "הבקשה לא נמצאה." }, { status: 404 });
  }

  const auth = await requireClinicalRotationHospitalApiAccess(application.hospitalId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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
          notes: parsed.data.notes
        });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
