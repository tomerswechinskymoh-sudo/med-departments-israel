import Link from "next/link";
import { ClinicalRotationOfferingForm } from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getClinicalRotationHospitalFormOptions,
  getClinicalRotationHospitalPortalContext
} from "@/lib/clinical-rotations";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewClinicalRotationOfferingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const hospitalId = typeof params.hospitalId === "string" ? params.hospitalId : undefined;
  const context = await getClinicalRotationHospitalPortalContext({
    requestedHospitalId: hospitalId,
    nextPath: "/clinical-rotations/hospital/offerings/new"
  });
  const options = await getClinicalRotationHospitalFormOptions(context.selectedHospital.id);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow={context.selectedHospital.name}
        title="סבב חדש"
        description="סבב יישמר כטיוטה אם לא מסמנים פרסום. פרסום ייכשל אם חסרים זמינות, מינימום משתתפים או תשלום."
      />
      <Card>
        <ClinicalRotationOfferingForm
          hospitalId={context.selectedHospital.id}
          specialties={options.specialties}
          departments={options.departments}
        />
      </Card>
      <Link href={`/clinical-rotations/hospital/offerings?hospitalId=${context.selectedHospital.id}`} className="inline-flex text-sm font-black text-brand-700">
        חזרה לרשימת הסבבים
      </Link>
    </PageShell>
  );
}
