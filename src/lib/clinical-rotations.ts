import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import {
  ClinicalRotationApplicationStatus,
  ClinicalRotationCancellationActorType,
  ClinicalRotationCancellationReasonCategory,
  ClinicalRotationCancellationStatus,
  ClinicalRotationGroupMemberStatus,
  ClinicalRotationGroupStatus,
  ClinicalRotationIdentityVerificationStatus,
  ClinicalRotationNotificationOutboxStatus,
  ClinicalRotationNotificationOutboxType,
  ClinicalRotationOfferingStatus,
  ClinicalRotationPaymentMethod,
  ClinicalRotationPaymentStatus,
  InstitutionType,
  Prisma,
  RoleKey,
  VerificationStatus
} from "@prisma/client";
import { getSession, type AppSession } from "@/lib/auth";
import {
  buildClinicalRotationPaymentLinkEmailPayload,
  canManageClinicalRotationHospital,
  clinicalRotationApplicationStatusLabels,
  clinicalRotationCoreSpecialtyLabels,
  clinicalRotationPaymentMethodLabels,
  clinicalRotationPaymentStatusLabels,
  clinicalRotationPriceUnitLabels,
  clinicalRotationWeeksInclusive,
  evaluateClinicalRotationCoreLimit,
  formatClinicalRotationDateInput,
  inferClinicalRotationCoreSpecialty,
  isClinicalRotationDateRangeAllowed,
  parseClinicalRotationDate,
  summarizeClinicalRotationDashboard,
  validateClinicalRotationOfferingPublishInput,
  type ClinicalRotationCoreSpecialtyValue
} from "@/lib/clinical-rotations-shared";
import {
  createClinicalRotationInviteToken,
  getClinicalRotationEligibilityState,
  hashClinicalRotationInviteToken
} from "@/lib/clinical-rotations-privacy";
import { getBaseUrl, sendTransactionalEmail } from "@/lib/services/email";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

type SearchParamValue = string | string[] | undefined;

export type ClinicalRotationHospitalPortalContext = {
  session: AppSession;
  isAdmin: boolean;
  hospitals: Array<{ id: string; name: string; slug: string; city: string | null; region: string | null }>;
  selectedHospital: { id: string; name: string; slug: string; city: string | null; region: string | null };
};

export function firstClinicalRotationParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function splitClinicalRotationParam(value: SearchParamValue) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(
    new Set(values.flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter(Boolean))
  );
}

export function parseClinicalRotationSearch(input?: Record<string, SearchParamValue>) {
  return {
    hospitalIds: splitClinicalRotationParam(input?.hospitalIds ?? input?.hospital),
    specialtyIds: splitClinicalRotationParam(input?.specialtyIds ?? input?.specialty),
    start: firstClinicalRotationParam(input?.start)?.trim() ?? "",
    end: firstClinicalRotationParam(input?.end)?.trim() ?? "",
    region: firstClinicalRotationParam(input?.region)?.trim() ?? "",
    durationWeeks: firstClinicalRotationParam(input?.durationWeeks)?.trim() ?? "",
    maxPrice: firstClinicalRotationParam(input?.maxPrice)?.trim() ?? "",
    paymentMethod: firstClinicalRotationParam(input?.paymentMethod)?.trim() ?? "",
    groupOnly: firstClinicalRotationParam(input?.groupOnly) === "1",
    search: firstClinicalRotationParam(input?.search)?.trim() ?? ""
  };
}

export function clinicalRotationDateRangeLabel(start: Date, end: Date) {
  return `${formatClinicalRotationDateInput(start)} - ${formatClinicalRotationDateInput(end)}`;
}

export function clinicalRotationMoneyLabel(amount: Prisma.Decimal | number | string, currency = "ILS") {
  const value = Number(amount);
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);
}

export function clinicalRotationPriceLabel(input: {
  priceAmount: Prisma.Decimal | number | string;
  priceCurrency: string;
  priceUnit: string;
}) {
  const unitLabel =
    input.priceUnit === "TOTAL"
      ? clinicalRotationPriceUnitLabels.TOTAL
      : clinicalRotationPriceUnitLabels.PER_WEEK;
  return `${clinicalRotationMoneyLabel(input.priceAmount, input.priceCurrency)} ${unitLabel}`;
}

function createClinicalRotationSlug(input: { hospitalSlug: string; specialtySlug?: string | null; displayName: string }) {
  const base = slugify(`${input.hospitalSlug}-${input.specialtySlug ?? ""}-${input.displayName}`) || "clinical-rotation";
  return `${base}-${randomUUID().slice(0, 8)}`;
}

export async function createClinicalRotationAuditLog(
  tx: Prisma.TransactionClient | typeof prisma,
  input: {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    hospitalId?: string | null;
    offeringId?: string | null;
    applicationId?: string | null;
    groupId?: string | null;
    cancellationId?: string | null;
    paymentId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }
) {
  await tx.clinicalRotationAuditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      hospitalId: input.hospitalId ?? null,
      offeringId: input.offeringId ?? null,
      applicationId: input.applicationId ?? null,
      groupId: input.groupId ?? null,
      cancellationId: input.cancellationId ?? null,
      paymentId: input.paymentId ?? null,
      metadata: input.metadata
    }
  });
}

async function lockClinicalRotationStudentIdentity(
  tx: Prisma.TransactionClient,
  input: { studentAnonymousKey: string; keyVersion: number }
) {
  await tx.$queryRaw`
    SELECT "id"
    FROM "ClinicalRotationStudentIdentity"
    WHERE "student_anonymous_key" = ${input.studentAnonymousKey}
      AND "key_version" = ${input.keyVersion}
    FOR UPDATE
  `;
}

async function findClinicalRotationDateConflict(
  tx: Prisma.TransactionClient | typeof prisma,
  input: {
    studentAnonymousKey: string;
    keyVersion: number;
    requestedStartAt: Date;
    requestedEndAt: Date;
    excludeApplicationIds?: string[];
  }
) {
  return tx.clinicalRotationApplication.findFirst({
    where: {
      studentAnonymousKey: input.studentAnonymousKey,
      keyVersion: input.keyVersion,
      status: { in: clinicalRotationApplicationBlockingStatuses() },
      requestedStartAt: { lte: input.requestedEndAt },
      requestedEndAt: { gte: input.requestedStartAt },
      ...(input.excludeApplicationIds?.length ? { id: { notIn: input.excludeApplicationIds } } : {})
    },
    select: { id: true }
  });
}

function clinicalRotationPaymentLinkDeliveryErrorCategory(error: unknown) {
  if (!(error instanceof Error)) return "UNKNOWN";
  if (error.message.includes("Missing RESEND_API_KEY") || error.message.includes("Missing EMAIL_FROM")) {
    return "EMAIL_PROVIDER_NOT_CONFIGURED";
  }
  if (error.message.includes("Skipping delivery")) return "EMAIL_DELIVERY_SKIPPED";
  return "EMAIL_DELIVERY_FAILED";
}

async function enqueueClinicalRotationPaymentLinkEmail(
  tx: Prisma.TransactionClient,
  input: {
    paymentId: string;
    applicationId: string;
    hospitalId: string;
    offeringId: string;
    groupId?: string | null;
    actorUserId?: string | null;
  }
) {
  await tx.clinicalRotationNotificationOutbox.upsert({
    where: {
      type_paymentId: {
        type: ClinicalRotationNotificationOutboxType.PAYMENT_LINK_EMAIL,
        paymentId: input.paymentId
      }
    },
    create: {
      type: ClinicalRotationNotificationOutboxType.PAYMENT_LINK_EMAIL,
      status: ClinicalRotationNotificationOutboxStatus.PENDING,
      paymentId: input.paymentId,
      applicationId: input.applicationId,
      hospitalId: input.hospitalId,
      offeringId: input.offeringId,
      groupId: input.groupId ?? null,
      createdByUserId: input.actorUserId ?? null,
      metadata: { purpose: "payment_link_email" }
    },
    update: {
      status: ClinicalRotationNotificationOutboxStatus.PENDING,
      lockedAt: null,
      nextAttemptAt: null,
      failedAt: null,
      lastErrorCategory: null,
      createdByUserId: input.actorUserId ?? null
    }
  });
}

export async function deliverClinicalRotationPaymentLink(input: {
  paymentId: string;
  actorUserId?: string | null;
}) {
  const now = new Date();
  const claim = await prisma.$transaction(async (tx) => {
    const outbox = await tx.clinicalRotationNotificationOutbox.findFirst({
      where: {
        type: ClinicalRotationNotificationOutboxType.PAYMENT_LINK_EMAIL,
        paymentId: input.paymentId
      },
      select: { id: true }
    });

    if (!outbox) {
      return { action: "missing" as const };
    }

    await tx.$queryRaw`SELECT "id" FROM "ClinicalRotationNotificationOutbox" WHERE "id" = ${outbox.id} FOR UPDATE`;
    const locked = await tx.clinicalRotationNotificationOutbox.findUnique({
      where: { id: outbox.id },
      include: {
        payment: {
          include: {
            application: {
              include: {
                studentUser: { select: { fullName: true, email: true } },
                hospital: { select: { name: true } },
                offering: true
              }
            }
          }
        }
      }
    });

    if (!locked?.payment || locked.status === ClinicalRotationNotificationOutboxStatus.SENT) {
      return { action: "already_done" as const };
    }

    if (
      locked.status === ClinicalRotationNotificationOutboxStatus.PROCESSING &&
      locked.lockedAt &&
      now.getTime() - locked.lockedAt.getTime() < 5 * 60 * 1000
    ) {
      return { action: "in_progress" as const };
    }

    await tx.clinicalRotationNotificationOutbox.update({
      where: { id: locked.id },
      data: {
        status: ClinicalRotationNotificationOutboxStatus.PROCESSING,
        lockedAt: now,
        nextAttemptAt: null,
        attemptCount: { increment: 1 },
        lastErrorCategory: null
      }
    });

    return { action: "send" as const, outboxId: locked.id, payment: locked.payment };
  });

  if (claim.action !== "send") {
    return { ok: true as const, status: claim.action };
  }

  const { payment } = claim;
  const application = payment.application;
  if (!payment.paymentLink || payment.method !== ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK) {
    await prisma.$transaction(async (tx) => {
      await tx.clinicalRotationNotificationOutbox.update({
        where: { id: claim.outboxId },
        data: {
          status: ClinicalRotationNotificationOutboxStatus.FAILED,
          lockedAt: null,
          failedAt: new Date(),
          lastErrorCategory: "PAYMENT_LINK_MISSING",
          nextAttemptAt: new Date(Date.now() + 60 * 60 * 1000)
        }
      });
      await tx.clinicalRotationPayment.update({
        where: { id: payment.id },
        data: { status: ClinicalRotationPaymentStatus.LINK_DELIVERY_FAILED }
      });
    });
    return { ok: false as const, status: "failed" as const, errorCategory: "PAYMENT_LINK_MISSING" };
  }

  const dashboardUrl = `${getBaseUrl().replace(/\/$/, "")}/clinical-rotations/my-rotations`;
  const emailPayload = buildClinicalRotationPaymentLinkEmailPayload({
    studentName: application.studentUser.fullName,
    studentEmail: application.studentUser.email,
    hospitalName: application.hospital.name,
    offeringName: application.offering.displayName,
    dateRange: clinicalRotationDateRangeLabel(application.requestedStartAt, application.requestedEndAt),
    amountLabel: clinicalRotationPriceLabel(application.offering),
    paymentLink: payment.paymentLink,
    dashboardUrl
  });

  try {
    const emailResult = await sendTransactionalEmail(emailPayload);
    if (!emailResult.delivered) {
      throw new Error(emailResult.skipped ? "Email delivery skipped in local environment." : "Email delivery was not confirmed.");
    }

    const sentAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.clinicalRotationPayment.update({
        where: { id: payment.id },
        data: {
          status: ClinicalRotationPaymentStatus.LINK_SENT,
          linkSentAt: sentAt,
          updatedByUserId: input.actorUserId ?? payment.updatedByUserId
        }
      });
      await tx.clinicalRotationNotificationOutbox.update({
        where: { id: claim.outboxId },
        data: {
          status: ClinicalRotationNotificationOutboxStatus.SENT,
          lockedAt: null,
          sentAt,
          failedAt: null,
          nextAttemptAt: null,
          lastErrorCategory: null
        }
      });
      await createClinicalRotationAuditLog(tx, {
        actorUserId: input.actorUserId ?? null,
        action: "clinical_rotation.payment_link_sent",
        entityType: "ClinicalRotationPayment",
        entityId: payment.id,
        hospitalId: application.hospitalId,
        offeringId: application.offeringId,
        applicationId: application.id,
        groupId: application.groupId,
        paymentId: payment.id,
        metadata: { delivered: true, outboxId: claim.outboxId }
      });
    });

    return { ok: true as const, status: "sent" as const };
  } catch (error) {
    const errorCategory = clinicalRotationPaymentLinkDeliveryErrorCategory(error);
    const retryAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.$transaction(async (tx) => {
      await tx.clinicalRotationPayment.update({
        where: { id: payment.id },
        data: {
          status: ClinicalRotationPaymentStatus.LINK_DELIVERY_FAILED,
          linkSentAt: null,
          updatedByUserId: input.actorUserId ?? payment.updatedByUserId
        }
      });
      await tx.clinicalRotationNotificationOutbox.update({
        where: { id: claim.outboxId },
        data: {
          status: ClinicalRotationNotificationOutboxStatus.FAILED,
          lockedAt: null,
          failedAt: new Date(),
          nextAttemptAt: retryAt,
          lastErrorCategory: errorCategory
        }
      });
      await createClinicalRotationAuditLog(tx, {
        actorUserId: input.actorUserId ?? null,
        action: "clinical_rotation.payment_link_delivery_failed",
        entityType: "ClinicalRotationPayment",
        entityId: payment.id,
        hospitalId: application.hospitalId,
        offeringId: application.offeringId,
        applicationId: application.id,
        groupId: application.groupId,
        paymentId: payment.id,
        metadata: { errorCategory, outboxId: claim.outboxId }
      });
    });

    return { ok: false as const, status: "failed" as const, errorCategory };
  }
}

