import { getSession } from "@/lib/auth";
import { departmentFilterSchema } from "@/lib/validation";
import { DepartmentCard } from "@/components/departments/department-card";
import { DepartmentFilters } from "@/components/departments/department-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDirectoryData, getDirectoryFilters } from "@/lib/queries";

export const dynamic = "force-dynamic";

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
    institution:
      typeof rawSearchParams.institution === "string" ? rawSearchParams.institution : undefined,
    specialty:
      typeof rawSearchParams.specialty === "string" ? rawSearchParams.specialty : undefined,
    city: typeof rawSearchParams.city === "string" ? rawSearchParams.city : undefined
  });

  const departments = await getDirectoryData(parsedFilters, session?.userId);

  return (
    <PageShell className="space-y-8 py-10">
      <SectionHeading
        eyebrow="מאגר מחלקות"
        title="חיפוש מחלקות, מסלולים וקהילה במקום אחד"
        description="סננו לפי מוסד, תחום או עיר והשוו בין ביקורות, מחקר, תקנים ומידע פרקטי ליום-יום."
      />

      <DepartmentFilters
        filters={parsedFilters}
        institutions={availableFilters.institutions}
        specialties={availableFilters.specialties}
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
