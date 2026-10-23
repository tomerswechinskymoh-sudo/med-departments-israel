export const metadata = {
  title: "חיפוש מחלקות והתמחויות | hitmachut.org",
  alternates: { canonical: "/departments" },
};
import { PageIntro } from "@/components/ui/page-intro";

import { getSession } from "@/lib/auth";
import { departmentFilterSchema } from "@/lib/validation";
import { DepartmentCard } from "@/components/departments/department-card";
import {
  CompareSelectableShell,
  DepartmentCompareProvider,
  type DepartmentCompareOption,
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
  getSpecialtyDashboardMetrics,
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

function toParamEntries(
  searchParams: Record<string, string | string[] | undefined>,
) {
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
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, availableFilters, rawSearchParams, reviewDepartments] =
    await Promise.all([
      getSession(),
      getDirectoryFilters(),
      searchParams,
      getDepartmentOptions(),
    ]);

  const defaultSpecialtyId = getDefaultSpecialtyId(
    availableFilters.specialties,
  );
  const requestedSpecialtyId = toMultiValue(rawSearchParams.specialty)?.[0];
  const selectedSpecialtyId = availableFilters.specialties.some(
    (specialty) => specialty.id === requestedSpecialtyId,
  )
    ? requestedSpecialtyId
    : defaultSpecialtyId;

  const filterResult = departmentFilterSchema.safeParse({
    search:
      typeof rawSearchParams.search === "string"
        ? rawSearchParams.search
        : undefined,
    institutions: toMultiValue(rawSearchParams.institution),
    specialties: selectedSpecialtyId ? [selectedSpecialtyId] : undefined,
    regions: toMultiValue(rawSearchParams.region),
    institutionTypes: toMultiValue(rawSearchParams.institutionType),
    hasOpenPositions: rawSearchParams.hasOpenPositions,
    hasResearch: rawSearchParams.hasResearch,
    hasReviews: rawSearchParams.hasReviews,
    sort:
      typeof rawSearchParams.sort === "string"
        ? rawSearchParams.sort
        : undefined,
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
        : undefined,
  });
  const parsedFilters = filterResult.success
    ? filterResult.data
    : departmentFilterSchema.parse({});
  const searchAcrossSpecialties =
    Boolean(rawSearchParams.search) && !rawSearchParams.specialty;
  const effectiveFilters = {
    ...parsedFilters,
    searchAcrossSpecialties,
  };

  const [departments, specialtyDashboard] = await Promise.all([
    getDirectoryData(effectiveFilters, session?.userId),
    getSpecialtyDashboardMetrics(selectedSpecialtyId),
  ]);
  const selectedSpecialty = availableFilters.specialties.find(
    (specialty) => specialty.id === selectedSpecialtyId,
  );
  const filtersKey = JSON.stringify(effectiveFilters);
  const compareOptionsByDepartmentId = new Map<string, DepartmentCompareOption>(
    departments.map((department) => {
      const compareId = department.hrefDepartmentId ?? department.id;

      return [
        department.id,
        {
          id: compareId,
          slug: department.slug,
          name: department.name,
          institutionName: department.institutionName,
          institutionSlug: department.institutionSlug,
          specialtyId: department.specialtyId,
          specialtyName: department.specialtyName,
          isArray: department.isArrayCard,
        },
      ];
    }),
  );

  return (
    <div className="directory-page">
      <PageShell className="space-y-5 py-5">
        <PageIntro
          eyebrow="חיפוש מחלקות"
          title="חיפוש מחלקות והשוואת תוכניות"
          image="corridor"
          description="חפשו לפי תחום התמחות, מוסד ואזור. בחרו מחלקות כדי להשוות ביניהן, והעמיקו במקורות ובחוויות מהשטח."
        />

        {rawSearchParams.signup === "checkEmail" ? (
          <section className="rounded-2xl border border-brand-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
            ההרשמה התקבלה. בדקו את המייל ולחצו על קישור האימות לפני התחברות.
          </section>
        ) : null}

        <div className="space-y-4">
          <div className="directory-layout">
            <aside aria-label="סינון תוצאות" className="directory-filter-bar">
              <DepartmentFilters
                specialtySelector={
                  <SpecialtySelector
                    specialties={availableFilters.specialties}
                    selectedSpecialtyId={selectedSpecialtyId}
                    preservedParams={toParamEntries(rawSearchParams)}
                  />
                }
                key={filtersKey}
                filters={parsedFilters}
                institutions={availableFilters.institutions}
                specialties={availableFilters.specialties}
                departments={availableFilters.departments}
                regions={availableFilters.regions}
              />
            </aside>

            <div className="min-w-0 space-y-4">
              {selectedSpecialty ? (
                <section id="specialty-dashboard" className="directory-dashboard">
                  <nav className="directory-section-nav" aria-label="ניווט במאגר"><span>תמונת מצב ארצית</span><a href="#department-results">מעבר לרשימת המחלקות <span>({departments.length})</span><span aria-hidden="true">↓</span></a></nav>
                  <SpecialtyDashboardMetrics
                    specialtyId={selectedSpecialty.id}
                    specialtyName={selectedSpecialty.name}
                    metrics={specialtyDashboard.metrics}
                          explanationOverrides={
                      specialtyDashboard.explanationOverrides
                    }
                    isAdmin={session?.role === "admin"}
                  />
                </section>
              ) : null}

              <div id="department-results" tabIndex={-1} role="region" aria-label="תוצאות חיפוש מחלקות" className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-brand-100 bg-white/94 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-ink">
                    {departments.length} תוכניות נמצאו
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {searchAcrossSpecialties
                      ? "החיפוש מתבצע בכל תחומי ההתמחות."
                      : `מוצגות תוכניות בתחום ${selectedSpecialty?.name ?? "ההתמחות שנבחרה"} בלבד.`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    סידור:{" "}
                    {parsedFilters.sort === "rating"
                      ? "דירוג"
                      : parsedFilters.sort === "reviews"
                        ? "ביקורות"
                        : parsedFilters.sort === "openings"
                          ? "משרות"
                          : parsedFilters.sort === "research"
                            ? "מחקר"
                            : "מומלץ"}
                  </p>
                  <div id="share-experience" className="scroll-mt-36">
                    <ExperienceCta
                      departments={reviewDepartments}
                      buttonClassName="inline-flex rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-bold text-brand-800  transition hover:-translate-y-0.5"
                    />
                  </div>
                </div>
              </div>

              {departments.length === 0 ? (
                <EmptyState
                  title="לא נמצאו תוכניות תואמות"
                  description="נסו לבחור תחום התמחות אחר, להסיר אזור או לפתוח את הסינון."
                  ctaHref={
                    selectedSpecialtyId
                      ? `/departments?specialty=${selectedSpecialtyId}`
                      : "/departments"
                  }
                  ctaLabel="איפוס סינון"
                  filterReset
                />
              ) : selectedSpecialtyId ? (
                <DepartmentCompareProvider layout="sidebar"
                  specialtyId={selectedSpecialtyId}
                  isAuthenticated={Boolean(session)}
                >
                  <div className="directory-cards grid gap-4 md:grid-cols-2">
                    {departments.map((department) => {
                      const compareOption = compareOptionsByDepartmentId.get(
                        department.id,
                      );

                      return compareOption ? (
                        <CompareSelectableShell
                          key={department.id}
                          option={compareOption}
                        >
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
                <div className="directory-cards grid gap-4 md:grid-cols-2">
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