export async function requireClinicalRotationStudentSession(nextPath: string) {
  const session = await getSession();

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (session.role !== "student" || session.verificationStatus !== VerificationStatus.VERIFIED) {
    notFound();
  }

  return session;
}

export async function requireClinicalRotationStudentApiSession() {
  const session = await getSession();

  if (!session) {
    return { ok: false as const, status: 401, error: "יש להתחבר מחדש." };
  }

  if (session.role !== "student" || session.verificationStatus !== VerificationStatus.VERIFIED) {
    return { ok: false as const, status: 403, error: "גישה זמינה רק לחשבון סטודנט מאומת." };
  }

  return { ok: true as const, session };
}

export async function requireClinicalRotationAdminApiSession() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return { ok: false as const, status: 403, error: "גישה נדחתה." };
  }

  return { ok: true as const, session };
}

export async function getClinicalRotationHospitalPortalContext(input?: {
  requestedHospitalId?: string | null;
  nextPath?: string;
}): Promise<ClinicalRotationHospitalPortalContext> {
  const session = await getSession();

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(input?.nextPath ?? "/clinical-rotations/hospital")}`);
  }

  if (session.role === "admin") {
    const hospitals = await prisma.institution.findMany({
      where: { type: InstitutionType.HOSPITAL },
      select: { id: true, name: true, slug: true, city: true, region: true },
      orderBy: [{ name: "asc" }]
    });
    const selectedHospital =
      hospitals.find((hospital) => hospital.id === input?.requestedHospitalId) ?? hospitals[0];

    if (!selectedHospital) {
      notFound();
    }

    return { session, isAdmin: true, hospitals, selectedHospital };
  }

  if (session.role !== "representative") {
    notFound();
  }

  const accesses = await prisma.clinicalRotationHospitalAccess.findMany({
    where: {
      userId: session.userId,
      isActive: true
    },
    include: {
      hospital: {
        select: { id: true, name: true, slug: true, city: true, region: true }
      }
    },
    orderBy: [{ hospital: { name: "asc" } }]
  });

  const hospitals = accesses.map((access) => access.hospital);
  const selectedHospital =
    hospitals.find((hospital) => hospital.id === input?.requestedHospitalId) ?? hospitals[0];

  if (!selectedHospital) {
    notFound();
  }

  return { session, isAdmin: false, hospitals, selectedHospital };
}

export async function requireClinicalRotationHospitalApiAccess(hospitalId: string) {
  const session = await getSession();

  if (!session) {
    return { ok: false as const, status: 401, error: "יש להתחבר מחדש." };
  }

  if (session.role === "admin") {
    return { ok: true as const, session, isAdmin: true as const };
  }

  if (session.role !== "representative") {
    return { ok: false as const, status: 403, error: "גישה נדחתה." };
  }

  const accesses = await prisma.clinicalRotationHospitalAccess.findMany({
    where: { userId: session.userId, isActive: true },
    select: { userId: true, hospitalId: true, isActive: true }
  });

  if (!canManageClinicalRotationHospital({ sessionRole: session.role, userId: session.userId, hospitalId, accesses })) {
    return { ok: false as const, status: 403, error: "אין הרשאה לבית החולים הזה." };
  }

  return { ok: true as const, session, isAdmin: false as const };
}

async function getClinicalRotationApprovedStudentIdentity(session: AppSession) {
  const identity = await prisma.clinicalRotationStudentIdentity.findUnique({
    where: { userId: session.userId },
    select: {
      id: true,
      status: true,
      studentAnonymousKey: true,
      keyVersion: true,
      documentDeletedAt: true
    }
  });

  if (!identity || identity.status === ClinicalRotationIdentityVerificationStatus.NOT_SUBMITTED) {
    return {
      ok: false as const,
      status: 403,
      error: "לפני הגשה לסבב קליני יש להשלים אימות זהות וזכאות."
    };
  }

  if (identity.status === ClinicalRotationIdentityVerificationStatus.PENDING_REVIEW) {
    return {
      ok: false as const,
      status: 403,
      error: "בקשת האימות שלך ממתינה לבדיקה ידנית."
    };
  }

  if (identity.status !== ClinicalRotationIdentityVerificationStatus.APPROVED || !identity.studentAnonymousKey) {
    return {
      ok: false as const,
      status: 403,
      error: "אימות הזהות לא אושר לסבבים קליניים."
    };
  }

  const eligibility = await getClinicalRotationEligibilityState(identity.studentAnonymousKey, identity.keyVersion);
  if (!eligibility.ok) {
    return { ok: false as const, status: 403, error: eligibility.message };
  }

  return {
    ok: true as const,
    identity: {
      ...identity,
      studentAnonymousKey: identity.studentAnonymousKey
    },
    eligibility
  };
}

function clinicalRotationApplicationBlockingStatuses() {
  return [
    ClinicalRotationApplicationStatus.SUBMITTED,
    ClinicalRotationApplicationStatus.WAITLISTED,
    ClinicalRotationApplicationStatus.APPROVED,
    ClinicalRotationApplicationStatus.CANCELLATION_REQUESTED
  ];
}

function clinicalRotationApprovedCapacityStatuses() {
  return [
    ClinicalRotationApplicationStatus.APPROVED,
    ClinicalRotationApplicationStatus.COMPLETED
  ];
}

export async function getClinicalRotationSearchOptions() {
  const offerings = await prisma.clinicalRotationOffering.findMany({
    where: { status: ClinicalRotationOfferingStatus.PUBLISHED, isPreviewOnly: false },
    select: {
      hospital: { select: { id: true, name: true, city: true, region: true } },
      specialty: { select: { id: true, name: true } }
    },
    orderBy: [{ hospital: { name: "asc" } }, { specialty: { name: "asc" } }]
  });

  return {
    hospitals: Array.from(new Map(offerings.map((offering) => [offering.hospital.id, offering.hospital])).values()),
    specialties: Array.from(new Map(offerings.map((offering) => [offering.specialty.id, offering.specialty])).values()),
    regions: Array.from(
      new Set(offerings.map((offering) => offering.hospital.region).filter((region): region is string => Boolean(region)))
    ).sort()
  };
}

const clinicalRotationOfferingListInclude = {
  hospital: {
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      region: true,
      clinicalRotationAvailabilityWindows: {
        select: { startsAt: true, endsAt: true },
        orderBy: [{ startsAt: "asc" }]
      },
      clinicalRotationBlackouts: {
        select: { startsAt: true, endsAt: true, reason: true },
        orderBy: [{ startsAt: "asc" }]
      }
    }
  },
  specialty: { select: { id: true, name: true, slug: true } },
  department: { select: { id: true, name: true, slug: true } },
  applications: {
    where: { status: { in: [ClinicalRotationApplicationStatus.APPROVED, ClinicalRotationApplicationStatus.COMPLETED] } },
    select: { id: true, status: true }
  }
} satisfies Prisma.ClinicalRotationOfferingInclude;

type ClinicalRotationOfferingListItemBase = Prisma.ClinicalRotationOfferingGetPayload<{
  include: typeof clinicalRotationOfferingListInclude;
}>;

export type ClinicalRotationOfferingListItem = ClinicalRotationOfferingListItemBase & {
  participantCount: number;
  remainingCapacity: number | null;
  minimumMet: boolean;
  priceLabel: string;
  dateLabel: string;
};

export async function listClinicalRotationOfferings(searchParams?: Record<string, SearchParamValue>) {
  const search = parseClinicalRotationSearch(searchParams);
  const startDate = search.start ? parseClinicalRotationDate(search.start) : null;
  const endDate = search.end ? parseClinicalRotationDate(search.end) : null;
  const maxPrice = search.maxPrice ? Number(search.maxPrice) : null;
  const durationWeeks = search.durationWeeks ? Number(search.durationWeeks) : null;
  const hasValidPrice = maxPrice !== null && Number.isFinite(maxPrice);
  const hasValidDuration = durationWeeks !== null && Number.isFinite(durationWeeks);

  const offerings = await prisma.clinicalRotationOffering.findMany({
    where: {
      status: ClinicalRotationOfferingStatus.PUBLISHED,
      isPreviewOnly: false,
      ...(search.hospitalIds.length > 0 ? { hospitalId: { in: search.hospitalIds } } : {}),
      ...(search.specialtyIds.length > 0 ? { specialtyId: { in: search.specialtyIds } } : {}),
      ...(search.region ? { hospital: { region: search.region } } : {}),
      ...(search.paymentMethod ? { paymentMethod: search.paymentMethod as ClinicalRotationPaymentMethod } : {}),
      ...(hasValidPrice ? { priceAmount: { lte: maxPrice! } } : {}),
      ...(hasValidDuration ? { minDurationWeeks: { lte: durationWeeks! }, maxDurationWeeks: { gte: durationWeeks! } } : {}),
      ...(search.groupOnly ? { groupRegistrationEnabled: true } : {}),
      ...(search.search
        ? {
            OR: [
              { displayName: { contains: search.search, mode: "insensitive" as const } },
              { hospital: { name: { contains: search.search, mode: "insensitive" as const } } },
              { specialty: { name: { contains: search.search, mode: "insensitive" as const } } }
            ]
          }
        : {})
    },
    include: clinicalRotationOfferingListInclude,
    orderBy: [{ startsAt: "asc" }, { hospital: { name: "asc" } }]
  });

  return offerings
    .filter((offering) => {
      if (!startDate || !endDate) {
        return true;
      }
      return isClinicalRotationDateRangeAllowed({
        requestedStartAt: startDate,
        requestedEndAt: endDate,
        offering,
        openWindows: offering.hospital.clinicalRotationAvailabilityWindows,
        blackouts: offering.hospital.clinicalRotationBlackouts
      }).ok;
    })
    .map((offering) => {
      const participantCount = offering.applications.length;
      const remainingCapacity = offering.maximumCapacity === null ? null : Math.max(0, offering.maximumCapacity - participantCount);
      return {
        ...offering,
        participantCount,
        remainingCapacity,
        minimumMet: participantCount >= offering.minimumParticipants,
        priceLabel: clinicalRotationPriceLabel(offering),
        dateLabel: clinicalRotationDateRangeLabel(offering.startsAt, offering.endsAt)
      };
    });
}

export async function getClinicalRotationOfferingForStudent(offeringSlug: string) {
  const offering = await prisma.clinicalRotationOffering.findUnique({
    where: { slug: decodeURIComponent(offeringSlug) },
    include: clinicalRotationOfferingListInclude
  });

  if (!offering || offering.status !== ClinicalRotationOfferingStatus.PUBLISHED) {
    notFound();
  }

  const participantCount = offering.applications.length;
  const remainingCapacity = offering.maximumCapacity === null ? null : Math.max(0, offering.maximumCapacity - participantCount);
  return {
    ...offering,
    participantCount,
    remainingCapacity,
    minimumMet: participantCount >= offering.minimumParticipants,
    priceLabel: clinicalRotationPriceLabel(offering),
    dateLabel: clinicalRotationDateRangeLabel(offering.startsAt, offering.endsAt)
  };
}

export async function getClinicalRotationHospitalDashboard(hospitalId: string) {
  const [windows, blackouts, offerings, applications, payments, groups, cancellations] = await Promise.all([
    prisma.clinicalRotationAvailabilityWindow.findMany({
      where: { hospitalId },
      orderBy: [{ startsAt: "asc" }]
    }),
    prisma.clinicalRotationBlackout.findMany({
      where: { hospitalId },
      orderBy: [{ startsAt: "asc" }]
    }),
    prisma.clinicalRotationOffering.findMany({
      where: { hospitalId },
      include: {
        specialty: { select: { name: true } },
        department: { select: { name: true } },
        applications: {
          select: { id: true, status: true }
        }
      },
      orderBy: [{ updatedAt: "desc" }]
    }),
    prisma.clinicalRotationApplication.findMany({
      where: { hospitalId },
      include: {
        offering: { select: { displayName: true, slug: true, minimumParticipants: true } },
        studentUser: { select: { fullName: true, email: true } },
        payment: true
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100
    }),
    prisma.clinicalRotationPayment.findMany({
      where: { application: { hospitalId } },
      include: {
        application: {
          select: {
            id: true,
            requestedStartAt: true,
            requestedEndAt: true,
            studentUser: { select: { fullName: true, email: true } },
            offering: { select: { displayName: true } }
          }
        }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 100
    }),
    getClinicalRotationHospitalGroups(hospitalId),
    prisma.clinicalRotationCancellation.findMany({
      where: { hospitalId },
      include: {
        application: { select: { id: true, status: true } },
        offering: { select: { displayName: true } },
        studentUser: { select: { fullName: true, email: true } }
      },
      orderBy: [{ requestedAt: "desc" }],
      take: 100
    })
  ]);

  return { windows, blackouts, offerings, applications, payments, groups, cancellations };
}

export async function getClinicalRotationHospitalFormOptions(hospitalId: string) {
  const [hospital, specialties, departments] = await Promise.all([
    prisma.institution.findUnique({
      where: { id: hospitalId },
      select: { id: true, name: true, slug: true }
    }),
    prisma.specialty.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: [{ name: "asc" }]
    }),
    prisma.department.findMany({
      where: { institutionId: hospitalId },
      select: { id: true, name: true, specialtyId: true },
      orderBy: [{ specialty: { name: "asc" } }, { name: "asc" }]
    })
  ]);

  if (!hospital) {
    notFound();
  }

  return { hospital, specialties, departments };
}

export async function getClinicalRotationStudentDashboard(session: AppSession) {
  const identity = await prisma.clinicalRotationStudentIdentity.findUnique({
    where: { userId: session.userId },
    select: { status: true, studentAnonymousKey: true, keyVersion: true, documentDeletedAt: true, decidedAt: true, reviewerNote: true }
  });
  const studentKeyFilter = identity?.studentAnonymousKey
    ? { studentAnonymousKey: identity.studentAnonymousKey, keyVersion: identity.keyVersion }
    : { studentUserId: session.userId };
  const [applications, rules, cancellations] = await Promise.all([
    prisma.clinicalRotationApplication.findMany({
      where: studentKeyFilter,
      include: {
        offering: {
          select: {
            slug: true,
            displayName: true,
            minimumParticipants: true,
            paymentMethod: true,
            groupRegistrationEnabled: true
          }
        },
        hospital: { select: { name: true } },
        specialty: { select: { name: true } },
        department: { select: { name: true } },
        payment: true
      },
      orderBy: [{ requestedStartAt: "asc" }]
    }),
    getActiveClinicalRotationCoreRules(),
    prisma.clinicalRotationCancellation.findMany({
      where: studentKeyFilter,
      include: {
        offering: { select: { displayName: true, slug: true } },
        hospital: { select: { name: true } }
      },
      orderBy: [{ requestedAt: "desc" }],
      take: 20
    })
  ]);

  const summary = summarizeClinicalRotationDashboard({
    applications: applications.map((application) => ({
      status: application.status,
      requestedStartAt: application.requestedStartAt,
      requestedEndAt: application.requestedEndAt,
      coreSpecialty: application.coreSpecialty as ClinicalRotationCoreSpecialtyValue | null
    })),
    rules: rules.map((rule) => ({
      coreSpecialty: rule.coreSpecialty as ClinicalRotationCoreSpecialtyValue,
      maxWeeks: rule.maxWeeks,
      enforcementMode: rule.enforcementMode
    }))
  });

  return { identity, applications, rules, summary, cancellations };
}

export async function getActiveClinicalRotationCoreRules(date = new Date()) {
  const rules = await prisma.clinicalRotationCoreRule.findMany({
    where: {
      isActive: true,
      effectiveDate: { lte: date }
    },
    include: { specialty: { select: { name: true } } },
    orderBy: [{ coreSpecialty: "asc" }, { effectiveDate: "desc" }]
  });
  const latestBySpecialty = new Map<string, (typeof rules)[number]>();

  for (const rule of rules) {
    if (!latestBySpecialty.has(rule.coreSpecialty)) {
      latestBySpecialty.set(rule.coreSpecialty, rule);
    }
  }

  return Array.from(latestBySpecialty.values());
}

async function evaluateStudentCoreLimit(input: {
  studentAnonymousKey: string;
  keyVersion: number;
  coreSpecialty: ClinicalRotationCoreSpecialtyValue | null;
  requestedStartAt: Date;
  requestedEndAt: Date;
}) {
  if (!input.coreSpecialty) {
    return { rule: null, evaluation: evaluateClinicalRotationCoreLimit({ completedWeeks: 0, futureApprovedWeeks: 0, requestedWeeks: 0 }) };
  }

  const rotationYear = input.requestedStartAt.getUTCFullYear();
  const yearStart = new Date(Date.UTC(rotationYear, 0, 1));
  const yearEnd = new Date(Date.UTC(rotationYear, 11, 31, 23, 59, 59, 999));
  const [rule, applications] = await Promise.all([
    prisma.clinicalRotationCoreRule.findFirst({
      where: {
        coreSpecialty: input.coreSpecialty,
        isActive: true,
        effectiveDate: { lte: input.requestedStartAt }
      },
      orderBy: [{ effectiveDate: "desc" }]
    }),
    prisma.clinicalRotationApplication.findMany({
      where: {
        studentAnonymousKey: input.studentAnonymousKey,
        keyVersion: input.keyVersion,
        coreSpecialty: input.coreSpecialty,
        status: { in: [ClinicalRotationApplicationStatus.APPROVED, ClinicalRotationApplicationStatus.COMPLETED] },
        requestedStartAt: { gte: yearStart, lte: yearEnd }
      },
      select: {
        status: true,
        requestedStartAt: true,
        requestedEndAt: true
      }
    })
  ]);
  const now = new Date();
  const completedWeeks = applications
    .filter((application) => application.status === ClinicalRotationApplicationStatus.COMPLETED)
    .reduce((sum, application) => sum + clinicalRotationWeeksInclusive(application.requestedStartAt, application.requestedEndAt), 0);
  const futureApprovedWeeks = applications
    .filter((application) => application.status === ClinicalRotationApplicationStatus.APPROVED && application.requestedStartAt >= now)
    .reduce((sum, application) => sum + clinicalRotationWeeksInclusive(application.requestedStartAt, application.requestedEndAt), 0);
  const requestedWeeks = clinicalRotationWeeksInclusive(input.requestedStartAt, input.requestedEndAt);

  return {
    rule,
    evaluation: evaluateClinicalRotationCoreLimit({
      completedWeeks,
      futureApprovedWeeks,
      requestedWeeks,
      rule: rule ? { maxWeeks: rule.maxWeeks, enforcementMode: rule.enforcementMode } : null
    })
  };
}

export async function submitClinicalRotationApplication(input: {
  session: AppSession;
  offeringId: string;
  requestedStartAt: Date;
  requestedEndAt: Date;
  acceptedRequirements?: boolean;
  studentNotes?: string | null;
}) {
  const identity = await getClinicalRotationApprovedStudentIdentity(input.session);
  if (!identity.ok) return identity;

  const offering = await prisma.clinicalRotationOffering.findUnique({
    where: { id: input.offeringId },
    include: {
      hospital: {
        select: {
          id: true,
          clinicalRotationAvailabilityWindows: { select: { startsAt: true, endsAt: true } },
          clinicalRotationBlackouts: { select: { startsAt: true, endsAt: true } }
        }
      },
      specialty: { select: { name: true } },
      department: true
    }
  });

  if (!offering || offering.status !== ClinicalRotationOfferingStatus.PUBLISHED) {
    return { ok: false as const, status: 404, error: "הסבב לא נמצא או אינו פתוח להגשה." };
  }

  if (offering.isPreviewOnly || offering.applicationBlockedReason) {
    return {
      ok: false as const,
      status: 403,
      error: offering.applicationBlockedReason ?? "זהו סבב תצוגה מקדימה ואי אפשר להגיש אליו בקשות."
    };
  }

  if (!input.acceptedRequirements) {
    return { ok: false as const, status: 400, error: "יש לאשר שקראת והבנת את דרישות הסבב." };
  }

  const dateValidation = isClinicalRotationDateRangeAllowed({
    requestedStartAt: input.requestedStartAt,
    requestedEndAt: input.requestedEndAt,
    offering,
    openWindows: offering.hospital.clinicalRotationAvailabilityWindows,
    blackouts: offering.hospital.clinicalRotationBlackouts
  });

  if (!dateValidation.ok) {
    return { ok: false as const, status: 400, error: dateValidation.error };
  }

  if (dateValidation.weeks < offering.minDurationWeeks || dateValidation.weeks > offering.maxDurationWeeks) {
    return {
      ok: false as const,
      status: 400,
      error: `משך הסבב חייב להיות בין ${offering.minDurationWeeks} ל-${offering.maxDurationWeeks} שבועות.`
    };
  }

  if (offering.maximumCapacity) {
    const approvedCount = await prisma.clinicalRotationApplication.count({
      where: {
        offeringId: offering.id,
        status: { in: clinicalRotationApprovedCapacityStatuses() },
        requestedStartAt: { lte: input.requestedEndAt },
        requestedEndAt: { gte: input.requestedStartAt }
      }
    });

    if (approvedCount >= offering.maximumCapacity) {
      return { ok: false as const, status: 409, error: "אין קיבולת זמינה בתאריכים שנבחרו." };
    }
  }

  const conflict = await findClinicalRotationDateConflict(prisma, {
    studentAnonymousKey: identity.identity.studentAnonymousKey,
    keyVersion: identity.identity.keyVersion,
    requestedStartAt: input.requestedStartAt,
    requestedEndAt: input.requestedEndAt
  });

  if (conflict) {
    return { ok: false as const, status: 409, error: "כבר קיימת בקשה או סבב חופף לתאריכים שנבחרו." };
  }

  const coreSpecialty =
    (offering.coreSpecialty as ClinicalRotationCoreSpecialtyValue | null) ??
    inferClinicalRotationCoreSpecialty(offering.specialty.name);
  const limit = await evaluateStudentCoreLimit({
    studentAnonymousKey: identity.identity.studentAnonymousKey,
    keyVersion: identity.identity.keyVersion,
    coreSpecialty,
    requestedStartAt: input.requestedStartAt,
    requestedEndAt: input.requestedEndAt
  });

  if (limit.evaluation.action === "block") {
    await createClinicalRotationAuditLog(prisma, {
      actorUserId: input.session.userId,
      action: "clinical_rotation.application_blocked_by_core_rule",
      entityType: "ClinicalRotationApplication",
      hospitalId: offering.hospitalId,
      offeringId: offering.id,
      metadata: {
        requestedStartAt: input.requestedStartAt.toISOString(),
        requestedEndAt: input.requestedEndAt.toISOString(),
        coreSpecialty,
        evaluation: limit.evaluation
      }
    });
    return { ok: false as const, status: 403, error: limit.evaluation.message ?? "הבקשה חסומה לפי כלל פעיל." };
  }

  let application;
  try {
    application = await prisma.$transaction(async (tx) => {
      await lockClinicalRotationStudentIdentity(tx, {
        studentAnonymousKey: identity.identity.studentAnonymousKey,
        keyVersion: identity.identity.keyVersion
      });
      const transactionConflict = await findClinicalRotationDateConflict(tx, {
        studentAnonymousKey: identity.identity.studentAnonymousKey,
        keyVersion: identity.identity.keyVersion,
        requestedStartAt: input.requestedStartAt,
        requestedEndAt: input.requestedEndAt
      });
      if (transactionConflict) {
        throw new Error("CLINICAL_ROTATION_DATE_CONFLICT");
      }

    const created = await tx.clinicalRotationApplication.create({
      data: {
        offeringId: offering.id,
        studentUserId: input.session.userId,
        hospitalId: offering.hospitalId,
        specialtyId: offering.specialtyId,
        departmentId: offering.departmentId,
        coreSpecialty,
        studentAnonymousKey: identity.identity.studentAnonymousKey,
        keyVersion: identity.identity.keyVersion,
        requestedStartAt: input.requestedStartAt,
        requestedEndAt: input.requestedEndAt,
        durationWeeks: dateValidation.weeks,
        status: ClinicalRotationApplicationStatus.SUBMITTED,
        studentNotes: input.studentNotes?.trim() || null,
        eligibilitySnapshot: {
          importId: identity.eligibility.importId,
          keyVersion: identity.eligibility.keyVersion,
          matched: true
        },
        complianceSnapshot: {
          coreSpecialty,
          action: limit.evaluation.action
        },
        ruleSnapshot: limit.rule
          ? {
              coreSpecialty: limit.rule.coreSpecialty,
              maxWeeks: limit.rule.maxWeeks,
              effectiveDate: limit.rule.effectiveDate.toISOString(),
              enforcementMode: limit.rule.enforcementMode
            }
          : Prisma.JsonNull,
        limitEvaluation: limit.evaluation,
        acceptedRequirementsAt: new Date()
      }
    });

    await createClinicalRotationAuditLog(tx, {
      actorUserId: input.session.userId,
      action: "clinical_rotation.application_submitted",
      entityType: "ClinicalRotationApplication",
      entityId: created.id,
      hospitalId: created.hospitalId,
      offeringId: created.offeringId,
      applicationId: created.id,
      metadata: {
        requestedStartAt: created.requestedStartAt.toISOString(),
        requestedEndAt: created.requestedEndAt.toISOString(),
        coreLimitAction: limit.evaluation.action
      }
    });

      return created;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CLINICAL_ROTATION_DATE_CONFLICT") {
      return { ok: false as const, status: 409, error: "כבר קיימת בקשה או סבב חופף לתאריכים שנבחרו." };
    }
    throw error;
  }

  return { ok: true as const, application, warning: limit.evaluation.action === "warn" ? limit.evaluation.message : null };
}

export async function validateClinicalRotationOfferingPublishById(offeringId: string) {
  const offering = await prisma.clinicalRotationOffering.findUnique({
    where: { id: offeringId },
    include: {
      hospital: {
        select: {
          clinicalRotationAvailabilityWindows: { select: { startsAt: true, endsAt: true } },
          clinicalRotationBlackouts: { select: { startsAt: true, endsAt: true } }
        }
      },
      department: { select: { institutionId: true } }
    }
  });

  if (!offering) {
    return { ok: false as const, error: "הסבב לא נמצא." };
  }

  if (offering.department && offering.department.institutionId !== offering.hospitalId) {
    return { ok: false as const, error: "המחלקה שנבחרה אינה שייכת לבית החולים של הסבב." };
  }

  return validateClinicalRotationOfferingPublishInput({
    hospitalId: offering.hospitalId,
    specialtyId: offering.specialtyId,
    displayName: offering.displayName,
    startsAt: offering.startsAt,
    endsAt: offering.endsAt,
    minimumParticipants: offering.minimumParticipants,
    maximumCapacity: offering.maximumCapacity,
    minDurationWeeks: offering.minDurationWeeks,
    maxDurationWeeks: offering.maxDurationWeeks,
    priceAmount: Number(offering.priceAmount),
    paymentMethod: offering.paymentMethod,
    paymentLink: offering.paymentLink,
    requirements: offering.requirements,
    cancellationPolicy: offering.cancellationPolicy,
    groupRegistrationEnabled: offering.groupRegistrationEnabled,
    groupMinSize: offering.groupMinSize,
    groupMaxSize: offering.groupMaxSize,
    isPreviewOnly: offering.isPreviewOnly,
    openWindows: offering.hospital.clinicalRotationAvailabilityWindows,
    blackouts: offering.hospital.clinicalRotationBlackouts
  });
}

export async function createClinicalRotationOffering(input: {
  session: AppSession;
  hospitalId: string;
  specialtyId: string;
  departmentId?: string | null;
  displayName: string;
  startsAt: Date;
  endsAt: Date;
  minimumParticipants: number;
  maximumCapacity?: number | null;
  minDurationWeeks: number;
  maxDurationWeeks: number;
  priceAmount: number;
  priceUnit: "TOTAL" | "PER_WEEK";
  paymentMethod: "CASH_AT_ROTATION" | "EXTERNAL_PAYMENT_LINK";
  paymentLink?: string | null;
  requirements?: string | null;
  cancellationPolicy?: string | null;
  workLanguage?: string | null;
  departmentContactName?: string | null;
  departmentContactEmail?: string | null;
  requiresDeanApproval?: boolean;
  requiresInsurance?: boolean;
  groupRegistrationEnabled?: boolean;
  groupMinSize?: number | null;
  groupMaxSize?: number | null;
  isPreviewOnly?: boolean;
  applicationBlockedReason?: string | null;
  studentInstructions?: string | null;
  internalNotes?: string | null;
  publish?: boolean;
}) {
  const auth = await requireClinicalRotationHospitalApiAccess(input.hospitalId);
  if (!auth.ok) return auth;

  const [hospital, specialty, department, windows, blackouts] = await Promise.all([
    prisma.institution.findUnique({ where: { id: input.hospitalId }, select: { id: true, slug: true } }),
    prisma.specialty.findUnique({ where: { id: input.specialtyId }, select: { id: true, slug: true, name: true } }),
    input.departmentId
      ? prisma.department.findUnique({ where: { id: input.departmentId }, select: { id: true, institutionId: true } })
      : Promise.resolve(null),
    prisma.clinicalRotationAvailabilityWindow.findMany({ where: { hospitalId: input.hospitalId }, select: { startsAt: true, endsAt: true } }),
    prisma.clinicalRotationBlackout.findMany({ where: { hospitalId: input.hospitalId }, select: { startsAt: true, endsAt: true } })
  ]);

  if (!hospital || !specialty) {
    return { ok: false as const, status: 400, error: "בית חולים או תחום לא נמצאו." };
  }

  if (department && department.institutionId !== input.hospitalId) {
    return { ok: false as const, status: 403, error: "המחלקה אינה שייכת לבית החולים הזה." };
  }

  const publishValidation = input.publish
    ? validateClinicalRotationOfferingPublishInput({
        hospitalId: input.hospitalId,
        specialtyId: input.specialtyId,
        displayName: input.displayName,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        minimumParticipants: input.minimumParticipants,
        maximumCapacity: input.maximumCapacity,
        minDurationWeeks: input.minDurationWeeks,
        maxDurationWeeks: input.maxDurationWeeks,
        priceAmount: input.priceAmount,
        paymentMethod: input.paymentMethod,
        paymentLink: input.paymentLink,
        requirements: input.requirements,
        cancellationPolicy: input.cancellationPolicy,
        groupRegistrationEnabled: input.groupRegistrationEnabled,
        groupMinSize: input.groupMinSize,
        groupMaxSize: input.groupMaxSize,
        isPreviewOnly: input.isPreviewOnly,
        openWindows: windows,
        blackouts
      })
    : { ok: true as const };

  if (!publishValidation.ok) {
    return { ok: false as const, status: 400, error: publishValidation.error };
  }

  const status = input.publish ? ClinicalRotationOfferingStatus.PUBLISHED : ClinicalRotationOfferingStatus.DRAFT;
  const offering = await prisma.$transaction(async (tx) => {
    const created = await tx.clinicalRotationOffering.create({
      data: {
        hospitalId: input.hospitalId,
        specialtyId: input.specialtyId,
        departmentId: input.departmentId || null,
        coreSpecialty: inferClinicalRotationCoreSpecialty(specialty.name),
        slug: createClinicalRotationSlug({
          hospitalSlug: hospital.slug,
          specialtySlug: specialty.slug,
          displayName: input.displayName
        }),
        displayName: input.displayName.trim(),
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        minimumParticipants: input.minimumParticipants,
        maximumCapacity: input.maximumCapacity ?? null,
        minDurationWeeks: input.minDurationWeeks,
        maxDurationWeeks: input.maxDurationWeeks,
        priceAmount: input.priceAmount,
        priceUnit: input.priceUnit,
        paymentMethod: input.paymentMethod,
        paymentLink: input.paymentMethod === "EXTERNAL_PAYMENT_LINK" ? input.paymentLink?.trim() || null : null,
        status,
        publishedAt: status === ClinicalRotationOfferingStatus.PUBLISHED ? new Date() : null,
        requirements: input.requirements?.trim() || null,
        cancellationPolicy: input.cancellationPolicy?.trim() || null,
        workLanguage: input.workLanguage?.trim() || null,
        departmentContactName: input.departmentContactName?.trim() || null,
        departmentContactEmail: input.departmentContactEmail?.trim() || null,
        requiresDeanApproval: input.requiresDeanApproval === true,
        requiresInsurance: input.requiresInsurance !== false,
        groupRegistrationEnabled: input.groupRegistrationEnabled === true,
        groupMinSize: input.groupRegistrationEnabled ? input.groupMinSize ?? null : null,
        groupMaxSize: input.groupRegistrationEnabled ? input.groupMaxSize ?? null : null,
        isPreviewOnly: input.isPreviewOnly === true,
        applicationBlockedReason: input.applicationBlockedReason?.trim() || null,
        studentInstructions: input.studentInstructions?.trim() || null,
        internalNotes: input.internalNotes?.trim() || null,
        createdByUserId: input.session.userId,
        updatedByUserId: input.session.userId
      }
    });

    await createClinicalRotationAuditLog(tx, {
      actorUserId: input.session.userId,
      action: status === ClinicalRotationOfferingStatus.PUBLISHED
        ? "clinical_rotation.offering_created_published"
        : "clinical_rotation.offering_created",
      entityType: "ClinicalRotationOffering",
      entityId: created.id,
      hospitalId: created.hospitalId,
      offeringId: created.id,
      metadata: { status }
    });

    return created;
  });

  return { ok: true as const, offering };
}

export async function updateClinicalRotationOfferingStatus(input: {
  session: AppSession;
  offeringId: string;
  action: "publish" | "pause" | "close" | "cancel";
}) {
  const offering = await prisma.clinicalRotationOffering.findUnique({
    where: { id: input.offeringId },
    select: { id: true, hospitalId: true, status: true }
  });

  if (!offering) return { ok: false as const, status: 404, error: "הסבב לא נמצא." };
  const auth = await requireClinicalRotationHospitalApiAccess(offering.hospitalId);
  if (!auth.ok) return auth;

  if (input.action === "publish") {
    const validation = await validateClinicalRotationOfferingPublishById(offering.id);
    if (!validation.ok) {
      return { ok: false as const, status: 400, error: validation.error };
    }
  }

  const now = new Date();
  const nextStatus =
    input.action === "publish"
      ? ClinicalRotationOfferingStatus.PUBLISHED
      : input.action === "pause"
        ? ClinicalRotationOfferingStatus.PAUSED
        : input.action === "cancel"
          ? ClinicalRotationOfferingStatus.CANCELLED
          : ClinicalRotationOfferingStatus.CLOSED;

  await prisma.$transaction(async (tx) => {
    await tx.clinicalRotationOffering.update({
      where: { id: offering.id },
      data: {
        status: nextStatus,
        updatedByUserId: input.session.userId,
        ...(input.action === "publish" ? { publishedAt: now, pausedAt: null, closedAt: null } : {}),
        ...(input.action === "pause" ? { pausedAt: now } : {}),
        ...(input.action === "close" ? { closedAt: now } : {}),
        ...(input.action === "cancel" ? { cancelledAt: now, closedAt: now } : {})
      }
    });

    await createClinicalRotationAuditLog(tx, {
      actorUserId: input.session.userId,
      action: `clinical_rotation.offering_${input.action}`,
      entityType: "ClinicalRotationOffering",
      entityId: offering.id,
      hospitalId: offering.hospitalId,
      offeringId: offering.id,
      metadata: { from: offering.status, to: nextStatus }
    });
  });

  return { ok: true as const };
}

export async function approveClinicalRotationApplication(input: {
  session: AppSession;
  applicationId: string;
  hospitalNotes?: string | null;
}) {
  const application = await prisma.clinicalRotationApplication.findUnique({
    where: { id: input.applicationId },
    include: {
      studentUser: { select: { fullName: true, email: true } },
      hospital: { select: { name: true } },
      offering: true
    }
  });

  if (!application) return { ok: false as const, status: 404, error: "הבקשה לא נמצאה." };
  const auth = await requireClinicalRotationHospitalApiAccess(application.hospitalId);
  if (!auth.ok) return auth;

  if (application.studentUserId === input.session.userId) {
    return { ok: false as const, status: 403, error: "אי אפשר לאשר בקשה של עצמך." };
  }

  if (application.groupId) {
    return { ok: false as const, status: 409, error: "בקשה קבוצתית מאושרת דרך מסך הקבוצות." };
  }

  if (
    application.status !== ClinicalRotationApplicationStatus.SUBMITTED &&
    application.status !== ClinicalRotationApplicationStatus.WAITLISTED
  ) {
    return { ok: false as const, status: 409, error: "ניתן לאשר רק בקשה שהוגשה או נמצאת בהמתנה." };
  }

  const paymentStatus =
    application.offering.paymentMethod === ClinicalRotationPaymentMethod.CASH_AT_ROTATION
      ? ClinicalRotationPaymentStatus.CASH_DUE
      : ClinicalRotationPaymentStatus.LINK_PENDING;
  let payment;
  try {
    payment = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "ClinicalRotationOffering" WHERE "id" = ${application.offeringId} FOR UPDATE`;
    if (application.offering.maximumCapacity) {
      const approvedCount = await tx.clinicalRotationApplication.count({
        where: {
          offeringId: application.offeringId,
          status: { in: clinicalRotationApprovedCapacityStatuses() },
          requestedStartAt: { lte: application.requestedEndAt },
          requestedEndAt: { gte: application.requestedStartAt }
        }
      });

      if (approvedCount >= application.offering.maximumCapacity) {
        throw new Error("אין קיבולת זמינה בתאריכים שנבחרו.");
      }
    }

    const updatedApplication = await tx.clinicalRotationApplication.update({
      where: { id: application.id },
      data: {
        status: ClinicalRotationApplicationStatus.APPROVED,
        hospitalNotes: input.hospitalNotes?.trim() || null,
        decidedByUserId: input.session.userId,
        decidedAt: new Date()
      }
    });
    const upsertedPayment = await tx.clinicalRotationPayment.upsert({
      where: { applicationId: application.id },
      create: {
        applicationId: application.id,
        method: application.offering.paymentMethod,
        amount: application.offering.priceAmount,
        currency: application.offering.priceCurrency,
        paymentLink: application.offering.paymentLink,
        status: paymentStatus,
        updatedByUserId: input.session.userId
      },
      update: {
        method: application.offering.paymentMethod,
        amount: application.offering.priceAmount,
        currency: application.offering.priceCurrency,
        paymentLink: application.offering.paymentLink,
        status: paymentStatus,
        updatedByUserId: input.session.userId
      }
    });

	    await createClinicalRotationAuditLog(tx, {
	      actorUserId: input.session.userId,
	      action: "clinical_rotation.application_approved",
      entityType: "ClinicalRotationApplication",
      entityId: updatedApplication.id,
      hospitalId: updatedApplication.hospitalId,
      offeringId: updatedApplication.offeringId,
      applicationId: updatedApplication.id,
      paymentId: upsertedPayment.id,
	      metadata: { paymentStatus }
	    });

	    if (application.offering.paymentMethod === ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK) {
	      await enqueueClinicalRotationPaymentLinkEmail(tx, {
	        paymentId: upsertedPayment.id,
	        applicationId: application.id,
	        hospitalId: application.hospitalId,
	        offeringId: application.offeringId,
	        groupId: application.groupId,
	        actorUserId: input.session.userId
	      });
	    }

	    return upsertedPayment;
	    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("אין קיבולת זמינה")) {
      return { ok: false as const, status: 409, error: error.message };
    }
    throw error;
  }

	  if (application.offering.paymentMethod === ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK) {
	    await deliverClinicalRotationPaymentLink({ paymentId: payment.id, actorUserId: input.session.userId });
	  }

  return { ok: true as const };
}

