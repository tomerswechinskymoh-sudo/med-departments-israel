import Link from "next/link";
import {
  ClinicalRotationActionForm,
  ClinicalRotationAdminAccessForm,
  ClinicalRotationAdminPermissionForm
} from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";
import { getClinicalRotationAdminLists } from "@/lib/clinical-rotations";
import { clinicalRotationNoIndexMetadata } from "@/lib/clinical-rotations-shared";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

export default async function AdminClinicalRotationUsersPage() {
  await requireAdmin();
  const { hospitals, accesses } = await getClinicalRotationAdminLists();

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="נציגי בתי חולים"
        description="הרשאה ניתנת לבית חולים מסוים בלבד. ידיעת URL אינה הרשאה."
      />

      <Card>
        <h2 className="mb-4 text-xl font-black text-ink">הזמנה או עדכון נציג/ה</h2>
        <ClinicalRotationAdminAccessForm hospitals={hospitals.map((hospital) => ({ id: hospital.id, name: hospital.name }))} />
      </Card>

      <Card>
        <h2 className="mb-4 text-xl font-black text-ink">הרשאת צפייה במסמכי אימות</h2>
        <p className="mb-4 text-sm leading-7 text-slate-700">גם אדמין רגיל אינו מקבל גישה למסמכי זהות בלי הרשאה מפורשת.</p>
        <ClinicalRotationAdminPermissionForm />
      </Card>

      <div className="space-y-3">
        {accesses.map((access) => (
          <Card key={access.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-ink">{access.user.fullName}</h2>
              <p className="text-sm font-semibold text-slate-600">{access.user.email} · {access.hospital.name}</p>
              <p className="text-xs text-slate-500">RoleKey: {access.user.roleKey}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={access.isActive ? "success" : "warning"}>{access.isActive ? "פעיל" : "כבוי"}</Badge>
              <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/users" payload={{ action: access.isActive ? "deactivate" : "activate", accessId: access.id }} label={access.isActive ? "כיבוי" : "הפעלה"} tone={access.isActive ? "danger" : "primary"} />
              <ClinicalRotationActionForm endpoint="/api/admin/clinical-rotations/users" payload={{ action: "reset", accessId: access.id }} label="איפוס גישה" tone="neutral" />
            </div>
          </Card>
        ))}
        {accesses.length === 0 ? <Card><p className="text-sm text-slate-600">אין נציגים עדיין.</p></Card> : null}
      </div>

      <Link href="/admin/clinical-rotations" className="inline-flex text-sm font-black text-brand-700">חזרה</Link>
    </PageShell>
  );
}
