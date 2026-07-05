import { NextResponse } from "next/server";
import {
  buildElectiveDepartmentHref,
  getAvailabilityModeLabel,
  getAvailabilitySummary,
  getElectiveDepartmentRegion,
  getStudentElectivesAccess,
  listElectiveDepartments,
  parseStudentElectiveSearch,
  hasCompleteElectiveDateRange
} from "@/lib/student-electives";

export async function GET(request: Request) {
  const access = await getStudentElectivesAccess();

  if (!access.ok) {
    return NextResponse.json({ error: "תצוגת אלקטיבים אינה פעילה כרגע." }, { status: 404 });
  }

  const url = new URL(request.url);
  const specialties = url.searchParams.getAll("specialties");
  const regions = url.searchParams.getAll("regions");
  const searchInput = {
    search: url.searchParams.get("search") ?? undefined,
    start: url.searchParams.get("start") ?? undefined,
    end: url.searchParams.get("end") ?? undefined,
    specialties: specialties.length > 0 ? specialties : url.searchParams.get("specialties") ?? url.searchParams.get("specialty") ?? undefined,
    regions: regions.length > 0 ? regions : url.searchParams.get("regions") ?? url.searchParams.get("region") ?? undefined
  };
  const parsedSearch = parseStudentElectiveSearch(searchInput);
  const hasDateRange = hasCompleteElectiveDateRange(parsedSearch);
  const departments = await listElectiveDepartments(searchInput);

  return NextResponse.json({
    ok: true,
    dateRangeSelected: hasDateRange,
    departments: departments.map((department) => ({
      id: department.id,
      slug: department.slug,
      href: buildElectiveDepartmentHref(department.slug),
      name: department.name,
      hospital: department.institution.name,
      city: department.institution.city,
      region: getElectiveDepartmentRegion(department),
      specialty: department.specialty.name,
      maxStudentsAtOnce: department.electiveSettings?.maxStudentsAtOnce ?? null,
      availabilityMode: department.electiveSettings?.availabilityMode ?? null,
      availabilityModeLabel: getAvailabilityModeLabel(department.electiveSettings?.availabilityMode),
      dateAvailable: department.electiveMatch?.ok ?? null,
      remainingCapacity: department.electiveMatch?.remainingCapacity ?? null,
      dateAvailabilityError: department.electiveMatch?.error ?? null,
      availabilitySummary: getAvailabilitySummary(department)
    }))
  });
}