export async function updateClinicalRotationApplicationStatus(input: {
  session: AppSession;
  applicationId: string;
  status: "WAITLISTED" | "DECLINED" | "CANCELLED" | "COMPLETED";
  notes?: string | null;
  adminOverride?: boolean;
}) {
  const application = await prisma.clinicalRotationApplication.findUnique({
    where: { id: input.applicationId },
    select: { id: true, hospitalId: true, offeringId: true, status: true }
  });

  if (!application) return { ok: false as const, status: 404, error: "הבקשה לא נמצאה." };
  const auth = await requireClinicalRotationHospitalApiAccess(application.hospitalId);
  if (!auth.ok) return auth;

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.clinicalRotationApplication.update({
      where: { id: application.id },
      data: {
        status: input.status,
        ...(input.status === "WAITLISTED" ? { hospitalNotes: input.notes?.trim() || null, decidedByUserId: input.session.userId, decidedAt: now } : {}),
        ...(input.status === "DECLINED" ? { hospitalNotes: input.notes?.trim() || null, decidedByUserId: input.session.userId, decidedAt: now } : {}),
        ...(input.status === "CANCELLED" ? { cancelledByUserId: input.session.userId, cancelledAt: now } : {}),
        ...(input.status === "COMPLETED" ? { completedByUserId: input.session.userId, completedAt: now } : {})
      }
    });
    await createClinicalRotationAuditLog(tx, {
      actorUserId: input.session.userId,
      action: `clinical_rotation.application_${input.status.toLowerCase()}`,
      entityType: "ClinicalRotationApplication",
      entityId: application.id,
      hospitalId: application.hospitalId,
      offeringId: application.offeringId,
      applicationId: application.id,
      metadata: { from: application.status, to: input.status, adminOverride: input.adminOverride === true }
    });
  });

  return { ok: true as const };
}

