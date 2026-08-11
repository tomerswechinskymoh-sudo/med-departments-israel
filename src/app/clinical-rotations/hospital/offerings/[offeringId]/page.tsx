import { notFound } from "next/navigation";
import Link from "next/link";
import { ClinicalRotationOfferingForm } from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getClinicalRotationHospitalFormOptions,
  getClinicalRotationHospitalPortalContext
} from "@/lib/clinical-rotations";
import {
  clinicalRotationNoIndexMetadata,
  formatClinicalRotationDateInput
} from "@/lib/clinical-rotations-shared";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EditClinicalRotationOfferingPage({
  params,
  searchParams
}: {
  params: Promise<{ offeringId: string }>;
  searchParams: SearchParams;
}) {
  const { offeringId } = await params;
  const rawParams = await searchParams;
  const hospitalId = typeof rawParams.hospitalId === "string" ? rawParams.hospitalId : undefined;
  const context = await getClinicalRotationHospitalPortalContext({
    requestedHospitalId: hospitalId,
    nextPath: `/clinical-rotations/hospital/offerings/${offeringId}`
  });
  const offering = await prisma.clinicalRotationOffering.findUnique({
    where: { id: offeringId },
    include: { specialty: { select: { name: true } }, department: { select: { name: true } } }
  });

  if (!offering || offering.hospitalId !== context.selectedHospital.id) {
    notFound();
  }

  const options = await getClinicalRotationHospitalFormOptions(context.selectedHospital.id);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow={context.selectedHospital.name}
        title={`עריכת ${offering.displayName}`}
        description="עדכון סבב קיים. אם הסבב מפורסם, שמירה ממשיכה לאכוף זמינות ותשלום תקינים."
      />
      <Card className="space-y-4">
        <Badge tone={offering.status === "PUBLISHED" ? "success" : "warning"}>{offering.status}</Badge>
        <ClinicalRotationOfferingForm
          hospitalId={context.selectedHospital.id}
          specialties={options.specialties}
          departments={options.departments}
          offering={{
            id: offering.id,
            specialtyId: offering.specialtyId,
            departmentId: offering.departmentId,
            displayName: offering.displayName,
            startsAt: formatClinicalRotationDateInput(offering.startsAt),
            endsAt: formatClinicalRotationDateInput(offering.endsAt),
            minimumParticipants: offering.minimumParticipants,
            maximumCapacity: offering.maximumCapacity,
            minDurationWeeks: offering.minDurationWeeks,
            maxDurationWeeks: offering.maxDurationWeeks,
            priceAmount: String(offering.priceAmount),
            priceUnit: offering.priceUnit,
            paymentMethod: offering.paymentMethod,
            paymentLink: offering.paymentLink,
            requirements: offering.requirements,
            cancellationPolicy: offering.cancellationPolicy,
            workLanguage: offering.workLanguage,
            departmentContactName: offering.departmentContactName,
            departmentContactEmail: offering.departmentContactEmail,
            requiresDeanApproval: offering.requiresDeanApproval,
            requiresInsurance: offering.requiresInsurance,
            groupRegistrationEnabled: offering.groupRegistrationEnabled,
            groupMinSize: offering.groupMinSize,
            groupMaxSize: offering.groupMaxSize,
            isPreviewOnly: offering.isPreviewOnly,
            applicationBlockedReason: offering.applicationBlockedReason,
            studentInstructions: offering.studentInstructions,
            internalNotes: offering.internalNotes
          }}
        />
      </Card>
      <Link href={`/clinical-rotations/hospital/offerings?hospitalId=${context.selectedHospital.id}`} className="inline-flex text-sm font-black text-brand-700">
        חזרה לרשימה
      </Link>
    </PageShell>
  );
}
