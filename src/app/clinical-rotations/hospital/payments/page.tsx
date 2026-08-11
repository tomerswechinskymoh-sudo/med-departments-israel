import Link from "next/link";
import { ClinicalRotationActionForm } from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  clinicalRotationDateRangeLabel,
  clinicalRotationMoneyLabel,
  getClinicalRotationHospitalDashboard,
  getClinicalRotationHospitalPortalContext
} from "@/lib/clinical-rotations";
import {
  clinicalRotationNoIndexMetadata,
  clinicalRotationPaymentStatusLabels
} from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ClinicalRotationHospitalPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const hospitalId = typeof params.hospitalId === "string" ? params.hospitalId : undefined;
  const context = await getClinicalRotationHospitalPortalContext({
    requestedHospitalId: hospitalId,
    nextPath: "/clinical-rotations/hospital/payments"
  });
  const data = await getClinicalRotationHospitalDashboard(context.selectedHospital.id);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow={context.selectedHospital.name}
        title="תשלומים"
        description="פתיחת קישור תשלום אינה מסמנת תשלום כהושלם. סטטוס מתעדכן ידנית לאחר אימות."
      />

      <div className="space-y-3">
        {data.payments.map((payment) => (
          <Card key={payment.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-ink">{payment.application.studentUser.fullName}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">{payment.application.offering.displayName}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {clinicalRotationDateRangeLabel(payment.application.requestedStartAt, payment.application.requestedEndAt)} · {clinicalRotationMoneyLabel(payment.amount, payment.currency)}
                </p>
              </div>
              <Badge tone={payment.status === "PAID" || payment.status === "WAIVED" ? "success" : payment.status === "OVERDUE" ? "danger" : "warning"}>
                {clinicalRotationPaymentStatusLabels[payment.status]}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {payment.status === "LINK_PENDING" || payment.status === "LINK_DELIVERY_FAILED" ? (
                <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/payments" payload={{ paymentId: payment.id, action: "retryPaymentLink" }} label="שליחה חוזרת של קישור" tone="neutral" />
              ) : null}
              <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/payments" payload={{ paymentId: payment.id, status: "PAID" }} label="שולם" />
              <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/payments" payload={{ paymentId: payment.id, status: "WAIVED" }} label="ויתור" tone="neutral" />
              <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/payments" payload={{ paymentId: payment.id, status: "OVERDUE" }} label="באיחור" tone="danger" />
            </div>
          </Card>
        ))}
        {data.payments.length === 0 ? <Card><p className="text-sm text-slate-600">אין רשומות תשלום עדיין.</p></Card> : null}
      </div>

      <Link href={`/clinical-rotations/hospital?hospitalId=${context.selectedHospital.id}`} className="inline-flex text-sm font-black text-brand-700">
        חזרה לפורטל
      </Link>
    </PageShell>
  );
}
