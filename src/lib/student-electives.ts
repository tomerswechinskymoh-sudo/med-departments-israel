import { notFound } from "next/navigation";
import { ElectiveAvailabilityMode, ElectiveApplicationStatus, ElectiveWindowStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCanonicalInstitutionRegion } from "@/lib/regions";

const APPLICATION_CAPACITY_STATUSES: ElectiveApplicationStatus[] = [
  ElectiveApplicationStatus.ACCEPTED,
  ElectiveApplicationStatus.APPROVED
];

export function isStudentElectivesPreviewEnabled() {
  return process.env.ENABLE_STUDENT_ELECTIVES_PREVIEW === "true" || process.env.ENABLE_STUDENT_ELECTIVES_PREVIEW === "1";
}

export function requireStudentElectivesPreviewEnabled() {
  if (!isStudentElectivesPreviewEnabled()) {
    notFound();
  }
}

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

export async function getElectiveDepartmentBySlug(departmentSlug: string) {
  return prisma.department.findFirst({
    where: {
      slug: departmentSlug,
      electiveSettings: {
        allowApplications: true
      }
    },
    include: {
      institution: { select: { name: true, city: true, region: true, slug: true, coverImageUrl: true } },
      specialty: { select: { name: true } },
      electiveSettings: true,
      electiveAvailabilityWindows: {
        orderBy: [{ startsAt: "asc" }, { endsAt: "asc" }]
      }
    }
  });
}

export async function listElectiveDepartments(input?: { search?: string; specialty?: string; region?: string }) {
  const search = input?.search?.trim();
  const specialty = input?.specialty?.trim();
  const region = input?.region?.trim();

  const departments = await prisma.department.findMany({
    where: {
      electiveSettings: {
        allowApplications: true
      },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { institution: { name: { contains: search, mode: "insensitive" } } },
              { specialty: { name: { contains: search, mode: "insensitive" } } }
            ]
          }
        : {}),
      ...(specialty ? { specialty: { name: specialty } } : {})
    },
    include: {
      institution: { select: { name: true, city: true, region: true, slug: true, coverImageUrl: true } },
      specialty: { select: { name: true } },
      electiveSettings: true,
      electiveAvailabilityWindows: {
        orderBy: [{ startsAt: "asc" }, { endsAt: "asc" }],
        take: 8
      }
    },
    orderBy: [{ institution: { name: "asc" } }, { specialty: { name: "asc" } }, { name: "asc" }]
  });

  return region
    ? departments.filter((department) => getElectiveDepartmentRegion(department) === region)
    : departments;
}

export function getElectiveDepartmentRegion(department: {
  institution: { name?: string | null; city?: string | null; region?: string | null };
}) {
  return resolveCanonicalInstitutionRegion(department.institution);
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

  if (!department?.electiveSettings?.allowApplications) {
    return { ok: false as const, error: "המחלקה אינה פתוחה למועמדויות אלקטיב." };
  }

  const settings = department.electiveSettings;

  if (input.requestedEndDate < input.requestedStartDate) {
    return { ok: false as const, error: "תאריך הסיום חייב להיות אחרי תאריך ההתחלה." };
  }

  const durationDays = daysInclusive(input.requestedStartDate, input.requestedEndDate);

  if (settings.minDurationDays && durationDays < settings.minDurationDays) {
    return { ok: false as const, error: `משך האלקטיב קצר מהמינימום שהוגדר: ${settings.minDurationDays} ימים.` };
  }

  if (settings.maxDurationDays && durationDays > settings.maxDurationDays) {
    return { ok: false as const, error: `משך האלקטיב ארוך מהמקסימום שהוגדר: ${settings.maxDurationDays} ימים.` };
  }

  const overlappingWindows = department.electiveAvailabilityWindows.filter((window) =>
    rangesOverlap(input.requestedStartDate, input.requestedEndDate, window.startsAt, window.endsAt)
  );

  if (settings.availabilityMode === ElectiveAvailabilityMode.CLOSED_BY_DEFAULT) {
    const containedByOpenWindow = overlappingWindows.some(
      (window) =>
        window.status === ElectiveWindowStatus.OPEN &&
        rangeContains(window.startsAt, window.endsAt, input.requestedStartDate, input.requestedEndDate)
    );

    if (!containedByOpenWindow) {
      return { ok: false as const, error: "המחלקה סגורה כברירת מחדל. יש לבחור תאריכים בתוך חלון פתוח." };
    }
  }

  if (settings.availabilityMode === ElectiveAvailabilityMode.OPEN_BY_DEFAULT && overlappingWindows.some((window) => window.status === ElectiveWindowStatus.CLOSED)) {
    return { ok: false as const, error: "התאריכים שנבחרו חופפים לחלון חסום." };
  }

  const capacityWindow = overlappingWindows
    .filter((window) => window.status === ElectiveWindowStatus.OPEN && window.capacityOverride)
    .sort((a, b) => (a.capacityOverride ?? settings.maxStudentsAtOnce) - (b.capacityOverride ?? settings.maxStudentsAtOnce))[0];
  const capacity = capacityWindow?.capacityOverride ?? settings.maxStudentsAtOnce;

  const approvedOverlapCount = await prisma.electiveApplication.count({
    where: {
      departmentId: input.departmentId,
      status: { in: APPLICATION_CAPACITY_STATUSES },
      requestedStartDate: { lte: input.requestedEndDate },
      requestedEndDate: { gte: input.requestedStartDate }
    }
  });

  if (approvedOverlapCount >= capacity) {
    return { ok: false as const, error: "אין קיבולת זמינה בתאריכים שנבחרו." };
  }

  return { ok: true as const, department, capacity };
}
