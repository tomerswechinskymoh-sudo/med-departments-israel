"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RowLog = {
  id: string;
  sourceFile: string;
  target: string;
  rowNumber: number;
  status: string;
  warningsJson?: unknown;
  errorsJson?: unknown;
};

type MappingRow = {
  departmentId: string;
  departmentName: string;
  institutionName: string;
  specialtyName: string;
  needsMapping: boolean;
  lowConfidence: boolean;
  latestMetric?: {
    year: number;
    publicationsCount?: number | null;
    confidenceScore?: number | null;
  } | null;
};

type ResearchMetric = {
  id: string;
  year: number;
  publicationsCount?: number | null;
  confidenceScore?: number | null;
  needsMapping: boolean;
  isAmbiguous: boolean;
  department: {
    name: string;
    institution: {
      name: string;
    };
    specialty: {
      name: string;
    };
  };
};

function toneForStatus(status: string) {
  if (/imported|updated|APPROVED/i.test(status)) return "success" as const;
  if (/warning|pending|mapping|PENDING/i.test(status)) return "warning" as const;
  if (/failed|error|rejected|FAILED/i.test(status)) return "danger" as const;
  return "default" as const;
}

function warningCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export function DataRefreshPanels({
  rowLogs,
  mappingRows,
  researchMetrics
}: {
  rowLogs: RowLog[];
  mappingRows: MappingRow[];
  researchMetrics: ResearchMetric[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"websites" | "openalex" | null>(null);

  async function runAction(action: "websites" | "openalex") {
    setBusyAction(action);
    setMessage(null);
    setError(null);
    const response = await fetch(
      action === "websites" ? "/api/admin/department-website-refresh" : "/api/admin/research-metrics",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ limit: 5 })
      }
    );
    const payload = await response.json().catch(() => ({}));
    setBusyAction(null);

    if (!response.ok) {
      setError(payload.error ?? "הפעולה נכשלה.");
      return;
    }

    setMessage(payload.message ?? "הפעולה הסתיימה.");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-black text-ink">ריענון אתרי מחלקות</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                יוצר דראפטים ממתינים בלבד. הנתונים לא מתפרסמים לפני אישור אדמין.
              </p>
            </div>
            <Button type="button" onClick={() => runAction("websites")} disabled={busyAction !== null}>
              {busyAction === "websites" ? "מרענן..." : "ריענון 5 מחלקות"}
            </Button>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-black text-ink">ריענון OpenAlex</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                שומר ספירת פרסומים שנתית משוערת בלבד, עם סטטוס מיפוי וביטחון.
              </p>
            </div>
            <Button type="button" onClick={() => runAction("openalex")} disabled={busyAction !== null}>
              {busyAction === "openalex" ? "מרענן..." : "ריענון 5 מחלקות"}
            </Button>
          </div>
        </section>
      </div>

      {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p> : null}
      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p> : null}

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[1.5rem] border border-brand-100 bg-white p-4">
          <p className="text-sm font-black text-ink">לוג ייבוא CSV אחרון</p>
          <div className="mt-4 space-y-2">
            {rowLogs.length === 0 ? (
              <p className="text-sm text-slate-600">אין עדיין לוגים של ייבוא CSV.</p>
            ) : (
              rowLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-ink">{log.sourceFile} · שורה {log.rowNumber}</span>
                    <Badge tone={toneForStatus(log.status)}>{log.status}</Badge>
                  </div>
                  <p className="mt-1">{log.target}</p>
                  {warningCount(log.warningsJson) > 0 ? (
                    <p className="mt-1 font-bold text-amber-800">{warningCount(log.warningsJson)} אזהרות</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-brand-100 bg-white p-4">
          <p className="text-sm font-black text-ink">סטטוס מיפוי OpenAlex</p>
          <div className="mt-4 space-y-2">
            {mappingRows.slice(0, 8).map((row) => (
              <div key={row.departmentId} className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-ink">{row.institutionName} · {row.specialtyName}</span>
                  {row.needsMapping ? (
                    <Badge tone="warning">needs mapping</Badge>
                  ) : row.lowConfidence ? (
                    <Badge tone="warning">low confidence</Badge>
                  ) : (
                    <Badge tone="success">mapped</Badge>
                  )}
                </div>
                <p className="mt-1">{row.departmentName}</p>
                {row.latestMetric ? (
                  <p className="mt-1">
                    {row.latestMetric.year}: {row.latestMetric.publicationsCount ?? "אין"} · ביטחון{" "}
                    {Math.round((row.latestMetric.confidenceScore ?? 0) * 100)}%
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-brand-100 bg-white p-4">
          <p className="text-sm font-black text-ink">מדדי מחקר אחרונים</p>
          <div className="mt-4 space-y-2">
            {researchMetrics.length === 0 ? (
              <p className="text-sm text-slate-600">אין עדיין מדדי OpenAlex.</p>
            ) : (
              researchMetrics.slice(0, 8).map((metric) => (
                <div key={metric.id} className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-ink">{metric.department.institution.name}</span>
                    {metric.needsMapping ? (
                      <Badge tone="warning">needs mapping</Badge>
                    ) : metric.isAmbiguous ? (
                      <Badge tone="warning">low confidence</Badge>
                    ) : (
                      <Badge tone="success">updated</Badge>
                    )}
                  </div>
                  <p className="mt-1">{metric.department.specialty.name} · {metric.department.name}</p>
                  <p className="mt-1">
                    {metric.year}: {metric.publicationsCount ?? "אין"} פרסומים משוערים
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
