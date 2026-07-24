import Link from "next/link";
import { ClinicalRotationApplicationForm } from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getClinicalRotationOfferingForStudent,
  requireClinicalRotationStudentSession
} from "@/lib/clinical-rotations";
import {
  clinicalRotationNoIndexMetadata,
  formatClinicalRotationDateInput
} from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

export default async function ClinicalRotationApplyPage({
  params
}: {
  params: Promise<{ offeringSlug: string }>;
}) {
  const { offeringSlug } = await params;
  await requireClinicalRotationStudentSession(`/clinical-rotations/${offeringSlug}/apply`);
  const offering = await getClinicalRotationOfferingForStudent(offeringSlug);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="הגשת בקשה"
        title={offering.displayName}
        description={`${offering.hospital.name} · ${offering.specialty.name}`}
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{offering.dateLabel}</Badge>
          <Badge>{offering.priceLabel}</Badge>
          <Badge tone={offering.minimumMet ? "success" : "warning"}>
            {offering.minimumMet ? "מינימום משתתפים הושג" : "טרם הושג מינימום משתתפים"}
          </Badge>
        </div>
        <p className="text-sm leading-7 text-slate-700">
          יש לבחור תאריכים בתוך חלון הסבב. המערכת בודקת גם חלונות זמינות פתוחים וגם תאריכי סגירה של בית החולים.
        </p>
        <ClinicalRotationApplicationForm
          offeringId={offering.id}
          defaultStart={formatClinicalRotationDateInput(offering.startsAt)}
          defaultEnd={formatClinicalRotationDateInput(offering.endsAt)}
        />
        <Link href={`/clinical-rotations/${offering.slug}`} className="inline-flex text-sm font-black text-brand-700">
          חזרה לפרטי הסבב
        </Link>
      </Card>
    </PageShell>
  );
}
