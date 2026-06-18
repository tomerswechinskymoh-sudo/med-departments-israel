import Link from "next/link";
import { MasterCsvUploadPanel } from "@/components/admin/master-csv-upload-panel";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function AdminMasterCsvPage() {
  await requireAdmin();

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="ייבוא נתונים"
        title="ניהול קבצי MASTER"
        description="ייבוא קבוע ומבוקר לקבצי MASTER_Spec.csv ו-MASTER_Dept.csv עם תצוגה מקדימה לפני החלה."
      />

      <Card className="rounded-[1.5rem]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-ink">כללי בטיחות</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              הייבוא לא מריץ Data_Exp, לא מוחק נתונים ידנית, ולא מפעיל תיקון stale. ערכי גיליון כמו #DIV/0! מטופלים כחסר.
            </p>
          </div>
          <Link href="/admin" className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-black text-brand-800">
            חזרה לדשבורד
          </Link>
        </div>
      </Card>

      <MasterCsvUploadPanel />
    </PageShell>
  );
}
