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
    trackType: url.searchParams.get("trackType") ?? url.searchParams.get("track") ?? undefined,
    specialties: specialties.length > 0 ? specialties : url.searchParams.get("specialties") ?? url.searchParams.get("specialty") ?? undefined,
    regions: regions.length > 0 ? regions : url.searchParams.get("regions") ?? url.searchParams.get("region") ?? undefined
  };
  const parsedSearch = parseStudentElectiveSearch(searchInput);
  const hasDateRange = hasCompleteElectiveDateRange(parsedSearch);
  const departments = await listElectiveDepartments(searchInput);

  return NextResponse.json({
    ok: true,
    dateRangeSelected: hasDateRange,
    departments: departments.map((department) => {
      const item = department as typeof department & {
        institution: { name: string; city: string | null; region: string | null };
        specialty: { name: string };
        effectiveElectiveSettings: {
          availabilityMode: "OPEN_BY_DEFAULT" | "CLOSED_BY_DEFAULT";
          maxStudentsAtOnce: number | null;
          paymentRequired: boolean;
        } | null;
        electiveSettings: { availabilityMode: "OPEN_BY_DEFAULT" | "CLOSED_BY_DEFAULT" } | null;
        electiveMatch: { ok: boolean; remainingCapacity: number | null; error: string | null } | null;
      };

      return {
        id: item.id,
        slug: item.slug,
        href: buildElectiveDepartmentHref(item.slug),
        name: item.name,
        hospital: item.institution.name,
        city: item.institution.city,
        region: getElectiveDepartmentRegion(item),
        specialty: item.specialty.name,
        trackType: parsedSearch.trackType,
        maxStudentsAtOnce: item.effectiveElectiveSettings?.maxStudentsAtOnce ?? null,
        paymentRequired: item.effectiveElectiveSettings?.paymentRequired ?? false,
        availabilityMode: item.effectiveElectiveSettings?.availabilityMode ?? null,
        availabilityModeLabel: getAvailabilityModeLabel(item.electiveSettings?.availabilityMode),
        dateAvailable: item.electiveMatch?.ok ?? null,
        remainingCapacity: item.electiveMatch?.remainingCapacity ?? null,
        dateAvailabilityError: item.electiveMatch?.error ?? null,
        availabilitySummary: getAvailabilitySummary(item as unknown as Parameters<typeof getAvailabilitySummary>[0])
      };
    })
  });
}
