import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guards";
import { getCrawlerReviewHospitals } from "@/lib/server/crawler-review-store";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function warningTotal(warnings: Record<string, number>) {
  return Object.values(warnings).reduce((sum, count) => sum + count, 0);
}

function badgeTone(value: string) {
  if (value === "departmentMappedRoster" || value === "safeForFullBatch") return "success" as const;
  if (value === "hospitalRoster" || value === "needsCalibration" || value === "reviewNeeded") return "warning" as const;
  return "default" as const;
}

export default async function AdminCrawlerReviewPage() {
  await requireAdmin();
  const hospitals = await getCrawlerReviewHospitals();

  return (
    <PageShell className="space-y-8 py-10">
      <SectionHeading
        eyebrow="Crawler Review"
        title="בדיקת רופאים מהקרולר"
        description="בחר/י בית חולים, בדוק/י רופאים וקישורי מחלקה, ושמור/י החלטות לקובץ ביקורת מקומי בלבד."
      />

      <Card className="border-amber-200 bg-amber-50/70">
        <p className="text-sm leading-7 text-slate-700">
          שמירה בעמוד זה כותבת רק ל־<code>data/crawler/hospitals/review-exports/admin-review-decisions.json</code>.
          אין כאן ייבוא ל־DB ואין פרסום באתר הציבורי.
        </p>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Card><p className="text-xs font-bold text-slate-500">Hospitals</p><p className="text-3xl font-black text-ink">{hospitals.length}</p></Card>
        <Card><p className="text-xs font-bold text-slate-500">Total doctors</p><p className="text-3xl font-black text-ink">{hospitals.reduce((sum, hospital) => sum + hospital.canonicalDoctorsCount, 0)}</p></Card>
        <Card><p className="text-xs font-bold text-slate-500">Total links</p><p className="text-3xl font-black text-ink">{hospitals.reduce((sum, hospital) => sum + hospital.departmentLinksCount, 0)}</p></Card>
        <Card><p className="text-xs font-bold text-slate-500">Reviewed</p><p className="text-3xl font-black text-ink">{hospitals.reduce((sum, hospital) => sum + hospital.reviewedCount, 0)}</p></Card>
      </div>

      <div className="space-y-3">
        {hospitals.map((hospital) => {
          const warningCount = warningTotal(hospital.warningBadges);
          const progress = hospital.totalReviewableCount ? Math.round((hospital.reviewedCount / hospital.totalReviewableCount) * 100) : 0;
          return (
            <Link
              key={hospital.hospitalSlug}
              href={`/admin/crawler-review/${hospital.hospitalSlug}`}
              className="block rounded-[1.35rem] border border-brand-100 bg-white/95 p-4 shadow-sm transition hover:border-brand-300 hover:shadow-panel"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-ink">{hospital.hospitalName}</h2>
                  <p className="mt-1 text-sm text-slate-500">{hospital.hospitalSlug}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone={badgeTone(hospital.outputUsability)}>{hospital.outputUsability}</Badge>
                    <Badge tone={badgeTone(hospital.crawlReadiness)}>{hospital.crawlReadiness}</Badge>
                    <Badge tone={badgeTone(hospital.mappingReadiness)}>{hospital.mappingReadiness}</Badge>
                    {warningCount ? <Badge tone="warning">{warningCount} warnings</Badge> : <Badge tone="success">low warning load</Badge>}
                  </div>
                </div>
                <div className="grid min-w-[17rem] grid-cols-2 gap-2 text-sm text-slate-700">
                  <span>Doctors: <b>{hospital.canonicalDoctorsCount}</b></span>
                  <span>Links: <b>{hospital.departmentLinksCount}</b></span>
                  <span>Review needed: <b>{hospital.reviewNeededCount}</b></span>
                  <span>Source match: <b>{hospital.sourceUrlMatchCount}</b></span>
                  <span className="col-span-2">Progress: <b>{hospital.reviewedCount}/{hospital.totalReviewableCount}</b> · {progress}%</span>
                </div>
              </div>
              {Object.keys(hospital.warningBadges).length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(hospital.warningBadges).map(([warning, count]) => (
                    <span key={warning} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {warning}: {count}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