export async function requestClinicalRotationCancellation(input: {
  session: AppSession;
  applicationId: string;
  reasonCategory: keyof typeof ClinicalRotationCancellationReasonCategory;
  note?: string | null;
}) {
  const application = await prisma.clinicalRotationApplication.findUnique({
    where: { id: input.applicationId },
    include: { payment: true }
  });

  if (!application || application.studentUserId !== input.session.userId) {
    return { ok: false as const, status: 404, error: "הבקשה לא נמצאה." };
  }

  if (
    application.status !== ClinicalRotationApplicationStatus.SUBMITTED &&
    application.status !== ClinicalRotationApplicationStatus.WAITLISTED &&
    application.status !== ClinicalRotationApplicationStatus.APPROVED
  ) {
    return { ok: false as const, status: 409, error: "אי אפשר לבקש ביטול במצב הנוכחי." };
  }

  const cancellation = await prisma.$transaction(async (tx) => {
    const created = await tx.clinicalRotationCancellation.create({
      data: {
        applicationId: application.id,
        groupId: application.groupId,
        studentUserId: input.session.userId,
        studentAnonymousKey: application.studentAnonymousKey,
        keyVersion: application.keyVersion,
        hospitalId: application.hospitalId,
        offeringId: application.offeringId,
        departmentId: application.departmentId,
        actorUserId: input.session.userId,
        actorType: ClinicalRotationCancellationActorType.STUDENT,
        reasonCategory: input.reasonCategory,
        note: input.note?.trim() || null,
        applicationStatusAtRequest: application.status,
        paymentStatusAtRequest: application.payment?.status ?? null,
        beforeApproval: application.status !== ClinicalRotationApplicationStatus.APPROVED
      }
    });

    await tx.clinicalRotationApplication.update({
      where: { id: application.id },
      data: { status: ClinicalRotationApplicationStatus.CANCELLATION_REQUESTED }
    });

    await createClinicalRotationAuditLog(tx, {
      actorUserId: input.session.userId,
      action: "clinical_rotation.cancellation_requested",
      entityType: "ClinicalRotationCancellation",
      entityId: created.id,
      hospitalId: application.hospitalId,
      offeringId: application.offeringId,
      applicationId: application.id,
      groupId: application.groupId,
      cancellationId: created.id,
      metadata: {
        reasonCategory: input.reasonCategory,
        applicationStatusAtRequest: application.status,
        paymentStatusAtRequest: application.payment?.status ?? null
      }
    });

    return created;
  });

  return { ok: true as const, cancellation };
}

