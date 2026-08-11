import Link from "next/link";
import { ClinicalRotationActionForm } from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  clinicalRotationDateRangeLabel,
  clinicalRotationPriceLabel,
  getClinicalRotationHospitalDashboard,
  getClinicalRotationHospitalPortalContext
} from "@/lib/clinical-rotations";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ClinicalRotationHospitalOfferingsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const hospitalId = typeof params.hospitalId === "string" ? params.hospitalId : undefined;
  const context = await getClinicalRotationHospitalPortalContext({
    requestedHospitalId: hospitalId,
    nextPath: "/clinical-rotations/hospital/offerings"
  });
  const data = await getClinicalRotationHospitalDashboard(context.selectedHospital.id);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow={context.selectedHospital.name}
        title="ניהול סבבים"
        description="אפשר ליצור סבבים גם כשאין אף סבב קיים. פרסום דורש זמינות ותשלום תקינים."
      />

      <div className="flex flex-wrap gap-2">
        <Link href={`/clinical-rotations/hospital/offerings/new?hospitalId=${context.selectedHospital.id}`} className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">
          סבב חדש
        </Link>
        <Link href={`/clinical-rotations/hospital?hospitalId=${context.selectedHospital.id}`} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">
          חזרה לפורטל
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.offerings.map((offering) => {
          const participantCount = offering.applications.filter((application) => application.status === "APPROVED" || application.status === "COMPLETED").length;
          return (
            <Card key={offering.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={offering.status === "PUBLISHED" ? "success" : offering.status === "DRAFT" ? "warning" : "default"}>{offering.status}</Badge>
                <Badge tone={participantCount >= offering.minimumParticipants ? "success" : "warning"}>
                  {participantCount}/{offering.minimumParticipants} מינימום
                </Badge>
              </div>
              <div>
                <h2 className="text-xl font-black text-ink">{offering.displayName}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">{offering.specialty.name}{offering.department ? ` · ${offering.department.name}` : ""}</p>
              </div>
              <p className="text-sm text-slate-700">{clinicalRotationDateRangeLabel(offering.startsAt, offering.endsAt)} · {clinicalRotationPriceLabel(offering)}</p>
              <p className="text-xs font-bold text-slate-500">
                {offering.minDurationWeeks}-{offering.maxDurationWeeks} שבועות · קיבולת {offering.maximumCapacity ?? "לא הוגדרה"} · {offering.groupRegistrationEnabled ? "קבוצות פעילות" : "ללא קבוצות"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/clinical-rotations/hospital/offerings/${offering.id}?hospitalId=${context.selectedHospital.id}`} className="rounded-full bg-brand-700 px-4 py-2 text-xs font-black text-white">
                  עריכה
                </Link>
                {offering.status !== "PUBLISHED" ? (
                  <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/offerings" payload={{ action: "publish", offeringId: offering.id }} label="פרסום" />
                ) : (
                  <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/offerings" payload={{ action: "pause", offeringId: offering.id }} label="השהיה" tone="neutral" />
                )}
                {offering.status !== "CLOSED" ? (
                  <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/offerings" payload={{ action: "close", offeringId: offering.id }} label="סגירה" tone="danger" />
                ) : null}
                {offering.status !== "CANCELLED" ? (
                  <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/offerings" payload={{ action: "cancel", offeringId: offering.id }} label="ביטול סבב" tone="danger" />
                ) : null}
              </div>
            </Card>
          );
        })}
        {data.offerings.length === 0 ? (
          <Card>
            <p className="text-sm font-semibold text-slate-700">אין סבבים עדיין.</p>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
