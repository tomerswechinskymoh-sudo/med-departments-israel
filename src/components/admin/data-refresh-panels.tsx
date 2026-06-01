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

type CrawlerRunLog = {
  id: string;
  action: string;
  createdAt: string | Date;
  metadata?: unknown;
  actor?: {
    fullName: string;
  } | null;
};

type CrawlerBulkResponse = {
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

type CrawlerProgress = {
  processed: number;
  total: number;
  batches: number;
  failed: number;
};

type CrawlerCoverage = {
  totalImportedDepartments: number;
  duns100Covered: number;
  openAlexCovered: number;
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
  openAlexRunLogs = [],
  duns100RunLogs = [],
  crawlerCoverage
}: {
  rowLogs: RowLog[];
  mappingRows: MappingRow[];
  researchMetrics: ResearchMetric[];
  openAlexRunLogs?: CrawlerRunLog[];
  duns100RunLogs?: CrawlerRunLog[];
  crawlerCoverage: CrawlerCoverage;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"websites" | "openalex" | "duns100" | null>(null);
  const [crawlerProgress, setCrawlerProgress] = useState<{
    openalex?: CrawlerProgress;
    duns100?: CrawlerProgress;
  }>({});

  async function runWebsiteRefresh() {
    setBusyAction("websites");
    setMessage(null);
    setError(null);
    setCrawlerProgress({});
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

  async function runCrawlerRefreshAll(input: {
    key: "openalex" | "duns100";
    url: string;
    label: string;
    failedLabel: string;
    delayMs: number;
    years?: number[];
  }) {
    const batchSize = 3;
    let cursor: string | null = null;
    let done = false;
    let processed = 0;
    let failed = 0;
    let total = 0;
    let batches = 0;

    setBusyAction(input.key === "openalex" ? "openalex" : "duns100");
    setMessage(null);
    setError(null);
    setCrawlerProgress((current) => ({
      ...current,
      [input.key]: { processed: 0, total: 0, batches: 0, failed: 0 }
    }));

    while (!done) {
      const response: Response = await fetch(input.url, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          mode: "bulk",
          limit: batchSize,
          cursor,
          delayMs: input.delayMs,
          ...(input.years ? { years: input.years } : {})
        })
      });
      const payload: CrawlerBulkResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        setBusyAction(null);
        setError(payload.error ?? input.failedLabel);
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
      setCrawlerProgress((current) => ({
        ...current,
        [input.key]: { processed, total, batches, failed }
      }));

      if (done) {
        setMessage(`${input.label} הסתיים: ${processed}/${total || processed} מחלקות עובדו.`);
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
    await runCrawlerRefreshAll({
      key: "openalex",
      url: "/api/admin/research-metrics",
      label: "ריענון OpenAlex",
      failedLabel: "ריענון OpenAlex נכשל.",
      delayMs: 500
    });
  }

  async function runDuns100RefreshAll() {
    await runCrawlerRefreshAll({
      key: "duns100",
      url: "/api/admin/duns100-metrics",
      label: "ריענון DUNS100",
      failedLabel: "ריענון DUNS100 נכשל.",
      delayMs: 700
    });
  }

  function ProgressBlock({ progress }: { progress?: CrawlerProgress }) {
    if (!progress) return null;

    return (
      <div className="mt-4 rounded-2xl border border-brand-100 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-black text-ink">
            {progress.total
              ? `${progress.processed}/${progress.total} מחלקות`
              : `${progress.processed} מחלקות`}
          </span>
          <span className="text-slate-600">
            {progress.batches} באצ׳ים · {progress.failed} כשלונות
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-700 transition-all"
            style={{
              width: `${Math.min(
                100,
                progress.total ? (progress.processed / progress.total) * 100 : 5
              )}%`
            }}
          />
        </div>
      </div>
    );
  }

  function RunLogSection({
    title,
    emptyText,
    logs
  }: {
    title: string;
    emptyText: string;
    logs: CrawlerRunLog[];
  }) {
    return (
      <section className="rounded-[1.5rem] border border-brand-100 bg-white p-4">
        <p className="text-sm font-black text-ink">{title}</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {logs.length === 0 ? (
            <p className="text-sm text-slate-600">{emptyText}</p>
          ) : (
            logs.slice(0, 8).map((log) => {
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
    );
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
              <p className="mt-2 text-xs font-black text-brand-900">
                OpenAlex coverage {crawlerCoverage.openAlexCovered}/{crawlerCoverage.totalImportedDepartments}
              </p>
            </div>
            <Button type="button" onClick={() => runAction("openalex")} disabled={busyAction !== null}>
              {busyAction === "openalex" ? "מעדכן..." : "עדכן OpenAlex לכל המחלקות"}
            </Button>
          </div>
          <ProgressBlock progress={crawlerProgress.openalex} />
        </section>

        <section className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-black text-ink">ריענון DUNS100</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                סורק דפי DUNS100 ציבוריים, מתאים מוסד ותחום ושומר ספירת רופאים משוערת למחלקות מיובאות.
              </p>
              <p className="mt-2 text-xs font-black text-brand-900">
                DUNS100 coverage {crawlerCoverage.duns100Covered}/{crawlerCoverage.totalImportedDepartments}
              </p>
            </div>
            <Button type="button" onClick={runDuns100RefreshAll} disabled={busyAction !== null}>
              {busyAction === "duns100" ? "מעדכן..." : "עדכן DUNS100 לכל המחלקות"}
            </Button>
          </div>
          <ProgressBlock progress={crawlerProgress.duns100} />
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

      <RunLogSection
        title="לוג ריענוני OpenAlex"
        emptyText="אין עדיין ריענוני OpenAlex בלוג."
        logs={openAlexRunLogs}
      />
      <RunLogSection
        title="לוג ריענוני DUNS100"
        emptyText="אין עדיין ריענוני DUNS100 בלוג."
        logs={duns100RunLogs}
      />
    </div>
  );
}
