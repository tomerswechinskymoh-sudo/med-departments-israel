import { getSession } from "@/lib/auth";
import { departmentFilterSchema } from "@/lib/validation";
import { DepartmentCard } from "@/components/departments/department-card";
import { DepartmentFilters } from "@/components/departments/department-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDirectoryData, getDirectoryFilters } from "@/lib/queries";

export const dynamic = "force-dynamic";

function toMultiValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value;
  }

  return typeof value === "string" ? [value] : undefined;
}

function getDefaultSpecialtyId(specialties: { id: string; name: string }[]) {
  return (
    specialties.find((specialty) => specialty.name === "רפואה פנימית")?.id ??
    specialties[0]?.id
  );
}

export default async function DepartmentsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, availableFilters, rawSearchParams] = await Promise.all([
    getSession(),
    getDirectoryFilters(),
    searchParams
  ]);

  const defaultSpecialtyId = getDefaultSpecialtyId(availableFilters.specialties);
  const requestedSpecialtyId = toMultiValue(rawSearchParams.specialty)?.[0];
  const selectedSpecialtyId = availableFilters.specialties.some(
    (specialty) => specialty.id === requestedSpecialtyId
  )
    ? requestedSpecialtyId
    : defaultSpecialtyId;

  const parsedFilters = departmentFilterSchema.parse({
    search: typeof rawSearchParams.search === "string" ? rawSearchParams.search : undefined,
    institutions: toMultiValue(rawSearchParams.institution),
    specialties: selectedSpecialtyId ? [selectedSpecialtyId] : undefined,
    regions: toMultiValue(rawSearchParams.region),
    institutionTypes: toMultiValue(rawSearchParams.institutionType),
    hasOpenPositions: rawSearchParams.hasOpenPositions,
    hasResearch: rawSearchParams.hasResearch,
    hasReviews: rawSearchParams.hasReviews,
    sort: typeof rawSearchParams.sort === "string" ? rawSearchParams.sort : undefined,
    prioritizeOpenings: rawSearchParams.prioritizeOpenings,
    prioritizeCommittee: rawSearchParams.prioritizeCommittee,
    researchPriority:
      typeof rawSearchParams.researchPriority === "string"
        ? rawSearchParams.researchPriority
        : undefined,
    electivePriority:
      typeof rawSearchParams.electivePriority === "string"
        ? rawSearchParams.electivePriority
        : undefined,
    lifestylePriority:
      typeof rawSearchParams.lifestylePriority === "string"
        ? rawSearchParams.lifestylePriority
        : undefined,
    teachingPriority:
      typeof rawSearchParams.teachingPriority === "string"
        ? rawSearchParams.teachingPriority
        : undefined,
    seniorsPriority:
      typeof rawSearchParams.seniorsPriority === "string"
        ? rawSearchParams.seniorsPriority
        : undefined,
    clinicalPriority:
      typeof rawSearchParams.clinicalPriority === "string"
        ? rawSearchParams.clinicalPriority
        : undefined
  });

  const departments = await getDirectoryData(parsedFilters, session?.userId);
  const selectedSpecialty = availableFilters.specialties.find(
    (specialty) => specialty.id === selectedSpecialtyId
  );
  const filtersKey = JSON.stringify(parsedFilters);

  return (
    <div className="min-h-screen bg-[#f3f7fa]">
      <PageShell className="space-y-7 py-8">
        <SectionHeading
          eyebrow="Residency Navigator"
          title="בחרו תחום התמחות והשוו תוכניות"
          description="מתחילים מההתמחות, ואז משווים בתי חולים לפי ביקורות, תקנים, מחקר וסימנים פרקטיים."
        />

        <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
          <DepartmentFilters
            key={filtersKey}
            filters={parsedFilters}
            institutions={availableFilters.institutions}
            specialties={availableFilters.specialties}
            departments={availableFilters.departments}
            regions={availableFilters.regions}
          />

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-brand-100 bg-white/94 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-ink">{departments.length} תוכניות נמצאו</p>
                <p className="mt-1 text-xs text-slate-500">
                  מוצגות תוכניות בתחום {selectedSpecialty?.name ?? "ההתמחות שנבחרה"} בלבד.
                </p>
              </div>
              <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                סידור: {parsedFilters.sort === "rating" ? "דירוג" : parsedFilters.sort === "reviews" ? "ביקורות" : parsedFilters.sort === "openings" ? "תקנים" : parsedFilters.sort === "research" ? "מחקר" : "מומלץ"}
              </p>
            </div>

            {departments.length === 0 ? (
              <EmptyState
                title="לא נמצאו תוכניות תואמות"
                description="נסו לבחור תחום התמחות אחר, להסיר אזור או לפתוח את הסינון."
                ctaHref={selectedSpecialtyId ? `/departments?specialty=${selectedSpecialtyId}` : "/departments"}
                ctaLabel="איפוס סינון"
              />
            ) : (
              <div className="grid gap-4">
                {departments.map((department) => (
                  <DepartmentCard
                    key={department.id}
                    department={department}
                    showFavoriteButton={Boolean(session)}
                    variant="row"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </PageShell>
    </div>
  );
}
