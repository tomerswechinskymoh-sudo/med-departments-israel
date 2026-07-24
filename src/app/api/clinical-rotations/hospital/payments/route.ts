import { NextResponse } from "next/server";
import {
  requireClinicalRotationHospitalApiAccess,
  updateClinicalRotationPaymentStatus
} from "@/lib/clinical-rotations";
import { clinicalRotationPaymentActionSchema } from "@/lib/clinical-rotations-validation";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = clinicalRotationPaymentActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const payment = await prisma.clinicalRotationPayment.findUnique({
    where: { id: parsed.data.paymentId },
    select: { application: { select: { hospitalId: true } } }
  });

  if (!payment) {
    return NextResponse.json({ error: "רשומת התשלום לא נמצאה." }, { status: 404 });
  }

  const auth = await requireClinicalRotationHospitalApiAccess(payment.application.hospitalId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await updateClinicalRotationPaymentStatus({
    session: auth.session,
    paymentId: parsed.data.paymentId,
    status: parsed.data.status,
    notes: parsed.data.notes
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
