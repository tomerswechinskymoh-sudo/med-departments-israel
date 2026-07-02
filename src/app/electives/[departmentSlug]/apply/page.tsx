import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ElectiveApplicationForm } from "@/components/electives/student-electives-actions";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  buildElectiveDepartmentHref,
  getElectiveDepartmentAvailabilityMatch,
  getElectiveDepartmentBySlug,
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

export default async function StudentElectiveApplyPage({
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
  const detailHref = buildElectiveDepartmentHref(department.slug, search);
  const match = requestedStartDate && requestedEndDate
    ? await getElectiveDepartmentAvailabilityMatch(department, requestedStartDate, requestedEndDate)
    : null;

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="תצוגה פנימית לאדמין בלבד"
        title="הגשת בקשה לאלקטיב"
        description={`${department.institution.name} · ${department.specialty.name}. בשלב זה ההגשה זמינה לאדמין בלבד לצורכי בדיקה.`}
      />
      <Card>
        <p className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
          הבקשה תישמר כ-SUBMITTED ולא תאושר אוטומטית. המידע יוצג רק למשתמש שלך ולאדמין.
        </p>

        {!requestedStartDate || !requestedEndDate ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-900">
            חסרים תאריכי התחלה וסיום. יש לחזור לעמוד האלקטיב ולבחור תאריכים לפני הגשת בקשה.
          </div>
        ) : !match?.ok ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-900">
            {match?.error ?? "התאריכים אינם זמינים להגשה."}
          </div>
        ) : (
          <ElectiveApplicationForm
            departmentSlug={department.slug}
            defaultStartDate={search.start}
            defaultEndDate={search.end}
          />
        )}
      </Card>
      <Link href={detailHref} className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">
        חזרה לעמוד האלקטיב
      </Link>
    </PageShell>
  );
}
