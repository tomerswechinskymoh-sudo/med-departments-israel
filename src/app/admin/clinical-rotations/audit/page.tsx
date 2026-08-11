import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

export default async function AdminClinicalRotationAuditPage() {
  await requireAdmin();
  const logs = await prisma.clinicalRotationAuditLog.findMany({
    include: {
      actor: { select: { fullName: true, email: true } },
      hospital: { select: { name: true } }
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200
  });

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading eyebrow="אדמין" title="יומן ביקורת" description="יומן פעולות ללא תעודות זהות גולמיות, מסמכי אימות, קישורי הזמנה או מפתחות HMAC." />
      <div className="space-y-3">
        {logs.map((log) => (
          <Card key={log.id} className="space-y-1">
            <p className="text-sm font-black text-ink">{log.action}</p>
            <p className="text-xs text-slate-600">{log.createdAt.toISOString()} · {log.actor?.email ?? "system"} · {log.hospital?.name ?? "כללי"}</p>
          </Card>
        ))}
        {logs.length === 0 ? <Card><p className="text-sm text-slate-600">אין אירועי ביקורת.</p></Card> : null}
      </div>
      <Link href="/admin/clinical-rotations" className="inline-flex text-sm font-black text-brand-700">חזרה</Link>
    </PageShell>
  );
}
