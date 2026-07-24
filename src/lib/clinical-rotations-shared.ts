import type { Metadata } from "next";

export const clinicalRotationNoIndexMetadata = {
  robots: {
    index: false,
    follow: false
  }
} satisfies Metadata;

export const clinicalRotationPaymentMethodValues = [
  "CASH_AT_ROTATION",
  "EXTERNAL_PAYMENT_LINK"
] as const;

export const clinicalRotationPriceUnitValues = ["TOTAL", "PER_WEEK"] as const;

export const clinicalRotationOfferingStatusValues = [
  "DRAFT",
  "PUBLISHED",
  "PAUSED",
  "CLOSED"
] as const;

export const clinicalRotationApplicationStatusValues = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "DECLINED",
  "CANCELLED",
  "COMPLETED"
] as const;

export const clinicalRotationPaymentStatusValues = [
  "NOT_REQUIRED",
  "CASH_DUE",
  "LINK_PENDING",
  "LINK_SENT",
  "PAID",
  "WAIVED",
  "OVERDUE"
] as const;

export const clinicalRotationCoreSpecialtyValues = [
  "INTERNAL_MEDICINE",
  "GENERAL_SURGERY",
  "PEDIATRICS",
  "OBSTETRICS_GYNECOLOGY"
] as const;

export const clinicalRotationCoreRuleEnforcementModeValues = ["WARN", "BLOCK"] as const;

export type ClinicalRotationPaymentMethodValue = (typeof clinicalRotationPaymentMethodValues)[number];
export type ClinicalRotationPriceUnitValue = (typeof clinicalRotationPriceUnitValues)[number];
export type ClinicalRotationApplicationStatusValue = (typeof clinicalRotationApplicationStatusValues)[number];
export type ClinicalRotationPaymentStatusValue = (typeof clinicalRotationPaymentStatusValues)[number];
export type ClinicalRotationCoreSpecialtyValue = (typeof clinicalRotationCoreSpecialtyValues)[number];
export type ClinicalRotationCoreRuleEnforcementModeValue = (typeof clinicalRotationCoreRuleEnforcementModeValues)[number];

export const clinicalRotationCoreSpecialtyLabels: Record<ClinicalRotationCoreSpecialtyValue, string> = {
  INTERNAL_MEDICINE: "רפואה פנימית",
  GENERAL_SURGERY: "כירורגיה כללית",
  PEDIATRICS: "ילדים",
  OBSTETRICS_GYNECOLOGY: "נשים ויולדות"
};

export const clinicalRotationPaymentMethodLabels: Record<ClinicalRotationPaymentMethodValue, string> = {
  CASH_AT_ROTATION: "תשלום במזומן בתחילת הסבב",
  EXTERNAL_PAYMENT_LINK: "קישור תשלום חיצוני לאחר אישור"
};

export const clinicalRotationPriceUnitLabels: Record<ClinicalRotationPriceUnitValue, string> = {
  TOTAL: "סה\"כ לסבב",
  PER_WEEK: "לשבוע"
};

export const clinicalRotationApplicationStatusLabels: Record<ClinicalRotationApplicationStatusValue, string> = {
  DRAFT: "טיוטה",
  SUBMITTED: "הוגשה",
  APPROVED: "אושרה",
  DECLINED: "נדחתה",
  CANCELLED: "בוטלה",
  COMPLETED: "הושלמה"
};

export const clinicalRotationPaymentStatusLabels: Record<ClinicalRotationPaymentStatusValue, string> = {
  NOT_REQUIRED: "לא נדרש",
  CASH_DUE: "לתשלום במזומן",
  LINK_PENDING: "ממתין לשליחת קישור",
  LINK_SENT: "קישור נשלח",
  PAID: "שולם",
  WAIVED: "ויתרו על תשלום",
  OVERDUE: "באיחור"
};

type DateRangeLike = {
  startsAt: Date;
  endsAt: Date;
};

export function parseClinicalRotationDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatClinicalRotationDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function startOfCalendarDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function endOfCalendarDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

export function clinicalRotationRangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA <= endB && startB <= endA;
}

export function clinicalRotationRangeContains(outerStart: Date, outerEnd: Date, innerStart: Date, innerEnd: Date) {
  return outerStart <= innerStart && outerEnd >= innerEnd;
}

