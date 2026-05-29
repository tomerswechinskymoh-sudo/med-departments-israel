"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

type OpenAlexRunLog = {
  id: string;
  action: string;
  createdAt: string | Date;
  metadata?: unknown;
  actor?: {
    fullName: string;
  } | null;
};

type OpenAlexBulkResponse = {
  error?: string;
  message?: string;
  processed?: number;
  totalImportedDepartments?: number;
  nextCursor?: string | null;
  done?: boolean;
  results?: Array<{
    status?: string;
  }>;
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

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatRunDate(value: string | Date) {
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function DataRefreshPanels({
  rowLogs,
  mappingRows,
  researchMetrics,
  openAlexRunLogs = []
}: {
  rowLogs: RowLog[];
  mappingRows: MappingRow[];
  researchMetrics: ResearchMetric[];
  openAlexRunLogs?: OpenAlexRunLog[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"websites" | "openalex" | null>(null);
  const [openAlexProgress, setOpenAlexProgress] = useState<{
    processed: number;
    total: number;
    batches: number;
    failed: number;
  } | null>(null);

  async function runWebsiteRefresh() {
    setBusyAction("websites");
    setMessage(null);
    setError(null);
    setOpenAlexProgress(null);
    const response = await fetch("/api/admin/department-website-refresh", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ limit: 5 })
    });
    const payload = await response.json().catch(() => ({}));
    setBusyAction(null);

    if (!response.ok) {
      setError(payload.error ?? "הפעולה נכשלה.");
      return;
    }

    setMessage(payload.message ?? "הפעולה הסתיימה.");
    router.refresh();
  }

  async function runOpenAlexRefreshAll() {
    const batchSize = 3;
    let cursor: string | null = null;
    let done = false;
    let processed = 0;
    let failed = 0;
    let total = 0;
    let batches = 0;

    setBusyAction("openalex");
    setMessage(null);
    setError(null);
    setOpenAlexProgress({ processed: 0, total: 0, batches: 0, failed: 0 });

    while (!done) {
      const response: Response = await fetch("/api/admin/research-metrics", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          mode: "all",
          limit: batchSize,
          cursor,
          delayMs: 500
        })
      });
      const payload: OpenAlexBulkResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        setBusyAction(null);
        setError(payload.error ?? "ריענון OpenAlex נכשל.");
        return;
      }

      batches += 1;
      processed += Number(payload.processed ?? 0);
      total = Number(payload.totalImportedDepartments ?? total);
      failed += Array.isArray(payload.results)
        ? payload.results.filter((result: { status?: string }) => result.status === "failed").length
        : 0;
      cursor = typeof payload.nextCursor === "string" ? payload.nextCursor : null;
      done = Boolean(payload.done) || !cursor;
      setOpenAlexProgress({ processed, total, batches, failed });

      if (done) {
        setMessage(`ריענון OpenAlex הסתיים: ${processed}/${total || processed} מחלקות עובדו.`);
        break;
      }
    }

    setBusyAction(null);
    router.refresh();
  }

  async function runAction(action: "websites" | "openalex") {
    if (action === "websites") {
      await runWebsiteRefresh();
      return;
    }
    await runOpenAlexRefreshAll();
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
              {busyAction === "openalex" ? "מעדכן..." : "עדכן נתוני מחקר לכל המחלקות"}
            </Button>
          </div>
          {openAlexProgress ? (
            <div className="mt-4 rounded-2xl border border-brand-100 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-black text-ink">
                  {openAlexProgress.total
                    ? `${openAlexProgress.processed}/${openAlexProgress.total} מחלקות`
                    : `${openAlexProgress.processed} מחלקות`}
                </span>
                <span className="text-slate-600">
                  {openAlexProgress.batches} באצ׳ים · {openAlexProgress.failed} כשלונות
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-700 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      openAlexProgress.total
                        ? (openAlexProgress.processed / openAlexProgress.total) * 100
                        : 5
                    )}%`
                  }}
                />
              </div>
            </div>
          ) : null}
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

      <section className="rounded-[1.5rem] border border-brand-100 bg-white p-4">
        <p className="text-sm font-black text-ink">לוג ריענוני OpenAlex</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {openAlexRunLogs.length === 0 ? (
            <p className="text-sm text-slate-600">אין עדיין ריענוני OpenAlex בלוג.</p>
          ) : (
            openAlexRunLogs.slice(0, 8).map((log) => {
              const metadata = objectValue(log.metadata);
              const results = Array.isArray(metadata.results) ? metadata.results : [];
              const failures = results.filter(
                (result) => objectValue(result).status === "failed"
              ).length;

              return (
                <div key={log.id} className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-ink">{formatRunDate(log.createdAt)}</span>
                    <Badge tone={failures > 0 ? "warning" : "success"}>
                      {metadata.done ? "completed" : "batch"}
                    </Badge>
                  </div>
                  <p className="mt-1">
                    עובדו {String(metadata.requested ?? results.length ?? 0)} מחלקות · כשלונות {failures}
                  </p>
                  {typeof metadata.totalImportedDepartments === "number" ? (
                    <p className="mt-1">סה״כ מיובאות: {metadata.totalImportedDepartments}</p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
