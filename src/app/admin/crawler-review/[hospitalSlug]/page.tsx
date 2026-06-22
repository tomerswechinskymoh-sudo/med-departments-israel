import Link from "next/link";
import { notFound } from "next/navigation";
import { CrawlerReviewWorkbench } from "@/components/admin/crawler-review-workbench";
import { requireAdmin } from "@/lib/auth-guards";
import { getCrawlerReviewHospital } from "@/lib/server/crawler-review-store";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminCrawlerReviewHospitalPage({
  params
}: {
  params: Promise<{ hospitalSlug: string }>;
}) {
  await requireAdmin();
  const { hospitalSlug } = await params;
  const detail = await getCrawlerReviewHospital(hospitalSlug);

  if (!detail) notFound();

  return (
    <PageShell className="space-y-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading
          eyebrow="Crawler Review"
          title={detail.summary.hospitalName}
          description={`${detail.summary.hospitalSlug} · ${detail.summary.outputUsability}`}
        />
        <Link href="/admin/crawler-review" className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-black text-brand-800">
          Back to hospitals
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone="default">{detail.summary.institutionType}</Badge>
        <Badge tone="warning">{detail.summary.crawlReadiness}</Badge>
        <Badge tone="warning">{detail.summary.mappingReadiness}</Badge>
        {Object.entries(detail.summary.warningBadges).map(([warning, count]) => (
          <Badge key={warning} tone="warning">{warning}: {count}</Badge>
        ))}
      </div>

      <CrawlerReviewWorkbench
        summary={detail.summary}
        doctors={detail.doctors}
        departmentLinks={detail.departmentLinks}
        reviewNeeded={detail.reviewNeeded}
      />
    </PageShell>
  );
}
