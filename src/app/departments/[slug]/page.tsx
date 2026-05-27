import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DepartmentPageActions } from "@/components/departments/department-page-actions";
import {
  FavoriteToggleButton,
  LoginRequiredBookmarkButton
} from "@/components/departments/favorite-toggle-button";
import { OfficialUpdatesList } from "@/components/departments/official-updates-list";
import { ReviewCard } from "@/components/departments/review-card";
import { ExperienceCta } from "@/components/experience/experience-cta";
import { OpeningCard } from "@/components/openings/opening-card";
import { OpeningCriteriaGrid } from "@/components/openings/opening-criteria-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getDepartmentPageData,
  getReviewFormContext,
  resolveInstitutionRegion,
  reviewerTypeLabel
} from "@/lib/queries";
import { formatDate, getDepartmentHref } from "@/lib/utils";

export const dynamic = "force-dynamic";

type MetricSource = "moh" | "hospital" | "duns100" | "openalex" | "demo" | "missing";

type ImportedMetric = {
  metricKey: string;
  label?: string | null;
  value: number | null;
  rawValue?: string | null;
  unit?: string | null;
  sourceNotes?: string | null;
  lastUpdated?: string | Date | null;
};

type ImportedYearlyMetric = {
  metricKey: string;
  year: number;
  value: number | null;
  rawValue?: string | null;
  unit?: string | null;
  sourceNotes?: string | null;
  lastUpdated?: string | Date | null;
};

const MISSING_IMPORTED_VALUE = "הנתון עדיין לא סופק";

function EmptyValue({ text = MISSING_IMPORTED_VALUE }: { text?: string }) {
  return <span className="text-slate-400">{text}</span>;
}

