import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InstitutionLogo } from "@/components/departments/institution-logo";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  formatDateInput,
  getAvailabilitySummary,
  getElectiveDepartmentRegion,
  getElectiveDepartmentBySlug,
  requireStudentElectivesPreviewAccess
} from "@/lib/student-electives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function StudentElectiveDepartmentPage({
  params
}: {
  params: Promise<{ departmentSlug: string }>;
}) {
  await requireStudentElectivesPreviewAccess();
  const { departmentSlug } = await params;
  const department = await getElectiveDepartmentBySlug(departmentSlug);

  if (!department) {
    notFound();
  }

  const openWindows = department.electiveAvailabilityWindows.filter((window) => window.status === "OPEN");
  const closedWindows = department.electiveAvailabilityWindows.filter((window) => window.status === "CLOSED");
  const region = getElectiveDepartmentRegion(department);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin hidden preview"
        title={`${department.institution.name} · ${department.specialty.name}`}
        description="עמוד אלקטיב בתצוגת אדמין מוסתרת בלבד. משתמשים רגילים חסומים עד פתיחה עתידית."
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">פתוח להגשה</Badge>
            <Badge tone="default">{department.electiveSettings?.availabilityMode}</Badge>
          </div>
          <div className="mt-5 flex gap-4">
            <InstitutionLogo institution={department.institution} size="md" />
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-ink">{department.name}</h2>
              <p className="mt-2 text-sm text-slate-600">
                {[department.institution.city, region].filter(Boolean).join(" · ") || "מיקום לא צוין"}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-700">{department.about || department.shortSummary || "לא נוסף תיאור אלקטיב למחלקה."}</p>
          {department.electiveSettings?.notes ? (
            <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
              {department.electiveSettings.notes}
            </div>
          ) : null}
          <div className="mt-6">
            <Link href={`/electives/${department.slug}/apply`} className="inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">
              הגשת בקשה לאלקטיב
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-black text-ink">זמינות</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">{getAvailabilitySummary(department)}</p>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs font-black text-slate-500">מקסימום סטודנטים במקביל</dt>
              <dd className="mt-1 font-semibold text-ink">{department.electiveSettings?.maxStudentsAtOnce ?? "לא הוגדר"}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs font-black text-slate-500">משך אלקטיב</dt>
              <dd className="mt-1 font-semibold text-ink">
                {department.electiveSettings?.minDurationDays ?? "?"} - {department.electiveSettings?.maxDurationDays ?? "?"} ימים
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-black text-ink">חלונות תאריכים</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {department.electiveSettings?.availabilityMode === "OPEN_BY_DEFAULT"
            ? "המחלקה פתוחה כברירת מחדל. חלונות סגורים חוסמים תאריכים מסוימים."
            : "המחלקה סגורה כברירת מחדל. ניתן להגיש רק בתוך חלונות פתוחים."}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[...openWindows, ...closedWindows].map((window) => (
            <div key={window.id} className="rounded-2xl border border-slate-100 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone={window.status === "OPEN" ? "success" : "danger"}>{window.status === "OPEN" ? "פתוח" : "סגור"}</Badge>
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
    </PageShell>
  );
}