export async function decideClinicalRotationCancellation(input: {
  session: AppSession;
  applicationId: string;
  approved: boolean;
  notes?: string | null;
}) {
  const cancellation = await prisma.clinicalRotationCancellation.findFirst({
    where: {
      applicationId: input.applicationId,
      status: ClinicalRotationCancellationStatus.REQUESTED
    },
    include: { application: { select: { id: true, hospitalId: true, offeringId: true, groupId: true } } },
    orderBy: [{ requestedAt: "desc" }]
  });

  if (!cancellation) {
    return { ok: false as const, status: 404, error: "בקשת הביטול לא נמצאה." };
  }

  const auth = await requireClinicalRotationHospitalApiAccess(cancellation.application.hospitalId);
  if (!auth.ok) return auth;

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.clinicalRotationCancellation.update({
      where: { id: cancellation.id },
      data: {
        status: input.approved
          ? ClinicalRotationCancellationStatus.APPROVED
          : ClinicalRotationCancellationStatus.REJECTED,
        decidedByUserId: input.session.userId,
        decidedAt: now,
        note: input.notes?.trim() || cancellation.note
      }
    });

    await tx.clinicalRotationApplication.update({
      where: { id: cancellation.applicationId },
      data: input.approved
        ? {
            status: ClinicalRotationApplicationStatus.CANCELLED,
            cancelledByUserId: input.session.userId,
            cancelledAt: now
          }
        : { status: cancellation.applicationStatusAtRequest }
    });

    await createClinicalRotationAuditLog(tx, {
      actorUserId: input.session.userId,
      action: input.approved
        ? "clinical_rotation.cancellation_approved"
        : "clinical_rotation.cancellation_rejected",
      entityType: "ClinicalRotationCancellation",
      entityId: cancellation.id,
      hospitalId: cancellation.application.hospitalId,
      offeringId: cancellation.application.offeringId,
      applicationId: cancellation.applicationId,
      groupId: cancellation.application.groupId,
      cancellationId: cancellation.id,
      metadata: { approved: input.approved }
    });
  });

  return { ok: true as const };
}

