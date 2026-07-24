import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import {
  ClinicalRotationApplicationStatus,
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
    maxPrice: firstClinicalRotationParam(input?.maxPrice)?.trim() ?? "",
    paymentMethod: firstClinicalRotationParam(input?.paymentMethod)?.trim() ?? "",
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
      paymentId: input.paymentId ?? null,
      metadata: input.metadata
    }
  });
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

export async function getClinicalRotationSearchOptions() {
  const offerings = await prisma.clinicalRotationOffering.findMany({
    where: { status: ClinicalRotationOfferingStatus.PUBLISHED },
    select: {
      hospital: { select: { id: true, name: true, city: true, region: true } },
      specialty: { select: { id: true, name: true } }
    },
    orderBy: [{ hospital: { name: "asc" } }, { specialty: { name: "asc" } }]
  });

  return {
    hospitals: Array.from(new Map(offerings.map((offering) => [offering.hospital.id, offering.hospital])).values()),
    specialties: Array.from(new Map(offerings.map((offering) => [offering.specialty.id, offering.specialty])).values())
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
  minimumMet: boolean;
  priceLabel: string;
  dateLabel: string;
};

export async function listClinicalRotationOfferings(searchParams?: Record<string, SearchParamValue>) {
  const search = parseClinicalRotationSearch(searchParams);
  const startDate = search.start ? parseClinicalRotationDate(search.start) : null;
  const endDate = search.end ? parseClinicalRotationDate(search.end) : null;
  const maxPrice = search.maxPrice ? Number(search.maxPrice) : null;
  const hasValidPrice = maxPrice !== null && Number.isFinite(maxPrice);

  const offerings = await prisma.clinicalRotationOffering.findMany({
    where: {
      status: ClinicalRotationOfferingStatus.PUBLISHED,
      ...(search.hospitalIds.length > 0 ? { hospitalId: { in: search.hospitalIds } } : {}),
      ...(search.specialtyIds.length > 0 ? { specialtyId: { in: search.specialtyIds } } : {}),
      ...(search.paymentMethod ? { paymentMethod: search.paymentMethod as ClinicalRotationPaymentMethod } : {}),
      ...(hasValidPrice ? { priceAmount: { lte: maxPrice! } } : {}),
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
      return {
        ...offering,
        participantCount,
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
  return {
    ...offering,
    participantCount,
    minimumMet: participantCount >= offering.minimumParticipants,
    priceLabel: clinicalRotationPriceLabel(offering),
    dateLabel: clinicalRotationDateRangeLabel(offering.startsAt, offering.endsAt)
  };
}

export async function getClinicalRotationHospitalDashboard(hospitalId: string) {
  const [windows, blackouts, offerings, applications, payments] = await Promise.all([
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
    })
  ]);

  return { windows, blackouts, offerings, applications, payments };
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
  const [applications, rules] = await Promise.all([
    prisma.clinicalRotationApplication.findMany({
      where: { studentUserId: session.userId },
      include: {
        offering: {
          select: {
            slug: true,
            displayName: true,
            minimumParticipants: true,
            paymentMethod: true
          }
        },
        hospital: { select: { name: true } },
        specialty: { select: { name: true } },
        department: { select: { name: true } },
        payment: true
      },
      orderBy: [{ requestedStartAt: "asc" }]
    }),
    getActiveClinicalRotationCoreRules()
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

  return { applications, rules, summary };
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
  studentUserId: string;
  coreSpecialty: ClinicalRotationCoreSpecialtyValue | null;
  requestedStartAt: Date;
  requestedEndAt: Date;
}) {
  if (!input.coreSpecialty) {
    return { rule: null, evaluation: evaluateClinicalRotationCoreLimit({ completedWeeks: 0, futureApprovedWeeks: 0, requestedWeeks: 0 }) };
  }

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
        studentUserId: input.studentUserId,
        coreSpecialty: input.coreSpecialty,
        status: { in: [ClinicalRotationApplicationStatus.APPROVED, ClinicalRotationApplicationStatus.COMPLETED] }
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
  studentNotes?: string | null;
}) {
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

  if (offering.maximumCapacity) {
    const approvedCount = await prisma.clinicalRotationApplication.count({
      where: {
        offeringId: offering.id,
        status: { in: [ClinicalRotationApplicationStatus.APPROVED, ClinicalRotationApplicationStatus.COMPLETED] },
        requestedStartAt: { lte: input.requestedEndAt },
        requestedEndAt: { gte: input.requestedStartAt }
      }
    });

    if (approvedCount >= offering.maximumCapacity) {
      return { ok: false as const, status: 409, error: "אין קיבולת זמינה בתאריכים שנבחרו." };
    }
  }

  const coreSpecialty =
    (offering.coreSpecialty as ClinicalRotationCoreSpecialtyValue | null) ??
    inferClinicalRotationCoreSpecialty(offering.specialty.name);
  const limit = await evaluateStudentCoreLimit({
    studentUserId: input.session.userId,
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
        studentUserId: input.session.userId,
        requestedStartAt: input.requestedStartAt.toISOString(),
        requestedEndAt: input.requestedEndAt.toISOString(),
        coreSpecialty,
        evaluation: limit.evaluation
      }
    });
    return { ok: false as const, status: 403, error: limit.evaluation.message ?? "הבקשה חסומה לפי כלל פעיל." };
  }

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.clinicalRotationApplication.create({
      data: {
        offeringId: offering.id,
        studentUserId: input.session.userId,
        hospitalId: offering.hospitalId,
        specialtyId: offering.specialtyId,
        departmentId: offering.departmentId,
        coreSpecialty,
        requestedStartAt: input.requestedStartAt,
        requestedEndAt: input.requestedEndAt,
        status: ClinicalRotationApplicationStatus.SUBMITTED,
        studentNotes: input.studentNotes?.trim() || null,
        ruleSnapshot: limit.rule
          ? {
              coreSpecialty: limit.rule.coreSpecialty,
              maxWeeks: limit.rule.maxWeeks,
              effectiveDate: limit.rule.effectiveDate.toISOString(),
              enforcementMode: limit.rule.enforcementMode
            }
          : Prisma.JsonNull,
        limitEvaluation: limit.evaluation
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
    priceAmount: Number(offering.priceAmount),
    paymentMethod: offering.paymentMethod,
    paymentLink: offering.paymentLink,
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
  priceAmount: number;
  priceUnit: "TOTAL" | "PER_WEEK";
  paymentMethod: "CASH_AT_ROTATION" | "EXTERNAL_PAYMENT_LINK";
  paymentLink?: string | null;
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
        priceAmount: input.priceAmount,
        paymentMethod: input.paymentMethod,
        paymentLink: input.paymentLink,
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
        priceAmount: input.priceAmount,
        priceUnit: input.priceUnit,
        paymentMethod: input.paymentMethod,
        paymentLink: input.paymentMethod === "EXTERNAL_PAYMENT_LINK" ? input.paymentLink?.trim() || null : null,
        status,
        publishedAt: status === ClinicalRotationOfferingStatus.PUBLISHED ? new Date() : null,
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
  action: "publish" | "pause" | "close";
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
        : ClinicalRotationOfferingStatus.CLOSED;

  await prisma.$transaction(async (tx) => {
    await tx.clinicalRotationOffering.update({
      where: { id: offering.id },
      data: {
        status: nextStatus,
        updatedByUserId: input.session.userId,
        ...(input.action === "publish" ? { publishedAt: now, pausedAt: null, closedAt: null } : {}),
        ...(input.action === "pause" ? { pausedAt: now } : {}),
        ...(input.action === "close" ? { closedAt: now } : {})
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

  if (application.status !== ClinicalRotationApplicationStatus.SUBMITTED) {
    return { ok: false as const, status: 409, error: "ניתן לאשר רק בקשה שהוגשה וממתינה לבדיקה." };
  }

  const paymentStatus =
    application.offering.paymentMethod === ClinicalRotationPaymentMethod.CASH_AT_ROTATION
      ? ClinicalRotationPaymentStatus.CASH_DUE
      : ClinicalRotationPaymentStatus.LINK_PENDING;
  const payment = await prisma.$transaction(async (tx) => {
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

    return upsertedPayment;
  });

  if (application.offering.paymentMethod === ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK) {
    if (!application.offering.paymentLink) {
      return { ok: false as const, status: 500, error: "חסר קישור תשלום בסבב שאושר." };
    }

    const dashboardUrl = `${getBaseUrl().replace(/\/$/, "")}/clinical-rotations/my-rotations`;
    const emailPayload = buildClinicalRotationPaymentLinkEmailPayload({
      studentName: application.studentUser.fullName,
      studentEmail: application.studentUser.email,
      hospitalName: application.hospital.name,
      offeringName: application.offering.displayName,
      dateRange: clinicalRotationDateRangeLabel(application.requestedStartAt, application.requestedEndAt),
      amountLabel: clinicalRotationPriceLabel(application.offering),
      paymentLink: application.offering.paymentLink,
      dashboardUrl
    });
    const emailResult = await sendTransactionalEmail(emailPayload);

    await prisma.$transaction(async (tx) => {
      await tx.clinicalRotationPayment.update({
        where: { id: payment.id },
        data: {
          status: ClinicalRotationPaymentStatus.LINK_SENT,
          linkSentAt: new Date(),
          updatedByUserId: input.session.userId
        }
      });
      await createClinicalRotationAuditLog(tx, {
        actorUserId: input.session.userId,
        action: "clinical_rotation.payment_link_sent",
        entityType: "ClinicalRotationPayment",
        entityId: payment.id,
        hospitalId: application.hospitalId,
        offeringId: application.offeringId,
        applicationId: application.id,
        paymentId: payment.id,
        metadata: {
          delivered: emailResult.delivered,
          skipped: emailResult.skipped,
          to: application.studentUser.email
        }
      });
    });
  }

  return { ok: true as const };
}

export async function updateClinicalRotationApplicationStatus(input: {
  session: AppSession;
  applicationId: string;
  status: "DECLINED" | "CANCELLED" | "COMPLETED";
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
        status: true,
        studentUser: { select: { fullName: true, email: true } }
      },
      orderBy: [{ studentUser: { fullName: "asc" } }]
    })
  ]);
  const rules = await getActiveClinicalRotationCoreRules();
  const summaries = new Map<string, {
    studentUserId: string;
    fullName: string;
    email: string;
    byCoreSpecialty: ReturnType<typeof summarizeClinicalRotationDashboard>["byCoreSpecialty"];
  }>();

  for (const application of studentSummaries) {
    const existing = summaries.get(application.studentUserId);
    const rows = studentSummaries.filter((row) => row.studentUserId === application.studentUserId);
    if (!existing) {
      summaries.set(application.studentUserId, {
        studentUserId: application.studentUserId,
        fullName: application.studentUser.fullName,
        email: application.studentUser.email,
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