function SourceBadge({ source }: { source: MetricSource }) {
  const config: Record<MetricSource, { label: string; className: string }> = {
    moh: {
      label: "משרד הבריאות",
      className: "border-blue-100 bg-blue-50 text-blue-800"
    },
    hospital: {
      label: "בי״ח",
      className: "border-brand-100 bg-brand-50 text-brand-800"
    },
    duns100: {
      label: "DUNS100",
      className: "border-slate-200 bg-white text-slate-700"
    },
    openalex: {
      label: "OpenAlex משוער",
      className: "border-cyan-100 bg-cyan-50 text-cyan-800"
    },
    demo: {
      label: "דמו",
      className: "border-amber-200 bg-amber-50 text-amber-800"
    },
    missing: {
      label: "טרם סופק",
      className: "border-slate-200 bg-slate-50 text-slate-500"
    }
  };
  const item = config[source];

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-black ${item.className}`}>
      {item.label}
    </span>
  );
}

function MetricInfoTip({
  sourceLabel,
  text
}: {
  sourceLabel: string;
  text?: string;
}) {
  const tooltipText = [text, `מקור נתונים: ${sourceLabel}`].filter(Boolean).join(" · ");

  return (
    <span className="relative inline-flex">
      <span
        tabIndex={0}
        title={tooltipText}
        aria-label={tooltipText}
        className="group grid h-7 w-7 cursor-help place-items-center rounded-full border border-slate-200 bg-white text-[0.72rem] font-black text-slate-500 transition hover:border-brand-200 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-200"
      >
        i
        <span className="pointer-events-none absolute left-0 top-9 z-20 hidden w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs font-semibold leading-5 text-slate-700 shadow-xl group-hover:block group-focus:block">
          {tooltipText}
        </span>
      </span>
    </span>
  );
}

function DataMetricCard({
  label,
  value,
  sourceLabel,
  tooltip,
  lastUpdated
}: {
  label: string;
  value: string | number | null | undefined;
  sourceLabel: string;
  tooltip?: string;
  lastUpdated?: string | Date | null;
}) {
  const hasValue = value !== null && value !== undefined && String(value).trim().length > 0;

  return (
    <div className="flex min-h-[8.5rem] flex-col rounded-2xl border border-slate-100 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold leading-5 text-slate-500">{label}</p>
        <MetricInfoTip sourceLabel={sourceLabel} text={tooltip} />
      </div>
      <p className={`mt-3 text-xl font-black leading-tight ${hasValue ? "text-ink" : "text-slate-400"}`}>
        {hasValue ? value : MISSING_IMPORTED_VALUE}
      </p>
      <div className="mt-auto flex items-center gap-2 pt-4 text-[0.68rem] font-black text-slate-400">
        <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-200 bg-slate-50">
          i
        </span>
        <span>מקור נתונים</span>
      </div>
      {lastUpdated ? (
        <p className="mt-1 text-[0.68rem] font-semibold text-slate-400">
          עודכן: {formatDate(lastUpdated)}
        </p>
      ) : null}
    </div>
  );
}

function DataMetricGrid({
  metrics
}: {
  metrics: Array<{
    id: string;
    label: string;
    value: string | number | null | undefined;
    sourceLabel: string;
    tooltip?: string;
    lastUpdated?: string | Date | null;
  }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <DataMetricCard key={metric.id} {...metric} />
      ))}
    </div>
  );
}

function ObjectiveStatCard({
  label,
  value,
  caption,
  comparison
}: {
  label: string;
  value: string | number;
  caption?: string;
  comparison?: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-white to-brand-50/60 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        {comparison ? (
          <span className="rounded-full border border-brand-100 bg-white px-2.5 py-1 text-[0.68rem] font-black text-brand-800">
            {comparison}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-black leading-tight text-ink">{value}</p>
      {caption ? <p className="mt-2 text-xs leading-5 text-slate-500">{caption}</p> : null}
    </div>
  );
}

function CompactDataCard({
  label,
  value,
  source,
  caption
}: {
  label: string;
  value: string | number;
  source: MetricSource;
  caption?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <SourceBadge source={source} />
      </div>
      <p className="mt-2 text-xl font-black text-ink">{value}</p>
      {caption ? <p className="mt-1 text-xs leading-5 text-slate-500">{caption}</p> : null}
    </div>
  );
}

function DataUnavailable({ label, text }: { label?: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        {label ? <p className="text-xs font-bold text-slate-500">{label}</p> : null}
        <SourceBadge source="missing" />
      </div>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function formatImportedNumber(value: number) {
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 }).format(value);
}

function formatImportedMetricValue(metric: ImportedMetric | ImportedYearlyMetric) {
  if (metric.rawValue) {
    return metric.rawValue;
  }

  if (typeof metric.value !== "number" || !Number.isFinite(metric.value)) {
    return "נשמר כטקסט";
  }

  const formattedValue = formatImportedNumber(metric.value);

  if (metric.unit === "%") return `${formattedValue}%`;
  if (metric.unit === "currency") return `${formattedValue} ₪`;
  if (metric.unit === "months") return `${formattedValue} חודשים`;
  if (metric.unit === "years") return `${formattedValue} שנים`;
  if (metric.unit === "score") return formattedValue;
  if (metric.unit && metric.unit !== "count") return `${formattedValue} ${metric.unit}`;

  return formattedValue;
}

function sourceLabelFromNotes(sourceNotes?: string | null) {
  const normalized = sourceNotes?.trim();
  if (!normalized) return null;

  if (/openalex/i.test(normalized)) return "OpenAlex";
  if (/הר[״"׳']?י|ima/i.test(normalized)) return "הר״י";
  if (/דיווח|מתמחים/i.test(normalized)) return "דיווחי מתמחים משרד הבריאות";
  if (/משרד הבריאות|moh|ministry/i.test(normalized)) return "משרד הבריאות";
  if (normalized.length <= 42) return normalized;

  return null;
}

function importedSourceLabel(
  metric: ImportedMetric | ImportedYearlyMetric | null | undefined,
  fallback: string
) {
  return sourceLabelFromNotes(metric?.sourceNotes) ?? fallback;
}

function findImportedMetric(metrics: ImportedMetric[], ...metricKeys: string[]) {
  return (
    metrics.find(
      (metric) =>
        metricKeys.includes(metric.metricKey) &&
        (typeof metric.value === "number" || Boolean(metric.rawValue))
    ) ?? null
  );
}

function importedMetricNumber(metrics: ImportedMetric[], ...metricKeys: string[]) {
  return findImportedMetric(metrics, ...metricKeys)?.value ?? null;
}

function latestYearlyMetric(
  metrics: ImportedYearlyMetric[],
  metricKey: string,
  options: { beforeYear?: number; year?: number } = {}
) {
  return (
    metrics
      .filter((metric) => metric.metricKey === metricKey)
      .filter((metric) => (options.year ? metric.year === options.year : true))
      .filter((metric) => (options.beforeYear ? metric.year < options.beforeYear : true))
      .filter((metric) => typeof metric.value === "number" || Boolean(metric.rawValue))
      .sort((left, right) => right.year - left.year)[0] ?? null
  );
}

function metricCardFromImported(
  metrics: ImportedMetric[],
  input: {
    id: string;
    label: string;
    keys: string[];
    sourceLabel: string;
    tooltip?: string;
    valueOverride?: string | number | null;
  }
) {
  const metric = findImportedMetric(metrics, ...input.keys);
  const value = input.valueOverride ?? (metric ? formatImportedMetricValue(metric) : null);

  return {
    id: input.id,
    label: input.label,
    value,
    sourceLabel: importedSourceLabel(metric, input.sourceLabel),
    tooltip: input.tooltip,
    lastUpdated: metric?.lastUpdated
  };
}

function metricCardFromYear(
  metrics: ImportedYearlyMetric[],
  input: {
    id: string;
    label: string;
    metricKey: string;
    year: number;
    sourceLabel: string;
    tooltip?: string;
    valueOverride?: string | number | null;
  }
) {
  const metric = latestYearlyMetric(metrics, input.metricKey, { year: input.year });
  const value = input.valueOverride ?? (metric ? formatImportedMetricValue(metric) : null);

  return {
    id: input.id,
    label: input.label,
    value,
    sourceLabel: importedSourceLabel(metric, input.sourceLabel),
    tooltip: input.tooltip,
    lastUpdated: metric?.lastUpdated
  };
}

function yearlyMetricLabel(metric: ImportedYearlyMetric) {
  if (metric.metricKey === "newResidents" && metric.year === 2026) {
    return "צפי תקנים חדשים";
  }

  if (metric.metricKey === "newResidents") {
    return "מתמחים חדשים";
  }

  return metric.metricKey;
}

function ImportedMetricGrid({
  title,
  metrics,
  source,
  emptyText,
  maxItems
}: {
  title: string;
  metrics: ImportedMetric[];
  source: MetricSource;
  emptyText: string;
  maxItems?: number;
}) {
  const visibleMetrics = metrics
    .filter((metric) => typeof metric.value === "number" || Boolean(metric.rawValue))
    .slice(0, maxItems ?? metrics.length);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-black text-ink">{title}</p>
        <SourceBadge source={visibleMetrics.length > 0 ? source : "missing"} />
      </div>
      {visibleMetrics.length === 0 ? (
        <p className="mt-3 text-sm font-bold leading-6 text-slate-500">{emptyText}</p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {visibleMetrics.map((metric) => (
            <div key={metric.metricKey} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <p className="text-xs font-bold leading-5 text-slate-500">
                {metric.label ?? metric.metricKey}
              </p>
              <p className="mt-1 text-lg font-black text-ink">
                {formatImportedMetricValue(metric)}
              </p>
              {metric.lastUpdated ? (
                <p className="mt-1 text-[0.68rem] font-semibold text-slate-400">
                  עודכן: {formatDate(metric.lastUpdated)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function YearlyMetricsTable({
  title,
  metrics,
  source,
  emptyText
}: {
  title: string;
  metrics: ImportedYearlyMetric[];
  source: MetricSource;
  emptyText: string;
}) {
  const visibleMetrics = metrics.filter(
    (metric) => typeof metric.value === "number" || Boolean(metric.rawValue)
  );

  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-black text-ink">{title}</p>
        <SourceBadge source={visibleMetrics.length > 0 ? source : "missing"} />
      </div>
      {visibleMetrics.length === 0 ? (
        <p className="mt-3 text-sm font-bold leading-6 text-slate-500">{emptyText}</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
          {visibleMetrics.map((metric) => (
            <div
              key={`${metric.metricKey}-${metric.year}`}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0"
            >
              <span className="text-sm font-bold text-slate-600">{yearlyMetricLabel(metric)}</span>
              <span className="text-sm font-semibold text-slate-500">{metric.year}</span>
              <span className="text-sm font-black text-ink">{formatImportedMetricValue(metric)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function comparisonLabelForScore(value: number, salt = 0) {
  if (!value) {
    return "אין השוואה";
  }

  const percentile = Math.max(45, Math.min(96, Math.round((value / 5) * 90 + salt)));

  if (percentile >= 85) {
    return `Top ${100 - percentile}%`;
  }

  if (percentile >= 68) {
    return `אחוזון ${percentile}`;
  }

  return "סביב הממוצע";
}

function comparisonLabelForObjective(value: number | string, salt = 0) {
  const numericValue =
    typeof value === "number" ? value : Number(String(value).match(/\d+/)?.[0] ?? 0);

  if (!numericValue) {
    return "דמו";
  }

  if (numericValue >= 80) {
    return `אחוזון ${Math.min(95, numericValue + salt)}`;
  }

  if (numericValue >= 15) {
    return "מעל הממוצע";
  }

  return "נתון להשוואה";
}

function numericRecordFromJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([key, entryValue]) => ({
      key,
      value: typeof entryValue === "number" ? entryValue : Number(entryValue)
    }))
    .filter((item) => Number.isFinite(item.value))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function ArrayYearlyResidentsTable({
  value,
  missingText,
  source = "hospital"
}: {
  value: unknown;
  missingText: string;
  source?: MetricSource;
}) {
  const rows = numericRecordFromJson(value);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-black text-ink">מתמחים שנקלטו לפי שנה</p>
        <SourceBadge source={rows.length === 0 ? "missing" : source} />
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm font-bold leading-6 text-slate-500">{missingText}</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4 border-b border-slate-100 px-3 py-2 last:border-b-0">
              <span className="text-sm font-bold text-slate-600">{row.key}</span>
              <span className="text-sm font-black text-ink">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArrayPublicationMetrics({
  total,
  residentTotal,
  years,
  sourceUrl,
  missingText
}: {
  total: number | null | undefined;
  residentTotal: number | null | undefined;
  years: unknown;
  sourceUrl: string | null | undefined;
  missingText: string;
}) {
  const yearRows = numericRecordFromJson(years);
  const hasData = typeof total === "number" || typeof residentTotal === "number" || yearRows.length > 0;
  const source: MetricSource = sourceUrl === "DEMO" ? "demo" : hasData ? "hospital" : "missing";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-black text-ink">פרסומים במערך</p>
        <div className="flex items-center gap-2">
          <SourceBadge source={source} />
          {sourceUrl && sourceUrl !== "DEMO" ? (
            <a href={sourceUrl} className="text-xs font-bold text-brand-800">
              מקור
            </a>
          ) : null}
        </div>
      </div>
      {!hasData ? (
        <p className="mt-3 text-sm font-bold leading-6 text-slate-500">{missingText}</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {typeof total === "number" ? (
            <ObjectiveStatCard label="מספר פרסומים במערך" value={total} />
          ) : null}
          {typeof residentTotal === "number" ? (
            <ObjectiveStatCard label="פרסומי מתמחים במערך" value={residentTotal} />
          ) : null}
          {yearRows.length > 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 sm:col-span-2">
              <p className="text-xs font-bold text-slate-500">שנות פרסום</p>
              <p className="mt-2 text-sm font-black text-ink">
                {yearRows.map((row) => `${row.key}: ${row.value}`).join(" · ")}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function EstimatedOpenAlexResearch({
  metrics
}: {
  metrics: Array<{
    year: number;
    publicationsCount: number | null;
    confidenceScore: number | null;
    needsMapping: boolean;
    isAmbiguous: boolean;
  }>;
}) {
  const availableMetrics = metrics.filter((metric) => !metric.needsMapping);
  const latest = availableMetrics[0];

  if (!latest) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-black text-ink">פעילות מחקרית משוערת</p>
        <SourceBadge source="openalex" />
      </div>
      <p className="mt-2 text-2xl font-black text-ink">
        {latest.publicationsCount ?? 0}
        <span className="me-2 text-sm font-bold text-slate-600">פרסומים בשנת {latest.year}</span>
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        הערכה לפי שאילתת OpenAlex, לא ספירה רשמית של המחלקה.
        {latest.isAmbiguous || (latest.confidenceScore ?? 0) < 0.55 ? " רמת הביטחון נמוכה ויש להתייחס בזהירות." : ""}
      </p>
      {availableMetrics.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {availableMetrics.slice(0, 5).map((metric) => (
            <span key={metric.year} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-cyan-900">
              {metric.year}: {metric.publicationsCount ?? 0}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DunsTrend({ people }: { people: Array<{ id: string; rankingYear: number | null }> }) {
  const rows = Object.entries(
    people.reduce<Record<string, number>>((accumulator, person) => {
      if (!person.rankingYear) return accumulator;
      const key = String(person.rankingYear);
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {})
  ).sort(([left], [right]) => left.localeCompare(right));

  if (rows.length === 0) {
    return null;
  }

  const max = Math.max(...rows.map(([, count]) => count), 1);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-black text-ink">מגמת DUNS לפי שנים</p>
        <SourceBadge source="duns100" />
      </div>
      <div className="mt-4 space-y-2">
        {rows.map(([year, count]) => (
          <div key={year}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span>{year}</span>
              <span>{count}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-700"
                style={{ width: `${Math.round((count / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const comparisonLabel = comparisonLabelForScore(value, label.length % 6);

  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[0.68rem] font-black text-brand-800">
            {comparisonLabel}
          </span>
          <span className="text-xs font-bold text-slate-500">{value ? value.toFixed(1) : "אין"}</span>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-700"
          style={{ width: `${Math.max(0, Math.min(100, (value / 5) * 100))}%` }}
        />
      </div>
    </div>
  );
}

function splitList(value: string | null | undefined) {
  const items = (value ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : null;
}

function getPerkIcon(perk: string) {
  if (perk.includes("אוכל")) return "🍽️";
  if (perk.includes("חניה")) return "🅿️";
  if (perk.includes("חו״ל") || perk.includes("חול")) return "✈️";
  if (perk.includes("כנס")) return "🎤";
  if (perk.includes("יום מחקר")) return "🔬";
  if (perk.includes("מחקר")) return "📚";
  if (perk.includes("גמישות")) return "🕒";
  if (perk.includes("חדר")) return "🛋️";

  return "✦";
}

function sourceFromName(sourceName: string | null | undefined): MetricSource {
  const normalized = (sourceName ?? "").toUpperCase();

  if (normalized === "DUNS100") return "duns100";
  if (normalized === "DEMO") return "demo";
  if (normalized.includes("MOH") || normalized.includes("MINISTRY")) return "moh";

  return "hospital";
}

function isPresentNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function departmentLockCopy(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) {
    return {
      title: "העמוד המלא פתוח למשתמשים מאומתים",
      description:
        "כדי לצפות בנתוני המחלקה, ביקורות, תקנים ופרטי קשר יש להתחבר או לפתוח חשבון עם אימות סטטוס מקצועי.",
      ctaHref: "/login",
      ctaLabel: "התחברות"
    };
  }

  if (session.verificationStatus === "REJECTED") {
    return {
      title: "אימות הסטטוס לא אושר",
      description:
        "הגישה המלאה לעמודי המחלקות נעולה כרגע. אפשר לבדוק את סטטוס החשבון באזור האישי או ליצור קשר עם צוות האתר.",
      ctaHref: "/dashboard",
      ctaLabel: "לאזור האישי"
    };
  }

  return {
    title: "הסטטוס המקצועי ממתין לאישור",
    description:
      "כתובת המייל אומתה, והמסמך שהעלית נמצא בבדיקת אדמין. לאחר אישור הסטטוס תיפתח הגישה המלאה לעמודי המחלקות.",
    ctaHref: "/dashboard",
    ctaLabel: "בדיקת סטטוס"
  };
}

export default async function DepartmentDetailsPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, resolvedSearchParams, session] = await Promise.all([
    params,
    searchParams,
    getSession()
  ]);
  const departmentId =
    typeof resolvedSearchParams.departmentId === "string"
      ? resolvedSearchParams.departmentId
      : null;
  const department = await getDepartmentPageData(slug, session?.userId, departmentId);

  if (!department) {
    notFound();
  }

  const reviewContext = await getReviewFormContext(department.slug);
  const visibleReviews = session ? department.reviews : department.reviews.slice(0, 3);
  const departmentHref = getDepartmentHref(department);
  const region = resolveInstitutionRegion(department.institution);
  const isMedicalArrayProfile = Boolean(department.specialty.groupAsArray && department.medicalArray);
  const profileTerm = isMedicalArrayProfile ? "מערך" : "מחלקה";
  const profileMissingText = MISSING_IMPORTED_VALUE;
  const profileTitle = isMedicalArrayProfile ? `מערך ${department.specialty.name}` : department.name;
  const profileDescription = isMedicalArrayProfile
    ? department.medicalArray?.description || department.about || department.shortSummary
    : department.about || department.shortSummary;
  const profileExternalMetrics = isMedicalArrayProfile
    ? department.medicalArray?.externalMetrics ?? []
    : department.externalMetrics;
  const profileExternalPeople = isMedicalArrayProfile
    ? department.medicalArray?.externalPeople ?? []
    : department.externalPeople;
  const arrayDepartments = isMedicalArrayProfile ? department.medicalArray?.departments ?? [] : [];
  const importedDepartmentMetrics = department.metrics;
  const importedDepartmentYearlyMetrics = department.yearlyMetrics;
  const importedSpecialtyMetrics = department.specialty.metrics;
  const importedSpecialtyYearlyMetrics = department.specialty.yearlyMetrics;
  const contactEmails = (department.publicContactEmail ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const websiteUrl = department.websiteUrl ?? department.institution.websiteUrl;
  const hasOfficialDescription =
    department.heads.length > 0 ||
    department.officialUpdates.length > 0 ||
    department.researchOpportunities.length > 0 ||
    department.representativeAssignments.length > 0 ||
    department.residencyOpenings.length > 0;
  const canViewDepartmentDetails =
    session?.role === "admin" ||
    session?.role === "representative" ||
    session?.verificationStatus === "VERIFIED";

  if (!canViewDepartmentDetails) {
    const lock = departmentLockCopy(session);

    return (
      <PageShell className="space-y-7 py-8">
        <section className="rounded-xl border border-brand-100 bg-white px-5 py-6 shadow-panel md:px-6">
          <div className="flex flex-wrap gap-2">
            <Badge>{department.specialty.name}</Badge>
            <Badge tone="default">{profileTerm}</Badge>
            <Badge tone="default">{region}</Badge>
          </div>
          <h1 className="mt-4 break-words text-3xl font-bold leading-tight text-ink md:text-4xl">
            {profileTitle}
          </h1>
          <p className="mt-3 text-lg font-bold leading-7 text-slate-700">
            {department.institution.name}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">{region}</p>
        </section>

        <Card className="mx-auto max-w-2xl rounded-xl text-center">
          <p className="text-sm font-bold text-brand-600">גישה מוגנת</p>
          <h2 className="mt-2 text-2xl font-black text-ink">{lock.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{lock.description}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={lock.ctaHref}
              className="rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white"
            >
              {lock.ctaLabel}
            </Link>
            {!session ? (
              <Link
                href="/signup"
                className="rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-800"
              >
                הרשמה ואימות
              </Link>
            ) : null}
          </div>
        </Card>
      </PageShell>
    );
  }

  const roleSummaries = ["RESIDENT", "INTERN", "STUDENT"].map((reviewerType) => {
    const reviews = department.reviews.filter((review) => review.reviewerType === reviewerType);

    return {
      reviewerType,
      count: reviews.length,
      average:
        reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.overallRecommendation, 0) / reviews.length
        : 0
    };
  });
  const perkItems = splitList(department.perks) ?? [];
  const metricRecord = (metricKey: string) =>
    profileExternalMetrics.find((metric) => metric.metricKey === metricKey && metric.sourceName !== "DEMO");
  const isMedicalArrayDemo = department.medicalArray?.publicationSourceUrl === "DEMO";
  const duns100PhysiciansCount =
    importedMetricNumber(importedDepartmentMetrics, "duns100PhysiciansCount") ??
    profileExternalMetrics.find(
      (metric) => metric.metricKey === "duns100PhysiciansCount" && metric.sourceName === "DUNS100"
    )?.value;
  const activeResidentsMetric = metricRecord("activeResidentsCount");
  const importedActiveResidents = importedMetricNumber(
    importedDepartmentMetrics,
    "residentsCount",
    "activeResidentsCount"
  );
  const activeResidents =
    department.residentsCount !== null && department.residentsCount !== undefined
      ? { value: department.residentsCount, source: "hospital" as MetricSource }
      : importedActiveResidents !== null
        ? { value: importedActiveResidents, source: "hospital" as MetricSource }
      : activeResidentsMetric
        ? { value: activeResidentsMetric.value, source: sourceFromName(activeResidentsMetric.sourceName) }
        : null;
  const specialistsMetric = metricRecord("seniorPhysiciansCount");
  const importedSpecialists = importedMetricNumber(importedDepartmentMetrics, "seniorPhysiciansCount");
  const specialists =
    isMedicalArrayProfile && !isMedicalArrayDemo && isPresentNumber(department.medicalArray?.specialistsCount)
      ? { value: department.medicalArray.specialistsCount, source: "hospital" as MetricSource }
      : importedSpecialists !== null
        ? { value: importedSpecialists, source: "hospital" as MetricSource }
      : specialistsMetric
        ? { value: specialistsMetric.value, source: sourceFromName(specialistsMetric.sourceName) }
        : null;
  const medianDurationMetric = metricRecord("medianResidencyDurationMonths");
  const importedMedianDuration = findImportedMetric(importedDepartmentMetrics, "medianResidencyDurationMonths");
  const medianDuration =
    department.medianResidencyLength
      ? { value: department.medianResidencyLength, source: "hospital" as MetricSource }
      : importedMedianDuration
        ? { value: formatImportedMetricValue(importedMedianDuration), source: "moh" as MetricSource }
      : medianDurationMetric
        ? { value: `${medianDurationMetric.value} חודשים`, source: sourceFromName(medianDurationMetric.sourceName) }
        : null;
  const boardStageAMetric = metricRecord("boardStageAPassRate");
  const importedBoardStageA = findImportedMetric(
    importedDepartmentMetrics,
    "boardStageAPassRate",
    "inherited_boardStageAPassRate"
  );
  const boardStageA =
    department.shlavAlephPassRate !== null && department.shlavAlephPassRate !== undefined
      ? { value: `${department.shlavAlephPassRate}%`, source: "hospital" as MetricSource }
      : importedBoardStageA
        ? { value: formatImportedMetricValue(importedBoardStageA), source: "moh" as MetricSource }
      : boardStageAMetric
        ? { value: `${boardStageAMetric.value}%`, source: sourceFromName(boardStageAMetric.sourceName) }
        : null;
  const boardStageBMetric = metricRecord("boardStageBPassRate");
  const importedBoardStageB = findImportedMetric(
    importedDepartmentMetrics,
    "boardStageBPassRate",
    "inherited_boardStageBPassRate"
  );
  const boardStageB =
    department.shlavBetPassRate !== null && department.shlavBetPassRate !== undefined
      ? { value: `${department.shlavBetPassRate}%`, source: "hospital" as MetricSource }
      : importedBoardStageB
        ? { value: formatImportedMetricValue(importedBoardStageB), source: "moh" as MetricSource }
      : boardStageBMetric
        ? { value: `${boardStageBMetric.value}%`, source: sourceFromName(boardStageBMetric.sourceName) }
        : null;
  const latestNewResidentsMetric = latestYearlyMetric(
    importedDepartmentYearlyMetrics,
    "newResidents",
    { beforeYear: 2026 }
  );
  const newResidents =
    department.newResidentsThisYear !== null && department.newResidentsThisYear !== undefined
      ? { value: department.newResidentsThisYear, source: "hospital" as MetricSource }
      : latestNewResidentsMetric
        ? { value: formatImportedMetricValue(latestNewResidentsMetric), source: "hospital" as MetricSource }
      : null;
  const expectedOpeningsMetric =
    findImportedMetric(importedDepartmentMetrics, "expectedOpenings2026") ??
    latestYearlyMetric(importedDepartmentYearlyMetrics, "newResidents", { year: 2026 });
  const expectedGraduates =
    department.expectedGraduatesThisYear !== null && department.expectedGraduatesThisYear !== undefined
      ? { value: department.expectedGraduatesThisYear, source: "hospital" as MetricSource }
      : expectedOpeningsMetric
        ? { value: formatImportedMetricValue(expectedOpeningsMetric), source: "hospital" as MetricSource }
      : null;
  const openingsCount = department.residencyOpenings.reduce(
    (sum, opening) => sum + (opening.openingsCount ?? 0),
    0
  );
  const duns100Physicians = profileExternalPeople.filter(
    (person) => person.sourceName === "DUNS100" && person.approved
  );
  const openAlexResearchMetrics = department.researchMetrics.filter((metric) => metric.source === "OpenAlex");
  const profileHeads = isMedicalArrayProfile
    ? arrayDepartments.flatMap((arrayDepartment) =>
        arrayDepartment.heads.map((head) => ({
          ...head,
          departmentName: arrayDepartment.name
        }))
      )
    : department.heads.map((head) => ({
        ...head,
        departmentName: department.name
      }));
  const latestOpenAlexResearchMetric = openAlexResearchMetrics.find((metric) => !metric.needsMapping) ?? null;
  const publicationMetric = findImportedMetric(importedDepartmentMetrics, "departmentalPublicationsCount");
  const expectedOpeningsDepartmentMetric = findImportedMetric(importedDepartmentMetrics, "expectedOpenings2026");
  const expectedOpeningsYearlyMetric = latestYearlyMetric(importedDepartmentYearlyMetrics, "newResidents", { year: 2026 });
  const departmentDataMetrics = [
    {
      id: "department-residents-count",
      label: "מספר_מתמחים",
      value: activeResidents?.value ?? null,
      sourceLabel: "משרד הבריאות",
      tooltip: "נתון מחלקתי מתוך Master_Dept.csv כאשר קיים."
    },
    {
      id: "department-stage-a",
      label: "מעבר_שלב_א",
      value: boardStageA?.value ?? null,
      sourceLabel: "משרד הבריאות",
      tooltip: "נתון מחלקתי מתוך שורת המחלקה ב-Master_Dept.csv."
    },
    {
      id: "department-stage-b",
      label: "מעבר_שלב_ב",
      value: boardStageB?.value ?? null,
      sourceLabel: "משרד הבריאות",
      tooltip: "נתון מחלקתי מתוך שורת המחלקה ב-Master_Dept.csv."
    },
    {
      id: "department-senior-physicians",
      label: "מספר בכירים",
      value: specialists?.value ?? null,
      sourceLabel: "משרד הבריאות",
      tooltip: "מספר רופאים בכירים כפי שיובא עבור המחלקה."
    },
    metricCardFromImported(importedDepartmentMetrics, {
      id: "department-duns100",
      label: "מספר רופאים ב-DUNS100",
      keys: ["duns100PhysiciansCount"],
      sourceLabel: "DUNS100",
      tooltip: "רופאים שנספרו מנתוני DUNS100 מיובאים."
    }),
    {
      id: "department-publications",
      label: "מספר פרסומים מחלקתי",
      value: publicationMetric
        ? formatImportedMetricValue(publicationMetric)
        : latestOpenAlexResearchMetric
          ? latestOpenAlexResearchMetric.publicationsCount
          : null,
      sourceLabel: publicationMetric
        ? importedSourceLabel(publicationMetric, "משרד הבריאות")
        : latestOpenAlexResearchMetric
          ? "OpenAlex"
          : "OpenAlex",
      tooltip: latestOpenAlexResearchMetric
        ? "פעילות מחקרית משוערת לפי OpenAlex, לא ספירה רשמית של המחלקה."
        : "מספר פרסומים מחלקתי מיובא כאשר קיים."
    },
    ...[2020, 2021, 2022, 2023, 2024].map((year) =>
      metricCardFromYear(importedDepartmentYearlyMetrics, {
        id: `department-new-residents-${year}`,
        label: `מספר מתמחים חדשים ${year}`,
        metricKey: "newResidents",
        year,
        sourceLabel: "משרד הבריאות",
        tooltip: "מתמחים חדשים לפי שנה מתוך Master_Dept.csv."
      })
    ),
    {
      id: "department-expected-openings-2026",
      label: "צפי תקנים חדשים ב2026",
      value: expectedOpeningsDepartmentMetric
        ? formatImportedMetricValue(expectedOpeningsDepartmentMetric)
        : expectedOpeningsYearlyMetric
          ? formatImportedMetricValue(expectedOpeningsYearlyMetric)
          : null,
      sourceLabel: importedSourceLabel(
        expectedOpeningsDepartmentMetric ?? expectedOpeningsYearlyMetric,
        "מספר המתמחים שאמורים לסיים השנה ע״ב אורך ההתמחות החציוני"
      ),
      tooltip: "צפי תקנים המבוסס על המתמחים שאמורים לסיים השנה לפי אורך ההתמחות החציוני."
    },
    metricCardFromImported(importedDepartmentMetrics, {
      id: "department-median-elective-demand",
      label: "מספר אלקטיביסטים חציוני",
      keys: ["medianElectiveDemand"],
      sourceLabel: "מצביע על ביקוש המחלקה",
      tooltip: "מדד ביקוש למחלקה לפי מספר אלקטיביסטים חציוני."
    })
  ];
  const specialtyGeneralMetrics = [
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-official-duration",
      label: "משך_התמחות_רשמי",
      keys: ["officialResidencyDuration"],
      sourceLabel: "הר״י",
      tooltip: "משך ההתמחות הרשמי לפי הר״י."
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-actual-average-duration",
      label: "משך_ממוצע_בפועל",
      keys: ["actualAverageDuration"],
      sourceLabel: "משרד הבריאות",
      tooltip: "משך התמחות ממוצע בפועל לפי נתוני ייבוא ארציים."
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-median-wait",
      label: "זמן_המתנה_חציוני_לתקן",
      keys: ["medianWaitingTime"],
      sourceLabel: "משרד הבריאות",
      tooltip: "זמן ההמתנה החציוני לתקן בתחום ההתמחות."
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-accepted-immediate",
      label: "מספר המתקבלים שדיווחו שמצאו מיד התמחות",
      keys: ["acceptedImmediatelyReports"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות"
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-accepted-six-months",
      label: "מספר המתקבלים שדיווחו שמצאו עד חצי שנה",
      keys: ["acceptedWithinSixMonthsReports"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות"
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-accepted-one-year",
      label: "מספר המתקבלים שדיווחו שמצאו עד שנה",
      keys: ["acceptedWithinOneYearReports"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות"
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-accepted-two-years",
      label: "מספר המתקבלים שדיווחו שמצאו עד שנתיים",
      keys: ["acceptedWithinTwoYearsReports"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות"
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-accepted-after-two-years",
      label: "מספר המתקבלים שדיווחו שמצאו אחרי שנתיים",
      keys: ["acceptedAfterTwoYearsReports"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות"
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-center-salary",
      label: "שכר_לא_פריפריה",
      keys: ["centerSalary"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות"
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-periphery-salary",
      label: "שכר_פריפריה",
      keys: ["peripherySalary"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות"
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-periphery-salary-gap",
      label: "פער_שכר_פריפריה",
      keys: ["peripherySalaryGap"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות",
      tooltip: "פער בין שכר פריפריה לשכר לא פריפריה."
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-residents-count",
      label: "מספר_מתמחים",
      keys: ["residentsCount"],
      sourceLabel: "משרד הבריאות"
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-women-percent",
      label: "אחוז_נשים",
      keys: ["womenPercent"],
      sourceLabel: "משרד הבריאות"
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-men-percent",
      label: "אחוז_גברים",
      keys: ["menPercent"],
      sourceLabel: "משרד הבריאות"
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-stage-a",
      label: "מעבר_שלב_א",
      keys: ["boardStageAPassRate"],
      sourceLabel: "משרד הבריאות"
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-burnout-index",
      label: "מדד_שחיקה",
      keys: ["burnoutIndex"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות"
    }),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-stage-b",
      label: "מעבר_שלב_ב",
      keys: ["boardStageBPassRate"],
      sourceLabel: "משרד הבריאות"
    }),
    ...[2020, 2021, 2022, 2023, 2024].map((year) =>
      metricCardFromYear(importedSpecialtyYearlyMetrics, {
        id: `specialty-new-residents-${year}`,
        label: `מספר מתמחים חדשים ${year}`,
        metricKey: "newResidents",
        year,
        sourceLabel: "משרד הבריאות",
        tooltip: "מתמחים חדשים בתחום ההתמחות לפי שנה."
      })
    ),
    metricCardFromImported(importedSpecialtyMetrics, {
      id: "specialty-expected-national-openings",
      label: "צפי תקנים ארצי",
      keys: ["expectedNationalOpenings"],
      sourceLabel: "משרד הבריאות"
    })
  ];

  return (
    <PageShell className="space-y-7 py-8">
      <section className="relative rounded-xl border border-brand-100 bg-white px-5 py-5 shadow-panel md:px-6">
        <div className="absolute left-5 top-5 z-10">
          {session ? (
            <FavoriteToggleButton
              departmentId={department.id}
              initialFavorite={department.isFavorite}
              variant="icon"
            />
          ) : (
            <LoginRequiredBookmarkButton />
          )}
        </div>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 pe-12">
            <div className="flex flex-wrap gap-2">
              <Badge>{department.specialty.name}</Badge>
              <Badge tone="default">{profileTerm}</Badge>
              <Badge tone="default">{region}</Badge>
              <Badge tone={department.residencyOpenings.length > 0 ? "success" : "warning"}>
                {department.residencyOpenings.length > 0 ? "תקנים פתוחים" : "אין תקנים כרגע"}
              </Badge>
            </div>
            <h1 className="mt-4 break-words text-3xl font-bold leading-tight text-ink md:text-4xl">
              {profileTitle}
            </h1>
            <p className="mt-3 text-lg font-bold leading-7 text-slate-700">
              {department.institution.name}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600">{region}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <RatingStars value={department.summary.overallRecommendation || 0} />
              <span className="text-sm font-semibold text-slate-600">
                {department.summary.reviewCount} ביקורות מאושרות
              </span>
            </div>
            {isMedicalArrayProfile && arrayDepartments.length > 1 ? (
              <p className="mt-3 inline-flex rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-900">
                מספר מחלקות במערך: {arrayDepartments.length}
              </p>
            ) : null}
            <div className="mt-4">
              <DepartmentPageActions
                departmentId={department.id}
                isAdmin={false}
                showClaim
              />
            </div>
          </div>

          <div className="w-full space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4 lg:w-[320px]">
            <div>
              <ExperienceCta
                departments={reviewContext.departments}
                selectedDepartmentId={department.id}
                className="w-full"
                buttonClassName="inline-flex w-full items-center justify-center rounded-full border border-amber-200 bg-gradient-to-l from-amber-300 via-amber-200 to-orange-100 px-5 py-3 text-sm font-bold text-amber-950 shadow-lg shadow-amber-200/50 transition hover:-translate-y-0.5 hover:shadow-xl"
              />
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              {websiteUrl ? (
                <a href={websiteUrl} className="block font-semibold text-brand-800">
                  אתר המחלקה / המוסד
                </a>
              ) : (
                <p>
                  אתר: <EmptyValue />
                </p>
              )}
              {department.applicationUrl ? (
                <a href={department.applicationUrl} className="block font-semibold text-brand-800">
                  קישור להגשת מועמדות
                </a>
              ) : null}
              {department.contactName ? (
                <p className="leading-7">איש קשר: {department.contactName}</p>
              ) : null}
              {contactEmails.length > 0 ? (
                <p className="leading-7">אימייל: {contactEmails.join(", ")}</p>
              ) : (
                <p>
                  אימייל: <EmptyValue />
                </p>
              )}
              <p>טלפון: {department.publicContactPhone ?? <EmptyValue />}</p>
            </div>
            <DepartmentPageActions
              departmentId={department.id}
              isAdmin={false}
              showMistake
            />
          </div>
        </div>
      </section>

      {session?.role === "admin" ? (
        <DepartmentPageActions departmentId={department.id} isAdmin showAdminScrape />
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="rounded-xl">
            <SectionHeading title="פרופיל המחלקה" />
            <p className="mt-4 text-sm leading-8 text-slate-700">
              {profileDescription || MISSING_IMPORTED_VALUE}
            </p>
            {department.dataSourceNotes || department.dataLastUpdated ? (
              <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
                מקור/עדכון נתונים: {department.dataSourceNotes ?? "מקור CSV"}
                {" · "}
                עודכן: {formatDate(department.dataLastUpdated)}
              </p>
            ) : null}
            {!hasOfficialDescription ? (
              <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm leading-7 text-brand-900">
                עדיין אין מידע רשמי מלא מהמחלקה. אפשר כבר לשמור את העמוד, לשתף חוויה ולחזור
                כשיתווספו עדכונים.
              </div>
            ) : null}
            <p className="mt-4 text-sm leading-8 text-slate-700">{department.practicalInfo}</p>
          </Card>

          <Card className="rounded-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionHeading
                title={isMedicalArrayProfile ? "נתוני המערך" : "נתוני המחלקה"}
              />
              {isMedicalArrayDemo ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                  כולל נתוני דמו מסומנים
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              המדדים כאן נקראים ממודל המחלקה ומטבלאות DepartmentMetric / DepartmentYearlyMetric בלבד.
              נתונים כלליים של תחום ההתמחות מופיעים בסעיף נפרד בהמשך.
            </p>

            <div className="mt-5">
              <DataMetricGrid metrics={departmentDataMetrics} />
            </div>

            {isMedicalArrayProfile ? (
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                <ArrayYearlyResidentsTable
                  value={isMedicalArrayDemo ? null : department.medicalArray?.recruitedResidentsByYear}
                  missingText={profileMissingText}
                />
                <ArrayPublicationMetrics
                  total={department.medicalArray?.totalPublicationsCount}
                  residentTotal={department.medicalArray?.residentPublicationsCount}
                  years={department.medicalArray?.publicationYears}
                  sourceUrl={department.medicalArray?.publicationSourceUrl}
                  missingText={profileMissingText}
                />
                <DunsTrend people={duns100Physicians} />
              </div>
            ) : duns100Physicians.length > 0 ? (
              <div className="mt-5">
                <DunsTrend people={duns100Physicians} />
              </div>
            ) : null}

            {duns100Physicians.length > 0 ? (
              <details className="mt-4 rounded-2xl border border-brand-100 bg-white px-4 py-4">
                <summary className="cursor-pointer text-sm font-black text-ink">
                  רופאים שמופיעים ב-DUNS100 ({duns100Physicians.length})
                </summary>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {duns100Physicians.map((person) => (
                    <div key={person.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-ink">{person.personName}</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-black text-brand-800">
                          DUNS100
                        </span>
                      </div>
                      {person.roleTitle ? (
                        <p className="mt-1 text-xs leading-6 text-slate-600">{person.roleTitle}</p>
                      ) : null}
                      {person.rankingYear ? (
                        <p className="mt-1 text-xs font-bold text-slate-500">שנת דירוג: {person.rankingYear}</p>
                      ) : null}
                      {person.sourceUrl ? (
                        <a href={person.sourceUrl} className="mt-2 inline-flex text-xs font-bold text-brand-800">
                          מקור
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

          </Card>

          {importedSpecialtyMetrics.length > 0 || importedSpecialtyYearlyMetrics.length > 0 ? (
            <Card className="rounded-xl">
              <SectionHeading title="נתונים כלליים על תחום ההתמחות" />
              {department.specialty.dataSourceNotes || department.specialty.dataLastUpdated ? (
                <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-6 text-blue-900">
                  מקור/עדכון תחום: {department.specialty.dataSourceNotes ?? "MASTER_Spec.csv"}
                  {" · "}
                  עודכן: {formatDate(department.specialty.dataLastUpdated)}
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-7 text-slate-600">
                אלה נתונים ארציים של תחום ההתמחות, ולכן הם אינם מוצגים כנתוני המחלקה עצמה.
              </p>
              <div className="mt-5">
                <DataMetricGrid metrics={specialtyGeneralMetrics} />
              </div>
            </Card>
          ) : null}

          <Card className="rounded-xl">
            <SectionHeading title="מחקר ופרסומים" />
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <DataMetricCard
                label="מספר פרסומים מחלקתי"
                value={
                  publicationMetric
                    ? formatImportedMetricValue(publicationMetric)
                    : latestOpenAlexResearchMetric?.publicationsCount
                }
                sourceLabel={publicationMetric ? importedSourceLabel(publicationMetric, "משרד הבריאות") : "OpenAlex"}
                tooltip={
                  latestOpenAlexResearchMetric
                    ? "פעילות מחקרית משוערת לפי OpenAlex, לא ספירה רשמית של המחלקה."
                    : "מספר פרסומים מחלקתי מיובא כאשר קיים."
                }
                lastUpdated={publicationMetric?.lastUpdated}
              />
              {openAlexResearchMetrics.length > 0 ? (
                <EstimatedOpenAlexResearch metrics={openAlexResearchMetrics} />
              ) : (
                <DataMetricCard
                  label="פעילות מחקרית משוערת"
                  value={null}
                  sourceLabel="OpenAlex"
                  tooltip="יוצג לאחר רענון מדדי OpenAlex על ידי אדמין."
                />
              )}
            </div>
            <div className="mt-5">
              <p className="text-sm font-bold text-ink">הזדמנויות מחקר</p>
              <div className="mt-3 space-y-3">
                {department.researchOpportunities.length === 0 ? (
                  <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {MISSING_IMPORTED_VALUE}
                  </p>
                ) : (
                  department.researchOpportunities.map((opportunity) => (
                    <div key={opportunity.id} className="rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-3">
                      <p className="text-sm font-bold text-ink">{opportunity.title}</p>
                      <p className="mt-2 text-xs leading-6 text-slate-700">{opportunity.summary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card className="rounded-xl">
            <SectionHeading title="חוויות מהשטח" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ScoreBar label="דירוג כללי" value={department.summary.overallRecommendation} />
              <ScoreBar label="איכות הוראה" value={department.summary.teachingQuality} />
              <ScoreBar label="נגישות בכירים" value={department.summary.seniorsApproachability} />
              <ScoreBar label="חשיפה למחקר" value={department.summary.researchExposure} />
              <ScoreBar label="עומס ואיזון חיים" value={department.summary.lifestyleBalance} />
              <ScoreBar label="חשיפה קלינית" value={department.summary.clinicalExposure} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {roleSummaries.map((item) => (
                <div key={item.reviewerType} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="text-xs font-semibold text-slate-500">
                    {reviewerTypeLabel(item.reviewerType as "RESIDENT" | "INTERN" | "STUDENT")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink">
                    {item.count > 0 ? `${item.average.toFixed(1)} · ${item.count} ביקורות` : "אין עדיין נתונים"}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-xl">
            <SectionHeading title="תקנים והזדמנויות" />
            {department.residencyOpenings.length === 0 ? (
              <p className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                אין עדיין נתונים
              </p>
            ) : (
              <div className="mt-5 grid gap-4">
                {department.residencyOpenings.map((opening) => (
                  <OpeningCard
                    key={opening.id}
                    opening={{
                      ...opening,
                      department: {
                        name: department.name,
                        institution: {
                          name: department.institution.name
                        },
                        specialty: {
                          name: department.specialty.name
                        }
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </Card>

          {department.residencyOpenings[0]?.acceptanceCriteria ? (
            <Card className="rounded-xl">
              <SectionHeading title="מה התוכנית מחפשת במועמדים" />
              <div className="mt-5">
                <OpeningCriteriaGrid criteria={department.residencyOpenings[0].acceptanceCriteria} />
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-5">
          <Card className="rounded-xl">
            <SectionHeading title={`יתרונות ה${profileTerm}`} />
            <div className="mt-5 flex flex-wrap gap-2">
              {perkItems.length === 0 ? (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                  {profileMissingText}
                </p>
              ) : null}
              {perkItems.map((perk) => (
                <span
                  key={perk}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-900"
                >
                  <span className="text-sm leading-none" aria-hidden="true">
                    {getPerkIcon(perk)}
                  </span>
                  {perk}
                </span>
              ))}
            </div>
          </Card>

          <Card className="rounded-xl">
            <SectionHeading title="הנהלה ויצירת קשר" />
            <div className="mt-5 space-y-3">
              {department.representativeAssignments.length === 0 && profileHeads.length === 0 && !department.contactName && contactEmails.length === 0 && !department.publicContactPhone ? (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {profileMissingText}
                </p>
              ) : null}
              <div className="rounded-lg border border-slate-100 bg-white px-3 py-3">
                <p className="text-xs font-black text-slate-500">איש קשר</p>
                <p className="mt-2 text-sm font-bold text-ink">
                  {department.contactName || <EmptyValue />}
                </p>
                <p className="mt-1 text-xs leading-6 text-slate-600">
                  תפקיד: <EmptyValue />
                </p>
                <p className="text-xs leading-6 text-slate-600">
                  אימייל: {contactEmails.length > 0 ? contactEmails.join(", ") : <EmptyValue />}
                </p>
                <p className="text-xs leading-6 text-slate-600">
                  טלפון: {department.publicContactPhone || <EmptyValue />}
                </p>
              </div>
              {department.representativeAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-3">
                  {assignment.user.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={assignment.user.profileImageUrl}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-900">
                      MD
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{assignment.user.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {assignment.user.representativeProfile?.title ?? "נציג/ת מחלקה"}
                    </p>
                    {assignment.user.email ? (
                      <a href={`mailto:${assignment.user.email}`} className="text-xs font-semibold text-brand-700">
                        יצירת קשר
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
              {profileHeads.map((head) => (
                <div key={head.id} className="rounded-lg border border-slate-100 bg-white px-3 py-3">
                  <p className="text-xs font-black text-slate-500">מנהל/ת מחלקה</p>
                  <p className="mt-2 text-sm font-bold text-ink">{head.name || <EmptyValue />}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[head.title, head.role, head.departmentName].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    אימייל: <EmptyValue />
                  </p>
                  <p className="text-xs leading-6 text-slate-600">
                    טלפון: <EmptyValue />
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-xl">
            <SectionHeading title="עדכונים רשמיים" />
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-bold text-ink">עדכונים רשמיים</p>
                <div className="mt-3">
                  <OfficialUpdatesList updates={department.officialUpdates} />
                </div>
              </div>
            </div>
          </Card>
        </aside>
      </section>

      <section className="space-y-5">
        <SectionHeading title="שיתופים מהשטח" />
        <div className="grid gap-4">
          {visibleReviews.length === 0 ? (
            <Card className="rounded-xl">
              <p className="text-sm text-slate-600">אין עדיין נתונים</p>
            </Card>
          ) : (
            visibleReviews.map((review) => (
              <ReviewCard key={review.id} review={review} canReport={Boolean(session)} />
            ))
          )}
          {!session && department.reviews.length > visibleReviews.length ? (
            <Card className="rounded-xl text-center">
              <p className="text-sm text-slate-600">
                יש עוד שיתופים מהשטח למחלקה הזו. התחברות מאפשרת גם שמירה להשוואה.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(departmentHref)}`}
                className="mt-4 inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white"
              >
                התחברות
              </Link>
            </Card>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
