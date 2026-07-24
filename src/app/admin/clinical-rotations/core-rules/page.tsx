import Link from "next/link";
import { ClinicalRotationCoreRuleForm } from "@/components/clinical-rotations/clinical-rotation-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdmin } from "@/lib/auth-guards";
import { getClinicalRotationAdminLists } from "@/lib/clinical-rotations";
import {
  clinicalRotationCoreSpecialtyLabels,
  clinicalRotationNoIndexMetadata
} from "@/lib/clinical-rotations-shared";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = clinicalRotationNoIndexMetadata;

export default async function AdminClinicalRotationCoreRulesPage() {
  await requireAdmin();
  const { specialties, rules } = await getClinicalRotationAdminLists();

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Admin only"
        title="כללי מגבלות ליבה"
        description="ברירת המחדל לכל כלל חדש היא WARN. BLOCK מונע הגשת בקשה שחורגת מהמגבלה."
      />
      <Card>
        <ClinicalRotationCoreRuleForm specialties={specialties} />
      </Card>
      <div className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-ink">{clinicalRotationCoreSpecialtyLabels[rule.coreSpecialty]}</h2>
              <p className="mt-1 text-sm text-slate-600">
                עד {rule.maxWeeks} שבועות · תחולה {formatDate(rule.effectiveDate)}
                {rule.specialty ? ` · ${rule.specialty.name}` : ""}
              </p>
              {rule.notes ? <p className="mt-1 text-sm text-slate-600">{rule.notes}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={rule.enforcementMode === "BLOCK" ? "danger" : "warning"}>{rule.enforcementMode}</Badge>
              <Badge tone={rule.isActive ? "success" : "default"}>{rule.isActive ? "פעיל" : "כבוי"}</Badge>
            </div>
          </Card>
        ))}
        {rules.length === 0 ? <Card><p className="text-sm text-slate-600">לא הוגדרו כללים עדיין. יש ליצור כלל לכל תחום ליבה נדרש.</p></Card> : null}
      </div>
      <Link href="/admin/clinical-rotations" className="inline-flex text-sm font-black text-brand-700">חזרה</Link>
    </PageShell>
  );
}
