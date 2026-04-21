import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { openingTypeLabel } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

function statusLabel(status: "OPEN" | "UPCOMING" | "CLOSED") {
  if (status === "OPEN") {
    return { label: "פתוח להגשה", tone: "success" as const };
  }

  if (status === "UPCOMING") {
    return { label: "צפוי להיפתח", tone: "warning" as const };
  }

  return { label: "סגור כרגע", tone: "default" as const };
}

export function OpeningCard({
  opening,
  showInstitution = true,
  showApplyButton = true
}: {
  opening: {
    id: string;
    title: string;
    summary: string;
    openingType: "RESIDENCY" | "FELLOWSHIP" | "ACADEMIC_TRACK" | "COMMUNITY_TRACK" | "OTHER";
    isImmediate: boolean;
    openingsCount?: number | null;
    status: "OPEN" | "UPCOMING" | "CLOSED";
    committeeDate?: Date | string | null;
    applicationDeadline?: Date | string | null;
    department: {
      name: string;
      institution: {
        name: string;
      };
      specialty: {
        name: string;
      };
    };
    acceptanceCriteria?: {
      researchImportance: number;
      departmentElectiveImportance: number;
      personalFitImportance: number;
    } | null;
    _count?: {
      applications: number;
    };
  };
  showInstitution?: boolean;
  showApplyButton?: boolean;
}) {
  const status = statusLabel(opening.status);

  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <Badge>{openingTypeLabel(opening.openingType)}</Badge>
          {opening.isImmediate ? <Badge tone="warning">זמינות מיידית</Badge> : null}
          {opening.openingsCount ? <Badge>{opening.openingsCount} תקנים</Badge> : null}
        </div>

        <h3 className="mt-4 text-2xl font-bold text-ink">{opening.title}</h3>
        <p className="mt-2 text-sm font-semibold text-brand-700">{opening.department.specialty.name}</p>
        {showInstitution ? (
          <p className="mt-1 text-sm text-slate-600">
            {opening.department.institution.name} · {opening.department.name}
          </p>
        ) : null}

        <p className="mt-4 text-sm leading-7 text-slate-700">{opening.summary}</p>

        <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div className="rounded-2xl bg-brand-50/70 p-3">
            <p className="text-xs font-semibold text-slate-500">תאריך ועדה קרוב</p>
            <p className="mt-1 font-semibold text-ink">{formatDate(opening.committeeDate)}</p>
          </div>
          <div className="rounded-2xl bg-brand-50/70 p-3">
            <p className="text-xs font-semibold text-slate-500">דדליין להגשה</p>
            <p className="mt-1 font-semibold text-ink">{formatDate(opening.applicationDeadline)}</p>
          </div>
        </div>

        {opening.acceptanceCriteria ? (
          <div className="mt-5 rounded-2xl border border-brand-100 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">מה המחלקה מדגישה במיוחד</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">מחקר</p>
                <p className="mt-1 font-semibold text-ink">
                  {opening.acceptanceCriteria.researchImportance}/5
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">אלקטיב במחלקה</p>
                <p className="mt-1 font-semibold text-ink">
                  {opening.acceptanceCriteria.departmentElectiveImportance}/5
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">התאמה אישית</p>
                <p className="mt-1 font-semibold text-ink">
                  {opening.acceptanceCriteria.personalFitImportance}/5
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/openings/${opening.id}`}
          className="rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          לפרטי הפתיחה
        </Link>
        {showApplyButton && opening.status !== "CLOSED" ? (
          <Link
            href={`/openings/${opening.id}/apply`}
            className="rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
          >
            הגשת מועמדות
          </Link>
        ) : null}
        {opening._count ? (
          <span className="text-xs text-slate-500">{opening._count.applications} מועמדויות התקבלו</span>
        ) : null}
      </div>
    </Card>
  );
}
