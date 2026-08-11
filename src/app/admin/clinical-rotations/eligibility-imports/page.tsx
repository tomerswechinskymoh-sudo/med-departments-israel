import Link from "next/link";
import { ClinicalRotationEligibilityImportForm } from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

export default async function AdminClinicalRotationEligibilityImportsPage() {
  await requireAdmin();
  const imports = await prisma.clinicalRotationEligibilityImport.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 50
  });

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading eyebrow="אדמין" title="ייבוא רשימות זכאות" description="הקובץ מעובד בצד השרת. נשמרים רק ערכי HMAC ותקציר ולידציה ללא תעודות זהות גולמיות." />
      <Card>
        <ClinicalRotationEligibilityImportForm />
      </Card>
      <div className="space-y-3">
        {imports.map((entry) => (
          <Card key={entry.id} className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-ink">{entry.sourceLabel}</h2>
                <p className="text-sm text-slate-600">שורות: {entry.rowCount} · התקבלו: {entry.acceptedRowCount} · נדחו: {entry.rejectedRowCount}</p>
                <p className="text-xs font-bold text-slate-500">קובץ מקור: {entry.sourceDeletionStatus} · נמחק: {entry.sourceDeletedAt ? "כן" : "לא"} · גרסת מפתח {entry.keyVersion}</p>
                {entry.sourceDeletionErrorCategory ? (
                  <p className="text-xs font-bold text-rose-700">נדרש ניקוי חוזר: {entry.sourceDeletionErrorCategory}</p>
                ) : null}
              </div>
              <Badge tone={entry.status === "ACTIVE" ? "success" : "default"}>{entry.status}</Badge>
            </div>
          </Card>
        ))}
        {imports.length === 0 ? <Card><p className="text-sm text-slate-600">אין ייבואי זכאות.</p></Card> : null}
      </div>
      <Link href="/admin/clinical-rotations" className="inline-flex text-sm font-black text-brand-700">חזרה</Link>
    </PageShell>
  );
}
