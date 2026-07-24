import Link from "next/link";
import { ClinicalRotationActionForm } from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";
import {
  clinicalRotationDateRangeLabel,
  clinicalRotationMoneyLabel,
  getClinicalRotationAdminLists
} from "@/lib/clinical-rotations";
import {
  clinicalRotationNoIndexMetadata,
  clinicalRotationPaymentStatusLabels
} from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

export default async function AdminClinicalRotationPaymentsPage() {
  await requireAdmin();
  const { payments } = await getClinicalRotationAdminLists();

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="כל רשומות התשלום"
        description="אין אינטגרציית ספק תשלום אמיתית בשלב זה. סטטוס PAID מתעדכן ידנית בלבד."
      />
      <div className="space-y-3">
        {payments.map((payment) => (
          <Card key={payment.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-ink">{payment.application.studentUser.fullName}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {payment.application.hospital.name} · {payment.application.offering.displayName}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {clinicalRotationDateRangeLabel(payment.application.requestedStartAt, payment.application.requestedEndAt)} · {clinicalRotationMoneyLabel(payment.amount, payment.currency)}
                </p>
              </div>
              <Badge tone={payment.status === "PAID" || payment.status === "WAIVED" ? "success" : payment.status === "OVERDUE" ? "danger" : "warning"}>
                {clinicalRotationPaymentStatusLabels[payment.status]}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/payments" payload={{ paymentId: payment.id, status: "PAID" }} label="שולם" />
              <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/payments" payload={{ paymentId: payment.id, status: "WAIVED" }} label="ויתור" tone="neutral" />
              <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/payments" payload={{ paymentId: payment.id, status: "OVERDUE" }} label="באיחור" tone="danger" />
            </div>
          </Card>
        ))}
        {payments.length === 0 ? <Card><p className="text-sm text-slate-600">אין רשומות תשלום עדיין.</p></Card> : null}
      </div>
      <Link href="/admin/clinical-rotations" className="inline-flex text-sm font-black text-brand-700">חזרה</Link>
    </PageShell>
  );
}
