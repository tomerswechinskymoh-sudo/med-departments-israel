import { NextResponse } from "next/server";
import {
  buildElectiveDepartmentHref,
  getAvailabilityModeLabel,
  getAvailabilitySummary,
  getElectiveDepartmentRegion,
  getStudentElectivesAccess,
  isElectiveSearchComplete,
  listElectiveDepartments,
  parseStudentElectiveSearch
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
  const isComplete = isElectiveSearchComplete(parseStudentElectiveSearch(searchInput));
  const departments = isComplete ? await listElectiveDepartments(searchInput) : [];

  return NextResponse.json({
    ok: true,
    searchComplete: isComplete,
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
      remainingCapacity: department.electiveMatch?.remainingCapacity ?? null,
      availabilitySummary: getAvailabilitySummary(department)
    }))
  });
}
