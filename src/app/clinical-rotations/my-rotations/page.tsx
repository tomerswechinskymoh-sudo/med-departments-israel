import Link from "next/link";
import {
  ClinicalRotationCancellationForm,
  ClinicalRotationIdentityVerificationForm
} from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  clinicalRotationDateRangeLabel,
  clinicalRotationPriceLabel,
  getClinicalRotationStudentDashboard,
  requireClinicalRotationStudentSession
} from "@/lib/clinical-rotations";
import {
  clinicalRotationApplicationStatusLabels,
  clinicalRotationCoreSpecialtyLabels,
  clinicalRotationNoIndexMetadata,
  clinicalRotationPaymentStatusLabels
} from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

export default async function MyClinicalRotationsPage() {
  const session = await requireClinicalRotationStudentSession("/clinical-rotations/my-rotations");
  const dashboard = await getClinicalRotationStudentDashboard(session);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="האזור האישי"
        title="הסבבים הקליניים שלי"
        description="מעקב אחר בקשות, תשלומים ושבועות לפי תחום. שבועות שהושלמו מוצגים בנפרד מסבבים עתידיים שאושרו."
      />

      <Card>
        <h2 className="text-xl font-black text-ink">סטטוס אימות לסבבים קליניים</h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          {dashboard.identity?.status === "APPROVED"
            ? "האימות שלך אושר. המסמך המקורי נמחק לאחר ההחלטה ונשמרו רק פרטי החלטה מינימליים."
            : dashboard.identity?.status === "PENDING_REVIEW"
              ? "בקשת האימות שלך ממתינה לבדיקה ידנית."
              : "לפני הגשה ראשונה נדרש אימות זהות וזכאות."}
        </p>
        {dashboard.identity?.status !== "APPROVED" ? <div className="mt-4"><ClinicalRotationIdentityVerificationForm /></div> : null}
      </Card>

      <div className="grid gap-3 md:grid-cols-6">
        {Object.entries(dashboard.summary.buckets).map(([key, value]) => (
          <Card key={key}>
            <p className="text-xs font-black text-slate-500">{key}</p>
            <p className="mt-2 text-3xl font-black text-ink">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="text-xl font-black text-ink">מגבלות ליבה</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {dashboard.summary.byCoreSpecialty.map((row) => (
            <div key={row.coreSpecialty} className="rounded-2xl border border-brand-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black text-ink">{clinicalRotationCoreSpecialtyLabels[row.coreSpecialty]}</h3>
                {row.warning ? <Badge tone={row.enforcementMode === "BLOCK" ? "danger" : "warning"}>{row.enforcementMode}</Badge> : <Badge tone="success">תקין</Badge>}
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div><dt className="text-xs font-black text-slate-500">הושלם</dt><dd className="font-black text-ink">{row.completedWeeks}</dd></div>
                <div><dt className="text-xs font-black text-slate-500">עתידי מאושר</dt><dd className="font-black text-ink">{row.futureApprovedWeeks}</dd></div>
                <div><dt className="text-xs font-black text-slate-500">מגבלה</dt><dd className="font-black text-ink">{row.ruleLimitWeeks ?? "לא הוגדרה"}</dd></div>
              </dl>
              {row.warning ? <p className="mt-3 text-sm font-semibold text-amber-800">{row.warning}</p> : null}
            </div>
          ))}
          {dashboard.summary.byCoreSpecialty.length === 0 ? (
            <p className="text-sm text-slate-600">אין עדיין סבבים בתחומי הליבה.</p>
          ) : null}
        </div>
      </Card>

      <div className="space-y-3">
        {dashboard.applications.map((application) => (
          <Card key={application.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-ink">{application.offering.displayName}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {application.hospital.name} · {application.specialty.name}
                  {application.department ? ` · ${application.department.name}` : ""}
                </p>
                <p className="mt-1 text-sm text-slate-600">{clinicalRotationDateRangeLabel(application.requestedStartAt, application.requestedEndAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{clinicalRotationApplicationStatusLabels[application.status]}</Badge>
                <Badge tone={application.payment?.status === "PAID" || application.payment?.status === "WAIVED" ? "success" : "warning"}>
                  {application.payment ? clinicalRotationPaymentStatusLabels[application.payment.status] : "אין רשומת תשלום"}
                </Badge>
              </div>
            </div>
            {application.payment ? (
              <p className="text-sm leading-7 text-slate-700">
                תשלום: {clinicalRotationPriceLabel({ priceAmount: application.payment.amount, priceCurrency: application.payment.currency, priceUnit: "TOTAL" })}.
                {application.payment.paymentLink && application.payment.status === "LINK_SENT" ? (
                  <> <a href={application.payment.paymentLink} className="font-black text-brand-700">פתיחת קישור התשלום</a></>
                ) : null}
              </p>
            ) : null}
            {["SUBMITTED", "WAITLISTED", "APPROVED"].includes(application.status) ? (
              <ClinicalRotationCancellationForm applicationId={application.id} />
            ) : null}
          </Card>
        ))}
        {dashboard.applications.length === 0 ? (
          <Card>
            <p className="text-sm font-semibold text-slate-700">עדיין לא הוגשו בקשות.</p>
            <Link href="/clinical-rotations" className="mt-3 inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">
              חיפוש סבבים
            </Link>
          </Card>
        ) : null}
      </div>

      <Card>
        <h2 className="text-xl font-black text-ink">ביטולים</h2>
        <div className="mt-3 space-y-3">
          {dashboard.cancellations.map((cancellation) => (
            <div key={cancellation.id} className="rounded-2xl border border-brand-100 bg-white p-4 text-sm">
              <p className="font-black text-ink">{cancellation.offering.displayName} · {cancellation.hospital.name}</p>
              <p className="mt-1 text-slate-600">סטטוס: {cancellation.status} · סיבה: {cancellation.reasonCategory}</p>
            </div>
          ))}
          {dashboard.cancellations.length === 0 ? <p className="text-sm text-slate-600">אין היסטוריית ביטולים.</p> : null}
        </div>
      </Card>
    </PageShell>
  );
}
