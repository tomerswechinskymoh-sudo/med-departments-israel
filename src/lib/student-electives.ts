import { notFound } from "next/navigation";
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
