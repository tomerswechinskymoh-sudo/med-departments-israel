import { notFound } from "next/navigation";
import { ElectiveApplicationStatus } from "@prisma/client";
import { getSession, type AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCanonicalInstitutionRegion } from "@/lib/regions";
export {
  daysInclusive,
  formatDateInput,
  getAvailabilitySummary,
  parseDateOnly,
  rangeContains,
  rangesOverlap,
  validateElectiveApplicationRequest
} from "@/lib/elective-availability";
import {
  countApprovedApplicationsOverlappingRange,
  formatDateInput,
  isDateRangeAllowedForDepartment,
  parseDateOnly
} from "@/lib/elective-availability";

type SearchParamValue = string | string[] | undefined;

export type StudentElectiveSearchInput = {
  start?: SearchParamValue;
  end?: SearchParamValue;
  specialties?: SearchParamValue;
  specialty?: SearchParamValue;
  regions?: SearchParamValue;
  region?: SearchParamValue;
  search?: SearchParamValue;
};

type ElectiveDepartmentForAvailability = {
  id: string;
  electiveSettings: {
    availabilityMode: "OPEN_BY_DEFAULT" | "CLOSED_BY_DEFAULT";
    maxStudentsAtOnce: number | null;
    minDurationDays?: number | null;
    maxDurationDays?: number | null;
    allowApplications?: boolean | null;
  } | null;
  electiveAvailabilityWindows: Array<{
    status: "OPEN" | "CLOSED";
    startsAt: Date;
    endsAt: Date;
    capacityOverride?: number | null;
  }>;
};

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function splitMultiValue(value: SearchParamValue) {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return Array.from(
    new Set(
      values
        .flatMap((entry) => entry.split(","))
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

function safeDecodeSlug(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseStudentElectiveSearch(input?: StudentElectiveSearchInput) {
  const specialties = splitMultiValue(input?.specialties);
  const legacySpecialties = splitMultiValue(input?.specialty);
  const regions = splitMultiValue(input?.regions);
  const legacyRegions = splitMultiValue(input?.region);

  return {
    start: firstValue(input?.start)?.trim() ?? "",
    end: firstValue(input?.end)?.trim() ?? "",
    search: firstValue(input?.search)?.trim() ?? "",
    specialties: Array.from(new Set([...specialties, ...legacySpecialties])),
    regions: Array.from(new Set([...regions, ...legacyRegions]))
  };
}

export function isElectiveSearchComplete(search: ReturnType<typeof parseStudentElectiveSearch>) {
  return hasCompleteElectiveDateRange(search);
}

export function hasCompleteElectiveDateRange(search: ReturnType<typeof parseStudentElectiveSearch>) {
  return Boolean(search.start && search.end && parseDateOnly(search.start) && parseDateOnly(search.end));
}

export function hasPartialElectiveDateRange(search: ReturnType<typeof parseStudentElectiveSearch>) {
  return Boolean((search.start && !search.end) || (!search.start && search.end));
}

export function createElectiveSearchQuery(search: ReturnType<typeof parseStudentElectiveSearch>) {
  const params = new URLSearchParams();

  if (search.start) params.set("start", search.start);
  if (search.end) params.set("end", search.end);
  if (search.specialties.length > 0) params.set("specialties", search.specialties.join(","));
  if (search.regions.length > 0) params.set("regions", search.regions.join(","));
  if (search.search) params.set("search", search.search);

  return params;
}

export function buildElectiveDepartmentHref(slug: string, search?: ReturnType<typeof parseStudentElectiveSearch>) {
  const query = search ? createElectiveSearchQuery(search).toString() : "";
  return `/electives/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
}

export function buildElectiveApplyHref(slug: string, search?: ReturnType<typeof parseStudentElectiveSearch>) {
  const query = search ? createElectiveSearchQuery(search).toString() : "";
  return `/electives/${encodeURIComponent(slug)}/apply${query ? `?${query}` : ""}`;
}

export function getAvailabilityModeLabel(mode?: string | null) {
  if (mode === "OPEN_BY_DEFAULT") return "פתוח בדרך כלל";
  if (mode === "CLOSED_BY_DEFAULT") return "פתוח רק בחלונות מוגדרים";
  return "לא הוגדר";
}

export function isStudentElectivesPreviewEnabled() {
  return process.env.ENABLE_STUDENT_ELECTIVES_PREVIEW === "true" || process.env.ENABLE_STUDENT_ELECTIVES_PREVIEW === "1";
}

export function isStudentElectivesPublicEnabled() {
  // Future launch switch. Keep false unless explicitly enabled after product approval.
  return process.env.ENABLE_STUDENT_ELECTIVES_PUBLIC === "true" || process.env.ENABLE_STUDENT_ELECTIVES_PUBLIC === "1";
}

export type StudentElectivesAccess =
  | { ok: true; mode: "admin_preview" | "public"; session: AppSession }
  | { ok: false; status: "disabled" | "admin_required" | "login_required" };

export async function getStudentElectivesAccess(): Promise<StudentElectivesAccess> {
  if (!isStudentElectivesPreviewEnabled()) {
    return { ok: false, status: "disabled" };
  }

  const session = await getSession();

  if (isStudentElectivesPublicEnabled()) {
    return session ? { ok: true, mode: "public", session } : { ok: false, status: "login_required" };
  }

  if (!session || session.role !== "admin") {
    return { ok: false, status: "admin_required" };
  }

  return { ok: true, mode: "admin_preview", session };
}

export async function requireStudentElectivesPreviewAccess() {
  const access = await getStudentElectivesAccess();

  if (!access.ok) {
    notFound();
  }

  return access;
}

export function requireStudentElectivesPreviewEnabled() {
  if (!isStudentElectivesPreviewEnabled()) {
    notFound();
  }
}

export async function getElectiveDepartmentBySlug(departmentSlug: string) {
  const decodedSlug = safeDecodeSlug(departmentSlug);
  const slugCandidates = Array.from(new Set([departmentSlug, decodedSlug]));

  return prisma.department.findFirst({
    where: {
      OR: [{ slug: { in: slugCandidates } }, { id: decodedSlug }],
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

export async function getElectiveSearchOptions() {
  const departments = await prisma.department.findMany({
    where: {
      electiveSettings: {
        allowApplications: true
      }
    },
    select: {
      institution: { select: { name: true, city: true, region: true } },
      specialty: { select: { name: true } }
    },
    orderBy: [{ specialty: { name: "asc" } }, { institution: { name: "asc" } }]
  });

  return {
    specialties: Array.from(new Set(departments.map((department) => department.specialty.name))).sort(),
    regions: Array.from(new Set(departments.map((department) => getElectiveDepartmentRegion(department)))).sort()
  };
}

export async function getElectiveDepartmentAvailabilityMatch(
  department: ElectiveDepartmentForAvailability,
  requestedStartDate: Date,
  requestedEndDate: Date
) {
  const range = isDateRangeAllowedForDepartment({
    settings: department.electiveSettings,
    windows: department.electiveAvailabilityWindows,
    requestedStartDate,
    requestedEndDate
  });

  if (!range.ok) {
    return {
      ok: false as const,
      error: range.error,
      capacity: null,
      approvedOverlapCount: null,
      remainingCapacity: null
    };
  }

  const approvedOverlapCount = await countApprovedApplicationsOverlappingRange({
    departmentId: department.id,
    requestedStartDate,
    requestedEndDate
  });
  const remainingCapacity = Math.max(range.capacity - approvedOverlapCount, 0);

  if (remainingCapacity <= 0) {
    return {
      ok: false as const,
      error: "אין קיבולת פנויה בתאריכים שנבחרו.",
      capacity: range.capacity,
      approvedOverlapCount,
      remainingCapacity
    };
  }

  return {
    ok: true as const,
    error: null,
    capacity: range.capacity,
    approvedOverlapCount,
    remainingCapacity
  };
}

export async function listElectiveDepartments(input?: StudentElectiveSearchInput) {
  const parsed = parseStudentElectiveSearch(input);
  const requestedStartDate = parseDateOnly(parsed.start);
  const requestedEndDate = parseDateOnly(parsed.end);
  const shouldApplyDateMatching = hasCompleteElectiveDateRange(parsed) && requestedStartDate && requestedEndDate;

  const departments = await prisma.department.findMany({
    where: {
      electiveSettings: {
        allowApplications: true
      },
      ...(parsed.search
        ? {
            OR: [
              { name: { contains: parsed.search, mode: "insensitive" } },
              { institution: { name: { contains: parsed.search, mode: "insensitive" } } },
              { specialty: { name: { contains: parsed.search, mode: "insensitive" } } }
            ]
          }
        : {}),
      ...(parsed.specialties.length > 0 ? { specialty: { name: { in: parsed.specialties } } } : {})
    },
    include: {
      institution: { select: { name: true, city: true, region: true, slug: true, coverImageUrl: true } },
      specialty: { select: { name: true } },
      electiveSettings: true,
      electiveAvailabilityWindows: {
        orderBy: [{ startsAt: "asc" }, { endsAt: "asc" }],
        take: 8
      },
      electiveApplications: {
        where: {
          status: {
            in: [
              ElectiveApplicationStatus.ACCEPTED,
              ElectiveApplicationStatus.APPROVED,
              ElectiveApplicationStatus.ALTERNATIVE_ACCEPTED
            ]
          },
          requestedStartDate: { not: null },
          requestedEndDate: { not: null }
        },
        select: {
          id: true,
          requestedStartDate: true,
          requestedEndDate: true,
          status: true
        }
      },
      reviews: {
        where: { reviewerType: "STUDENT" },
        select: { overallRecommendation: true }
      }
    },
    orderBy: [{ institution: { name: "asc" } }, { specialty: { name: "asc" } }, { name: "asc" }]
  });

  const regionFiltered = parsed.regions.length > 0
    ? departments.filter((department) => parsed.regions.includes(getElectiveDepartmentRegion(department)))
    : departments;

  if (!shouldApplyDateMatching) {
    return regionFiltered.map((department) => ({
      ...department,
      electiveMatch: null
    }));
  }

  const departmentsWithMatches = [];

  for (const department of regionFiltered) {
    const electiveMatch = await getElectiveDepartmentAvailabilityMatch(department, requestedStartDate, requestedEndDate);
    departmentsWithMatches.push({
      ...department,
      electiveMatch
    });
  }

  return departmentsWithMatches;
}

export function getElectiveDepartmentRegion(department: {
  institution: { name?: string | null; city?: string | null; region?: string | null };
}) {
  return resolveCanonicalInstitutionRegion(department.institution);
}
