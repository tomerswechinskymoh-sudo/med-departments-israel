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
  isElectiveSearchComplete,
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
  const isSearchComplete = isElectiveSearchComplete(search);
  const options = await getElectiveSearchOptions();
  const departments = isSearchComplete ? await listElectiveDepartments(rawParams) : [];

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="תצוגה פנימית לאדמין בלבד"
        title="התאמת אלקטיבים למחלקות"
        description="בחר/י תאריכים, תחומי עניין ואזור בארץ. רק לאחר מכן יוצגו מחלקות שמתאימות לזמינות ולקיבולת."
      />

      <Card>
        <form className="space-y-5" action="/electives">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-black text-slate-600">תאריך התחלה</span>
              <input
                name="start"
                type="date"
                required
                defaultValue={search.start}
                className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-black text-slate-600">תאריך סיום</span>
              <input
                name="end"
                type="date"
                required
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

      {!isSearchComplete ? (
        <Card>
          <p className="text-sm leading-7 text-slate-600">
            כדי לראות מחלקות מתאימות יש לבחור תאריך התחלה, תאריך סיום, לפחות תחום התמחות אחד ולפחות אזור אחד.
          </p>
        </Card>
      ) : null}

      {isSearchComplete ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-ink">מחלקות מתאימות</h2>
            <p className="text-sm font-semibold text-slate-600">{departments.length} תוצאות</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {departments.map((department) => {
              const region = getElectiveDepartmentRegion(department);
              const remainingCapacity = department.electiveMatch?.remainingCapacity ?? null;

              return (
                <Card key={department.id} className="flex h-full flex-col justify-between gap-5">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="success">מתאים לתאריכים שבחרת</Badge>
                      <Badge tone="default">{getAvailabilityModeLabel(department.electiveSettings?.availabilityMode)}</Badge>
                      <Badge tone="success">נותרו {remainingCapacity ?? "?"} מקומות</Badge>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <InstitutionLogo institution={department.institution} size="sm" />
                      <div className="min-w-0">
                        <h3 className="text-xl font-black text-ink">{department.institution.name}</h3>
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
                    <p className="mt-1 text-xs font-black text-brand-700">תחום ואזור תואמים לסינון שבחרת.</p>
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
              <p className="text-sm font-semibold text-slate-700">אין מחלקות מתאימות לתאריכים ולסינון שבחרת.</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                נסה להרחיב אזור, לשנות תאריכים או לבחור תחומי התמחות נוספים.
              </p>
            </Card>
          ) : null}
        </div>
      ) : null}
    </PageShell>
  );
}
