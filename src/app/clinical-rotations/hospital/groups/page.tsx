import { ClinicalRotationActionForm } from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  clinicalRotationDateRangeLabel,
  getClinicalRotationHospitalGroups,
  getClinicalRotationHospitalPortalContext
} from "@/lib/clinical-rotations";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ClinicalRotationHospitalGroupsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const hospitalId = typeof params.hospitalId === "string" ? params.hospitalId : null;
  const context = await getClinicalRotationHospitalPortalContext({
    requestedHospitalId: hospitalId,
    nextPath: "/clinical-rotations/hospital/groups"
  });
  const groups = await getClinicalRotationHospitalGroups(context.selectedHospital.id);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading eyebrow={context.selectedHospital.name} title="בקשות קבוצתיות" description="קבוצות אינן ציבוריות. מתאם רואה רק חברים שהצטרפו והשלימו בדיקות מינימליות." />
      <div className="space-y-4">
        {groups.map((group) => (
          <Card key={group.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-ink">{group.offering.displayName}</h2>
                <p className="text-sm text-slate-600">{clinicalRotationDateRangeLabel(group.requestedStartAt, group.requestedEndAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{group.status}</Badge>
                <Badge>{group.members.length} / {group.maxMembers}</Badge>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {group.members.map((member) => (
                <div key={member.id} className="rounded-2xl border border-brand-100 bg-white p-3 text-sm">
                  <p className="font-black text-ink">{member.user.fullName}</p>
                  <p className="text-slate-600">{member.user.email}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">סטטוס: {member.application.status}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/groups" payload={{ groupId: group.id, action: "approve" }} label="אישור קבוצה" />
              <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/groups" payload={{ groupId: group.id, action: "decline" }} label="דחייה" tone="danger" />
              <ClinicalRotationActionForm endpoint="/api/clinical-rotations/hospital/groups" payload={{ groupId: group.id, action: "revokeInvite" }} label="ביטול הזמנה" tone="neutral" />
            </div>
          </Card>
        ))}
        {groups.length === 0 ? <Card><p className="text-sm text-slate-600">אין בקשות קבוצתיות.</p></Card> : null}
      </div>
    </PageShell>
  );
}
