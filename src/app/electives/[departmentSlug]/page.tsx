import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InstitutionLogo } from "@/components/departments/institution-logo";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  buildElectiveApplyHref,
  createElectiveSearchQuery,
  formatDateInput,
  getAvailabilityModeLabel,
  getAvailabilitySummary,
  getElectiveDepartmentAvailabilityMatch,
  getElectiveDepartmentBySlug,
  getElectiveDepartmentRegion,
  parseDateOnly,
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

export default async function StudentElectiveDepartmentPage({
  params,
  searchParams
}: {
  params: Promise<{ departmentSlug: string }>;
  searchParams: SearchParams;
}) {
  await requireStudentElectivesPreviewAccess();
  const { departmentSlug } = await params;
  const rawSearch = await searchParams;
  const search = parseStudentElectiveSearch(rawSearch);
  const department = await getElectiveDepartmentBySlug(departmentSlug);

  if (!department) {
    notFound();
  }

  const requestedStartDate = parseDateOnly(search.start);
  const requestedEndDate = parseDateOnly(search.end);
  const hasSelectedDates = Boolean(requestedStartDate && requestedEndDate);
  const match = requestedStartDate && requestedEndDate
    ? await getElectiveDepartmentAvailabilityMatch(department, requestedStartDate, requestedEndDate)
    : null;
  const openWindows = department.electiveAvailabilityWindows.filter((window) => window.status === "OPEN");
  const closedWindows = department.electiveAvailabilityWindows.filter((window) => window.status === "CLOSED");
  const region = getElectiveDepartmentRegion(department);
  const backQuery = createElectiveSearchQuery(search).toString();
  const backHref = backQuery ? `/electives?${backQuery}` : "/electives";

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="תצוגה פנימית לאדמין בלבד"
        title={`${department.institution.name} · ${department.specialty.name}`}
        description="עמוד אלקטיב בתצוגת אדמין מוסתרת בלבד. משתמשים רגילים חסומים עד פתיחה עתידית."
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">פתוח להגשה</Badge>
            <Badge tone="default">{getAvailabilityModeLabel(department.electiveSettings?.availabilityMode)}</Badge>
          </div>
          <div className="mt-5 flex gap-4">
            <InstitutionLogo institution={department.institution} size="md" />
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-ink">{department.name}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-700">{department.specialty.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {[department.institution.name, department.institution.city, region].filter(Boolean).join(" · ") || "מיקום לא צוין"}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-700">{department.about || department.shortSummary || "לא נוסף תיאור אלקטיב למחלקה."}</p>
          {department.electiveSettings?.notes ? (
            <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
              {department.electiveSettings.notes}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {hasSelectedDates && match?.ok ? (
              <Link href={buildElectiveApplyHref(department.slug, search)} className="inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">
                המשך להגשת בקשה
              </Link>
            ) : (
              <button disabled className="inline-flex rounded-full bg-slate-200 px-5 py-3 text-sm font-black text-slate-500">
                המשך להגשת בקשה
              </button>
            )}
            <Link href={backHref} className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">
              חזרה לחיפוש אלקטיבים
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-black text-ink">בדיקת התאמה לתאריכים</h2>
          {hasSelectedDates ? (
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <dt className="text-xs font-black text-slate-500">תאריכים שבחרת</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {search.start} - {search.end}
                </dd>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <dt className="text-xs font-black text-slate-500">קיבולת מקסימלית</dt>
                <dd className="mt-1 font-semibold text-ink">{match?.capacity ?? department.electiveSettings?.maxStudentsAtOnce ?? "לא הוגדר"}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <dt className="text-xs font-black text-slate-500">בקשות מאושרות חופפות</dt>
                <dd className="mt-1 font-semibold text-ink">{match?.approvedOverlapCount ?? 0}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <dt className="text-xs font-black text-slate-500">מקומות פנויים בטווח שבחרת</dt>
                <dd className="mt-1 font-semibold text-ink">{match?.remainingCapacity ?? 0}</dd>
              </div>
              {!match?.ok ? (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
                  {match?.error ?? "התאריכים אינם זמינים."}
                </div>
              ) : (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                  התאריכים זמינים להגשת בקשה.
                </div>
              )}
            </dl>
          ) : (
            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
              כדי לבדוק התאמה למחלקה יש לבחור תחילת וסיום אלקטיב.
              <div className="mt-3">
                <Link href="/electives" className="inline-flex rounded-full bg-amber-700 px-4 py-2 text-xs font-black text-white">
                  מעבר לטופס החיפוש
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="text-xl font-black text-ink">זמינות וקיבולת</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">{getAvailabilitySummary(department)}</p>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs font-black text-slate-500">מצב זמינות</dt>
              <dd className="mt-1 font-semibold text-ink">{getAvailabilityModeLabel(department.electiveSettings?.availabilityMode)}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs font-black text-slate-500">משך אלקטיב</dt>
              <dd className="mt-1 font-semibold text-ink">
                {department.electiveSettings?.minDurationDays ?? "?"} - {department.electiveSettings?.maxDurationDays ?? "?"} ימים
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="text-xl font-black text-ink">חלונות תאריכים</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {department.electiveSettings?.availabilityMode === "OPEN_BY_DEFAULT"
              ? "פתוח בדרך כלל. תאריכים חסומים מסומנים מטה."
              : "פתוח רק בחלונות מוגדרים מראש. ניתן להגיש רק בתוך חלון פתוח."}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[...openWindows, ...closedWindows].map((window) => (
              <div key={window.id} className="rounded-2xl border border-slate-100 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={window.status === "OPEN" ? "success" : "danger"}>{window.status === "OPEN" ? "חלונות פתוחים" : "תאריכים חסומים"}</Badge>
                  <span className="font-semibold text-ink">
                    {formatDateInput(window.startsAt)} - {formatDateInput(window.endsAt)}
                  </span>
                </div>
                {window.capacityOverride ? <p className="mt-2 text-slate-600">קיבולת בחלון: {window.capacityOverride}</p> : null}
                {window.reason ? <p className="mt-2 text-slate-600">{window.reason}</p> : null}
              </div>
            ))}
            {department.electiveAvailabilityWindows.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">לא הוגדרו חלונות תאריכים.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
