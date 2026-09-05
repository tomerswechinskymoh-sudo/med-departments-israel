import { getSession } from "@/lib/auth";
import { departmentFilterSchema } from "@/lib/validation";
import { DepartmentCard } from "@/components/departments/department-card";
import {
  CompareSelectableShell,
  DepartmentCompareProvider,
  type DepartmentCompareOption
} from "@/components/departments/department-comparison-selection";
import { DepartmentFilters } from "@/components/departments/department-filters";
import { SpecialtySelector } from "@/components/departments/specialty-selector";
import { SpecialtyDashboardMetrics } from "@/components/departments/specialty-dashboard-metrics";
import { ExperienceCta } from "@/components/experience/experience-cta";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import {
  getDirectoryData,
  getDirectoryFilters,
  getDepartmentOptions,
  getSpecialtyDashboardMetrics
} from "@/lib/queries";

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

function toParamEntries(searchParams: Record<string, string | string[] | undefined>) {
  const entries: Array<[string, string]> = [];

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "specialty") {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => entries.push([key, item]));
    } else if (typeof value === "string") {
      entries.push([key, value]);
    }
  }

  return entries;
}

export default async function DepartmentsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, availableFilters, rawSearchParams, reviewDepartments] = await Promise.all([
    getSession(),
    getDirectoryFilters(),
    searchParams,
    getDepartmentOptions()
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
  const searchAcrossSpecialties = Boolean(rawSearchParams.search) && !rawSearchParams.specialty;
  const effectiveFilters = {
    ...parsedFilters,
    searchAcrossSpecialties
  };

  const [departments, specialtyDashboard] = await Promise.all([
    getDirectoryData(effectiveFilters, session?.userId),
    getSpecialtyDashboardMetrics(selectedSpecialtyId)
  ]);
  const selectedSpecialty = availableFilters.specialties.find(
    (specialty) => specialty.id === selectedSpecialtyId
  );
  const filtersKey = JSON.stringify(effectiveFilters);
  const compareOptionsByDepartmentId = new Map<string, DepartmentCompareOption>(
    departments.map((department) => {
      const compareId = department.hrefDepartmentId ?? department.id;

      return [
        department.id,
        {
          id: compareId,
          name: department.name,
          institutionName: department.institutionName,
          specialtyId: department.specialtyId,
          specialtyName: department.specialtyName,
          isArray: department.isArrayCard
        }
      ];
    })
  );

  return (
    <div className="min-h-screen bg-[#f3f7fa]">
      <PageShell className="space-y-5 py-5">
        {rawSearchParams.signup === "checkEmail" ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
            ההרשמה התקבלה. בדקו את המייל ולחצו על קישור האימות לפני התחברות.
          </section>
        ) : null}
        <section className="rounded-2xl border border-brand-100 bg-white/95 p-4 shadow-sm md:p-5">
          <SpecialtySelector
            specialties={availableFilters.specialties}
            selectedSpecialtyId={selectedSpecialtyId}
            preservedParams={toParamEntries(rawSearchParams)}
          />
          <div className="mt-4 max-w-3xl">
            <h1 className="text-2xl font-black leading-tight text-ink md:text-3xl">
              בחרו תחום התמחות והשוו תוכניות
            </h1>
            <p className="mt-2 text-sm leading-7 text-slate-600 md:text-base">
              מתחילים מנתונים לאומיים על תחום ההתמחות וממשיכים להשוואה בין המערכים השונים.
            </p>
          </div>
        </section>

        <div className="space-y-4">
          {selectedSpecialty ? (
            <SpecialtyDashboardMetrics
              specialtyId={selectedSpecialty.id}
              specialtyName={selectedSpecialty.name}
              metrics={specialtyDashboard.metrics}
              explanationOverrides={specialtyDashboard.explanationOverrides}
              isAdmin={session?.role === "admin"}
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[280px_1fr] lg:items-start">
            <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pe-1">
              <DepartmentFilters
                key={filtersKey}
                filters={parsedFilters}
                institutions={availableFilters.institutions}
                specialties={availableFilters.specialties}
                departments={availableFilters.departments}
                regions={availableFilters.regions}
              />
            </aside>

            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-brand-100 bg-white/94 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-ink">{departments.length} תוכניות נמצאו</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {searchAcrossSpecialties
                      ? "החיפוש מתבצע בכל תחומי ההתמחות."
                      : `מוצגות תוכניות בתחום ${selectedSpecialty?.name ?? "ההתמחות שנבחרה"} בלבד.`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    סידור: {parsedFilters.sort === "rating" ? "דירוג" : parsedFilters.sort === "reviews" ? "ביקורות" : parsedFilters.sort === "openings" ? "משרות" : parsedFilters.sort === "research" ? "מחקר" : "מומלץ"}
                  </p>
                  <ExperienceCta
                    departments={reviewDepartments}
                    buttonClassName="inline-flex rounded-full border border-amber-200 bg-gradient-to-l from-amber-300 via-amber-200 to-orange-100 px-4 py-2 text-xs font-bold text-amber-950 shadow-sm shadow-amber-200/40 transition hover:-translate-y-0.5"
                  />
                </div>
              </div>

              {departments.length === 0 ? (
                <EmptyState
                  title="לא נמצאו תוכניות תואמות"
                  description="נסו לבחור תחום התמחות אחר, להסיר אזור או לפתוח את הסינון."
                  ctaHref={selectedSpecialtyId ? `/departments?specialty=${selectedSpecialtyId}` : "/departments"}
                  ctaLabel="איפוס סינון"
                />
              ) : selectedSpecialtyId ? (
                <DepartmentCompareProvider
                  specialtyId={selectedSpecialtyId}
                  isAuthenticated={Boolean(session)}
                >
                  <div className="grid gap-4">
                    {departments.map((department) => {
                      const compareOption = compareOptionsByDepartmentId.get(department.id);

                      return compareOption ? (
                        <CompareSelectableShell key={department.id} option={compareOption}>
                          <DepartmentCard
                            department={department}
                            showFavoriteButton={Boolean(session)}
                            variant="row"
                          />
                        </CompareSelectableShell>
                      ) : (
                        <DepartmentCard
                          key={department.id}
                          department={department}
                          showFavoriteButton={Boolean(session)}
                          variant="row"
                        />
                      );
                    })}
                  </div>
                </DepartmentCompareProvider>
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
        </div>
      </PageShell>
    </div>
  );
}
