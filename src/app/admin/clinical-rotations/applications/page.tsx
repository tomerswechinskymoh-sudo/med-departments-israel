import Link from "next/link";
import { ClinicalRotationActionForm } from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";
import {
  clinicalRotationDateRangeLabel,
  getClinicalRotationAdminLists
} from "@/lib/clinical-rotations";
import {
  clinicalRotationApplicationStatusLabels,
  clinicalRotationNoIndexMetadata,
  clinicalRotationPaymentStatusLabels
} from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

export default async function AdminClinicalRotationApplicationsPage() {
  await requireAdmin();
  const { applications } = await getClinicalRotationAdminLists();

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="כל בקשות הסבבים"
        description="אדמין יכול לבצע תיקון ידני עם audit trail. אין מחיקה או שכתוב היסטורי."
      />
      <div className="space-y-3">
        {applications.map((application) => (
          <Card key={application.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-ink">{application.studentUser.fullName}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">{application.studentUser.email}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {application.hospital.name} · {application.specialty.name} · {application.offering.displayName}
                </p>
                <p className="mt-1 text-sm text-slate-700">{clinicalRotationDateRangeLabel(application.requestedStartAt, application.requestedEndAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{clinicalRotationApplicationStatusLabels[application.status]}</Badge>
                {application.payment ? <Badge>{clinicalRotationPaymentStatusLabels[application.payment.status]}</Badge> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {application.status === "SUBMITTED" || application.status === "WAITLISTED" ? <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/applications" payload={{ action: "approve", applicationId: application.id, notes: "פעולת אדמין ידנית" }} label="אישור" /> : null}
              {application.status === "SUBMITTED" ? <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/applications" payload={{ action: "waitlist", applicationId: application.id, notes: "פעולת אדמין ידנית" }} label="המתנה" tone="neutral" /> : null}
              {application.status === "CANCELLATION_REQUESTED" ? <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/applications" payload={{ action: "approveCancellation", applicationId: application.id, notes: "פעולת אדמין ידנית" }} label="אישור ביטול" /> : null}
              {application.status === "CANCELLATION_REQUESTED" ? <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/applications" payload={{ action: "rejectCancellation", applicationId: application.id, notes: "פעולת אדמין ידנית" }} label="דחיית ביטול" tone="neutral" /> : null}
              {application.status !== "DECLINED" ? <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/applications" payload={{ action: "decline", applicationId: application.id, notes: "פעולת אדמין ידנית" }} label="דחייה" tone="danger" /> : null}
              {application.status !== "CANCELLED" ? <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/applications" payload={{ action: "cancel", applicationId: application.id, notes: "פעולת אדמין ידנית" }} label="ביטול" tone="danger" /> : null}
              {application.status !== "COMPLETED" ? <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/applications" payload={{ action: "complete", applicationId: application.id, notes: "פעולת אדמין ידנית" }} label="הושלם" /> : null}
            </div>
          </Card>
        ))}
        {applications.length === 0 ? <Card><p className="text-sm text-slate-600">אין בקשות עדיין.</p></Card> : null}
      </div>
      <Link href="/admin/clinical-rotations" className="inline-flex text-sm font-black text-brand-700">חזרה</Link>
    </PageShell>
  );
}
