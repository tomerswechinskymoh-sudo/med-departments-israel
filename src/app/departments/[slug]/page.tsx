import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DepartmentPageActions } from "@/components/departments/department-page-actions";
import {
  FavoriteToggleButton,
  LoginRequiredBookmarkButton
} from "@/components/departments/favorite-toggle-button";
import { InstitutionLogo } from "@/components/departments/institution-logo";
import { ReviewCard } from "@/components/departments/review-card";
import { ExperienceCta } from "@/components/experience/experience-cta";
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

function MetricInfoTip({
  sourceLabel,
  text,
  lastUpdated,
  metricType
}: {
  sourceLabel: string;
  text?: string;
  lastUpdated?: string | Date | null;
  metricType?: string;
}) {
  const tooltipText = [
    text,
    metricType ? `סוג נתון: ${metricType}` : null,
    `מקור נתונים: ${sourceLabel}`,
    lastUpdated ? `עודכן: ${formatDate(lastUpdated)}` : null
  ].filter(Boolean).join(" · ");

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
  lastUpdated,
  metricType = "נתון מחלקתי",
  caption,
  className = ""
}: {
  label: string;
  value: string | number | null | undefined;
  sourceLabel: string;
  tooltip?: string;
  lastUpdated?: string | Date | null;
  metricType?: string;
  caption?: string;
  className?: string;
}) {
  const hasValue = value !== null && value !== undefined && String(value).trim().length > 0;
  const isGeneralSpecialtyMetric = metricType === "נתון כללי לתחום";

  return (
    <div className={`flex min-h-[5.75rem] flex-col rounded-xl border border-slate-100 bg-white px-2.5 py-2.5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold leading-5 text-slate-600">{label}</p>
          {isGeneralSpecialtyMetric ? (
            <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-black text-blue-800">
              נתון כללי לתחום
            </span>
          ) : null}
        </div>
        <MetricInfoTip
          sourceLabel={sourceLabel}
          text={tooltip}
          lastUpdated={lastUpdated}
          metricType={metricType}
        />
      </div>
      <p className={`mt-1.5 text-base font-black leading-tight ${hasValue ? "text-ink" : "text-slate-400"}`}>
        {hasValue ? value : MISSING_IMPORTED_VALUE}
      </p>
      {caption ? <p className="mt-1 text-xs font-semibold text-slate-500">{caption}</p> : null}
    </div>
  );
}

type DisplayMetric = {
  id: string;
  label: string;
  value: string | number | null | undefined;
  sourceLabel: string;
  tooltip?: string;
  lastUpdated?: string | Date | null;
  metricType?: string;
  caption?: string;
  lowPriority?: boolean;
};

function YearlyResidentsChart({
  rows,
  sourceLabel,
  lastUpdated
}: {
  rows: Array<{ year: number; value: number; rawValue?: string | null }>;
  sourceLabel: string;
  lastUpdated?: string | Date | null;
}) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-slate-600">מתמחים חדשים לפי שנה</p>
        <MetricInfoTip
          sourceLabel={sourceLabel}
          text="מספר מתמחים חדשים שנקלטו במחלקה לפי שנה."
          metricType="נתון מחלקתי"
          lastUpdated={lastUpdated}
        />
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-lg font-black text-slate-400">{MISSING_IMPORTED_VALUE}</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {rows.map((row) => (
            <div key={row.year} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-2">
              <span className="text-xs font-black text-slate-500">{row.year}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-700"
                  style={{ width: `${Math.max(8, Math.round((row.value / maxValue) * 100))}%` }}
                />
              </div>
              <span className="text-left text-sm font-black text-ink">{row.rawValue ?? row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function sanitizedProfileText(value?: string | null) {
  const text = value?.trim();
  if (!text) return null;

  if (
    /בסיסי|עתידי|לפני שהוזן|כיסוי מלא|בהמשך אפשר|מוכן לעדכונים/.test(
      text
    )
  ) {
    return null;
  }

  return text;
}

function formatDepartmentHeaderTitle(
  departmentName: string,
  specialtyName: string,
  institutionName: string
) {
  const withGeresh = (value: string) => (/^[א-ת]$/.test(value) ? `${value}׳` : value);
  const normalized = departmentName
    .replace(institutionName, "")
    .replace(/[״"`']/g, "׳")
    .replace(/\s+/g, " ")
    .trim();
  const standaloneSubDepartment = normalized.match(/^(?:מחלקה\s*)?([א-ת]׳?)$/);

  if (standaloneSubDepartment) {
    return `מחלקה ${withGeresh(standaloneSubDepartment[1])}`;
  }

  if (normalized.startsWith(`${specialtyName} `)) {
    const suffix = normalized.slice(specialtyName.length).trim();
    const simpleSuffix = suffix.match(/^(?:מחלקה\s*)?([א-ת]׳?)$/);

    if (simpleSuffix) {
      return `מחלקה ${withGeresh(simpleSuffix[1])}`;
    }
  }

  const embeddedSubDepartment = normalized.match(/מחלקה\s+([א-ת]׳?)/);
  if (embeddedSubDepartment) {
    return `מחלקה ${withGeresh(embeddedSubDepartment[1])}`;
  }

  return normalized || departmentName;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function genderPercentFromText(value: string | null | undefined, gender: "women" | "men") {
  if (!value) return null;
  const normalized = value.replace(",", ".");
  const labels = gender === "women" ? ["נשים", "אישה", "נקבות", "female", "women"] : ["גברים", "גבר", "זכרים", "male", "men"];
  const labelPattern = labels.join("|");
  const before = normalized.match(new RegExp(`(?:${labelPattern})[^0-9]{0,12}(\\d+(?:\\.\\d+)?)\\s*%?`, "i"));
  const after = normalized.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%?[^0-9]{0,12}(?:${labelPattern})`, "i"));
  const parsed = Number(before?.[1] ?? after?.[1]);

  return Number.isFinite(parsed) ? clampPercent(parsed) : null;
}

function GenderBalanceCard({
  womenPercent,
  menPercent,
  sourceLabel,
  tooltip,
  lastUpdated
}: {
  womenPercent: number | null;
  menPercent: number | null;
  sourceLabel: string;
  tooltip: string;
  lastUpdated?: string | Date | null;
}) {
  const hasValue = womenPercent !== null || menPercent !== null;
  const women = clampPercent(womenPercent ?? (menPercent !== null ? 100 - menPercent : 0));
  const men = clampPercent(menPercent ?? (womenPercent !== null ? 100 - womenPercent : 0));

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold leading-5 text-slate-600">איזון מגדרי</p>
        <MetricInfoTip
          sourceLabel={sourceLabel}
          text={tooltip}
          metricType="נתון מחלקתי"
          lastUpdated={lastUpdated}
        />
      </div>
      {!hasValue ? (
        <p className="mt-2 text-lg font-black text-slate-400">{MISSING_IMPORTED_VALUE}</p>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <div
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(#0f766e 0 ${women}%, #dbeafe ${women}% 100%)`
            }}
            aria-label={`נשים ${Math.round(women)}%, גברים ${Math.round(men)}%`}
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-xs font-black text-ink">
              {Math.round(women)}%
            </div>
          </div>
          <div className="space-y-2 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-700" />
              <span>נשים {Math.round(women)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-100" />
              <span>גברים {Math.round(men)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClockMetricCard({
  label,
  value,
  sourceLabel,
  tooltip,
  lastUpdated
}: {
  label: string;
  value: string | number | null | undefined;
  sourceLabel: string;
  tooltip: string;
  lastUpdated?: string | Date | null;
}) {
  const hasValue = value !== null && value !== undefined && String(value).trim().length > 0;

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-sm font-black text-brand-800">
            ◷
          </span>
          <p className="text-sm font-bold leading-5 text-slate-600">{label}</p>
        </div>
        <MetricInfoTip
          sourceLabel={sourceLabel}
          text={tooltip}
          metricType="נתון מחלקתי"
          lastUpdated={lastUpdated}
        />
      </div>
      <p className={`mt-2 text-base font-black ${hasValue ? "text-ink" : "text-slate-400"}`}>
        {hasValue ? value : MISSING_IMPORTED_VALUE}
      </p>
    </div>
  );
}

function AcceptanceDistributionCard({
  rows,
  sourceLabel,
  tooltip,
  metricType,
  lastUpdated
}: {
  rows: Array<{ label: string; value: number; displayValue: string }>;
  sourceLabel: string;
  tooltip: string;
  metricType: string;
  lastUpdated?: string | Date | null;
}) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold leading-5 text-slate-600">התפלגות מצאו התמחות</p>
          {metricType === "נתון כללי לתחום" ? (
            <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-black text-blue-800">
              נתון כללי לתחום
            </span>
          ) : null}
        </div>
        <MetricInfoTip
          sourceLabel={sourceLabel}
          text={tooltip}
          metricType={metricType}
          lastUpdated={lastUpdated}
        />
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-base font-black text-slate-400">{MISSING_IMPORTED_VALUE}</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[5.6rem_1fr_2.4rem] items-center gap-2">
              <span className="truncate text-[0.68rem] font-bold text-slate-500">{row.label}</span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-teal-600"
                  style={{ width: `${Math.max(8, Math.round((row.value / maxValue) * 100))}%` }}
                />
              </div>
              <span className="text-left text-xs font-black text-ink">{row.displayValue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickHighlightCard({
  label,
  value,
  sourceLabel,
  tooltip,
  metricType,
  lastUpdated,
  missingText = "לא זמין"
}: {
  label: string;
  value: string | number | null | undefined;
  sourceLabel: string;
  tooltip: string;
  metricType?: string;
  lastUpdated?: string | Date | null;
  missingText?: string;
}) {
  const hasValue = value !== null && value !== undefined && String(value).trim().length > 0;

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.68rem] font-black text-slate-500">{label}</p>
        <MetricInfoTip
          sourceLabel={sourceLabel}
          text={tooltip}
          metricType={metricType}
          lastUpdated={lastUpdated}
        />
      </div>
      <p className={`mt-1 text-sm font-black leading-tight ${hasValue ? "text-ink" : "text-slate-400"}`}>
        {hasValue ? value : missingText}
      </p>
    </div>
  );
}

function SalaryGapHighlight() {
  const centerSalary = 16954;
  const peripherySalary = 19965.92;
  const gap = peripherySalary - centerSalary;
  const max = peripherySalary;
  const tooltip = "שכר מרכז: 16,954.00 ₪ · שכר פריפריה: 19,965.92 ₪ · פער לטובת פריפריה.";

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-l from-amber-50 to-white px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.68rem] font-black text-amber-900">פער שכר</p>
        <MetricInfoTip
          sourceLabel="קבוע שכר מערכת"
          text={tooltip}
          metricType="נתון כללי לתחום"
        />
      </div>
      <p className="mt-1 text-sm font-black text-ink">
        +{formatImportedNumber(gap)} ₪
      </p>
      <div className="mt-2 space-y-1">
        <div className="grid grid-cols-[3.8rem_1fr] items-center gap-2">
          <span className="text-[0.65rem] font-bold text-slate-500">מרכז</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(centerSalary / max) * 100}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-[3.8rem_1fr] items-center gap-2">
          <span className="text-[0.65rem] font-bold text-slate-500">פריפריה</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-amber-500" style={{ width: "100%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const acceptanceMetricInputs = [
  {
    id: "accepted-immediately",
    label: "מצאו התמחות מיד",
    keys: ["acceptedImmediatelyReports"],
    tooltip: "מספר דיווחים על מציאת התמחות מיד, רק כאשר קיים נתון מחלקתי."
  },
  {
    id: "accepted-within-six-months",
    label: "מצאו עד חצי שנה",
    keys: ["acceptedWithinSixMonthsReports"],
    tooltip: "מספר דיווחים על מציאת התמחות עד חצי שנה, רק כאשר קיים נתון מחלקתי."
  },
  {
    id: "accepted-within-one-year",
    label: "מצאו עד שנה",
    keys: ["acceptedWithinOneYearReports"],
    tooltip: "מספר דיווחים על מציאת התמחות עד שנה, רק כאשר קיים נתון מחלקתי."
  },
  {
    id: "accepted-within-two-years",
    label: "מצאו עד שנתיים",
    keys: ["acceptedWithinTwoYearsReports"],
    tooltip: "מספר דיווחים על מציאת התמחות עד שנתיים, רק כאשר קיים נתון מחלקתי."
  },
  {
    id: "accepted-after-two-years",
    label: "מצאו אחרי שנתיים",
    keys: ["acceptedAfterTwoYearsReports"],
    tooltip: "מספר דיווחים על מציאת התמחות אחרי שנתיים, רק כאשר קיים נתון מחלקתי."
  }
];

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

const readableMetricLabels: Record<string, string> = {
  officialResidencyDuration: "משך התמחות רשמי",
  actualAverageDuration: "משך ממוצע בפועל",
  medianWaitingTime: "זמן המתנה חציוני לתקן",
  residentsCount: "מספר מתמחים",
  activeResidentsCount: "מספר מתמחים",
  boardStageAPassRate: "מעבר שלב א׳",
  inherited_boardStageAPassRate: "מעבר שלב א׳",
  burnoutIndex: "מדד שחיקה",
  departmentalPublicationsCount: "מספר פרסומים מחלקתי",
  boardStageBPassRate: "מעבר שלב ב׳",
  inherited_boardStageBPassRate: "מעבר שלב ב׳",
  expectedOpenings2026: "צפי תקנים חדשים ב-2026",
  medianElectiveDemand: "מספר אלקטיביסטים חציוני",
  seniorPhysiciansCount: "מספר בכירים",
  duns100PhysiciansCount: "רופאים ב-DUNS100",
  newResidents: "מתמחים חדשים"
};

function readableMetricLabel(value: string) {
  return (
    readableMetricLabels[value] ??
    value
      .replace(/_/g, " ")
      .replace(/שלב א\b/g, "שלב א׳")
      .replace(/שלב ב\b/g, "שלב ב׳")
      .replace(/ב2026/g, "ב-2026")
  );
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
    label?: string;
    keys: string[];
    sourceLabel: string;
    tooltip?: string;
    valueOverride?: string | number | null;
    metricType?: string;
    lowPriority?: boolean;
  }
): DisplayMetric {
  const metric = findImportedMetric(metrics, ...input.keys);
  const value = input.valueOverride ?? (metric ? formatImportedMetricValue(metric) : null);

  return {
    id: input.id,
    label: input.label ?? readableMetricLabel(metric?.metricKey ?? input.keys[0] ?? input.id),
    value,
    sourceLabel: importedSourceLabel(metric, input.sourceLabel),
    tooltip: input.tooltip,
    lastUpdated: metric?.lastUpdated,
    metricType: input.metricType ?? "נתון מחלקתי",
    lowPriority: input.lowPriority
  };
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

function sourceLabelFromExternalMetricSource(sourceName: string | null | undefined) {
  const normalized = (sourceName ?? "").toUpperCase();

  if (normalized === "DUNS100") return "DUNS100";
  if (normalized.includes("MOH") || normalized.includes("MINISTRY")) return "משרד הבריאות";

  return "נתוני המחלקה";
}

function numberFromUnknown(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function rawJsonObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hIndexEstimateFromRaw(rawValue: unknown) {
  const raw = rawJsonObject(rawValue);
  if (!raw) return null;

  const direct =
    numberFromUnknown(raw.hIndexEstimate) ??
    numberFromUnknown(raw.h_index_estimate) ??
    numberFromUnknown(raw.hIndex) ??
    numberFromUnknown(raw.h_index);

  if (direct !== null) return direct;

  const meta = rawJsonObject(raw.meta);
  return (
    numberFromUnknown(meta?.hIndexEstimate) ??
    numberFromUnknown(meta?.h_index_estimate) ??
    numberFromUnknown(meta?.hIndex) ??
    numberFromUnknown(meta?.h_index)
  );
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
        "הגישה לחשבון נחסמה. אפשר להירשם מחדש עם אסמכתא מתאימה או ליצור קשר עם contact@hitmachut.org.",
      ctaHref: "/signup",
      ctaLabel: "הרשמה מחדש"
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
  const profileTitle = isMedicalArrayProfile
    ? `מערך ${department.specialty.name}`
    : formatDepartmentHeaderTitle(
        department.name,
        department.specialty.name,
        department.institution.name
      );
  const rawProfileDescription = isMedicalArrayProfile
    ? department.medicalArray?.description || department.about || department.shortSummary
    : department.about || department.shortSummary;
  const profileDescription = sanitizedProfileText(rawProfileDescription);
  const practicalInfo = sanitizedProfileText(department.practicalInfo);
  const profileExternalMetrics = isMedicalArrayProfile
    ? department.medicalArray?.externalMetrics ?? []
    : department.externalMetrics;
  const arrayDepartments = isMedicalArrayProfile ? department.medicalArray?.departments ?? [] : [];
  const importedDepartmentMetrics = department.metrics;
  const importedDepartmentYearlyMetrics = department.yearlyMetrics;
  const importedSpecialtyMetrics = department.specialty.metrics;
  const contactEmails = (department.publicContactEmail ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const websiteUrl = department.websiteUrl ?? department.institution.websiteUrl;
  const canViewDepartmentDetails = Boolean(session && session.verificationStatus !== "REJECTED");

  if (!canViewDepartmentDetails) {
    const lock = departmentLockCopy(session);

    return (
      <PageShell className="space-y-5 py-6">
        <section className="rounded-xl border border-brand-100 bg-white px-4 py-5 shadow-panel md:px-5">
          <div className="flex gap-4">
            <InstitutionLogo institution={department.institution} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <Badge>{department.specialty.name}</Badge>
                <Badge tone="default">{profileTerm}</Badge>
                <Badge tone="default">{region}</Badge>
              </div>
              <h1 className="mt-3 break-words text-3xl font-bold leading-tight text-ink md:text-4xl">
                {profileTitle}
              </h1>
              <p className="mt-2 text-lg font-bold leading-7 text-slate-700">
                {department.institution.name}
              </p>
            </div>
          </div>
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
  const metricRecord = (metricKey: string) =>
    profileExternalMetrics.find((metric) => metric.metricKey === metricKey && metric.sourceName !== "DEMO");
  const isMedicalArrayDemo = department.medicalArray?.publicationSourceUrl === "DEMO";
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
  const specialtyBoardStageA = findImportedMetric(importedSpecialtyMetrics, "boardStageAPassRate");
  const boardStageA =
    department.shlavAlephPassRate !== null && department.shlavAlephPassRate !== undefined
      ? { value: `${department.shlavAlephPassRate}%`, sourceLabel: "משרד הבריאות", metricType: "נתון מחלקתי" }
      : importedBoardStageA
        ? {
            value: formatImportedMetricValue(importedBoardStageA),
            sourceLabel: importedSourceLabel(importedBoardStageA, "משרד הבריאות"),
            metricType: importedBoardStageA.metricKey.startsWith("inherited_") ? "נתון כללי לתחום" : "נתון מחלקתי",
            lastUpdated: importedBoardStageA.lastUpdated
          }
      : boardStageAMetric
        ? {
            value: `${boardStageAMetric.value}%`,
            sourceLabel: sourceLabelFromExternalMetricSource(boardStageAMetric.sourceName),
            metricType: "נתון מחלקתי"
          }
        : specialtyBoardStageA
          ? {
              value: formatImportedMetricValue(specialtyBoardStageA),
              sourceLabel: importedSourceLabel(specialtyBoardStageA, "משרד הבריאות"),
              metricType: "נתון כללי לתחום",
              lastUpdated: specialtyBoardStageA.lastUpdated
            }
          : null;
  const boardStageBMetric = metricRecord("boardStageBPassRate");
  const importedBoardStageB = findImportedMetric(
    importedDepartmentMetrics,
    "boardStageBPassRate",
    "inherited_boardStageBPassRate"
  );
  const specialtyBoardStageB = findImportedMetric(importedSpecialtyMetrics, "boardStageBPassRate");
  const boardStageB =
    department.shlavBetPassRate !== null && department.shlavBetPassRate !== undefined
      ? { value: `${department.shlavBetPassRate}%`, sourceLabel: "משרד הבריאות", metricType: "נתון מחלקתי" }
      : importedBoardStageB
        ? {
            value: formatImportedMetricValue(importedBoardStageB),
            sourceLabel: importedSourceLabel(importedBoardStageB, "משרד הבריאות"),
            metricType: importedBoardStageB.metricKey.startsWith("inherited_") ? "נתון כללי לתחום" : "נתון מחלקתי",
            lastUpdated: importedBoardStageB.lastUpdated
          }
      : boardStageBMetric
        ? {
            value: `${boardStageBMetric.value}%`,
            sourceLabel: sourceLabelFromExternalMetricSource(boardStageBMetric.sourceName),
            metricType: "נתון מחלקתי"
          }
        : specialtyBoardStageB
          ? {
              value: formatImportedMetricValue(specialtyBoardStageB),
              sourceLabel: importedSourceLabel(specialtyBoardStageB, "משרד הבריאות"),
              metricType: "נתון כללי לתחום",
              lastUpdated: specialtyBoardStageB.lastUpdated
            }
          : null;
  const openingsCount = department.residencyOpenings.reduce(
    (sum, opening) => sum + (opening.openingsCount ?? 0),
    0
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
  const latestAnyOpenAlexResearchMetric = openAlexResearchMetrics[0] ?? null;
  const latestOpenAlexResearchMetric =
    openAlexResearchMetrics.find(
      (metric) => !metric.needsMapping && typeof metric.publicationsCount === "number"
    ) ??
    openAlexResearchMetrics.find((metric) => !metric.needsMapping) ??
    null;
  const hIndexEstimate = hIndexEstimateFromRaw(latestOpenAlexResearchMetric?.rawResponseJson);
  const openAlexDebugTooltip = latestOpenAlexResearchMetric
    ? `הערכת פעילות מחקרית לפי OpenAlex. רמת ביטחון: ${latestOpenAlexResearchMetric.confidenceScore ?? "לא צוינה"}.`
    : latestAnyOpenAlexResearchMetric?.needsMapping
      ? "חסר מיפוי OpenAlex למחלקה או לתחום. ניתן להשלים מיפוי ולרענן מדדי מחקר באדמין."
      : "לא נמצאה רשומת OpenAlex למחלקה. ניתן להריץ רענון מדדי מחקר מהאדמין.";
  const publicationMetric = findImportedMetric(importedDepartmentMetrics, "departmentalPublicationsCount");
  const expectedOpeningsDepartmentMetric = findImportedMetric(importedDepartmentMetrics, "expectedOpenings2026");
  const expectedOpeningsYearlyMetric = latestYearlyMetric(importedDepartmentYearlyMetrics, "newResidents", { year: 2026 });
  const officialDurationMetric = findImportedMetric(importedDepartmentMetrics, "officialResidencyDuration");
  const actualDurationMetric = findImportedMetric(
    importedDepartmentMetrics,
    "actualAverageDuration",
    "medianResidencyDurationMonths"
  );
  const medianWaitingMetric = findImportedMetric(importedDepartmentMetrics, "medianWaitingTime");
  const womenPercentMetric = findImportedMetric(importedDepartmentMetrics, "womenPercent");
  const menPercentMetric = findImportedMetric(importedDepartmentMetrics, "menPercent");
  const burnoutDepartmentMetric = findImportedMetric(importedDepartmentMetrics, "burnoutIndex");
  const burnoutSpecialtyMetric = findImportedMetric(importedSpecialtyMetrics, "burnoutIndex");
  const burnoutMetric = burnoutDepartmentMetric ?? burnoutSpecialtyMetric;
  const burnoutMetricType = burnoutDepartmentMetric ? "נתון מחלקתי" : "נתון כללי לתחום";
  const womenPercent =
    (typeof womenPercentMetric?.value === "number" ? womenPercentMetric.value : null) ??
    genderPercentFromText(department.genderBalance, "women");
  const menPercent =
    (typeof menPercentMetric?.value === "number" ? menPercentMetric.value : null) ??
    genderPercentFromText(department.genderBalance, "men");
  const genderLastUpdated = womenPercentMetric?.lastUpdated ?? menPercentMetric?.lastUpdated ?? null;
  const hasContactPerson = Boolean(department.contactName || contactEmails.length > 0 || department.publicContactPhone);
  const departmentNewResidentsRows = [2020, 2021, 2022, 2023, 2024]
    .map((year) => {
      const metric = latestYearlyMetric(importedDepartmentYearlyMetrics, "newResidents", { year });
      if (!metric) return null;
      const parsedRawValue =
        metric.rawValue && Number.isFinite(Number(metric.rawValue))
          ? Number(metric.rawValue)
          : null;
      const value = typeof metric.value === "number" ? metric.value : parsedRawValue;

      return value === null
        ? null
        : {
            year,
            value,
            rawValue: metric.rawValue
          };
    })
    .filter((row): row is { year: number; value: number; rawValue: string | null | undefined } => Boolean(row));
  const firstDepartmentYearlyMetric = latestYearlyMetric(importedDepartmentYearlyMetrics, "newResidents", { beforeYear: 2026 });
  const acceptanceDepartmentRows = acceptanceMetricInputs
    .map((input) => {
      const metric = findImportedMetric(importedDepartmentMetrics, ...input.keys);
      if (!metric || typeof metric.value !== "number") return null;

      return {
        label: input.label.replace("מצאו ", ""),
        value: metric.value,
        displayValue: formatImportedMetricValue(metric),
        lastUpdated: metric.lastUpdated
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const acceptanceSpecialtyRows = acceptanceMetricInputs
    .map((input) => {
      const metric = findImportedMetric(importedSpecialtyMetrics, ...input.keys);
      if (!metric || typeof metric.value !== "number") return null;

      return {
        label: input.label.replace("מצאו ", ""),
        value: metric.value,
        displayValue: formatImportedMetricValue(metric),
        lastUpdated: metric.lastUpdated
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const acceptanceDistributionRows =
    acceptanceDepartmentRows.length > 0 ? acceptanceDepartmentRows : acceptanceSpecialtyRows;
  const acceptanceDistributionType =
    acceptanceDepartmentRows.length > 0 ? "נתון מחלקתי" : "נתון כללי לתחום";
  const acceptanceDistributionLastUpdated = acceptanceDistributionRows.find((row) => row.lastUpdated)?.lastUpdated;
  const workforceMetrics: DisplayMetric[] = [
    {
      id: "department-residents-count",
      label: "מספר מתמחים",
      value: activeResidents?.value ?? null,
      sourceLabel: "משרד הבריאות",
      tooltip: "מספר מתמחים פעילים כרגע במחלקה אשר דיווחו למשרד על התמחותם"
    },
    {
      id: "department-senior-physicians",
      label: "מספר בכירים",
      value: specialists?.value ?? null,
      sourceLabel: "משרד הבריאות",
      tooltip: "מספר הבכירים במחלקה כפי שדווח מהמחלקה"
    }
  ];
  const trainingMetrics: DisplayMetric[] = [
    {
      id: "residency-official-duration",
      label: "משך התמחות רשמי",
      value: officialDurationMetric ? formatImportedMetricValue(officialDurationMetric) : null,
      sourceLabel: importedSourceLabel(officialDurationMetric, "הר״י"),
      tooltip: "משך התמחות ע״פ הרשום באתר הר״י",
      lastUpdated: officialDurationMetric?.lastUpdated
    },
    {
      id: "residency-average-duration",
      label: medianDuration ? "משך התמחות במחלקה" : "משך ממוצע בפועל",
      value: medianDuration?.value ?? (actualDurationMetric ? formatImportedMetricValue(actualDurationMetric) : null),
      sourceLabel: importedSourceLabel(actualDurationMetric, "משרד הבריאות"),
      tooltip: "משך התמחות מחלקתי, אם סופק ברמת המחלקה.",
      lastUpdated: actualDurationMetric?.lastUpdated
    },
    {
      id: "residency-median-waiting-time",
      label: "זמן המתנה חציוני לתקן",
      value: medianWaitingMetric ? formatImportedMetricValue(medianWaitingMetric) : null,
      sourceLabel: importedSourceLabel(medianWaitingMetric, "משרד הבריאות"),
      tooltip: "זמן המתנה חציוני לתקן לפי נתון מחלקתי מיובא.",
      lastUpdated: medianWaitingMetric?.lastUpdated,
      lowPriority: true
    }
  ];
  const expectedOpeningsValue = expectedOpeningsDepartmentMetric
    ? formatImportedMetricValue(expectedOpeningsDepartmentMetric)
    : expectedOpeningsYearlyMetric
      ? formatImportedMetricValue(expectedOpeningsYearlyMetric)
      : null;
  const expectedOpeningsSourceLabel = importedSourceLabel(
    expectedOpeningsDepartmentMetric ?? expectedOpeningsYearlyMetric,
    "מספר המתמחים שאמורים לסיים השנה ע״ב אורך ההתמחות החציוני"
  );
  const electiveDemandMetric = findImportedMetric(importedDepartmentMetrics, "medianElectiveDemand");
  const duns100Metric = findImportedMetric(importedDepartmentMetrics, "duns100PhysiciansCount");
  const publicationsValue =
    latestOpenAlexResearchMetric?.publicationsCount ??
    (publicationMetric ? formatImportedMetricValue(publicationMetric) : null);
  const publicationsSourceLabel = latestOpenAlexResearchMetric
    ? "OpenAlex"
    : importedSourceLabel(publicationMetric, "משרד הבריאות");
  const publicationsLastUpdated =
    latestOpenAlexResearchMetric?.lastUpdated ??
    latestAnyOpenAlexResearchMetric?.lastUpdated ??
    publicationMetric?.lastUpdated;
  const examMetrics: DisplayMetric[] = [
    {
      id: "department-stage-a",
      label: "מעבר שלב א׳",
      value: boardStageA?.value ?? null,
      sourceLabel: boardStageA?.sourceLabel ?? "משרד הבריאות",
      tooltip:
        boardStageA?.metricType === "נתון כללי לתחום"
          ? "נתון כללי לתחום ההתמחות ולא למחלקה ספציפית"
          : "שיעור מעבר שלב א׳ למחלקה כאשר קיים נתון מחלקתי.",
      metricType: boardStageA?.metricType,
      lastUpdated: boardStageA?.lastUpdated
    },
    {
      id: "department-stage-b",
      label: "מעבר שלב ב׳",
      value: boardStageB?.value ?? null,
      sourceLabel: boardStageB?.sourceLabel ?? "משרד הבריאות",
      tooltip:
        boardStageB?.metricType === "נתון כללי לתחום"
          ? "נתון כללי לתחום ההתמחות ולא למחלקה ספציפית"
          : "שיעור מעבר שלב ב׳ למחלקה כאשר קיים נתון מחלקתי.",
      metricType: boardStageB?.metricType,
      lastUpdated: boardStageB?.lastUpdated
    }
  ];
  const newResidentsSourceLabel = importedSourceLabel(firstDepartmentYearlyMetric, "משרד הבריאות");
  const specialtyOverviewHref = `/departments?specialty=${department.specialty.id}`;

  return (
    <PageShell className="space-y-5 py-6">
      <section className="relative rounded-xl border border-brand-100 bg-white px-4 py-4 shadow-panel md:px-5">
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4 pe-12">
            <InstitutionLogo institution={department.institution} size="lg" className="mt-1" />
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <Badge>{department.specialty.name}</Badge>
                <Badge tone="default">{profileTerm}</Badge>
                <Badge tone="default">{region}</Badge>
                <Badge tone={department.residencyOpenings.length > 0 ? "success" : "warning"}>
                  {department.residencyOpenings.length > 0 ? "תקנים פתוחים" : "אין תקנים כרגע"}
                </Badge>
              </div>
              <h1 className="mt-3 break-words text-3xl font-bold leading-tight text-ink md:text-4xl">
                {profileTitle}
              </h1>
              <p className="mt-2 text-lg font-bold leading-7 text-slate-700">
                {department.institution.name}
              </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
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
            <div className="mt-3">
              <DepartmentPageActions
                departmentId={department.id}
                isAdmin={false}
                showClaim
              />
            </div>
            </div>
          </div>

          <div className="w-full space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3 lg:w-[300px]">
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

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="rounded-xl !p-4">
            <SectionHeading title="קצת על המחלקה" />
            {profileDescription || practicalInfo ? (
              <div className="mt-4 space-y-3 text-sm leading-8 text-slate-700">
                {profileDescription ? <p>{profileDescription}</p> : null}
                {practicalInfo ? <p>{practicalInfo}</p> : null}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-8 text-slate-500">{MISSING_IMPORTED_VALUE}</p>
            )}
            <Link
              href={specialtyOverviewHref}
              className="mt-4 inline-flex rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-black text-brand-900 transition hover:bg-brand-100"
            >
              סקירת תחום ההתמחות
            </Link>
          </Card>

          <Card className="rounded-xl !p-4">
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

            <div className="mt-4 space-y-3">
              <div className="grid gap-2 md:grid-cols-3">
                <DataMetricCard {...workforceMetrics[0]} />
                <DataMetricCard
                  label="מספר תקנים צפויים להתפנות"
                  value={expectedOpeningsValue}
                  sourceLabel={expectedOpeningsSourceLabel}
                  tooltip="צפי תקנים המבוסס על המתמחים שאמורים לסיים השנה לפי אורך ההתמחות החציוני."
                  className="border-amber-200 bg-amber-50/70"
                />
                <DataMetricCard {...workforceMetrics[1]} />
              </div>

              <div className="grid gap-2 lg:grid-cols-3">
                <ClockMetricCard
                  label="זמן המתנה חציוני לתקן"
                  value={medianWaitingMetric ? formatImportedMetricValue(medianWaitingMetric) : null}
                  sourceLabel={importedSourceLabel(medianWaitingMetric, "משרד הבריאות")}
                  tooltip="זמן המתנה חציוני לתקן לפי נתון מחלקתי מיובא."
                  lastUpdated={medianWaitingMetric?.lastUpdated}
                />
                <AcceptanceDistributionCard
                  rows={acceptanceDistributionRows}
                  sourceLabel="דיווחי מתמחים משרד הבריאות"
                  tooltip={
                    acceptanceDistributionType === "נתון כללי לתחום"
                      ? "התפלגות כללית לתחום ההתמחות ולא למחלקה ספציפית."
                      : "התפלגות מחלקתית לפי נתונים מיובאים, אם סופקה."
                  }
                  metricType={acceptanceDistributionType}
                  lastUpdated={acceptanceDistributionLastUpdated}
                />
                {electiveDemandMetric ? (
                  <DataMetricCard
                    label="מספר אלקטיביסטים חציוני"
                    value={formatImportedMetricValue(electiveDemandMetric)}
                    sourceLabel={importedSourceLabel(electiveDemandMetric, "מצביע על ביקוש המחלקה")}
                    tooltip="מדד ביקוש למחלקה לפי מספר אלקטיביסטים חציוני."
                    lastUpdated={electiveDemandMetric.lastUpdated}
                  />
                ) : null}
              </div>

              <div className="grid gap-2 lg:grid-cols-3">
                <GenderBalanceCard
                  womenPercent={womenPercent}
                  menPercent={menPercent}
                  sourceLabel={importedSourceLabel(womenPercentMetric ?? menPercentMetric, "משרד הבריאות")}
                  tooltip="התפלגות מגדרית מחלקתית, אם סופקה."
                  lastUpdated={genderLastUpdated}
                />
                <DataMetricCard {...trainingMetrics[0]} />
                <DataMetricCard {...trainingMetrics[1]} />
              </div>

              <YearlyResidentsChart
                rows={departmentNewResidentsRows}
                sourceLabel={newResidentsSourceLabel}
                lastUpdated={firstDepartmentYearlyMetric?.lastUpdated}
              />

            </div>
          </Card>

          <Card className="rounded-xl !p-4">
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
            <div className="mt-6 grid gap-4">
              {visibleReviews.length === 0 ? (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  אין עדיין נתונים
                </p>
              ) : (
                visibleReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} canReport={Boolean(session)} />
                ))
              )}
              {!session && department.reviews.length > visibleReviews.length ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 text-center">
                  <p className="text-sm text-slate-600">
                    יש עוד שיתופים מהשטח למחלקה הזו. התחברות מאפשרת גם שמירה להשוואה.
                  </p>
                  <Link
                    href={`/login?next=${encodeURIComponent(departmentHref)}`}
                    className="mt-4 inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white"
                  >
                    התחברות
                  </Link>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="rounded-xl !p-4">
            <SectionHeading title="הנהלה ויצירת קשר" />
            <div className="mt-5 space-y-3">
              {department.representativeAssignments.length === 0 && profileHeads.length === 0 && !hasContactPerson ? (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {profileMissingText}
                </p>
              ) : null}
              {hasContactPerson ? (
                <div className="rounded-lg border border-slate-100 bg-white px-3 py-3">
                  <p className="text-xs font-black text-slate-500">איש קשר</p>
                  {department.contactName ? (
                    <p className="mt-2 text-sm font-bold text-ink">{department.contactName}</p>
                  ) : null}
                  {contactEmails.length > 0 ? (
                    <p className="mt-2 text-xs leading-6 text-slate-600">
                      אימייל: {contactEmails.join(", ")}
                    </p>
                  ) : null}
                  {department.publicContactPhone ? (
                    <p className="text-xs leading-6 text-slate-600">
                      טלפון: {department.publicContactPhone}
                    </p>
                  ) : null}
                </div>
              ) : null}
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

          <Card className="rounded-xl !p-4">
            <SectionHeading title="מחקר ופרסומים" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <QuickHighlightCard
                label="מספר פרסומים"
                value={publicationsValue}
                sourceLabel={publicationsSourceLabel}
                tooltip={openAlexDebugTooltip}
                metricType={latestOpenAlexResearchMetric ? "הערכה מחלקתית" : "נתון מחלקתי"}
                lastUpdated={publicationsLastUpdated}
                missingText={MISSING_IMPORTED_VALUE}
              />
              <QuickHighlightCard
                label="h-index"
                value={hIndexEstimate}
                sourceLabel="OpenAlex"
                tooltip={
                  hIndexEstimate !== null
                    ? "אומדן h-index מחלקתי לפי נתונים זמינים ב-OpenAlex."
                    : "לא קיים h-index ברשומת OpenAlex הנוכחית. מוצג רק כאשר הערך נשמר בנתוני המחקר."
                }
                metricType="הערכה מחלקתית"
                lastUpdated={publicationsLastUpdated}
                missingText={MISSING_IMPORTED_VALUE}
              />
            </div>
            <div className="mt-5">
              <p className="text-sm font-bold text-ink">הזדמנויות מחקר</p>
              <div className="mt-3 space-y-2">
                {department.researchOpportunities.length === 0 ? (
                  <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
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

          <div className="rounded-2xl border border-brand-100 bg-white/95 p-3 shadow-sm">
            <p className="text-sm font-black text-ink">נתונים מקצועיים</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <QuickHighlightCard
                label="מעבר שלב א׳"
                value={boardStageA?.value ?? null}
                sourceLabel={boardStageA?.sourceLabel ?? "משרד הבריאות"}
                tooltip={
                  boardStageA?.metricType === "נתון כללי לתחום"
                    ? "נתון כללי לתחום ההתמחות ולא למחלקה ספציפית"
                    : "שיעור מעבר שלב א׳ למחלקה כאשר קיים נתון מחלקתי."
                }
                metricType={boardStageA?.metricType}
                lastUpdated={boardStageA?.lastUpdated}
              />
              <QuickHighlightCard
                label="מעבר שלב ב׳"
                value={boardStageB?.value ?? null}
                sourceLabel={boardStageB?.sourceLabel ?? "משרד הבריאות"}
                tooltip={
                  boardStageB?.metricType === "נתון כללי לתחום"
                    ? "נתון כללי לתחום ההתמחות ולא למחלקה ספציפית"
                    : "שיעור מעבר שלב ב׳ למחלקה כאשר קיים נתון מחלקתי."
                }
                metricType={boardStageB?.metricType}
                lastUpdated={boardStageB?.lastUpdated}
              />
              <QuickHighlightCard
                label="DUNS100"
                value={duns100Metric ? formatImportedMetricValue(duns100Metric) : null}
                sourceLabel="DUNS100"
                tooltip="רופאים שנספרו מנתוני DUNS100 מיובאים."
                lastUpdated={duns100Metric?.lastUpdated}
              />
              <QuickHighlightCard
                label="שכר מרכז"
                value="16,954.00 ₪"
                sourceLabel="קבוע שכר מערכת"
                tooltip="שכר בסיס להשוואה באזור מרכז."
                metricType="נתון כללי לתחום"
              />
              <QuickHighlightCard
                label="שכר פריפריה"
                value="19,965.92 ₪"
                sourceLabel="קבוע שכר מערכת"
                tooltip="שכר בסיס להשוואה באזור פריפריה."
                metricType="נתון כללי לתחום"
              />
              <QuickHighlightCard
                label="מדד שחיקה"
                value={burnoutMetric ? formatImportedMetricValue(burnoutMetric) : null}
                sourceLabel={importedSourceLabel(burnoutMetric, "דיווחי מתמחים משרד הבריאות")}
                tooltip={
                  burnoutMetricType === "נתון כללי לתחום"
                    ? "נתון כללי לתחום ההתמחות ולא למחלקה ספציפית."
                    : "מדד שחיקה מחלקתי, אם סופק."
                }
                metricType={burnoutMetricType}
                lastUpdated={burnoutMetric?.lastUpdated}
              />
            </div>
            <div className="mt-2">
              <SalaryGapHighlight />
            </div>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
