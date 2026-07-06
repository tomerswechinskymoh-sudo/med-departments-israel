import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ElectiveDepartmentLogoutButton } from "@/components/electives/department-portal-actions";
import { RepresentativeApplicationActions } from "@/components/electives/representative-application-actions";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireElectiveDepartmentSession } from "@/lib/elective-department-auth";
import { getRepresentativeApplication } from "@/lib/elective-representative-applications";
import { getElectiveTrackLabel } from "@/lib/elective-tracks";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function ElectiveDepartmentApplicationDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const session = await requireElectiveDepartmentSession();
  const application = await getRepresentativeApplication({
    session,
    applicationId: (await params).applicationId
  });

  if (!application) {
    notFound();
  }

  return (
    <PageShell className="space-y-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeading
          eyebrow="Private department portal"
          title={`בקשת אלקטיב · ${application.applicantName}`}
          description={`${application.department.institution.name} · ${application.department.specialty.name} · ${application.department.name}`}
        />
        <div className="flex flex-wrap gap-2">
          <Link href={`/electives/department/applications?departmentId=${application.departmentId}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700">
            חזרה
          </Link>
          <ElectiveDepartmentLogoutButton />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="default">{application.status}</Badge>
            <Badge tone="warning">פרטי סטודנט לצורך תיאום בלבד</Badge>
          </div>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs font-black text-slate-500">שם</dt>
              <dd className="mt-1 font-semibold text-ink">{application.applicantName}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs font-black text-slate-500">אימייל</dt>
              <dd className="mt-1 font-semibold text-ink">{application.applicantEmail}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs font-black text-slate-500">טלפון</dt>
              <dd className="mt-1 font-semibold text-ink">{application.applicantPhone ?? "לא צוין"}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-xs font-black text-slate-500">פקולטה</dt>
              <dd className="mt-1 font-semibold text-ink">{application.medicalSchool ?? "לא צוין"}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
              <dt className="text-xs font-black text-slate-500">סוג סבב</dt>
              <dd className="mt-1 font-semibold text-ink">{getElectiveTrackLabel(application.trackType)}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
              <dt className="text-xs font-black text-slate-500">תאריכים מבוקשים</dt>
              <dd className="mt-1 font-semibold text-ink">
                {application.requestedStartDate ? formatDate(application.requestedStartDate) : "לא צוין"}
                {" - "}
                {application.requestedEndDate ? formatDate(application.requestedEndDate) : "לא צוין"}
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
              <dt className="text-xs font-black text-slate-500">הערות הסטודנט/ית</dt>
              <dd className="mt-1 leading-7 text-slate-700">{application.studentNotes ?? "לא נוספו הערות."}</dd>
            </div>
            {application.proposedStartDate && application.proposedEndDate ? (
              <div className="rounded-2xl bg-brand-50 px-4 py-3 md:col-span-2">
                <dt className="text-xs font-black text-slate-500">חלופה שהוצעה</dt>
                <dd className="mt-1 font-semibold text-ink">
                  {formatDate(application.proposedStartDate)} - {formatDate(application.proposedEndDate)}
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <RepresentativeApplicationActions applicationId={application.id} />
      </div>
    </PageShell>
  );
}
