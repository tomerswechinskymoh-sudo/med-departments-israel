import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";
import {
  getClinicalRotationAdminDashboard,
  clinicalRotationCoreSpecialtyLabels
} from "@/lib/clinical-rotations";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

const links = [
  ["/admin/clinical-rotations/hospitals", "בתי חולים"],
  ["/admin/clinical-rotations/users", "נציגים"],
  ["/admin/clinical-rotations/core-rules", "כללי ליבה"],
  ["/admin/clinical-rotations/applications", "בקשות"],
  ["/admin/clinical-rotations/payments", "תשלומים"]
] as const;

export default async function AdminClinicalRotationsPage() {
  await requireAdmin();
  const data = await getClinicalRotationAdminDashboard();

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="ניהול סבבים קליניים"
        description="מודול נפרד מאלקטיבים. אין קישורים ציבוריים ואין חשיפה במפת האתר."
      />

      <div className="grid gap-3 md:grid-cols-5">
        <Card><p className="text-xs font-black text-slate-500">בתי חולים</p><p className="mt-2 text-3xl font-black text-ink">{data.hospitals}</p></Card>
        <Card><p className="text-xs font-black text-slate-500">הרשאות נציגים</p><p className="mt-2 text-3xl font-black text-ink">{data.accessCount}</p></Card>
        <Card><p className="text-xs font-black text-slate-500">סטטוסי סבבים</p><p className="mt-2 text-3xl font-black text-ink">{data.offerings.reduce((sum, row) => sum + row._count, 0)}</p></Card>
        <Card><p className="text-xs font-black text-slate-500">בקשות</p><p className="mt-2 text-3xl font-black text-ink">{data.applications.reduce((sum, row) => sum + row._count, 0)}</p></Card>
        <Card><p className="text-xs font-black text-slate-500">חריגות חסומות</p><p className="mt-2 text-3xl font-black text-ink">{data.ruleViolations}</p></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-2xl border border-brand-100 bg-white p-4 text-sm font-black text-brand-800 shadow-sm">
            {label}
          </Link>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-ink">סטודנטים ליד מגבלה</h2>
          <Badge tone="warning">WARN/BLOCK</Badge>
        </div>
        <div className="mt-4 space-y-3">
          {data.studentSummaries.flatMap((student) =>
            student.byCoreSpecialty
              .filter((row) => row.warning)
              .map((row) => (
                <div key={`${student.studentUserId}-${row.coreSpecialty}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                  <p className="font-black text-ink">{student.fullName} · {student.email}</p>
                  <p className="mt-1 text-amber-900">
                    {clinicalRotationCoreSpecialtyLabels[row.coreSpecialty]}: הושלם {row.completedWeeks}, עתידי מאושר {row.futureApprovedWeeks}, מגבלה {row.ruleLimitWeeks}, מצב {row.enforcementMode}
                  </p>
                </div>
              ))
          )}
          {data.studentSummaries.every((student) => student.byCoreSpecialty.every((row) => !row.warning)) ? (
            <p className="text-sm text-slate-600">אין כרגע סטודנטים עם אזהרת מגבלה פעילה.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink">סיכומי סטודנטים</h2>
        <div className="mt-4 space-y-3">
          {data.studentSummaries.map((student) => (
            <div key={student.studentUserId} className="rounded-2xl border border-brand-100 bg-white p-4 text-sm">
              <p className="font-black text-ink">{student.fullName} · {student.email}</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {student.byCoreSpecialty.map((row) => (
                  <div key={row.coreSpecialty} className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="font-black text-slate-800">{clinicalRotationCoreSpecialtyLabels[row.coreSpecialty]}</p>
                    <p className="mt-1 text-slate-600">
                      הושלם {row.completedWeeks} · עתידי מאושר {row.futureApprovedWeeks} · מגבלה {row.ruleLimitWeeks ?? "לא הוגדרה"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {data.studentSummaries.length === 0 ? <p className="text-sm text-slate-600">אין עדיין סבבים מאושרים או שהושלמו.</p> : null}
        </div>
      </Card>
    </PageShell>
  );
}