async function validateClinicalRotationGroupJoinCapacity(input: {
  groupId: string;
  maxMembers: number;
}) {
  const memberCount = await prisma.clinicalRotationGroupMember.count({
    where: {
      groupId: input.groupId,
      status: { in: [ClinicalRotationGroupMemberStatus.JOINED, ClinicalRotationGroupMemberStatus.APPROVED] }
    }
  });

  return memberCount < input.maxMembers;
}

export async function createClinicalRotationGroupApplication(input: {
  session: AppSession;
  offeringId: string;
  requestedStartAt: Date;
  requestedEndAt: Date;
  maxMembers: number;
  acceptedRequirements?: boolean;
  studentNotes?: string | null;
}) {
  const identity = await getClinicalRotationApprovedStudentIdentity(input.session);
  if (!identity.ok) return identity;

  const offering = await prisma.clinicalRotationOffering.findUnique({
    where: { id: input.offeringId },
    include: {
      hospital: {
        select: {
          id: true,
          clinicalRotationAvailabilityWindows: { select: { startsAt: true, endsAt: true } },
          clinicalRotationBlackouts: { select: { startsAt: true, endsAt: true } }
        }
      },
      specialty: { select: { name: true } }
    }
  });

  if (!offering || offering.status !== ClinicalRotationOfferingStatus.PUBLISHED || !offering.groupRegistrationEnabled) {
    return { ok: false as const, status: 404, error: "הסבב אינו פתוח להרשמה קבוצתית." };
  }

  if (offering.isPreviewOnly || offering.applicationBlockedReason) {
    return { ok: false as const, status: 403, error: offering.applicationBlockedReason ?? "אי אפשר להגיש לסבב תצוגה מקדימה." };
  }

  if (!input.acceptedRequirements) {
    return { ok: false as const, status: 400, error: "יש לאשר שקראת והבנת את דרישות הסבב." };
  }

  const groupMax = offering.groupMaxSize ?? offering.maximumCapacity ?? input.maxMembers;
  const groupMin = offering.groupMinSize ?? 2;
  if (input.maxMembers < groupMin || input.maxMembers > groupMax) {
    return { ok: false as const, status: 400, error: `גודל הקבוצה חייב להיות בין ${groupMin} ל-${groupMax}.` };
  }

  const dateValidation = isClinicalRotationDateRangeAllowed({
    requestedStartAt: input.requestedStartAt,
    requestedEndAt: input.requestedEndAt,
    offering,
    openWindows: offering.hospital.clinicalRotationAvailabilityWindows,
    blackouts: offering.hospital.clinicalRotationBlackouts
  });
  if (!dateValidation.ok) {
    return { ok: false as const, status: 400, error: dateValidation.error };
  }
  if (dateValidation.weeks < offering.minDurationWeeks || dateValidation.weeks > offering.maxDurationWeeks) {
    return { ok: false as const, status: 400, error: `משך הסבב חייב להיות בין ${offering.minDurationWeeks} ל-${offering.maxDurationWeeks} שבועות.` };
  }

  const coreSpecialty =
    (offering.coreSpecialty as ClinicalRotationCoreSpecialtyValue | null) ??
    inferClinicalRotationCoreSpecialty(offering.specialty.name);
  const limit = await evaluateStudentCoreLimit({
    studentAnonymousKey: identity.identity.studentAnonymousKey,
    keyVersion: identity.identity.keyVersion,
    coreSpecialty,
    requestedStartAt: input.requestedStartAt,
    requestedEndAt: input.requestedEndAt
  });
  if (limit.evaluation.action === "block") {
    return { ok: false as const, status: 403, error: limit.evaluation.message ?? "הבקשה חסומה לפי כלל פעיל." };
  }

  const creatorConflict = await findClinicalRotationDateConflict(prisma, {
    studentAnonymousKey: identity.identity.studentAnonymousKey,
    keyVersion: identity.identity.keyVersion,
    requestedStartAt: input.requestedStartAt,
    requestedEndAt: input.requestedEndAt
  });
  if (creatorConflict) {
    return { ok: false as const, status: 409, error: "כבר קיימת בקשה או סבב חופף לתאריכים שנבחרו." };
  }

  const inviteToken = createClinicalRotationInviteToken();
  const inviteTokenHash = hashClinicalRotationInviteToken(inviteToken);
  const inviteExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  let group;
  try {
    group = await prisma.$transaction(async (tx) => {
      await lockClinicalRotationStudentIdentity(tx, {
        studentAnonymousKey: identity.identity.studentAnonymousKey,
        keyVersion: identity.identity.keyVersion
      });
      const transactionConflict = await findClinicalRotationDateConflict(tx, {
        studentAnonymousKey: identity.identity.studentAnonymousKey,
        keyVersion: identity.identity.keyVersion,
        requestedStartAt: input.requestedStartAt,
        requestedEndAt: input.requestedEndAt
      });
      if (transactionConflict) {
        throw new Error("CLINICAL_ROTATION_DATE_CONFLICT");
      }

    const createdGroup = await tx.clinicalRotationGroupApplication.create({
      data: {
        offeringId: offering.id,
        hospitalId: offering.hospitalId,
        departmentId: offering.departmentId,
        creatorUserId: input.session.userId,
        creatorStudentAnonymousKey: identity.identity.studentAnonymousKey,
        keyVersion: identity.identity.keyVersion,
        inviteTokenHash,
        inviteExpiresAt,
        maxMembers: input.maxMembers,
        requestedStartAt: input.requestedStartAt,
        requestedEndAt: input.requestedEndAt,
        durationWeeks: dateValidation.weeks,
        acceptedRequirementsAt: new Date(),
        complianceSnapshot: { creator: limit.evaluation.action, coreSpecialty }
      }
    });

    const application = await tx.clinicalRotationApplication.create({
      data: {
        offeringId: offering.id,
        studentUserId: input.session.userId,
        hospitalId: offering.hospitalId,
        specialtyId: offering.specialtyId,
        departmentId: offering.departmentId,
        coreSpecialty,
        studentAnonymousKey: identity.identity.studentAnonymousKey,
        keyVersion: identity.identity.keyVersion,
        groupId: createdGroup.id,
        requestedStartAt: input.requestedStartAt,
        requestedEndAt: input.requestedEndAt,
        durationWeeks: dateValidation.weeks,
        status: ClinicalRotationApplicationStatus.SUBMITTED,
        studentNotes: input.studentNotes?.trim() || null,
        eligibilitySnapshot: { importId: identity.eligibility.importId, keyVersion: identity.eligibility.keyVersion, matched: true },
        complianceSnapshot: { coreSpecialty, action: limit.evaluation.action },
        ruleSnapshot: limit.rule
          ? {
              coreSpecialty: limit.rule.coreSpecialty,
              maxWeeks: limit.rule.maxWeeks,
              effectiveDate: limit.rule.effectiveDate.toISOString(),
              enforcementMode: limit.rule.enforcementMode
            }
          : Prisma.JsonNull,
        limitEvaluation: limit.evaluation,
        acceptedRequirementsAt: new Date()
      }
    });

    await tx.clinicalRotationGroupMember.create({
      data: {
        groupId: createdGroup.id,
        applicationId: application.id,
        userId: input.session.userId,
        studentAnonymousKey: identity.identity.studentAnonymousKey,
        keyVersion: identity.identity.keyVersion,
        complianceSnapshot: { coreSpecialty, action: limit.evaluation.action },
        acceptedRequirementsAt: new Date()
      }
    });

    await createClinicalRotationAuditLog(tx, {
      actorUserId: input.session.userId,
      action: "clinical_rotation.group_created",
      entityType: "ClinicalRotationGroupApplication",
      entityId: createdGroup.id,
      hospitalId: offering.hospitalId,
      offeringId: offering.id,
      applicationId: application.id,
      groupId: createdGroup.id,
      metadata: { maxMembers: input.maxMembers, expiresAt: inviteExpiresAt.toISOString() }
    });

      return createdGroup;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CLINICAL_ROTATION_DATE_CONFLICT") {
      return { ok: false as const, status: 409, error: "כבר קיימת בקשה או סבב חופף לתאריכים שנבחרו." };
    }
    throw error;
  }

  return {
    ok: true as const,
    group,
    inviteUrl: `${getBaseUrl().replace(/\/$/, "")}/clinical-rotations/groups/${inviteToken}`,
    warning: limit.evaluation.action === "warn" ? limit.evaluation.message : null
  };
}

export async function getClinicalRotationGroupInvite(inviteToken: string) {
  const group = await prisma.clinicalRotationGroupApplication.findUnique({
    where: { inviteTokenHash: hashClinicalRotationInviteToken(inviteToken) },
    include: {
      offering: {
        include: {
          hospital: { select: { name: true, region: true, city: true } },
          specialty: { select: { name: true } },
          department: { select: { name: true } }
        }
      },
      members: { select: { id: true, status: true } }
    }
  });

  if (!group || group.inviteRevokedAt || group.inviteExpiresAt < new Date() || group.status !== ClinicalRotationGroupStatus.SUBMITTED) {
    notFound();
  }

  return {
    group,
    memberCount: group.members.filter((member) => member.status === ClinicalRotationGroupMemberStatus.JOINED).length
  };
}

export async function joinClinicalRotationGroup(input: {
  session: AppSession;
  inviteToken: string;
  acceptedRequirements?: boolean;
  studentNotes?: string | null;
}) {
  const identity = await getClinicalRotationApprovedStudentIdentity(input.session);
  if (!identity.ok) return identity;
  if (!input.acceptedRequirements) {
    return { ok: false as const, status: 400, error: "יש לאשר שקראת והבנת את דרישות הסבב." };
  }

  const group = await prisma.clinicalRotationGroupApplication.findUnique({
    where: { inviteTokenHash: hashClinicalRotationInviteToken(input.inviteToken) },
    include: {
      offering: {
        include: {
          hospital: {
            select: {
              clinicalRotationAvailabilityWindows: { select: { startsAt: true, endsAt: true } },
              clinicalRotationBlackouts: { select: { startsAt: true, endsAt: true } }
            }
          },
          specialty: { select: { name: true } }
        }
      },
      members: { select: { userId: true, status: true } }
    }
  });

  if (!group || group.inviteRevokedAt || group.inviteExpiresAt < new Date() || group.status !== ClinicalRotationGroupStatus.SUBMITTED) {
    return { ok: false as const, status: 404, error: "הזמנת הקבוצה אינה זמינה." };
  }
  if (group.members.some((member) => member.userId === input.session.userId)) {
    return { ok: false as const, status: 409, error: "כבר הצטרפת לקבוצה הזו." };
  }
  if (!(await validateClinicalRotationGroupJoinCapacity({ groupId: group.id, maxMembers: group.maxMembers }))) {
    return { ok: false as const, status: 409, error: "הקבוצה מלאה." };
  }

  const offering = group.offering;
  if (offering.isPreviewOnly || offering.applicationBlockedReason) {
    return { ok: false as const, status: 403, error: offering.applicationBlockedReason ?? "אי אפשר להצטרף לסבב תצוגה מקדימה." };
  }

  const dateValidation = isClinicalRotationDateRangeAllowed({
    requestedStartAt: group.requestedStartAt,
    requestedEndAt: group.requestedEndAt,
    offering,
    openWindows: offering.hospital.clinicalRotationAvailabilityWindows,
    blackouts: offering.hospital.clinicalRotationBlackouts
  });
  if (!dateValidation.ok) {
    return { ok: false as const, status: 400, error: dateValidation.error };
  }

  const coreSpecialty =
    (offering.coreSpecialty as ClinicalRotationCoreSpecialtyValue | null) ??
    inferClinicalRotationCoreSpecialty(offering.specialty.name);
  const limit = await evaluateStudentCoreLimit({
    studentAnonymousKey: identity.identity.studentAnonymousKey,
    keyVersion: identity.identity.keyVersion,
    coreSpecialty,
    requestedStartAt: group.requestedStartAt,
    requestedEndAt: group.requestedEndAt
  });
  if (limit.evaluation.action === "block") {
    return { ok: false as const, status: 403, error: limit.evaluation.message ?? "הבקשה חסומה לפי כלל פעיל." };
  }

  const joinerConflict = await findClinicalRotationDateConflict(prisma, {
    studentAnonymousKey: identity.identity.studentAnonymousKey,
    keyVersion: identity.identity.keyVersion,
    requestedStartAt: group.requestedStartAt,
    requestedEndAt: group.requestedEndAt
  });
  if (joinerConflict) {
    return { ok: false as const, status: 409, error: "כבר קיימת בקשה או סבב חופף לתאריכים שנבחרו." };
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "ClinicalRotationGroupApplication" WHERE "id" = ${group.id} FOR UPDATE`;
    await lockClinicalRotationStudentIdentity(tx, {
      studentAnonymousKey: identity.identity.studentAnonymousKey,
      keyVersion: identity.identity.keyVersion
    });
    const transactionConflict = await findClinicalRotationDateConflict(tx, {
      studentAnonymousKey: identity.identity.studentAnonymousKey,
      keyVersion: identity.identity.keyVersion,
      requestedStartAt: group.requestedStartAt,
      requestedEndAt: group.requestedEndAt
    });
    if (transactionConflict) {
      throw new Error("CLINICAL_ROTATION_DATE_CONFLICT");
    }

    const memberCount = await tx.clinicalRotationGroupMember.count({
      where: { groupId: group.id, status: { in: [ClinicalRotationGroupMemberStatus.JOINED, ClinicalRotationGroupMemberStatus.APPROVED] } }
    });
    if (memberCount >= group.maxMembers) {
      throw new Error("הקבוצה מלאה.");
    }

    const application = await tx.clinicalRotationApplication.create({
      data: {
        offeringId: offering.id,
        studentUserId: input.session.userId,
        hospitalId: offering.hospitalId,
        specialtyId: offering.specialtyId,
        departmentId: offering.departmentId,
        coreSpecialty,
        studentAnonymousKey: identity.identity.studentAnonymousKey,
        keyVersion: identity.identity.keyVersion,
        groupId: group.id,
        requestedStartAt: group.requestedStartAt,
        requestedEndAt: group.requestedEndAt,
        durationWeeks: group.durationWeeks,
        status: ClinicalRotationApplicationStatus.SUBMITTED,
        studentNotes: input.studentNotes?.trim() || null,
        eligibilitySnapshot: { importId: identity.eligibility.importId, keyVersion: identity.eligibility.keyVersion, matched: true },
        complianceSnapshot: { coreSpecialty, action: limit.evaluation.action },
        limitEvaluation: limit.evaluation,
        acceptedRequirementsAt: new Date()
      }
    });

    const member = await tx.clinicalRotationGroupMember.create({
      data: {
        groupId: group.id,
        applicationId: application.id,
        userId: input.session.userId,
        studentAnonymousKey: identity.identity.studentAnonymousKey,
        keyVersion: identity.identity.keyVersion,
        complianceSnapshot: { coreSpecialty, action: limit.evaluation.action },
        acceptedRequirementsAt: new Date()
      }
    });

    await createClinicalRotationAuditLog(tx, {
      actorUserId: input.session.userId,
      action: "clinical_rotation.group_joined",
      entityType: "ClinicalRotationGroupMember",
      entityId: member.id,
      hospitalId: offering.hospitalId,
      offeringId: offering.id,
      applicationId: application.id,
      groupId: group.id,
      metadata: { coreLimitAction: limit.evaluation.action }
    });

    return { application, member };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CLINICAL_ROTATION_DATE_CONFLICT") {
      return { ok: false as const, status: 409, error: "כבר קיימת בקשה או סבב חופף לתאריכים שנבחרו." };
    }
    if (error instanceof Error && error.message.includes("הקבוצה מלאה")) {
      return { ok: false as const, status: 409, error: error.message };
    }
    throw error;
  }

  return {
    ok: true as const,
    ...result,
    warning: limit.evaluation.action === "warn" ? limit.evaluation.message : null
  };
}

export async function getClinicalRotationHospitalGroups(hospitalId: string) {
  return prisma.clinicalRotationGroupApplication.findMany({
    where: { hospitalId },
    include: {
      offering: { select: { displayName: true, slug: true, paymentMethod: true, priceAmount: true, priceCurrency: true, priceUnit: true, maximumCapacity: true } },
      creatorUser: { select: { fullName: true, email: true, phone: true } },
      members: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
          application: { select: { id: true, status: true, complianceSnapshot: true } }
        },
        orderBy: [{ joinedAt: "asc" }]
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });
}

export async function updateClinicalRotationGroupStatus(input: {
  session: AppSession;
  groupId: string;
  action: "approve" | "decline" | "cancel" | "revokeInvite";
  notes?: string | null;
}) {
  const group = await prisma.clinicalRotationGroupApplication.findUnique({
    where: { id: input.groupId },
    include: {
      offering: { include: { hospital: { select: { name: true } } } },
      applications: {
        include: { studentUser: { select: { fullName: true, email: true } } }
      }
    }
  });

  if (!group) return { ok: false as const, status: 404, error: "הקבוצה לא נמצאה." };
  const auth = await requireClinicalRotationHospitalApiAccess(group.hospitalId);
  if (!auth.ok) return auth;

  if (group.applications.some((application) => application.studentUserId === input.session.userId) && input.action === "approve") {
    return { ok: false as const, status: 403, error: "אי אפשר לאשר קבוצה שאתה חבר בה." };
  }

  if (input.action === "revokeInvite") {
    await prisma.clinicalRotationGroupApplication.update({
      where: { id: group.id },
      data: { inviteRevokedAt: new Date(), coordinatorNotes: input.notes?.trim() || group.coordinatorNotes }
    });
    return { ok: true as const };
  }

  if (group.status !== ClinicalRotationGroupStatus.SUBMITTED) {
    return { ok: false as const, status: 409, error: "ניתן לעדכן רק קבוצה שממתינה לבדיקה." };
  }

  const nextStatus =
    input.action === "approve"
      ? ClinicalRotationGroupStatus.APPROVED
      : input.action === "decline"
        ? ClinicalRotationGroupStatus.DECLINED
        : ClinicalRotationGroupStatus.CANCELLED;
  const nextApplicationStatus =
    input.action === "approve"
      ? ClinicalRotationApplicationStatus.APPROVED
      : input.action === "decline"
        ? ClinicalRotationApplicationStatus.DECLINED
        : ClinicalRotationApplicationStatus.CANCELLED;
  const paymentStatus =
    group.offering.paymentMethod === ClinicalRotationPaymentMethod.CASH_AT_ROTATION
      ? ClinicalRotationPaymentStatus.CASH_DUE
      : ClinicalRotationPaymentStatus.LINK_PENDING;

  const paymentIdsToDeliver: string[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ClinicalRotationOffering" WHERE "id" = ${group.offeringId} FOR UPDATE`;
      if (input.action === "approve" && group.offering.maximumCapacity) {
        const approvedCount = await tx.clinicalRotationApplication.count({
          where: {
            offeringId: group.offeringId,
            status: { in: clinicalRotationApprovedCapacityStatuses() },
            requestedStartAt: { lte: group.requestedEndAt },
            requestedEndAt: { gte: group.requestedStartAt }
          }
        });
        if (approvedCount + group.applications.length > group.offering.maximumCapacity) {
          throw new Error("אין קיבולת זמינה לאישור כל חברי הקבוצה.");
        }
      }

      if (input.action === "approve") {
        const groupApplicationIds = group.applications.map((application) => application.id);
        for (const application of group.applications) {
          if (!application.studentAnonymousKey || !application.keyVersion) {
            throw new Error("CLINICAL_ROTATION_DATE_CONFLICT");
          }
          await lockClinicalRotationStudentIdentity(tx, {
            studentAnonymousKey: application.studentAnonymousKey,
            keyVersion: application.keyVersion
          });
          const conflict = await findClinicalRotationDateConflict(tx, {
            studentAnonymousKey: application.studentAnonymousKey,
            keyVersion: application.keyVersion,
            requestedStartAt: group.requestedStartAt,
            requestedEndAt: group.requestedEndAt,
            excludeApplicationIds: groupApplicationIds
          });
          if (conflict) {
            throw new Error("CLINICAL_ROTATION_DATE_CONFLICT");
          }
        }
      }

      await tx.clinicalRotationGroupApplication.update({
        where: { id: group.id },
        data: {
          status: nextStatus,
          coordinatorNotes: input.notes?.trim() || null,
          decidedByUserId: input.session.userId,
          decidedAt: new Date()
        }
      });

      for (const application of group.applications) {
        await tx.clinicalRotationApplication.update({
          where: { id: application.id },
          data: {
            status: nextApplicationStatus,
            decidedByUserId: input.session.userId,
            decidedAt: new Date(),
            ...(input.action === "cancel" ? { cancelledByUserId: input.session.userId, cancelledAt: new Date() } : {})
          }
        });

        await tx.clinicalRotationGroupMember.updateMany({
          where: { applicationId: application.id },
          data: {
            status: input.action === "approve"
              ? ClinicalRotationGroupMemberStatus.APPROVED
              : input.action === "decline"
                ? ClinicalRotationGroupMemberStatus.DECLINED
                : ClinicalRotationGroupMemberStatus.CANCELLED
          }
        });

        if (input.action === "approve") {
          const upsertedPayment = await tx.clinicalRotationPayment.upsert({
            where: { applicationId: application.id },
            create: {
              applicationId: application.id,
              method: group.offering.paymentMethod,
              amount: group.offering.priceAmount,
              currency: group.offering.priceCurrency,
              paymentLink: group.offering.paymentLink,
              status: paymentStatus,
              linkSentAt: null,
              updatedByUserId: input.session.userId
            },
            update: {
              method: group.offering.paymentMethod,
              amount: group.offering.priceAmount,
              currency: group.offering.priceCurrency,
              paymentLink: group.offering.paymentLink,
              status: paymentStatus,
              linkSentAt: null,
              updatedByUserId: input.session.userId
            }
          });
          if (group.offering.paymentMethod === ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK) {
            await enqueueClinicalRotationPaymentLinkEmail(tx, {
              paymentId: upsertedPayment.id,
              applicationId: application.id,
              hospitalId: application.hospitalId,
              offeringId: application.offeringId,
              groupId: group.id,
              actorUserId: input.session.userId
            });
            paymentIdsToDeliver.push(upsertedPayment.id);
          }
        }
      }

      await createClinicalRotationAuditLog(tx, {
        actorUserId: input.session.userId,
        action: `clinical_rotation.group_${input.action}`,
        entityType: "ClinicalRotationGroupApplication",
        entityId: group.id,
        hospitalId: group.hospitalId,
        offeringId: group.offeringId,
        groupId: group.id,
        metadata: { memberCount: group.applications.length }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("אין קיבולת זמינה")) {
      return { ok: false as const, status: 409, error: error.message };
    }
    if (error instanceof Error && error.message === "CLINICAL_ROTATION_DATE_CONFLICT") {
      return { ok: false as const, status: 409, error: "לחבר/ה בקבוצה יש בקשה או סבב חופף בתאריכים שנבחרו." };
    }
    throw error;
  }

  for (const paymentId of paymentIdsToDeliver) {
    await deliverClinicalRotationPaymentLink({ paymentId, actorUserId: input.session.userId });
  }

  return { ok: true as const };
}

export async function updateClinicalRotationPaymentStatus(input: {
  session: AppSession;
  paymentId: string;
  status: "PAID" | "WAIVED" | "OVERDUE";
  notes?: string | null;
  adminOverride?: boolean;
}) {
  const payment = await prisma.clinicalRotationPayment.findUnique({
    where: { id: input.paymentId },
    include: { application: { select: { id: true, hospitalId: true, offeringId: true } } }
  });

  if (!payment) return { ok: false as const, status: 404, error: "רשומת התשלום לא נמצאה." };
  const auth = await requireClinicalRotationHospitalApiAccess(payment.application.hospitalId);
  if (!auth.ok) return auth;

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.clinicalRotationPayment.update({
      where: { id: payment.id },
      data: {
        status: input.status,
        notes: input.notes?.trim() || payment.notes,
        updatedByUserId: input.session.userId,
        ...(input.status === "PAID" ? { paidAt: now } : {}),
        ...(input.status === "WAIVED" ? { waivedAt: now } : {}),
        ...(input.status === "OVERDUE" ? { overdueAt: now } : {})
      }
    });
    await createClinicalRotationAuditLog(tx, {
      actorUserId: input.session.userId,
      action: "clinical_rotation.payment_status_changed",
      entityType: "ClinicalRotationPayment",
      entityId: payment.id,
      hospitalId: payment.application.hospitalId,
      offeringId: payment.application.offeringId,
      applicationId: payment.application.id,
      paymentId: payment.id,
      metadata: { from: payment.status, to: input.status, adminOverride: input.adminOverride === true }
    });
  });

  return { ok: true as const };
}

