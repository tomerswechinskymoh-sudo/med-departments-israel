import { notFound } from "next/navigation";
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