export function clinicalRotationDaysInclusive(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function clinicalRotationWeeksInclusive(start: Date, end: Date) {
  return Math.max(1, Math.ceil(clinicalRotationDaysInclusive(startOfCalendarDay(start), endOfCalendarDay(end)) / 7));
}

export function isHttpsUrl(value?: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isClinicalRotationDateRangeAllowed(input: {
  requestedStartAt: Date;
  requestedEndAt: Date;
  openWindows: DateRangeLike[];
  blackouts: DateRangeLike[];
  offering?: DateRangeLike | null;
}) {
  const requestedStartAt = startOfCalendarDay(input.requestedStartAt);
  const requestedEndAt = endOfCalendarDay(input.requestedEndAt);

  if (requestedEndAt < requestedStartAt) {
    return { ok: false as const, code: "INVALID_RANGE", error: "תאריך הסיום חייב להיות אחרי תאריך ההתחלה." };
  }

  if (input.offering) {
    const offeringStart = startOfCalendarDay(input.offering.startsAt);
    const offeringEnd = endOfCalendarDay(input.offering.endsAt);
    if (!clinicalRotationRangeContains(offeringStart, offeringEnd, requestedStartAt, requestedEndAt)) {
      return { ok: false as const, code: "OUTSIDE_OFFERING", error: "התאריכים אינם בתוך טווח הסבב שפורסם." };
    }
  }

  const containedByOpenWindow = input.openWindows.some((window) =>
    clinicalRotationRangeContains(
      startOfCalendarDay(window.startsAt),
      endOfCalendarDay(window.endsAt),
      requestedStartAt,
      requestedEndAt
    )
  );

  if (!containedByOpenWindow) {
    return {
      ok: false as const,
      code: "DEFAULT_CLOSED",
      error: "בית החולים סגור כברירת מחדל. יש לבחור תאריכים בתוך חלון פתוח."
    };
  }

  const overlapsBlackout = input.blackouts.some((blackout) =>
    clinicalRotationRangesOverlap(
      requestedStartAt,
      requestedEndAt,
      startOfCalendarDay(blackout.startsAt),
      endOfCalendarDay(blackout.endsAt)
    )
  );

  if (overlapsBlackout) {
    return { ok: false as const, code: "BLACKOUT", error: "התאריכים חופפים לתקופת סגירה של בית החולים." };
  }

  return {
    ok: true as const,
    weeks: clinicalRotationWeeksInclusive(requestedStartAt, requestedEndAt)
  };
}

export function validateClinicalRotationOfferingPublishInput(input: {
  hospitalId?: string | null;
  specialtyId?: string | null;
  displayName?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  minimumParticipants?: number | null;
  maximumCapacity?: number | null;
  priceAmount?: number | null;
  paymentMethod?: string | null;
  paymentLink?: string | null;
  openWindows: DateRangeLike[];
  blackouts: DateRangeLike[];
}) {
  if (!input.hospitalId) return { ok: false as const, error: "יש לבחור בית חולים." };
  if (!input.specialtyId) return { ok: false as const, error: "יש לבחור תחום/מחלקה." };
  if (!input.displayName?.trim()) return { ok: false as const, error: "יש להזין שם ציבורי לסבב." };
  if (!input.startsAt || !input.endsAt) return { ok: false as const, error: "יש להזין תאריכי התחלה וסיום." };
  if (!input.minimumParticipants || input.minimumParticipants < 1) {
    return { ok: false as const, error: "מספר משתתפים מינימלי חייב להיות לפחות 1." };
  }
  if (input.maximumCapacity !== null && input.maximumCapacity !== undefined && input.maximumCapacity < input.minimumParticipants) {
    return { ok: false as const, error: "קיבולת מקסימלית לא יכולה להיות נמוכה ממספר המשתתפים המינימלי." };
  }
  if (input.priceAmount === null || input.priceAmount === undefined || input.priceAmount < 0) {
    return { ok: false as const, error: "יש להזין סכום תשלום תקין." };
  }
  if (!clinicalRotationPaymentMethodValues.includes(input.paymentMethod as ClinicalRotationPaymentMethodValue)) {
    return { ok: false as const, error: "יש לבחור שיטת תשלום." };
  }
  if (input.paymentMethod === "EXTERNAL_PAYMENT_LINK" && !isHttpsUrl(input.paymentLink)) {
    return { ok: false as const, error: "בסוג תשלום חיצוני נדרש קישור HTTPS תקין." };
  }

  const dateValidation = isClinicalRotationDateRangeAllowed({
    requestedStartAt: input.startsAt,
    requestedEndAt: input.endsAt,
    openWindows: input.openWindows,
    blackouts: input.blackouts
  });

  if (!dateValidation.ok) {
    return { ok: false as const, error: dateValidation.error };
  }

  return { ok: true as const };
}

export function inferClinicalRotationCoreSpecialty(specialtyName: string) {
  const normalized = specialtyName.trim().toLowerCase();
  if (/(internal|פנימית|רפואה פנימית)/i.test(normalized)) return "INTERNAL_MEDICINE" as const;
  if (/(general surgery|כירורגיה כללית)/i.test(normalized)) return "GENERAL_SURGERY" as const;
  if (/(pediatrics|paediatrics|ילדים)/i.test(normalized)) return "PEDIATRICS" as const;
  if (/(obstetrics|gynecology|gynaecology|נשים|יולדות|גניקולוגיה|גינקולוגיה)/i.test(normalized)) {
    return "OBSTETRICS_GYNECOLOGY" as const;
  }
  return null;
}

export function evaluateClinicalRotationCoreLimit(input: {
  completedWeeks: number;
  futureApprovedWeeks: number;
  requestedWeeks: number;
  rule?: {
    maxWeeks: number;
    enforcementMode: ClinicalRotationCoreRuleEnforcementModeValue;
  } | null;
}) {
  const completedWeeks = Math.max(0, input.completedWeeks);
  const futureApprovedWeeks = Math.max(0, input.futureApprovedWeeks);
  const requestedWeeks = Math.max(0, input.requestedWeeks);

  if (!input.rule) {
    return {
      action: "allow" as const,
      completedWeeks,
      futureApprovedWeeks,
      requestedWeeks,
      totalApprovedAndRequestedWeeks: completedWeeks + futureApprovedWeeks + requestedWeeks,
      maxWeeks: null,
      enforcementMode: null,
      exceeds: false,
      reaches: false,
      approaching: false,
      message: null
    };
  }

  const maxWeeks = input.rule.maxWeeks;
  const totalApprovedAndRequestedWeeks = completedWeeks + futureApprovedWeeks + requestedWeeks;
  const exceeds = totalApprovedAndRequestedWeeks > maxWeeks;
  const reaches = totalApprovedAndRequestedWeeks === maxWeeks;
  const approaching = !exceeds && !reaches && totalApprovedAndRequestedWeeks >= Math.max(0, maxWeeks - 1);
  const action =
    exceeds && input.rule.enforcementMode === "BLOCK"
      ? "block"
      : exceeds || reaches || approaching
        ? "warn"
        : "allow";

  return {
    action,
    completedWeeks,
    futureApprovedWeeks,
    requestedWeeks,
    totalApprovedAndRequestedWeeks,
    maxWeeks,
    enforcementMode: input.rule.enforcementMode,
    exceeds,
    reaches,
    approaching,
    message:
      action === "block"
        ? "הבקשה חורגת מהמגבלה הפעילה ולכן חסומה."
        : action === "warn"
          ? "הבקשה מתקרבת למגבלת משרד הבריאות או חורגת ממנה."
          : null
  };
}

export function summarizeClinicalRotationDashboard(input: {
  now?: Date;
  applications: Array<{
    status: ClinicalRotationApplicationStatusValue;
    requestedStartAt: Date;
    requestedEndAt: Date;
    coreSpecialty?: ClinicalRotationCoreSpecialtyValue | null;
  }>;
  rules?: Array<{
    coreSpecialty: ClinicalRotationCoreSpecialtyValue;
    maxWeeks: number;
    enforcementMode: ClinicalRotationCoreRuleEnforcementModeValue;
  }>;
}) {
  const now = input.now ?? new Date();
  const buckets = {
    pending: 0,
    approved: 0,
    declined: 0,
    cancelled: 0,
    upcoming: 0,
    completed: 0
  };
  const byCoreSpecialty = new Map<ClinicalRotationCoreSpecialtyValue, {
    coreSpecialty: ClinicalRotationCoreSpecialtyValue;
    completedWeeks: number;
    futureApprovedWeeks: number;
    ruleLimitWeeks: number | null;
    enforcementMode: ClinicalRotationCoreRuleEnforcementModeValue | null;
    warning: string | null;
  }>();

  for (const application of input.applications) {
    if (application.status === "SUBMITTED" || application.status === "DRAFT") buckets.pending += 1;
    if (application.status === "APPROVED") buckets.approved += 1;
    if (application.status === "DECLINED") buckets.declined += 1;
    if (application.status === "CANCELLED") buckets.cancelled += 1;
    if (application.status === "COMPLETED") buckets.completed += 1;
    if (application.status === "APPROVED" && application.requestedStartAt > now) buckets.upcoming += 1;

    if (!application.coreSpecialty) {
      continue;
    }

    const current = byCoreSpecialty.get(application.coreSpecialty) ?? {
      coreSpecialty: application.coreSpecialty,
      completedWeeks: 0,
      futureApprovedWeeks: 0,
      ruleLimitWeeks: null,
      enforcementMode: null,
      warning: null
    };
    const weeks = clinicalRotationWeeksInclusive(application.requestedStartAt, application.requestedEndAt);

    if (application.status === "COMPLETED") {
      current.completedWeeks += weeks;
    }

    if (application.status === "APPROVED" && application.requestedStartAt >= now) {
      current.futureApprovedWeeks += weeks;
    }

    byCoreSpecialty.set(application.coreSpecialty, current);
  }

  for (const rule of input.rules ?? []) {
    const current = byCoreSpecialty.get(rule.coreSpecialty) ?? {
      coreSpecialty: rule.coreSpecialty,
      completedWeeks: 0,
      futureApprovedWeeks: 0,
      ruleLimitWeeks: null,
      enforcementMode: null,
      warning: null
    };
    const evaluation = evaluateClinicalRotationCoreLimit({
      completedWeeks: current.completedWeeks,
      futureApprovedWeeks: current.futureApprovedWeeks,
      requestedWeeks: 0,
      rule
    });
    current.ruleLimitWeeks = rule.maxWeeks;
    current.enforcementMode = rule.enforcementMode;
    current.warning = evaluation.action === "allow" ? null : evaluation.message;
    byCoreSpecialty.set(rule.coreSpecialty, current);
  }

  return {
    buckets,
    byCoreSpecialty: Array.from(byCoreSpecialty.values()).sort((left, right) =>
      clinicalRotationCoreSpecialtyLabels[left.coreSpecialty].localeCompare(
        clinicalRotationCoreSpecialtyLabels[right.coreSpecialty],
        "he"
      )
    )
  };
}

export function canManageClinicalRotationHospital(input: {
  sessionRole: "student" | "resident" | "representative" | "admin";
  userId: string;
  hospitalId: string;
  accesses: Array<{ userId: string; hospitalId: string; isActive: boolean }>;
}) {
  if (input.sessionRole === "admin") {
    return true;
  }

  if (input.sessionRole !== "representative") {
    return false;
  }

  return input.accesses.some(
    (access) =>
      access.userId === input.userId &&
      access.hospitalId === input.hospitalId &&
      access.isActive
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildClinicalRotationPaymentLinkEmailPayload(input: {
  studentName: string;
  studentEmail: string;
  hospitalName: string;
  offeringName: string;
  dateRange: string;
  amountLabel: string;
  paymentLink: string;
  dashboardUrl: string;
}) {
  const safeStudentName = escapeHtml(input.studentName);
  const safeHospitalName = escapeHtml(input.hospitalName);
  const safeOfferingName = escapeHtml(input.offeringName);
  const safeDateRange = escapeHtml(input.dateRange);
  const safeAmountLabel = escapeHtml(input.amountLabel);
  const safePaymentLink = escapeHtml(input.paymentLink);
  const safeDashboardUrl = escapeHtml(input.dashboardUrl);

  return {
    to: input.studentEmail,
    subject: `קישור לתשלום סבב קליני - ${input.hospitalName}`,
    text: [
      `שלום ${input.studentName},`,
      `הבקשה שלך לסבב ${input.offeringName} בבית החולים ${input.hospitalName} אושרה.`,
      `תאריכים: ${input.dateRange}`,
      `סכום: ${input.amountLabel}`,
      `קישור לתשלום: ${input.paymentLink}`,
      "פתיחת הקישור אינה מסמנת תשלום כהושלם. בית החולים או אדמין יעדכנו סטטוס לאחר אימות.",
      `מעקב אחר הסבבים שלי: ${input.dashboardUrl}`
    ].join("\n"),
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7">
        <p>שלום ${safeStudentName},</p>
        <p>הבקשה שלך לסבב ${safeOfferingName} בבית החולים ${safeHospitalName} אושרה.</p>
        <ul>
          <li><strong>תאריכים:</strong> ${safeDateRange}</li>
          <li><strong>סכום:</strong> ${safeAmountLabel}</li>
        </ul>
        <p><a href="${safePaymentLink}">פתיחת קישור התשלום</a></p>
        <p>פתיחת הקישור אינה מסמנת תשלום כהושלם. בית החולים או אדמין יעדכנו סטטוס לאחר אימות.</p>
        <p><a href="${safeDashboardUrl}">מעקב אחר הסבבים שלי</a></p>
      </div>
    `
  };
}
