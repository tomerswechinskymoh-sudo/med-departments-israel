import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getClinicalRotationOfferingForStudent
} from "@/lib/clinical-rotations";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

export default async function ClinicalRotationOfferingPage({
  params
}: {
  params: Promise<{ offeringSlug: string }>;
}) {
  const { offeringSlug } = await params;
  const offering = await getClinicalRotationOfferingForStudent(offeringSlug);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow={`${offering.hospital.name} · ${offering.specialty.name}`}
        title={offering.displayName}
        description={offering.studentInstructions ?? "פרטי הסבב כפי שהוגדרו על ידי בית החולים."}
      />
      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{offering.dateLabel}</Badge>
          <Badge>{offering.priceLabel}</Badge>
          <Badge tone={offering.minimumMet ? "success" : "warning"}>
            {offering.minimumMet ? "מינימום משתתפים הושג" : "טרם הושג מינימום משתתפים"}
          </Badge>
        </div>
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="font-black text-slate-500">בית חולים</dt>
            <dd className="mt-1 font-semibold text-ink">{offering.hospital.name}</dd>
          </div>
          <div>
            <dt className="font-black text-slate-500">תחום/מחלקה</dt>
            <dd className="mt-1 font-semibold text-ink">
              {offering.specialty.name}{offering.department ? ` · ${offering.department.name}` : ""}
            </dd>
          </div>
          <div>
            <dt className="font-black text-slate-500">מספר משתתפים מינימלי</dt>
            <dd className="mt-1 font-semibold text-ink">{offering.minimumParticipants}</dd>
          </div>
          <div>
            <dt className="font-black text-slate-500">משתתפים מאושרים</dt>
            <dd className="mt-1 font-semibold text-ink">{offering.participantCount}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Link href={`/clinical-rotations/${offering.slug}/apply`} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">
            הגשת בקשה
          </Link>
          <Link href="/clinical-rotations" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">
            חזרה לחיפוש
          </Link>
        </div>
      </Card>
    </PageShell>
  );
}
