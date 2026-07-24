import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";
import { getClinicalRotationAdminLists } from "@/lib/clinical-rotations";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

export default async function AdminClinicalRotationHospitalsPage() {
  await requireAdmin();
  const { hospitals } = await getClinicalRotationAdminLists();

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="בתי חולים בסבבים קליניים"
        description="בתי חולים אינם פתוחים כברירת מחדל. זמינות קיימת רק אחרי הגדרה מפורשת."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {hospitals.map((hospital) => {
          const published = hospital.clinicalRotationOfferings.filter((offering) => offering.status === "PUBLISHED").length;
          return (
            <Card key={hospital.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-ink">{hospital.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{hospital.city ?? "עיר לא הוגדרה"}</p>
                </div>
                <Badge tone={hospital.clinicalRotationAvailabilityWindows.length > 0 && published > 0 ? "success" : "warning"}>
                  {hospital.clinicalRotationAvailabilityWindows.length > 0 && published > 0 ? "פתוח חלקית" : "סגור"}
                </Badge>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div><dt className="text-xs font-black text-slate-500">נציגים</dt><dd className="font-black">{hospital.clinicalRotationHospitalAccesses.length}</dd></div>
                <div><dt className="text-xs font-black text-slate-500">חלונות</dt><dd className="font-black">{hospital.clinicalRotationAvailabilityWindows.length}</dd></div>
                <div><dt className="text-xs font-black text-slate-500">סבבים</dt><dd className="font-black">{hospital.clinicalRotationOfferings.length}</dd></div>
              </dl>
              <Link href={`/clinical-rotations/hospital?hospitalId=${hospital.id}`} className="mt-4 inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">
                פתיחת פורטל בית חולים
              </Link>
            </Card>
          );
        })}
      </div>
      <Link href="/admin/clinical-rotations" className="inline-flex text-sm font-black text-brand-700">חזרה</Link>
    </PageShell>
  );
}
