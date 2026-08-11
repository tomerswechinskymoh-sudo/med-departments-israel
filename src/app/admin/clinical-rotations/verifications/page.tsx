import Link from "next/link";
import { ClinicalRotationActionForm } from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";
import { hasClinicalRotationIdentityReviewPermission } from "@/lib/clinical-rotations-privacy";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";
import { prisma } from "@/lib/prisma";
import { ClinicalRotationIdentityVerificationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

export default async function AdminClinicalRotationVerificationsPage() {
  const session = await requireAdmin();
  const canReviewDocuments = await hasClinicalRotationIdentityReviewPermission(session.userId);
  if (!canReviewDocuments) {
    const pendingCount = await prisma.clinicalRotationStudentIdentity.count({
      where: { status: ClinicalRotationIdentityVerificationStatus.PENDING_REVIEW }
    });

    return (
      <PageShell className="space-y-6 py-8">
        <SectionHeading eyebrow="אדמין" title="אימות זהות לסבבים קליניים" description="גישה למסמכים ולפרטי בקשות ממתינות דורשת הרשאת CAN_REVIEW_IDENTITY_DOCUMENTS." />
        <Card>
          <p className="text-sm font-semibold text-rose-700">אין לחשבון הזה הרשאת צפייה במסמכי אימות.</p>
          <p className="mt-2 text-sm text-slate-600">בקשות ממתינות לבדיקה: {pendingCount}</p>
        </Card>
        <Link href="/admin/clinical-rotations" className="inline-flex text-sm font-black text-brand-700">חזרה</Link>
      </PageShell>
    );
  }

  const identities = await prisma.clinicalRotationStudentIdentity.findMany({
    include: {
      user: { select: { fullName: true, email: true } },
      pendingDocumentFile: { select: { id: true, originalName: true, sizeBytes: true } },
      verifierUser: { select: { fullName: true } }
    },
    orderBy: [{ submittedAt: "desc" }],
    take: 100
  });

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading eyebrow="אדמין" title="אימות זהות לסבבים קליניים" description="מסמכי אימות זמינים רק למי שקיבל הרשאת CAN_REVIEW_IDENTITY_DOCUMENTS." />
      <div className="space-y-3">
        {identities.map((identity) => (
          <Card key={identity.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-ink">{identity.user.fullName}</h2>
                <p className="text-sm text-slate-600">{identity.user.email}</p>
                <p className="text-xs font-bold text-slate-500">גרסת מפתח: {identity.keyVersion} · מסמך נמחק: {identity.documentDeletedAt ? "כן" : "לא"}</p>
              </div>
              <Badge>{identity.status}</Badge>
            </div>
            {identity.pendingDocumentFile ? (
              <a href={`/api/files/${identity.pendingDocumentFile.id}`} className="inline-flex text-sm font-black text-brand-700">
                פתיחת מסמך ממתין
              </a>
            ) : null}
            {identity.status === "PENDING_REVIEW" ? (
              <div className="flex flex-wrap gap-2">
                <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/verifications" payload={{ identityId: identity.id, action: "approve" }} label="אישור" />
                <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/verifications" payload={{ identityId: identity.id, action: "reject" }} label="דחייה" tone="danger" />
              </div>
            ) : null}
          </Card>
        ))}
        {identities.length === 0 ? <Card><p className="text-sm text-slate-600">אין בקשות אימות.</p></Card> : null}
      </div>
      <Link href="/admin/clinical-rotations" className="inline-flex text-sm font-black text-brand-700">חזרה</Link>
    </PageShell>
  );
}
