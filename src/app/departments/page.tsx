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

  const parsedFilters = departmentFilterSchema.parse({
    search: typeof rawSearchParams.search === "string" ? rawSearchParams.search : undefined,
    institutions: toMultiValue(rawSearchParams.institution),
    specialties: toMultiValue(rawSearchParams.specialty),
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

  return (
    <PageShell className="space-y-8 py-10">
      <SectionHeading
        eyebrow="חיפוש מחלקות"
        title="חיפוש מחלקות, מסלולים וקהילה במקום אחד"
        description="חיפוש בסיסי נשאר פשוט, ובחיפוש המתקדם אפשר לדרג מה חשוב לך יותר כדי לסדר את התוצאות בהתאם."
      />

      <DepartmentFilters
        filters={parsedFilters}
        institutions={availableFilters.institutions}
        specialties={availableFilters.specialties}
        departments={availableFilters.departments}
      />

      {departments.length === 0 ? (
        <EmptyState
          title="לא נמצאו מחלקות תואמות"
          description="נסו להסיר חלק מהסינונים או לחפש לפי שם מחלקה, מוסד או תחום."
          ctaHref="/departments"
          ctaLabel="איפוס סינון"
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => (
            <DepartmentCard
              key={department.id}
              department={department}
              showFavoriteButton={Boolean(session)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
