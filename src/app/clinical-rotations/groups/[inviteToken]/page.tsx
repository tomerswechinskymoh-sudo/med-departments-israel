import Link from "next/link";
import { ClinicalRotationGroupJoinForm } from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  clinicalRotationDateRangeLabel,
  getClinicalRotationGroupInvite,
  requireClinicalRotationStudentSession
} from "@/lib/clinical-rotations";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

export default async function ClinicalRotationGroupInvitePage({
  params
}: {
  params: Promise<{ inviteToken: string }>;
}) {
  const { inviteToken } = await params;
  await requireClinicalRotationStudentSession(`/clinical-rotations/groups/${inviteToken}`);
  const invite = await getClinicalRotationGroupInvite(inviteToken);

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="הזמנה לקבוצה"
        title={invite.group.offering.displayName}
        description={`${invite.group.offering.hospital.name} · ${invite.group.offering.specialty.name}`}
      />
      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{clinicalRotationDateRangeLabel(invite.group.requestedStartAt, invite.group.requestedEndAt)}</Badge>
          <Badge>{invite.memberCount} / {invite.group.maxMembers} חברים</Badge>
        </div>
        <p className="text-sm leading-7 text-slate-700">הקישור אינו מציג פרטים אישיים של חברי הקבוצה. כל מצטרף עובר בדיקת אימות וזכאות עצמאית.</p>
        <ClinicalRotationGroupJoinForm inviteToken={inviteToken} />
        <Link href="/clinical-rotations" className="inline-flex text-sm font-black text-brand-700">חזרה לסבבים</Link>
      </Card>
    </PageShell>
  );
}