export async function retryClinicalRotationPaymentLink(input: {
  session: AppSession;
  paymentId: string;
  adminOverride?: boolean;
}) {
  const payment = await prisma.clinicalRotationPayment.findUnique({
    where: { id: input.paymentId },
    include: {
      application: {
        select: {
          id: true,
          hospitalId: true,
          offeringId: true,
          groupId: true,
          status: true
        }
      }
    }
  });

  if (!payment) return { ok: false as const, status: 404, error: "רשומת התשלום לא נמצאה." };
  const auth = await requireClinicalRotationHospitalApiAccess(payment.application.hospitalId);
  if (!auth.ok) return auth;

  if (payment.method !== ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK || !payment.paymentLink) {
    return { ok: false as const, status: 409, error: "אין קישור תשלום חיצוני לשליחה חוזרת." };
  }

  if (payment.status === ClinicalRotationPaymentStatus.LINK_SENT) {
    return { ok: true as const, deliveryStatus: "already_sent" as const };
  }

  if (payment.status === ClinicalRotationPaymentStatus.PAID || payment.status === ClinicalRotationPaymentStatus.WAIVED) {
    return { ok: false as const, status: 409, error: "אין לשלוח קישור תשלום לאחר סגירת התשלום." };
  }

  await prisma.$transaction(async (tx) => {
    await enqueueClinicalRotationPaymentLinkEmail(tx, {
      paymentId: payment.id,
      applicationId: payment.application.id,
      hospitalId: payment.application.hospitalId,
      offeringId: payment.application.offeringId,
      groupId: payment.application.groupId,
      actorUserId: input.session.userId
    });
    await createClinicalRotationAuditLog(tx, {
      actorUserId: input.session.userId,
      action: "clinical_rotation.payment_link_retry_requested",
      entityType: "ClinicalRotationPayment",
      entityId: payment.id,
      hospitalId: payment.application.hospitalId,
      offeringId: payment.application.offeringId,
      applicationId: payment.application.id,
      groupId: payment.application.groupId,
      paymentId: payment.id,
      metadata: { adminOverride: input.adminOverride === true }
    });
  });

  const delivery = await deliverClinicalRotationPaymentLink({
    paymentId: payment.id,
    actorUserId: input.session.userId
  });

  return { ok: true as const, deliveryStatus: delivery.status };
}

