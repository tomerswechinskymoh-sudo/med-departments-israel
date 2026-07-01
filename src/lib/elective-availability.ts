import { ElectiveAvailabilityMode, ElectiveApplicationStatus, ElectiveWindowStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ELECTIVE_CAPACITY_STATUSES: ElectiveApplicationStatus[] = [
  ElectiveApplicationStatus.ACCEPTED,
  ElectiveApplicationStatus.APPROVED,
  ElectiveApplicationStatus.ALTERNATIVE_ACCEPTED
];

export function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA <= endB && startB <= endA;
}

export function rangeContains(outerStart: Date, outerEnd: Date, innerStart: Date, innerEnd: Date) {
  return outerStart <= innerStart && outerEnd >= innerEnd;
}

export function daysInclusive(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

type ElectiveSettingsLike = {
  availabilityMode: ElectiveAvailabilityMode;
  maxStudentsAtOnce: number | null;
  minDurationDays?: number | null;
  maxDurationDays?: number | null;
  allowApplications?: boolean | null;
};

type ElectiveWindowLike = {
  status: ElectiveWindowStatus;
  startsAt: Date;
  endsAt: Date;
  capacityOverride?: number | null;
};

export function getEffectiveCapacityForRange(input: {
  settings: ElectiveSettingsLike | null;
  windows: ElectiveWindowLike[];
  requestedStartDate: Date;
  requestedEndDate: Date;
}) {
  if (!input.settings?.maxStudentsAtOnce) {
    return null;
  }

  const overlappingOpenWindow = input.windows
    .filter(
      (window) =>
        window.status === ElectiveWindowStatus.OPEN &&
        window.capacityOverride &&
        rangesOverlap(input.requestedStartDate, input.requestedEndDate, window.startsAt, window.endsAt)
    )
    .sort((a, b) => (a.capacityOverride ?? input.settings!.maxStudentsAtOnce ?? 0) - (b.capacityOverride ?? input.settings!.maxStudentsAtOnce ?? 0))[0];

  return overlappingOpenWindow?.capacityOverride ?? input.settings.maxStudentsAtOnce;
}

export function isDateRangeAllowedForDepartment(input: {
  settings: ElectiveSettingsLike | null;
  windows: ElectiveWindowLike[];
  requestedStartDate: Date;
  requestedEndDate: Date;
}) {
  const { settings, windows, requestedStartDate, requestedEndDate } = input;

  if (!settings?.allowApplications) {
    return { ok: false as const, error: "המחלקה אינה פתוחה למועמדויות אלקטיב." };
  }

  if (requestedEndDate < requestedStartDate) {
    return { ok: false as const, error: "תאריך הסיום חייב להיות אחרי תאריך ההתחלה." };
  }

  const durationDays = daysInclusive(requestedStartDate, requestedEndDate);

  if (settings.minDurationDays && durationDays < settings.minDurationDays) {
    return { ok: false as const, error: `משך האלקטיב קצר מהמינימום שהוגדר: ${settings.minDurationDays} ימים.` };
  }

  if (settings.maxDurationDays && durationDays > settings.maxDurationDays) {
    return { ok: false as const, error: `משך האלקטיב ארוך מהמקסימום שהוגדר: ${settings.maxDurationDays} ימים.` };
  }

  const overlappingWindows = windows.filter((window) => rangesOverlap(requestedStartDate, requestedEndDate, window.startsAt, window.endsAt));

  if (settings.availabilityMode === ElectiveAvailabilityMode.CLOSED_BY_DEFAULT) {
    const containedByOpenWindow = overlappingWindows.some(
      (window) =>
        window.status === ElectiveWindowStatus.OPEN &&
        rangeContains(window.startsAt, window.endsAt, requestedStartDate, requestedEndDate)
    );

    if (!containedByOpenWindow) {
      return { ok: false as const, error: "המחלקה סגורה כברירת מחדל. יש לבחור תאריכים בתוך חלון פתוח." };
    }
  }

  if (
    settings.availabilityMode === ElectiveAvailabilityMode.OPEN_BY_DEFAULT &&
    overlappingWindows.some((window) => window.status === ElectiveWindowStatus.CLOSED)
  ) {
    return { ok: false as const, error: "התאריכים שנבחרו חופפים לחלון חסום." };
  }

  const capacity = getEffectiveCapacityForRange({
    settings,
    windows,
    requestedStartDate,
    requestedEndDate
  });

  if (!capacity) {
    return { ok: false as const, error: "לא הוגדרה קיבולת למחלקה. יש לפנות למנהל/ת המערכת." };
  }

  return { ok: true as const, capacity, overlappingWindows };
}

export async function countApprovedApplicationsOverlappingRange(input: {
  departmentId: string;
  requestedStartDate: Date;
  requestedEndDate: Date;
}) {
  return prisma.electiveApplication.count({
    where: {
      departmentId: input.departmentId,
      status: { in: ELECTIVE_CAPACITY_STATUSES },
      requestedStartDate: { lte: input.requestedEndDate },
      requestedEndDate: { gte: input.requestedStartDate }
    }
  });
}

export async function countPendingApplicationsOverlappingRange(input: {
  departmentId: string;
  requestedStartDate: Date;
  requestedEndDate: Date;
}) {
  return prisma.electiveApplication.count({
    where: {
      departmentId: input.departmentId,
      status: { in: [ElectiveApplicationStatus.SUBMITTED, ElectiveApplicationStatus.UNDER_REVIEW, ElectiveApplicationStatus.WAITLISTED] },
      requestedStartDate: { lte: input.requestedEndDate },
      requestedEndDate: { gte: input.requestedStartDate }
    }
  });
}

export function getAvailabilitySummary(department: {
  electiveSettings: { availabilityMode: ElectiveAvailabilityMode; maxStudentsAtOnce: number } | null;
  electiveAvailabilityWindows: Array<{ status: ElectiveWindowStatus; startsAt: Date; endsAt: Date }>;
}) {
  const settings = department.electiveSettings;

  if (!settings) {
    return "טרם הוגדרו הגדרות אלקטיב.";
  }

  const openWindows = department.electiveAvailabilityWindows.filter((window) => window.status === ElectiveWindowStatus.OPEN);
  const closedWindows = department.electiveAvailabilityWindows.filter((window) => window.status === ElectiveWindowStatus.CLOSED);

  if (settings.availabilityMode === ElectiveAvailabilityMode.OPEN_BY_DEFAULT) {
    return closedWindows.length > 0
      ? `פתוח כברירת מחדל, עם ${closedWindows.length} חלונות חסומים.`
      : "פתוח כברירת מחדל, ללא חלונות חסומים כרגע.";
  }

  return openWindows.length > 0 ? `${openWindows.length} חלונות פתוחים הוגדרו.` : "סגור כברירת מחדל, ללא חלונות פתוחים כרגע.";
}

export async function validateElectiveApplicationRequest(input: {
  departmentId: string;
  requestedStartDate: Date;
  requestedEndDate: Date;
}) {
  const department = await prisma.department.findUnique({
    where: { id: input.departmentId },
    include: {
      electiveSettings: true,
      electiveAvailabilityWindows: true
    }
  });

  const range = isDateRangeAllowedForDepartment({
    settings: department?.electiveSettings ?? null,
    windows: department?.electiveAvailabilityWindows ?? [],
    requestedStartDate: input.requestedStartDate,
    requestedEndDate: input.requestedEndDate
  });

  if (!department || !range.ok) {
    return { ok: false as const, error: range.ok ? "המחלקה לא נמצאה." : range.error };
  }

  const approvedOverlapCount = await countApprovedApplicationsOverlappingRange(input);

  if (approvedOverlapCount >= range.capacity) {
    return { ok: false as const, error: "אין קיבולת זמינה בתאריכים שנבחרו." };
  }

  return { ok: true as const, department, capacity: range.capacity, approvedOverlapCount };
}
