import { NextResponse } from "next/server";
import { ClinicalRotationOfferingStatus } from "@prisma/client";
import {
  createClinicalRotationAuditLog,
  createClinicalRotationOffering,
  parseClinicalRotationDate,
  requireClinicalRotationHospitalApiAccess,
  updateClinicalRotationOfferingStatus
} from "@/lib/clinical-rotations";
import { inferClinicalRotationCoreSpecialty, validateClinicalRotationOfferingPublishInput } from "@/lib/clinical-rotations-shared";
import {
  clinicalRotationOfferingMutationSchema,
  clinicalRotationOfferingStatusSchema
} from "@/lib/clinical-rotations-validation";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "clinical-rotations:hospital-offerings", { limit: 20, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfter);

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  if (body?.action === "publish" || body?.action === "pause" || body?.action === "close" || body?.action === "cancel") {
    const parsedStatus = clinicalRotationOfferingStatusSchema.safeParse(body);

    if (!parsedStatus.success) {
      return NextResponse.json({ error: parsedStatus.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
    }

    const sessionAuth = await requireClinicalRotationHospitalApiAccess(
      (await prisma.clinicalRotationOffering.findUnique({
        where: { id: parsedStatus.data.offeringId },
        select: { hospitalId: true }
      }))?.hospitalId ?? ""
    );

    if (!sessionAuth.ok) {
      return NextResponse.json({ error: sessionAuth.error }, { status: sessionAuth.status });
    }

    const result = await updateClinicalRotationOfferingStatus({
      session: sessionAuth.session,
      offeringId: parsedStatus.data.offeringId,
      action: parsedStatus.data.action
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  }

  const parsed = clinicalRotationOfferingMutationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const startsAt = parseClinicalRotationDate(parsed.data.startsAt);
  const endsAt = parseClinicalRotationDate(parsed.data.endsAt);

  if (!startsAt || !endsAt) {
    return NextResponse.json({ error: "תאריכים לא תקינים." }, { status: 400 });
  }

  const auth = await requireClinicalRotationHospitalApiAccess(parsed.data.hospitalId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!parsed.data.offeringId) {
    const result = await createClinicalRotationOffering({
      session: auth.session,
      hospitalId: parsed.data.hospitalId,
      specialtyId: parsed.data.specialtyId,
      departmentId: parsed.data.departmentId,
      displayName: parsed.data.displayName,
      startsAt,
      endsAt,
      minimumParticipants: parsed.data.minimumParticipants,
      maximumCapacity: parsed.data.maximumCapacity,
      minDurationWeeks: parsed.data.minDurationWeeks,
      maxDurationWeeks: parsed.data.maxDurationWeeks,
      priceAmount: parsed.data.priceAmount,
      priceUnit: parsed.data.priceUnit,
      paymentMethod: parsed.data.paymentMethod,
      paymentLink: parsed.data.paymentLink,
      requirements: parsed.data.requirements,
      cancellationPolicy: parsed.data.cancellationPolicy,
      workLanguage: parsed.data.workLanguage,
      departmentContactName: parsed.data.departmentContactName,
      departmentContactEmail: parsed.data.departmentContactEmail,
      requiresDeanApproval: parsed.data.requiresDeanApproval,
      requiresInsurance: parsed.data.requiresInsurance,
      groupRegistrationEnabled: parsed.data.groupRegistrationEnabled,
      groupMinSize: parsed.data.groupMinSize,
      groupMaxSize: parsed.data.groupMaxSize,
      isPreviewOnly: parsed.data.isPreviewOnly,
      applicationBlockedReason: parsed.data.applicationBlockedReason,
      studentInstructions: parsed.data.studentInstructions,
      internalNotes: parsed.data.internalNotes,
      publish: parsed.data.publish
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, offeringId: result.offering.id, slug: result.offering.slug });
  }

  const existing = await prisma.clinicalRotationOffering.findUnique({
    where: { id: parsed.data.offeringId },
    select: { id: true, hospitalId: true, status: true }
  });

  if (!existing || existing.hospitalId !== parsed.data.hospitalId) {
    return NextResponse.json({ error: "הסבב לא נמצא לבית החולים הזה." }, { status: 404 });
  }

  const [specialty, department, windows, blackouts] = await Promise.all([
    prisma.specialty.findUnique({ where: { id: parsed.data.specialtyId }, select: { id: true, name: true } }),
    parsed.data.departmentId
      ? prisma.department.findUnique({ where: { id: parsed.data.departmentId }, select: { id: true, institutionId: true } })
      : Promise.resolve(null),
    prisma.clinicalRotationAvailabilityWindow.findMany({ where: { hospitalId: parsed.data.hospitalId }, select: { startsAt: true, endsAt: true } }),
    prisma.clinicalRotationBlackout.findMany({ where: { hospitalId: parsed.data.hospitalId }, select: { startsAt: true, endsAt: true } })
  ]);

  if (!specialty) {
    return NextResponse.json({ error: "תחום לא נמצא." }, { status: 400 });
  }

  if (department && department.institutionId !== parsed.data.hospitalId) {
    return NextResponse.json({ error: "המחלקה אינה שייכת לבית החולים הזה." }, { status: 403 });
  }

  const nextStatus = parsed.data.publish ? ClinicalRotationOfferingStatus.PUBLISHED : existing.status;
  if (nextStatus === ClinicalRotationOfferingStatus.PUBLISHED) {
    const validation = validateClinicalRotationOfferingPublishInput({
      hospitalId: parsed.data.hospitalId,
      specialtyId: parsed.data.specialtyId,
      displayName: parsed.data.displayName,
      startsAt,
      endsAt,
      minimumParticipants: parsed.data.minimumParticipants,
      maximumCapacity: parsed.data.maximumCapacity,
      minDurationWeeks: parsed.data.minDurationWeeks,
      maxDurationWeeks: parsed.data.maxDurationWeeks,
      priceAmount: parsed.data.priceAmount,
      paymentMethod: parsed.data.paymentMethod,
      paymentLink: parsed.data.paymentLink,
      requirements: parsed.data.requirements,
      cancellationPolicy: parsed.data.cancellationPolicy,
      groupRegistrationEnabled: parsed.data.groupRegistrationEnabled,
      groupMinSize: parsed.data.groupMinSize,
      groupMaxSize: parsed.data.groupMaxSize,
      isPreviewOnly: parsed.data.isPreviewOnly,
      openWindows: windows,
      blackouts
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.clinicalRotationOffering.update({
      where: { id: existing.id },
      data: {
        specialtyId: parsed.data.specialtyId,
        departmentId: parsed.data.departmentId ?? null,
        coreSpecialty: inferClinicalRotationCoreSpecialty(specialty.name),
        displayName: parsed.data.displayName.trim(),
        startsAt,
        endsAt,
        minimumParticipants: parsed.data.minimumParticipants,
        maximumCapacity: parsed.data.maximumCapacity ?? null,
        minDurationWeeks: parsed.data.minDurationWeeks,
        maxDurationWeeks: parsed.data.maxDurationWeeks,
        priceAmount: parsed.data.priceAmount,
        priceUnit: parsed.data.priceUnit,
        paymentMethod: parsed.data.paymentMethod,
        paymentLink: parsed.data.paymentMethod === "EXTERNAL_PAYMENT_LINK" ? parsed.data.paymentLink ?? null : null,
        requirements: parsed.data.requirements ?? null,
        cancellationPolicy: parsed.data.cancellationPolicy ?? null,
        workLanguage: parsed.data.workLanguage ?? null,
        departmentContactName: parsed.data.departmentContactName ?? null,
        departmentContactEmail: parsed.data.departmentContactEmail ?? null,
        requiresDeanApproval: parsed.data.requiresDeanApproval,
        requiresInsurance: parsed.data.requiresInsurance,
        groupRegistrationEnabled: parsed.data.groupRegistrationEnabled,
        groupMinSize: parsed.data.groupRegistrationEnabled ? parsed.data.groupMinSize ?? null : null,
        groupMaxSize: parsed.data.groupRegistrationEnabled ? parsed.data.groupMaxSize ?? null : null,
        isPreviewOnly: parsed.data.isPreviewOnly,
        applicationBlockedReason: parsed.data.applicationBlockedReason ?? null,
        studentInstructions: parsed.data.studentInstructions ?? null,
        internalNotes: parsed.data.internalNotes ?? null,
        status: nextStatus,
        ...(parsed.data.publish ? { publishedAt: new Date(), pausedAt: null, closedAt: null } : {}),
        updatedByUserId: auth.session.userId
      }
    });
    await createClinicalRotationAuditLog(tx, {
      actorUserId: auth.session.userId,
      action: "clinical_rotation.offering_updated",
      entityType: "ClinicalRotationOffering",
      entityId: updated.id,
      hospitalId: updated.hospitalId,
      offeringId: updated.id,
      metadata: { status: updated.status }
    });
  });

  return NextResponse.json({ ok: true, offeringId: existing.id });
}
