import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InstitutionLogo } from "@/components/departments/institution-logo";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  buildElectiveDepartmentHref,
  getAvailabilityModeLabel,
  getAvailabilitySummary,
  getElectiveDepartmentRegion,
  getElectiveSearchOptions,
  hasCompleteElectiveDateRange,
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
  const hasDateRange = hasCompleteElectiveDateRange(search);
  const hasPartialDateRange = hasPartialElectiveDateRange(search);
  const options = await getElectiveSearchOptions();
  const departments = await listElectiveDepartments(rawParams);

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
          <p className="text-sm font-semibold text-slate-600">נמצאו {departments.length} מחלקות</p>
        </div>

        <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1 lg:grid-cols-2">
          {departments.map((department) => {
            const region = getElectiveDepartmentRegion(department);
            const remainingCapacity = department.electiveMatch?.remainingCapacity ?? null;
            const dateBadge = !hasDateRange
              ? "בחר תאריכים כדי לבדוק זמינות מדויקת"
              : department.electiveMatch?.ok
                ? "מתאים לתאריכים"
                : "לא מתאים לתאריכים";
            const dateBadgeTone = !hasDateRange ? "default" : department.electiveMatch?.ok ? "success" : "danger";

            return (
              <Card key={department.id} className="flex h-full flex-col justify-between gap-5">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={dateBadgeTone}>{dateBadge}</Badge>
                    <Badge tone="default">{getAvailabilityModeLabel(department.electiveSettings?.availabilityMode)}</Badge>
                    {hasDateRange && department.electiveMatch?.ok ? (
                      <Badge tone="success">נותרו {remainingCapacity ?? "?"} מקומות</Badge>
                    ) : null}
                  </div>
                  <div className="mt-4 flex gap-3">
                    <InstitutionLogo institution={department.institution} size="sm" />
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-ink">{department.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{department.institution.name}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{department.specialty.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {[department.institution.city, region].filter(Boolean).join(" · ") || "מיקום לא צוין"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{getAvailabilitySummary(department)}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    קיבולת מקסימלית: {department.electiveSettings?.maxStudentsAtOnce ?? "לא הוגדר"}
                  </p>
                  {hasDateRange && !department.electiveMatch?.ok ? (
                    <p className="mt-2 text-xs font-black text-rose-700">{department.electiveMatch?.error ?? "לא זמין בטווח שבחרת."}</p>
                  ) : null}
                  {!hasDateRange ? (
                    <p className="mt-2 text-xs font-black text-brand-700">בחר תאריכים כדי לבדוק זמינות מדויקת וקיבולת.</p>
                  ) : null}
                </div>
                <Link href={buildElectiveDepartmentHref(department.slug, search)} className="inline-flex w-fit rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">
                  צפייה בפרטי אלקטיב
                </Link>
              </Card>
            );
          })}
        </div>

        {departments.length === 0 ? (
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
