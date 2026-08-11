import { NextResponse } from "next/server";
import {
  createClinicalRotationAuditLog,
  parseClinicalRotationDate,
  requireClinicalRotationHospitalApiAccess
} from "@/lib/clinical-rotations";
import { clinicalRotationAvailabilityMutationSchema } from "@/lib/clinical-rotations-validation";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "clinical-rotations:hospital-availability", { limit: 30, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfter);

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = clinicalRotationAvailabilityMutationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const auth = await requireClinicalRotationHospitalApiAccess(parsed.data.hospitalId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (parsed.data.action === "deleteWindow" || parsed.data.action === "deleteBlackout") {
    if (!parsed.data.id) {
      return NextResponse.json({ error: "חסר מזהה למחיקה." }, { status: 400 });
    }

    const model = parsed.data.action === "deleteWindow" ? "window" : "blackout";
    const existing =
      model === "window"
        ? await prisma.clinicalRotationAvailabilityWindow.findUnique({ where: { id: parsed.data.id } })
        : await prisma.clinicalRotationBlackout.findUnique({ where: { id: parsed.data.id } });

    if (!existing || existing.hospitalId !== parsed.data.hospitalId) {
      return NextResponse.json({ error: "הרשומה לא נמצאה לבית החולים הזה." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      if (model === "window") {
        await tx.clinicalRotationAvailabilityWindow.delete({ where: { id: parsed.data.id! } });
      } else {
        await tx.clinicalRotationBlackout.delete({ where: { id: parsed.data.id! } });
      }

      await createClinicalRotationAuditLog(tx, {
        actorUserId: auth.session.userId,
        action: `clinical_rotation.availability_${model}_deleted`,
        entityType: model === "window" ? "ClinicalRotationAvailabilityWindow" : "ClinicalRotationBlackout",
        entityId: parsed.data.id,
        hospitalId: parsed.data.hospitalId
      });
    });

    return NextResponse.json({ ok: true });
  }

  const startsAt = parsed.data.startsAt ? parseClinicalRotationDate(parsed.data.startsAt) : null;
  const endsAt = parsed.data.endsAt ? parseClinicalRotationDate(parsed.data.endsAt) : null;

  if (!startsAt || !endsAt || endsAt < startsAt) {
    return NextResponse.json({ error: "טווח תאריכים לא תקין." }, { status: 400 });
  }

  if (parsed.data.action === "createWindow") {
    const window = await prisma.$transaction(async (tx) => {
      const created = await tx.clinicalRotationAvailabilityWindow.create({
        data: {
          hospitalId: parsed.data.hospitalId,
          startsAt,
          endsAt,
          notes: parsed.data.notes ?? null,
          createdByUserId: auth.session.userId
        }
      });
      await createClinicalRotationAuditLog(tx, {
        actorUserId: auth.session.userId,
        action: "clinical_rotation.availability_window_created",
        entityType: "ClinicalRotationAvailabilityWindow",
        entityId: created.id,
        hospitalId: created.hospitalId,
        metadata: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }
      });
      return created;
    });

    return NextResponse.json({ ok: true, id: window.id });
  }

  if (parsed.data.availabilityWindowId) {
    const window = await prisma.clinicalRotationAvailabilityWindow.findUnique({
      where: { id: parsed.data.availabilityWindowId },
      select: { hospitalId: true }
    });

    if (!window || window.hospitalId !== parsed.data.hospitalId) {
      return NextResponse.json({ error: "חלון הזמינות לא נמצא לבית החולים הזה." }, { status: 404 });
    }
  }

  const blackout = await prisma.$transaction(async (tx) => {
    const created = await tx.clinicalRotationBlackout.create({
      data: {
        hospitalId: parsed.data.hospitalId,
        availabilityWindowId: parsed.data.availabilityWindowId ?? null,
        startsAt,
        endsAt,
        reason: parsed.data.reason ?? null,
        createdByUserId: auth.session.userId
      }
    });
    await createClinicalRotationAuditLog(tx, {
      actorUserId: auth.session.userId,
      action: "clinical_rotation.blackout_created",
      entityType: "ClinicalRotationBlackout",
      entityId: created.id,
      hospitalId: created.hospitalId,
      metadata: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }
    });
    return created;
  });

  return NextResponse.json({ ok: true, id: blackout.id });
}
