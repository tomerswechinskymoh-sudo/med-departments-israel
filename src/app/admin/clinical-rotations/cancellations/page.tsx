import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

export default async function AdminClinicalRotationCancellationsPage() {
  await requireAdmin();
  const cancellations = await prisma.clinicalRotationCancellation.findMany({
    include: {
      studentUser: { select: { fullName: true, email: true } },
      hospital: { select: { name: true } },
      offering: { select: { displayName: true } }
    },
    orderBy: [{ requestedAt: "desc" }],
    take: 200
  });

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading eyebrow="אדמין" title="ביטולים" description="תצוגת ביטולים מערכתית ללא תעודות זהות גולמיות, מסמכים או מפתחות HMAC." />
      <div className="space-y-3">
        {cancellations.map((cancellation) => (
          <Card key={cancellation.id} className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-ink">{cancellation.offering.displayName}</h2>
                <p className="text-sm text-slate-600">{cancellation.hospital.name} · {cancellation.studentUser?.fullName ?? "סטודנט/ית"}</p>
                <p className="text-xs font-bold text-slate-500">סיבה: {cancellation.reasonCategory} · לפני אישור: {cancellation.beforeApproval ? "כן" : "לא"}</p>
              </div>
              <Badge>{cancellation.status}</Badge>
            </div>
          </Card>
        ))}
        {cancellations.length === 0 ? <Card><p className="text-sm text-slate-600">אין ביטולים.</p></Card> : null}
      </div>
      <Link href="/admin/clinical-rotations" className="inline-flex text-sm font-black text-brand-700">חזרה</Link>
    </PageShell>
  );
}
