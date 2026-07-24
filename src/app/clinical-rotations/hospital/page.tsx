import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  clinicalRotationDateRangeLabel,
  getClinicalRotationHospitalDashboard,
  getClinicalRotationHospitalPortalContext
} from "@/lib/clinical-rotations";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ClinicalRotationHospitalPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const hospitalId = typeof params.hospitalId === "string" ? params.hospitalId : undefined;
  const context = await getClinicalRotationHospitalPortalContext({
    requestedHospitalId: hospitalId,
    nextPath: "/clinical-rotations/hospital"
  });
  const data = await getClinicalRotationHospitalDashboard(context.selectedHospital.id);
  const publishedCount = data.offerings.filter((offering) => offering.status === "PUBLISHED").length;

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="פורטל בית חולים"
        title={`סבבים קליניים · ${context.selectedHospital.name}`}
        description="בית החולים סגור כברירת מחדל. פרסום סבב אפשרי רק לאחר הגדרת זמינות ופרטי תשלום."
      />

      {context.hospitals.length > 1 ? (
        <Card className="flex flex-wrap gap-2">
          {context.hospitals.map((hospital) => (
            <Link key={hospital.id} href={`/clinical-rotations/hospital?hospitalId=${hospital.id}`} className={`rounded-full px-4 py-2 text-xs font-black ${hospital.id === context.selectedHospital.id ? "bg-brand-700 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
              {hospital.name}
            </Link>
          ))}
        </Card>
      ) : null}

      {data.windows.length === 0 || publishedCount === 0 ? (
        <Card className="border-amber-200 bg-amber-50/70">
          <Badge tone="warning">סגור להגשות</Badge>
          <h2 className="mt-3 text-xl font-black text-ink">נדרש Setup לפני פרסום</h2>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            אין זמינות ציבורית כברירת מחדל. יש להגדיר חלונות פתוחים, תאריכי סגירה אם קיימים, מינימום משתתפים ותשלום לפני פרסום סבבים.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-5">
        <Card><p className="text-xs font-black text-slate-500">חלונות פתוחים</p><p className="mt-2 text-3xl font-black text-ink">{data.windows.length}</p></Card>
        <Card><p className="text-xs font-black text-slate-500">סגירות</p><p className="mt-2 text-3xl font-black text-ink">{data.blackouts.length}</p></Card>
        <Card><p className="text-xs font-black text-slate-500">סבבים</p><p className="mt-2 text-3xl font-black text-ink">{data.offerings.length}</p></Card>
        <Card><p className="text-xs font-black text-slate-500">בקשות</p><p className="mt-2 text-3xl font-black text-ink">{data.applications.length}</p></Card>
        <Card><p className="text-xs font-black text-slate-500">תשלומים</p><p className="mt-2 text-3xl font-black text-ink">{data.payments.length}</p></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {[
          ["/clinical-rotations/hospital/availability", "זמינות"],
          ["/clinical-rotations/hospital/offerings", "סבבים"],
          ["/clinical-rotations/hospital/offerings/new", "סבב חדש"],
          ["/clinical-rotations/hospital/applications", "בקשות"],
          ["/clinical-rotations/hospital/payments", "תשלומים"]
        ].map(([href, label]) => (
          <Link key={href} href={`${href}?hospitalId=${context.selectedHospital.id}`} className="rounded-2xl border border-brand-100 bg-white p-4 text-sm font-black text-brand-800 shadow-sm">
            {label}
          </Link>
        ))}
      </div>

      <Card>
        <h2 className="text-xl font-black text-ink">בקשות אחרונות</h2>
        <div className="mt-4 space-y-3">
          {data.applications.slice(0, 6).map((application) => (
            <div key={application.id} className="rounded-2xl border border-brand-100 bg-white p-4 text-sm">
              <p className="font-black text-ink">{application.studentUser.fullName} · {application.offering.displayName}</p>
              <p className="mt-1 text-slate-600">{clinicalRotationDateRangeLabel(application.requestedStartAt, application.requestedEndAt)} · {application.status}</p>
            </div>
          ))}
          {data.applications.length === 0 ? <p className="text-sm text-slate-600">אין בקשות עדיין.</p> : null}
        </div>
      </Card>
    </PageShell>
  );
}
