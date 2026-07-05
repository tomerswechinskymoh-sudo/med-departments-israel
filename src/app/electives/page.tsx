import type { Metadata } from "next";
import { StudentElectivesCatalog, type StudentElectiveCatalogDepartment } from "@/components/electives/student-electives-catalog";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getElectiveDepartmentRegion,
  getElectiveSearchOptions,
  formatDateInput,
  hasPartialElectiveDateRange,
  listElectiveDepartments,
  parseStudentElectiveSearch,
  requireStudentElectivesPreviewAccess
} from "@/lib/student-electives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StudentElectivesPreviewPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  await requireStudentElectivesPreviewAccess();
  const rawParams = await searchParams;
  const search = parseStudentElectiveSearch(rawParams);
  const hasPartialDateRange = hasPartialElectiveDateRange(search);
  const options = await getElectiveSearchOptions();
  const departments = await listElectiveDepartments(rawParams);
  const catalogDepartments: StudentElectiveCatalogDepartment[] = departments.map((department) => {
    const studentRatings = department.reviews.map((review) => review.overallRecommendation);
    const ratingAverage = studentRatings.length > 0
      ? studentRatings.reduce((sum, value) => sum + value, 0) / studentRatings.length
      : null;

    return {
      id: department.id,
      slug: department.slug,
      name: department.name,
      hospital: department.institution.name,
      city: department.institution.city,
      region: getElectiveDepartmentRegion(department),
      specialty: department.specialty.name,
      institution: department.institution,
      notes: department.electiveSettings?.notes ?? null,
      availabilityMode: department.electiveSettings?.availabilityMode ?? null,
      maxStudentsAtOnce: department.electiveSettings?.maxStudentsAtOnce ?? null,
      minDurationDays: department.electiveSettings?.minDurationDays ?? null,
      maxDurationDays: department.electiveSettings?.maxDurationDays ?? null,
      rating: {
        average: ratingAverage,
        count: studentRatings.length
      },
      openWindows: department.electiveAvailabilityWindows
        .filter((window) => window.status === "OPEN")
        .map((window) => ({
          id: window.id,
          status: window.status,
          startsAt: formatDateInput(window.startsAt),
          endsAt: formatDateInput(window.endsAt),
          capacityOverride: window.capacityOverride,
          reason: window.reason,
          note: window.note
        })),
      closedWindows: department.electiveAvailabilityWindows
        .filter((window) => window.status === "CLOSED")
        .map((window) => ({
          id: window.id,
          status: window.status,
          startsAt: formatDateInput(window.startsAt),
          endsAt: formatDateInput(window.endsAt),
          capacityOverride: window.capacityOverride,
          reason: window.reason,
          note: window.note
        })),
      bookedRanges: department.electiveApplications
        .filter((application) => application.requestedStartDate && application.requestedEndDate)
        .map((application) => ({
          id: application.id,
          requestedStartDate: formatDateInput(application.requestedStartDate!),
          requestedEndDate: formatDateInput(application.requestedEndDate!)
        })),
      electiveMatch: department.electiveMatch
    };
  });

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="תצוגה פנימית לאדמין בלבד"
        title="קטלוג אלקטיבים למחלקות"
        description="בחרו תאריכים, תחומים ואזור כדי לצמצם את האפשרויות. ניתן לדפדף במחלקות פתוחות גם בלי לבחור תאריכים."
      />

      <Card>
        <form className="space-y-5" action="/electives">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-black text-slate-600">תאריך התחלה</span>
              <input
                name="start"
                type="date"
                defaultValue={search.start}
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-black text-slate-600">תאריך סיום</span>
              <input
                name="end"
                type="date"
                defaultValue={search.end}
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <fieldset className="rounded-2xl border border-brand-100 bg-white p-4">
              <legend className="px-2 text-xs font-black text-slate-600">תחומי התמחות שמעניינים אותך</legend>
              <div className="mt-2 grid max-h-56 gap-2 overflow-auto pr-1 text-sm sm:grid-cols-2">
                {options.specialties.map((specialty) => (
                  <label key={specialty} className="flex items-center gap-2 rounded-xl px-2 py-1 font-semibold text-slate-700">
                    <input name="specialties" type="checkbox" value={specialty} defaultChecked={search.specialties.includes(specialty)} />
                    <span>{specialty}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-brand-100 bg-white p-4">
              <legend className="px-2 text-xs font-black text-slate-600">אזור בארץ</legend>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                {options.regions.map((region) => (
                  <label key={region} className="flex items-center gap-2 rounded-xl px-2 py-1 font-semibold text-slate-700">
                    <input name="regions" type="checkbox" value={region} defaultChecked={search.regions.includes(region)} />
                    <span>{region}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <input
            name="search"
            defaultValue={search.search}
            placeholder="חיפוש חופשי לפי מחלקה או בית חולים"
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          />

          <button className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">
            חיפוש אלקטיבים מתאימים
          </button>
        </form>
      </Card>

      {hasPartialDateRange ? (
        <Card>
          <p className="text-sm leading-7 text-slate-600">
            כדי לבדוק זמינות לפי תאריכים יש לבחור גם תאריך התחלה וגם תאריך סיום.
            בינתיים מוצגות מחלקות לפי שאר הסינונים שבחרת.
          </p>
        </Card>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-ink">מחלקות פתוחות לאלקטיב</h2>
          <p className="text-sm font-semibold text-slate-600">נמצאו {catalogDepartments.length} מחלקות</p>
        </div>

        <StudentElectivesCatalog
          departments={catalogDepartments}
          search={search}
        />

        {catalogDepartments.length === 0 ? (
          <Card>
            <p className="text-sm font-semibold text-slate-700">לא נמצאו מחלקות מתאימות לסינון שבחרת.</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              נסה לנקות סינונים, להרחיב אזור או לשנות תאריכים.
            </p>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
