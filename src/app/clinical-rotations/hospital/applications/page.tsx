import Link from "next/link";
import { ClinicalRotationActionForm } from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  clinicalRotationDateRangeLabel,
  getClinicalRotationHospitalDashboard,
  getClinicalRotationHospitalPortalContext
} from "@/lib/clinical-rotations";
import {
  clinicalRotationApplicationStatusLabels,
  clinicalRotationNoIndexMetadata,
  clinicalRotationPaymentStatusLabels
} from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ClinicalRotationHospitalApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const hospitalId = typeof params.hospitalId === "string" ? params.hospitalId : undefined;
  const context = await getClinicalRotationHospitalPortalContext({
    requestedHospitalId: hospitalId,
    nextPath: "/clinical-rotations/hospital/applications"
  });
  const data = await getClinicalRotationHospitalDashboard(context.selectedHospital.id);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow={context.selectedHospital.name}
        title="בקשות סטודנטים"
        description="אישור בקשה אינו מבטיח שהסבב יצא לפועל אם מינימום המשתתפים טרם הושג."
      />

      <div className="space-y-3">
        {data.applications.map((application) => {
          const approvedCount = data.applications.filter((item) => item.offeringId === application.offeringId && (item.status === "APPROVED" || item.status === "COMPLETED")).length;
          const cancellationCount = data.cancellations.filter((item) => item.studentUserId === application.studentUserId).length;
          return (
            <Card key={application.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-ink">{application.studentUser.fullName}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{application.studentUser.email}</p>
                  <p className="mt-1 text-sm text-slate-700">{application.offering.displayName} · {clinicalRotationDateRangeLabel(application.requestedStartAt, application.requestedEndAt)}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">מינימום סבב: {approvedCount}/{application.offering.minimumParticipants}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">ביטולים קודמים במודול: {cancellationCount}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{clinicalRotationApplicationStatusLabels[application.status]}</Badge>
                  <Badge tone={approvedCount >= application.offering.minimumParticipants ? "success" : "warning"}>
                    {approvedCount >= application.offering.minimumParticipants ? "מינימום הושג" : "מינימום טרם הושג"}
                  </Badge>
                  {application.payment ? <Badge>{clinicalRotationPaymentStatusLabels[application.payment.status]}</Badge> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {application.status === "SUBMITTED" ? (
                  <>
                    <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/applications" payload={{ action: "approve", applicationId: application.id }} label="אישור" />
                    <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/applications" payload={{ action: "waitlist", applicationId: application.id }} label="המתנה" tone="neutral" />
                    <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/applications" payload={{ action: "decline", applicationId: application.id }} label="דחייה" tone="danger" />
                  </>
                ) : null}
                {application.status === "WAITLISTED" ? (
                  <>
                    <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/applications" payload={{ action: "approve", applicationId: application.id }} label="אישור" />
                    <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/applications" payload={{ action: "decline", applicationId: application.id }} label="דחייה" tone="danger" />
                  </>
                ) : null}
                {application.status === "CANCELLATION_REQUESTED" ? (
                  <>
                    <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/applications" payload={{ action: "approveCancellation", applicationId: application.id }} label="אישור ביטול" />
                    <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/applications" payload={{ action: "rejectCancellation", applicationId: application.id }} label="דחיית ביטול" tone="neutral" />
                  </>
                ) : null}
                {application.status === "APPROVED" ? (
                  <>
                    <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/applications" payload={{ action: "complete", applicationId: application.id }} label="הושלם" />
                    <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/applications" payload={{ action: "cancel", applicationId: application.id }} label="ביטול" tone="danger" />
                  </>
                ) : null}
              </div>
            </Card>
          );
        })}
        {data.applications.length === 0 ? <Card><p className="text-sm text-slate-600">אין בקשות עדיין.</p></Card> : null}
      </div>

      <Link href={`/clinical-rotations/hospital?hospitalId=${context.selectedHospital.id}`} className="inline-flex text-sm font-black text-brand-700">
        חזרה לפורטל
      </Link>
    </PageShell>
  );
}