export async function getClinicalRotationAdminDashboard() {
  const [hospitals, accessCount, offerings, applications, payments, ruleViolations, studentSummaries] = await Promise.all([
    prisma.institution.count({ where: { type: InstitutionType.HOSPITAL } }),
    prisma.clinicalRotationHospitalAccess.count(),
    prisma.clinicalRotationOffering.groupBy({ by: ["status"], _count: true }),
    prisma.clinicalRotationApplication.groupBy({ by: ["status"], _count: true }),
    prisma.clinicalRotationPayment.groupBy({ by: ["status"], _count: true }),
    prisma.clinicalRotationAuditLog.count({
      where: { action: "clinical_rotation.application_blocked_by_core_rule" }
    }),
    prisma.clinicalRotationApplication.findMany({
      where: {
        status: { in: [ClinicalRotationApplicationStatus.APPROVED, ClinicalRotationApplicationStatus.COMPLETED] },
        coreSpecialty: { not: null }
      },
      select: {
        studentUserId: true,
        coreSpecialty: true,
        requestedStartAt: true,
        requestedEndAt: true,
        status: true
      },
      orderBy: [{ studentUser: { fullName: "asc" } }]
    })
  ]);
  const rules = await getActiveClinicalRotationCoreRules();
  const summaries = new Map<string, {
    studentUserId: string;
    studentRef: string;
    byCoreSpecialty: ReturnType<typeof summarizeClinicalRotationDashboard>["byCoreSpecialty"];
  }>();

  for (const application of studentSummaries) {
    const existing = summaries.get(application.studentUserId);
    const rows = studentSummaries.filter((row) => row.studentUserId === application.studentUserId);
    if (!existing) {
      summaries.set(application.studentUserId, {
        studentUserId: application.studentUserId,
        studentRef: `סטודנט/ית ${application.studentUserId.slice(-6)}`,
        byCoreSpecialty: summarizeClinicalRotationDashboard({
          applications: rows.map((row) => ({
            status: row.status,
            requestedStartAt: row.requestedStartAt,
            requestedEndAt: row.requestedEndAt,
            coreSpecialty: row.coreSpecialty as ClinicalRotationCoreSpecialtyValue
          })),
          rules: rules.map((rule) => ({
            coreSpecialty: rule.coreSpecialty as ClinicalRotationCoreSpecialtyValue,
            maxWeeks: rule.maxWeeks,
            enforcementMode: rule.enforcementMode
          }))
        }).byCoreSpecialty
      });
    }
  }

  return {
    hospitals,
    accessCount,
    offerings,
    applications,
    payments,
    ruleViolations,
    studentSummaries: Array.from(summaries.values())
  };
}

export async function createOrUpdateClinicalRotationCoreRule(input: {
  session: AppSession;
  coreSpecialty: ClinicalRotationCoreSpecialtyValue;
  specialtyId?: string | null;
  maxWeeks: number;
  effectiveDate: Date;
  enforcementMode: "WARN" | "BLOCK";
  isActive: boolean;
  notes?: string | null;
}) {
  const rule = await prisma.$transaction(async (tx) => {
    const saved = await tx.clinicalRotationCoreRule.upsert({
      where: {
        coreSpecialty_effectiveDate: {
          coreSpecialty: input.coreSpecialty,
          effectiveDate: input.effectiveDate
        }
      },
      create: {
        coreSpecialty: input.coreSpecialty,
        specialtyId: input.specialtyId || null,
        maxWeeks: input.maxWeeks,
        effectiveDate: input.effectiveDate,
        enforcementMode: input.enforcementMode,
        isActive: input.isActive,
        notes: input.notes?.trim() || null,
        createdByUserId: input.session.userId,
        updatedByUserId: input.session.userId
      },
      update: {
        specialtyId: input.specialtyId || null,
        maxWeeks: input.maxWeeks,
        enforcementMode: input.enforcementMode,
        isActive: input.isActive,
        notes: input.notes?.trim() || null,
        updatedByUserId: input.session.userId
      }
    });
    await createClinicalRotationAuditLog(tx, {
      actorUserId: input.session.userId,
      action: "clinical_rotation.core_rule_upserted",
      entityType: "ClinicalRotationCoreRule",
      entityId: saved.id,
      metadata: {
        coreSpecialty: saved.coreSpecialty,
        maxWeeks: saved.maxWeeks,
        effectiveDate: saved.effectiveDate.toISOString(),
        enforcementMode: saved.enforcementMode,
        isActive: saved.isActive
      }
    });
    return saved;
  });

  return rule;
}

export async function getClinicalRotationAdminLists() {
  const [hospitals, specialties, accesses, rules, applications, payments] = await Promise.all([
    prisma.institution.findMany({
      where: { type: InstitutionType.HOSPITAL },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        clinicalRotationHospitalAccesses: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
          orderBy: [{ createdAt: "desc" }]
        },
        clinicalRotationAvailabilityWindows: { select: { id: true } },
        clinicalRotationOfferings: { select: { id: true, status: true } }
      },
      orderBy: [{ name: "asc" }]
    }),
    prisma.specialty.findMany({ select: { id: true, name: true }, orderBy: [{ name: "asc" }] }),
    prisma.clinicalRotationHospitalAccess.findMany({
      include: {
        user: { select: { id: true, fullName: true, email: true, roleKey: true } },
        hospital: { select: { id: true, name: true } }
      },
      orderBy: [{ updatedAt: "desc" }]
    }),
    prisma.clinicalRotationCoreRule.findMany({
      include: { specialty: { select: { name: true } } },
      orderBy: [{ coreSpecialty: "asc" }, { effectiveDate: "desc" }]
    }),
    prisma.clinicalRotationApplication.findMany({
      include: {
        studentUser: { select: { fullName: true, email: true } },
        hospital: { select: { name: true } },
        specialty: { select: { name: true } },
        offering: { select: { displayName: true, minimumParticipants: true } },
        payment: true
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200
    }),
    prisma.clinicalRotationPayment.findMany({
      include: {
        application: {
          select: {
            id: true,
            hospitalId: true,
            requestedStartAt: true,
            requestedEndAt: true,
            studentUser: { select: { fullName: true, email: true } },
            hospital: { select: { name: true } },
            offering: { select: { displayName: true } }
          }
        }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 200
    })
  ]);

  return { hospitals, specialties, accesses, rules, applications, payments };
}

export {
  clinicalRotationApplicationStatusLabels,
  clinicalRotationCoreSpecialtyLabels,
  clinicalRotationPaymentMethodLabels,
  clinicalRotationPaymentStatusLabels,
  parseClinicalRotationDate
};
