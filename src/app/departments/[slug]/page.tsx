import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
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
  metadataDisplayAction,
  metadataSourceLabel,
  metadataTooltip,
  type MetricDisplayMetadata
} from "@/lib/metric-display";
import { departmentNewResidentsRowsFromYearlyMetrics } from "@/lib/department-yearly-residents";
import {
  metricFieldLabel,
  resolveImportedMetric,
  resolveImportedMetricNumber,
  resolveImportedSalaryMetrics,
  resolveImportedYearlyMetric,
  resolveMetricDisplayMetadata
} from "@/lib/imported-metric-resolver";
import {
  getDepartmentPageData,
  getDataExplanations,
  getReviewFormContext,
  requiredMedicalArraySpecialtyDisplayName,
  resolveInstitutionRegion,
  reviewerTypeLabel
} from "@/lib/queries";
import { formatDepartmentDisplayName, getDepartmentHref } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type ProfileManagerRow = {
  id: string;
  name: string | null;
  title: string | null;
  role: string | null;
  departmentName: string;
  email: string | null;
  phone: string | null;
  singleEmailFallback: boolean;
};

const MISSING_IMPORTED_VALUE = "הנתון עדיין לא סופק";
const NEW_RESIDENTS_TOOLTIP =
  "גרף המציג את מספר המתמחים החדשים שהחלו את התמחותם בתחום בכלל הארץ בשנים האחרונות.";
const BURNOUT_TOOLTIP_SENTENCE = "ככל שהערך גבוה יותר, רמת השחיקה בתחום גבוהה יותר.";
const ACCEPTANCE_DISTRIBUTION_TITLE = "התפלגות קצב מציאת ההתמחות על פי דיווחי המתקבלים";
const ACCEPTANCE_DISTRIBUTION_TOOLTIP =
  "מספר הרופאים שדיווחו כי החלו התמחות בתחום, לפי משך הזמן שעבר עד תחילת ההתמחות. הדיווח עבור נתון זה אינו חובה ולכן הנתונים עשויים להיות חלקיים ואינם מייצגים בהכרח את כלל המתקבלים לתחום.";

function EmptyValue({ text = MISSING_IMPORTED_VALUE }: { text?: string }) {
  return <span className="text-slate-400">{text}</span>;
}

function MetricInfoTip({
  sourceLabel,
  text,
  lastUpdated,
  metricType,
  sourceUrl,
  displayAction
}: {
  sourceLabel: string;
  text?: string;
  lastUpdated?: string | Date | null;
  metricType?: string;
  sourceUrl?: string | null;
  displayAction?: string | null;
}) {
  const tooltipLines = [
    text,
    `מקור נתונים: ${sourceLabel}`
  ].filter((line): line is string => Boolean(line));
  const tooltipText = tooltipLines.join("\n");

  return (
    <span className="relative inline-flex">
      <span
        tabIndex={0}
        title={tooltipText}
        aria-label={tooltipText}
        className="group grid h-7 w-7 cursor-help place-items-center rounded-full border border-slate-200 bg-white text-[0.72rem] font-black text-slate-500 transition hover:border-brand-200 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-200"
      >
        i
        <span className="pointer-events-auto absolute left-0 top-9 z-20 hidden w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs font-semibold leading-5 text-slate-700 shadow-xl group-hover:block group-focus:block">
          <span className="space-y-1">
            {tooltipLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </span>
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
  className = "",
  sourceUrl,
  displayAction
}: {
  label: string;
  value: string | number | null | undefined;
  sourceLabel: string;
  tooltip?: string;
  lastUpdated?: string | Date | null;
  metricType?: string;
  caption?: string;
  className?: string;
  sourceUrl?: string | null;
  displayAction?: string | null;
}) {
  const hasValue = value !== null && value !== undefined && String(value).trim().length > 0;
  const isGeneralSpecialtyMetric = metricType === "נתון כללי לתחום" || metricType === "נתון ארצי לתחום";

  return (
    <div className={`flex min-h-[5.75rem] flex-col rounded-xl border border-slate-100 bg-white px-2.5 py-2.5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold leading-5 text-slate-600">{label}</p>
          {isGeneralSpecialtyMetric ? (
            <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-black text-blue-800">
              {metricType === "נתון ארצי לתחום" ? "ארצי לתחום" : "נתון כללי לתחום"}
            </span>
          ) : null}
        </div>
        <MetricInfoTip
          sourceLabel={sourceLabel}
          text={tooltip}
          lastUpdated={lastUpdated}
          metricType={metricType}
          sourceUrl={sourceUrl}
          displayAction={displayAction}
        />
      </div>
      <p className={`mt-1.5 text-base font-black leading-tight ${hasValue ? "text-ink" : "text-slate-400"}`}>
        {hasValue ? value : MISSING_IMPORTED_VALUE}
      </p>
      {caption ? <p className="mt-1 text-xs font-semibold text-slate-500">{caption}</p> : null}
    </div>
  );
}

function DurationBenchmarkCard({
  departmentYears,
  nationalYears,
  sourceLabel,
  tooltip,
  lastUpdated,
  sourceUrl,
  displayAction
}: {
  departmentYears: number | null;
  nationalYears: number | null;
  sourceLabel: string;
  tooltip: string;
  lastUpdated?: string | Date | null;
  sourceUrl?: string | null;
  displayAction?: string | null;
}) {
  const values = [departmentYears, nationalYears].filter((value): value is number => typeof value === "number");
  const maxValue = Math.max(...values, 1);
  const difference =
    typeof departmentYears === "number" && typeof nationalYears === "number"
      ? departmentYears - nationalYears
      : null;
  const comparisonLabel =
    difference === null
      ? null
      : Math.abs(difference) <= 0.25
        ? "דומה לממוצע הארצי"
        : difference < 0
          ? "קצר מהממוצע הארצי"
          : "ארוך מהממוצע הארצי";
  const rows = [
    { label: "מחלקה", value: departmentYears, barClassName: "bg-brand-700" },
    { label: "ממוצע ארצי בתחום", value: nationalYears, barClassName: "bg-teal-600" }
  ];

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold leading-5 text-slate-600">משך התמחות ממוצע בפועל (שנים)</p>
          {comparisonLabel ? (
            <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[0.68rem] font-black text-slate-700">
              {comparisonLabel}
            </span>
          ) : null}
        </div>
        <MetricInfoTip
          sourceLabel={sourceLabel}
          text={tooltip}
          metricType="נתון מחלקתי מול ממוצע ארצי בתחום"
          lastUpdated={lastUpdated}
          sourceUrl={sourceUrl}
          displayAction={displayAction}
        />
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[6.5rem_1fr_4rem] items-center gap-2">
            <span className="text-[0.68rem] font-black text-slate-500">{row.label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${row.barClassName}`}
                style={{ width: `${row.value ? Math.max(8, (row.value / maxValue) * 100) : 0}%` }}
              />
            </div>
            <span className={`text-left text-xs font-black ${row.value ? "text-ink" : "text-slate-400"}`}>
              {row.value ? `${formatYearsNumber(row.value)} שנים` : "אין"}
            </span>
          </div>
        ))}
      </div>
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
  sourceUrl?: string | null;
  displayAction?: string | null;
  className?: string;
};

function YearlyResidentsChart({
  rows,
  sourceLabel,
  lastUpdated,
  sourceUrl,
  displayAction,
  title = "מתמחים חדשים לפי שנה",
  tooltip = NEW_RESIDENTS_TOOLTIP,
  metricType = "נתון מחלקתי"
}: {
  rows: Array<{ year: number; value: number; rawValue?: string | null }>;
  sourceLabel: string;
  lastUpdated?: string | Date | null;
  sourceUrl?: string | null;
  displayAction?: string | null;
  title?: string;
  tooltip?: string;
  metricType?: string;
}) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-slate-600">{title}</p>
        <MetricInfoTip
          sourceLabel={sourceLabel}
          text={tooltip}
          metricType={metricType}
          lastUpdated={lastUpdated}
          sourceUrl={sourceUrl}
          displayAction={displayAction}
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
  lastUpdated,
  sourceUrl,
  displayAction
}: {
  womenPercent: number | null;
  menPercent: number | null;
  sourceLabel: string;
  tooltip: string;
  lastUpdated?: string | Date | null;
  sourceUrl?: string | null;
  displayAction?: string | null;
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
          sourceUrl={sourceUrl}
          displayAction={displayAction}
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
  lastUpdated,
  sourceUrl,
  displayAction
}: {
  label: string;
  value: string | number | null | undefined;
  sourceLabel: string;
  tooltip: string;
  lastUpdated?: string | Date | null;
  sourceUrl?: string | null;
  displayAction?: string | null;
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
          sourceUrl={sourceUrl}
          displayAction={displayAction}
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
  lastUpdated,
  sourceUrl,
  displayAction
}: {
  rows: Array<{ label: string; value: number; displayValue: string }>;
  sourceLabel: string;
  tooltip: string;
  metricType: string;
  lastUpdated?: string | Date | null;
  sourceUrl?: string | null;
  displayAction?: string | null;
}) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold leading-5 text-slate-600">{ACCEPTANCE_DISTRIBUTION_TITLE}</p>
          {metricType === "נתון כללי לתחום" || metricType === "נתון ארצי לתחום" ? (
            <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-black text-blue-800">
              {metricType.replace(/^נתון\s+/, "")}
            </span>
          ) : null}
        </div>
        <MetricInfoTip
          sourceLabel={sourceLabel}
          text={tooltip}
          metricType={metricType}
          lastUpdated={lastUpdated}
          sourceUrl={sourceUrl}
          displayAction={displayAction}
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
  missingText = "לא זמין",
  sourceUrl,
  displayAction
}: {
  label: string;
  value: string | number | null | undefined;
  sourceLabel: string;
  tooltip: string;
  metricType?: string;
  lastUpdated?: string | Date | null;
  missingText?: string;
  sourceUrl?: string | null;
  displayAction?: string | null;
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
          sourceUrl={sourceUrl}
          displayAction={displayAction}
        />
      </div>
      <p className={`mt-1 text-sm font-black leading-tight ${hasValue ? "text-ink" : "text-slate-400"}`}>
        {hasValue ? value : missingText}
      </p>
    </div>
  );
}

function SalaryGapHighlight({
  metadata,
  centerMetric,
  peripheryMetric,
  gapMetric
}: {
  metadata?: MetricDisplayMetadata | null;
  centerMetric?: ImportedMetric | null;
  peripheryMetric?: ImportedMetric | null;
  gapMetric?: ImportedMetric | null;
}) {
  const centerSalary = typeof centerMetric?.value === "number" ? centerMetric.value : null;
  const peripherySalary = typeof peripheryMetric?.value === "number" ? peripheryMetric.value : null;
  const calculatedGap =
    typeof centerSalary === "number" && typeof peripherySalary === "number"
      ? peripherySalary - centerSalary
      : null;
  const gap = typeof gapMetric?.value === "number" ? gapMetric.value : calculatedGap;
  const maxSalary = Math.max(centerSalary ?? 0, peripherySalary ?? 0, 1);
  const tooltip = metadataTooltip(metadata, "פער שכר לטובת פריפריה לפי סימולטור שכר הר״י.");
  const hasSalaryComparison =
    typeof centerSalary === "number" && typeof peripherySalary === "number" && typeof gap === "number";

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-l from-amber-50 to-white px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.68rem] font-black text-amber-900">
          {metricLabelFromMetadata(metadata, "פער שכר")}
        </p>
        <MetricInfoTip
          sourceLabel={metadataSourceLabel(metadata, "סימולטור שכר של הר״י")}
          text={tooltip}
          metricType="נתון כללי לתחום"
          sourceUrl={metadata?.sourceUrl}
          displayAction={metadataDisplayAction(metadata)}
        />
      </div>
      <p className="mt-1 text-sm font-black text-ink">
        {typeof gap === "number" ? `${formatWholeImportedNumber(gap)} ₪` : MISSING_IMPORTED_VALUE}
      </p>
      {hasSalaryComparison ? (
        <div className="mt-2 space-y-1">
          <div
            className="grid grid-cols-[3.8rem_1fr] items-center gap-2"
            title={`שכר במרכז: ${formatImportedNumber(centerSalary)} ₪`}
          >
            <span className="text-[0.65rem] font-bold text-slate-500">מרכז</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${((centerSalary ?? 0) / maxSalary) * 100}%` }}
              />
            </div>
          </div>
          <div
            className="grid grid-cols-[3.8rem_1fr] items-center gap-2"
            title={`שכר בפריפריה: ${formatImportedNumber(peripherySalary)} ₪`}
          >
            <span className="text-[0.65rem] font-bold text-slate-500">פריפריה</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-amber-500" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const acceptanceMetricInputs = [
  {
    id: "accepted-immediately",
    label: "מצאו התמחות מיד",
    keys: ["מספר המתקבלים שדיווחו שמצאו מיד התמחות", "acceptedImmediatelyReports"],
    tooltip: ACCEPTANCE_DISTRIBUTION_TOOLTIP
  },
  {
    id: "accepted-within-six-months",
    label: "מצאו עד חצי שנה",
    keys: ["מספר המתקבלים שדיווחו שמצאו עד חצי שנה", "acceptedWithinSixMonthsReports"],
    tooltip: ACCEPTANCE_DISTRIBUTION_TOOLTIP
  },
  {
    id: "accepted-within-one-year",
    label: "מצאו עד שנה",
    keys: ["מספר המתקבלים שדיווחו שמצאו עד שנה", "acceptedWithinOneYearReports"],
    tooltip: ACCEPTANCE_DISTRIBUTION_TOOLTIP
  },
  {
    id: "accepted-within-two-years",
    label: "מצאו עד שנתיים",
    keys: ["מספר המתקבלים שדיווחו שמצאו עד שנתיים", "acceptedWithinTwoYearsReports"],
    tooltip: ACCEPTANCE_DISTRIBUTION_TOOLTIP
  },
  {
    id: "accepted-after-two-years",
    label: "מצאו אחרי שנתיים",
    keys: ["מספר המתקבלים שדיווחו שמצאו אחרי שנתיים", "acceptedAfterTwoYearsReports"],
    tooltip: ACCEPTANCE_DISTRIBUTION_TOOLTIP
  }
];

function formatImportedNumber(value: number) {
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 }).format(value);
}

function formatWholeImportedNumber(value: number) {
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(value);
}

function isInvalidImportedRawValue(value: string | null | undefined) {
  const rawValue = value?.trim();
  return Boolean(rawValue && /^#(?:DIV\/0!|N\/A|VALUE!|REF!|NUM!)/i.test(rawValue));
}

function formatImportedMetricValue(metric: ImportedMetric | ImportedYearlyMetric) {
  if (isInvalidImportedRawValue(metric.rawValue)) {
    return null;
  }

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

function formatRoundedPercentMetricValue(metric: ImportedMetric | ImportedYearlyMetric | null | undefined) {
  if (!metric || isInvalidImportedRawValue(metric.rawValue)) return null;
  const normalizedRaw = metric.rawValue
    ? metric.rawValue.replace(/[₪$%]/g, "").trim()
    : null;
  const rawNumber =
    normalizedRaw
      ? Number(normalizedRaw.includes(".") ? normalizedRaw.replace(/,/g, "") : normalizedRaw.replace(",", "."))
      : null;
  const value = typeof metric.value === "number" && Number.isFinite(metric.value) ? metric.value : rawNumber;

  return typeof value === "number" && Number.isFinite(value) ? `${formatWholeImportedNumber(value)}%` : null;
}

function durationYearsFromText(value: string | number | null | undefined, unit?: string | null) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text) return null;

  const numberMatches = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  const values = numberMatches
    .map((item) => Number(item.replace(",", ".")))
    .filter((item) => Number.isFinite(item));
  if (values.length === 0) return null;

  const shouldConvertFromMonths =
    unit === "months" || /חודש/.test(text) || values.some((item) => item > 12 && item <= 180);
  const years = values.map((item) => (shouldConvertFromMonths ? item / 12 : item));

  return years.reduce((sum, item) => sum + item, 0) / years.length;
}

function durationYearsFromMetric(metric: ImportedMetric | ImportedYearlyMetric | null | undefined) {
  if (!metric || isInvalidImportedRawValue(metric.rawValue)) return null;

  return durationYearsFromText(
    metric.rawValue ?? (typeof metric.value === "number" ? metric.value : null),
    metric.unit
  );
}

function formatYearsNumber(value: number) {
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 }).format(value);
}

function formatDurationMetricInYears(metric: ImportedMetric | ImportedYearlyMetric | null | undefined) {
  if (!metric || isInvalidImportedRawValue(metric.rawValue)) {
    return null;
  }

  const rawText = metric.rawValue?.trim();
  const numericText = rawText ?? (typeof metric.value === "number" ? String(metric.value) : "");
  const numberMatches = numericText.match(/\d+(?:[.,]\d+)?/g) ?? [];
  const values = numberMatches
    .map((item) => Number(item.replace(",", ".")))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return formatImportedMetricValue(metric);
  }

  const shouldConvertFromMonths =
    metric.unit === "months" ||
    /חודש/.test(rawText ?? "") ||
    values.some((value) => value > 12 && value <= 180);

  const formattedValues = values.map((value) => {
    const years = shouldConvertFromMonths ? value / 12 : value;
    return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 }).format(years);
  });

  return `${formattedValues.join(" - ")} שנים`;
}

function formatDurationTextInYears(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text) return null;

  const numberMatches = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  const values = numberMatches
    .map((item) => Number(item.replace(",", ".")))
    .filter((item) => Number.isFinite(item));

  if (values.length === 0) return text;

  const shouldConvertFromMonths = /חודש/.test(text) || values.some((item) => item > 12 && item <= 180);
  const formattedValues = values.map((item) => {
    const years = shouldConvertFromMonths ? item / 12 : item;
    return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 }).format(years);
  });

  return `${formattedValues.join(" - ")} שנים`;
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

function appendTooltipSentence(text: string, sentence: string) {
  return text.includes(sentence) ? text : `${text} ${sentence}`;
}

function departmentMetricMetadata(
  metadata: MetricDisplayMetadata[],
  ...metricKeysOrCriteria: string[]
) {
  const [fieldOrKey, ...aliases] = metricKeysOrCriteria;
  if (!fieldOrKey) return null;

  return resolveMetricDisplayMetadata(metadata, "Master_Dept", fieldOrKey, aliases);
}

function specialtyMetricMetadata(
  metadata: MetricDisplayMetadata[],
  ...metricKeysOrCriteria: string[]
) {
  const [fieldOrKey, ...aliases] = metricKeysOrCriteria;
  if (!fieldOrKey) return null;

  return resolveMetricDisplayMetadata(metadata, "MASTER_Spec", fieldOrKey, aliases);
}

function metricLabelFromMetadata(
  metadata: MetricDisplayMetadata | null | undefined,
  fallback: string
) {
  return metadata?.readableLabel || fallback;
}

function metricTypeFromMetadata(
  metadata: MetricDisplayMetadata | null | undefined,
  fallback = "נתון מחלקתי"
) {
  return metadata?.isNationalMetric ? "נתון ארצי לתחום" : fallback;
}

function highlightedCardClass(metadata: MetricDisplayMetadata | null | undefined) {
  return metadata?.isHighlighted ? "border-amber-200 bg-amber-50/70" : "";
}

const readableMetricLabels: Record<string, string> = {
  officialResidencyDuration: "משך התמחות רשמי",
  actualAverageDuration: "משך ממוצע בפועל",
  medianWaitingTime: "זמן המתנה חציוני למשרה",
  residentsCount: "מספר מתמחים",
  activeResidentsCount: "מספר מתמחים",
  boardStageAPassRate: "מעבר שלב א׳",
  inherited_boardStageAPassRate: "מעבר שלב א׳",
  burnoutIndex: "מדד שחיקה",
  departmentalPublicationsCount: "מספר פרסומים מחלקתי",
  boardStageBPassRate: "מעבר שלב ב׳",
  inherited_boardStageBPassRate: "מעבר שלב ב׳",
  expectedOpenings2026: "צפי משרות חדשות ב-2026",
  medianElectiveDemand: "מספר אלקטיביסטים חציוני",
  seniorPhysiciansCount: "מספר בכירים",
  duns100PhysiciansCount: "רופאים ב-DUNS100",
  newResidents: "מתמחים חדשים"
};

function readableMetricLabel(value: string) {
  return readableMetricLabels[value] ?? metricFieldLabel(value);
}

function findImportedMetric(metrics: ImportedMetric[], ...metricKeys: string[]) {
  const [fieldOrKey, ...aliases] = metricKeys;
  if (!fieldOrKey) return null;

  return resolveImportedMetric(metrics, fieldOrKey, {
    aliases,
    entityLabel: "department page"
  });
}

function importedMetricNumber(metrics: ImportedMetric[], ...metricKeys: string[]) {
  const [fieldOrKey, ...aliases] = metricKeys;
  if (!fieldOrKey) return null;

  return resolveImportedMetricNumber(metrics, fieldOrKey, {
    aliases,
    entityLabel: "department page"
  });
}

function latestYearlyMetric(
  metrics: ImportedYearlyMetric[],
  metricKey: string,
  options: { beforeYear?: number; year?: number } = {}
) {
  return resolveImportedYearlyMetric(metrics, metricKey, options);
}

function sumPresentMetric(values: Array<number | null | undefined>) {
  const presentValues = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );

  return presentValues.length > 0
    ? presentValues.reduce((sum, value) => sum + value, 0)
    : null;
}

function duplicateAwareArrayMetricCalculation(
  values: Array<number | null | undefined>,
  denominator: number
) {
  const normalizedValues = values.map((value) =>
    typeof value === "number" && Number.isFinite(value) ? value : null
  );
  const presentValues = normalizedValues.filter((value): value is number => value !== null);
  const rawTotal = sumPresentMetric(normalizedValues);
  const currentCalculation =
    rawTotal === null || denominator === 0 ? null : rawTotal / denominator;
  const duplicatedAcrossAllRows =
    denominator > 1 &&
    presentValues.length === denominator &&
    presentValues.every((value) => Math.abs(value - presentValues[0]) < 0.000001);
  const correctedCalculation =
    currentCalculation === null
      ? null
      : duplicatedAcrossAllRows
        ? presentValues[0] / denominator
        : currentCalculation;

  return {
    underlyingValues: normalizedValues,
    rawTotal,
    denominator,
    duplicatedAcrossAllRows,
    currentCalculation,
    correctedCalculation
  };
}

function formatMetricNumber(value: number | null) {
  if (value === null) {
    return null;
  }

  return Number.isInteger(value)
    ? value.toLocaleString("he-IL")
    : value.toLocaleString("he-IL", { maximumFractionDigits: 1 });
}

function splitContactEmails(value?: string | null) {
  return (value ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeJsonForHtml(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
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
        "כדי לצפות בנתוני המחלקה, ביקורות, משרות ופרטי קשר יש להתחבר או לפתוח חשבון עם אימות סטטוס מקצועי.",
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
  noStore();
  const [{ slug }, resolvedSearchParams, session] = await Promise.all([
    params,
    searchParams,
    getSession()
  ]);
  const requestedDepartmentId = resolvedSearchParams.departmentId;
  const departmentId =
    typeof requestedDepartmentId === "string"
      ? requestedDepartmentId
      : Array.isArray(requestedDepartmentId)
        ? requestedDepartmentId[0] ?? null
      : null;
  const [department, dataExplanations] = await Promise.all([
    getDepartmentPageData(slug, session?.userId, departmentId),
    getDataExplanations()
  ]);

  if (!department) {
    notFound();
  }

  if (process.env.NODE_ENV !== "production" && departmentId && department.id !== departmentId) {
    console.warn(
      `[department-page] requested departmentId ${departmentId} rendered ${department.id} for slug ${slug}`
    );
  }

  const reviewContext = await getReviewFormContext(department.slug);
  const visibleReviews = session ? department.reviews : department.reviews.slice(0, 3);
  const departmentHref = getDepartmentHref(department);
  const region = resolveInstitutionRegion(department.institution);
  const isMedicalArrayProfile = Boolean(department.specialty.groupAsArray && department.medicalArray);
  const profileTerm = isMedicalArrayProfile ? "מערך" : "מחלקה";
  const profileMissingText = MISSING_IMPORTED_VALUE;
  const arraySpecialtyName = requiredMedicalArraySpecialtyDisplayName(department.specialty.name);
  const profileTitle = isMedicalArrayProfile
    ? `מערך ${arraySpecialtyName}`
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
  const arrayDepartmentCount = arrayDepartments.length;
  const importedDepartmentMetrics = department.metrics;
  const importedDepartmentYearlyMetrics = department.yearlyMetrics;
  const importedSpecialtyMetrics = department.specialty.metrics;
  const contactEmails = splitContactEmails(department.publicContactEmail);
  const websiteUrl = department.websiteUrl ?? department.institution.websiteUrl;
  const departmentNewResidentsRows = departmentNewResidentsRowsFromYearlyMetrics(
    importedDepartmentYearlyMetrics
  );
  const arrayAverageTooltip =
    "הנתון מחושב כממוצע למחלקה במערך: סך הערכים במערך חלקי מספר המחלקות במערך.";
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
  const arrayActiveResidentValues = arrayDepartments.map(
    (arrayDepartment) =>
      arrayDepartment.residentsCount ??
      importedMetricNumber(arrayDepartment.metrics, "מספר_מתמחים", "residentsCount", "activeResidentsCount")
  );
  const arraySpecialistValues = arrayDepartments.map((arrayDepartment) =>
    importedMetricNumber(arrayDepartment.metrics, "מספר_בכירים", "seniorPhysiciansCount")
  );
  const arrayExpectedOpeningValues = arrayDepartments.map((arrayDepartment) => {
    const metricValue = importedMetricNumber(
      arrayDepartment.metrics,
      "צפי תקנים חדשים ב2026",
      "expectedOpenings2026"
    );
    const yearlyValue =
      latestYearlyMetric(arrayDepartment.yearlyMetrics, "מספר מתמחים חדשים 2026", { year: 2026 })?.value ??
      null;

    return metricValue ?? yearlyValue;
  });
  const arrayActiveResidentsCalculation = duplicateAwareArrayMetricCalculation(
    arrayActiveResidentValues,
    arrayDepartmentCount
  );
  const arraySpecialistsCalculation = duplicateAwareArrayMetricCalculation(
    arraySpecialistValues,
    arrayDepartmentCount
  );
  const arrayExpectedOpeningsCalculation = duplicateAwareArrayMetricCalculation(
    arrayExpectedOpeningValues,
    arrayDepartmentCount
  );
  const arrayActiveResidentsTotal = arrayActiveResidentsCalculation.rawTotal;
  const arraySpecialistsTotal = arraySpecialistsCalculation.rawTotal;
  const arrayExpectedOpeningsTotal = arrayExpectedOpeningsCalculation.rawTotal;
  const arrayActiveResidentsAverage =
    isMedicalArrayProfile ? arrayActiveResidentsCalculation.correctedCalculation : null;
  const arraySpecialistsAverage =
    isMedicalArrayProfile ? arraySpecialistsCalculation.correctedCalculation : null;
  const arrayExpectedOpeningsAverage =
    isMedicalArrayProfile ? arrayExpectedOpeningsCalculation.correctedCalculation : null;
  const arrayNewResidentsCalculations = isMedicalArrayProfile
    ? Array.from(
        new Set(
          arrayDepartments.flatMap((arrayDepartment) =>
            arrayDepartment.yearlyMetrics
              .filter((metric) => metric.metricKey === "newResidents")
              .map((metric) => metric.year)
          )
        )
      )
        .sort((left, right) => right - left)
        .map((year) => {
          const calculation = duplicateAwareArrayMetricCalculation(
            arrayDepartments.map(
              (arrayDepartment) =>
                latestYearlyMetric(arrayDepartment.yearlyMetrics, "newResidents", { year })?.value ?? null
            ),
            arrayDepartmentCount
          );

          return { year, calculation };
        })
    : [];
  const arrayNewResidentsRows = arrayNewResidentsCalculations
        .map(({ year, calculation }) => {
          const value =
            calculation.correctedCalculation === null
              ? null
              : Number(calculation.correctedCalculation.toFixed(1));

          return value === null
            ? null
            : {
                year,
                value,
                rawValue: formatMetricNumber(value)
              };
        })
        .filter((row): row is { year: number; value: number; rawValue: string | null } => Boolean(row));
  const activeResidentsMetric = metricRecord("activeResidentsCount");
  const importedActiveResidents = importedMetricNumber(
    importedDepartmentMetrics,
    "מספר_מתמחים",
    "residentsCount",
    "activeResidentsCount"
  );
  const activeResidents =
    isMedicalArrayProfile
      ? { value: formatMetricNumber(arrayActiveResidentsAverage), source: "hospital" as MetricSource }
      : importedActiveResidents !== null
        ? { value: importedActiveResidents, source: "hospital" as MetricSource }
      : department.residentsCount !== null && department.residentsCount !== undefined
        ? { value: department.residentsCount, source: "hospital" as MetricSource }
      : activeResidentsMetric
        ? { value: activeResidentsMetric.value, source: sourceFromName(activeResidentsMetric.sourceName) }
        : null;
  const specialistsMetric = metricRecord("seniorPhysiciansCount");
  const importedSpecialists = importedMetricNumber(importedDepartmentMetrics, "מספר_בכירים", "seniorPhysiciansCount");
  const specialists =
    isMedicalArrayProfile
      ? { value: formatMetricNumber(arraySpecialistsAverage), source: "hospital" as MetricSource }
      : importedSpecialists !== null
        ? { value: importedSpecialists, source: "hospital" as MetricSource }
      : specialistsMetric
        ? { value: specialistsMetric.value, source: sourceFromName(specialistsMetric.sourceName) }
        : null;
  const medianDurationMetric = metricRecord("medianResidencyDurationMonths");
  const importedMedianDuration = findImportedMetric(
    importedDepartmentMetrics,
    "משך_ממוצע_בפועל",
    "actualAverageDuration",
    "medianResidencyDurationMonths"
  );
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
    "מעבר_שלב_א",
    "boardStageAPassRate",
    "inherited_boardStageAPassRate"
  );
  const specialtyBoardStageA = findImportedMetric(importedSpecialtyMetrics, "מעבר_שלב_א", "boardStageAPassRate");
  const boardStageA =
    department.shlavAlephPassRate !== null && department.shlavAlephPassRate !== undefined
      ? {
          value: `${formatWholeImportedNumber(department.shlavAlephPassRate)}%`,
          sourceLabel: "משרד הבריאות",
          metricType: "נתון מחלקתי"
        }
      : importedBoardStageA
        ? {
            value: formatRoundedPercentMetricValue(importedBoardStageA),
            sourceLabel: importedSourceLabel(importedBoardStageA, "משרד הבריאות"),
            metricType: importedBoardStageA.metricKey.startsWith("inherited_") ? "נתון ארצי לתחום" : "נתון מחלקתי",
            lastUpdated: importedBoardStageA.lastUpdated
          }
      : boardStageAMetric
        ? {
            value: `${formatWholeImportedNumber(boardStageAMetric.value)}%`,
            sourceLabel: sourceLabelFromExternalMetricSource(boardStageAMetric.sourceName),
            metricType: "נתון מחלקתי"
          }
        : specialtyBoardStageA
          ? {
              value: formatRoundedPercentMetricValue(specialtyBoardStageA),
              sourceLabel: importedSourceLabel(specialtyBoardStageA, "משרד הבריאות"),
              metricType: "נתון ארצי לתחום",
              lastUpdated: specialtyBoardStageA.lastUpdated
            }
          : null;
  const boardStageBMetric = metricRecord("boardStageBPassRate");
  const importedBoardStageB = findImportedMetric(
    importedDepartmentMetrics,
    "מעבר_שלב_ב",
    "boardStageBPassRate",
    "inherited_boardStageBPassRate"
  );
  const specialtyBoardStageB = findImportedMetric(importedSpecialtyMetrics, "מעבר_שלב_ב", "boardStageBPassRate");
  const boardStageB =
    department.shlavBetPassRate !== null && department.shlavBetPassRate !== undefined
      ? {
          value: `${formatWholeImportedNumber(department.shlavBetPassRate)}%`,
          sourceLabel: "משרד הבריאות",
          metricType: "נתון מחלקתי"
        }
      : importedBoardStageB
        ? {
            value: formatRoundedPercentMetricValue(importedBoardStageB),
            sourceLabel: importedSourceLabel(importedBoardStageB, "משרד הבריאות"),
            metricType: importedBoardStageB.metricKey.startsWith("inherited_") ? "נתון ארצי לתחום" : "נתון מחלקתי",
            lastUpdated: importedBoardStageB.lastUpdated
          }
      : boardStageBMetric
        ? {
            value: `${formatWholeImportedNumber(boardStageBMetric.value)}%`,
            sourceLabel: sourceLabelFromExternalMetricSource(boardStageBMetric.sourceName),
            metricType: "נתון מחלקתי"
          }
        : specialtyBoardStageB
          ? {
              value: formatRoundedPercentMetricValue(specialtyBoardStageB),
              sourceLabel: importedSourceLabel(specialtyBoardStageB, "משרד הבריאות"),
              metricType: "נתון ארצי לתחום",
              lastUpdated: specialtyBoardStageB.lastUpdated
            }
          : null;
  const openingsCount = department.residencyOpenings.reduce(
    (sum, opening) => sum + (opening.openingsCount ?? 0),
    0
  );
  const openAlexResearchMetrics = department.researchMetrics.filter((metric) => metric.source === "OpenAlex");
  const profileHeads: ProfileManagerRow[] = isMedicalArrayProfile
    ? arrayDepartments.map((arrayDepartment): ProfileManagerRow => {
        const departmentEmails = splitContactEmails(arrayDepartment.publicContactEmail);
        const departmentEmail = departmentEmails.length > 0 ? departmentEmails.join(", ") : null;
        const departmentName = formatDepartmentDisplayName(
          arrayDepartment.name,
          arrayDepartment.specialty.name
        );
        const primaryHead = arrayDepartment.heads[0] ?? null;

        return {
          id: primaryHead?.id ?? `missing-${arrayDepartment.id}`,
          name: primaryHead?.name ?? null,
          title: primaryHead?.title ?? "מנהל/ת מחלקה",
          role: primaryHead?.role ?? null,
          departmentName,
          email: departmentEmail,
          phone: arrayDepartment.publicContactPhone,
          singleEmailFallback: departmentEmails.length === 1
        };
      })
    : department.heads.map((head): ProfileManagerRow => ({
      ...head,
      departmentName: department.name,
      email: contactEmails.length === 1 ? contactEmails[0] : null,
      phone: department.publicContactPhone,
      singleEmailFallback: contactEmails.length === 1
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
  const publicationMetric = findImportedMetric(
    importedDepartmentMetrics,
    "מספר פרסומים מחלקתי",
    "departmentalPublicationsCount"
  );
  const expectedOpeningsDepartmentMetric = findImportedMetric(
    importedDepartmentMetrics,
    "צפי תקנים חדשים ב2026",
    "expectedOpenings2026"
  );
  const expectedOpeningsYearlyMetric = latestYearlyMetric(importedDepartmentYearlyMetrics, "מספר מתמחים חדשים 2026", {
    year: 2026
  });
  const officialDurationMetric = findImportedMetric(
    importedDepartmentMetrics,
    "משך_התמחות_רשמי",
    "משך_התמחות_רשמי (שנים)",
    "officialResidencyDuration"
  );
  const actualDurationMetric = findImportedMetric(
    importedDepartmentMetrics,
    "משך_ממוצע_בפועל",
    "actualAverageDuration",
    "medianResidencyDurationMonths"
  );
  const specialtyActualDurationMetric = findImportedMetric(
    importedSpecialtyMetrics,
    "משך_ממוצע_בפועל",
    "actualAverageDuration",
    "medianResidencyDurationMonths"
  );
  const departmentActualDurationYears =
    durationYearsFromMetric(actualDurationMetric) ?? durationYearsFromText(medianDuration?.value);
  const nationalActualDurationYears = durationYearsFromMetric(specialtyActualDurationMetric);
  const medianWaitingMetric = findImportedMetric(
    importedDepartmentMetrics,
    "זמן_המתנה_חציוני_לתקן",
    "medianWaitingTime"
  );
  const womenPercentMetric = findImportedMetric(importedDepartmentMetrics, "אחוז_נשים", "womenPercent");
  const menPercentMetric = findImportedMetric(importedDepartmentMetrics, "אחוז_גברים", "menPercent");
  const burnoutDepartmentMetric = findImportedMetric(importedDepartmentMetrics, "מדד_שחיקה", "burnoutIndex");
  const burnoutSpecialtyMetric = findImportedMetric(importedSpecialtyMetrics, "מדד_שחיקה", "burnoutIndex");
  const burnoutMetric = burnoutDepartmentMetric ?? burnoutSpecialtyMetric;
  const burnoutMetricType = burnoutDepartmentMetric ? "נתון מחלקתי" : "נתון ארצי לתחום";
  const womenPercent =
    (typeof womenPercentMetric?.value === "number" ? womenPercentMetric.value : null) ??
    genderPercentFromText(department.genderBalance, "women");
  const menPercent =
    (typeof menPercentMetric?.value === "number" ? menPercentMetric.value : null) ??
    genderPercentFromText(department.genderBalance, "men");
  const genderLastUpdated = womenPercentMetric?.lastUpdated ?? menPercentMetric?.lastUpdated ?? null;
  const hasContactPerson = !isMedicalArrayProfile && Boolean(
    department.contactName || contactEmails.length > 0 || department.publicContactPhone
  );
  const firstDepartmentYearlyMetric = latestYearlyMetric(importedDepartmentYearlyMetrics, "מספר מתמחים חדשים 2024", {
    beforeYear: 2026
  });
  const acceptanceDepartmentRows = acceptanceMetricInputs
    .map((input) => {
      const metric = findImportedMetric(importedDepartmentMetrics, ...input.keys);
      if (!metric || typeof metric.value !== "number") return null;
      const displayValue = formatImportedMetricValue(metric);
      if (displayValue === null) return null;

      return {
        label: input.label.replace("מצאו ", ""),
        value: metric.value,
        displayValue,
        lastUpdated: metric.lastUpdated
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const acceptanceSpecialtyRows = acceptanceMetricInputs
    .map((input) => {
      const metric = findImportedMetric(importedSpecialtyMetrics, ...input.keys);
      if (!metric || typeof metric.value !== "number") return null;
      const displayValue = formatImportedMetricValue(metric);
      if (displayValue === null) return null;

      return {
        label: input.label.replace("מצאו ", ""),
        value: metric.value,
        displayValue,
        lastUpdated: metric.lastUpdated
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const acceptanceDistributionRows =
    acceptanceDepartmentRows.length > 0 ? acceptanceDepartmentRows : acceptanceSpecialtyRows;
  const acceptanceDistributionType =
    acceptanceDepartmentRows.length > 0 ? "נתון מחלקתי" : "נתון ארצי לתחום";
  const acceptanceDistributionLastUpdated = acceptanceDistributionRows.find((row) => row.lastUpdated)?.lastUpdated;
  const residentsMeta = departmentMetricMetadata(dataExplanations, "מספר_מתמחים", "residentsCount");
  const seniorPhysiciansMeta = departmentMetricMetadata(dataExplanations, "מספר_בכירים", "seniorPhysiciansCount");
  const expectedOpeningsMeta = departmentMetricMetadata(dataExplanations, "צפי תקנים חדשים ב2026", "expectedOpenings2026");
  const officialDurationMeta = departmentMetricMetadata(
    dataExplanations,
    "משך_התמחות_רשמי",
    "משך_התמחות_רשמי (שנים)",
    "officialResidencyDuration"
  );
  const actualDurationMeta = departmentMetricMetadata(dataExplanations, "משך_ממוצע_בפועל", "actualAverageDuration");
  const medianWaitingMeta = departmentMetricMetadata(dataExplanations, "זמן_המתנה_חציוני_לתקן", "medianWaitingTime");
  const acceptanceDepartmentMeta = departmentMetricMetadata(
    dataExplanations,
    "מספר המתקבלים שדיווחו שמצאו מיד התמחות",
    "acceptedImmediatelyReports"
  );
  const acceptanceSpecialtyMeta = specialtyMetricMetadata(
    dataExplanations,
    "מספר המתקבלים שדיווחו שמצאו מיד התמחות",
    "acceptedImmediatelyReports"
  );
  const acceptanceDisplayMeta =
    acceptanceDepartmentRows.length > 0
      ? acceptanceDepartmentMeta
      : acceptanceSpecialtyMeta ?? acceptanceDepartmentMeta;
  const genderMeta = departmentMetricMetadata(dataExplanations, "אחוז_נשים", "womenPercent");
  const newResidentsMeta = departmentMetricMetadata(dataExplanations, "מספר מתמחים חדשים 2024", "newResidents");
  const electiveDemandMeta = departmentMetricMetadata(dataExplanations, "מספר אלקטיביסטים חציוני", "medianElectiveDemand");
  const boardStageAMeta = departmentMetricMetadata(dataExplanations, "מעבר_שלב_א", "boardStageAPassRate");
  const boardStageBMeta = departmentMetricMetadata(dataExplanations, "מעבר_שלב_ב", "boardStageBPassRate");
  const duns100Meta = departmentMetricMetadata(dataExplanations, "DUNS100", "duns100PhysiciansCount");
  const publicationMeta = departmentMetricMetadata(
    dataExplanations,
    "מספר פרסומים מחלקתי",
    "departmentalPublicationsCount"
  );
  const burnoutMeta = departmentMetricMetadata(dataExplanations, "מדד_שחיקה", "burnoutIndex");
  const centerSalaryMeta = departmentMetricMetadata(dataExplanations, "שכר_לא_פריפריה", "centerSalary");
  const peripherySalaryMeta = departmentMetricMetadata(dataExplanations, "שכר_פריפריה", "peripherySalary");
  const salaryGapMeta = departmentMetricMetadata(dataExplanations, "פער_שכר_פריפריה", "peripherySalaryGap");
  const departmentSalaryMetrics = resolveImportedSalaryMetrics(importedDepartmentMetrics, {
    entityLabel: `${department.institution.name} ${department.name}`,
    logMissing: true
  });
  const specialtySalaryMetrics = resolveImportedSalaryMetrics(importedSpecialtyMetrics, {
    entityLabel: department.specialty.name,
    logMissing: true
  });
  const departmentCenterSalaryMetric = departmentSalaryMetrics.centerSalary;
  const departmentPeripherySalaryMetric = departmentSalaryMetrics.peripherySalary;
  const departmentSalaryGapMetric = departmentSalaryMetrics.salaryGap;
  const centerSalaryMetric =
    departmentCenterSalaryMetric ?? specialtySalaryMetrics.centerSalary;
  const peripherySalaryMetric =
    departmentPeripherySalaryMetric ?? specialtySalaryMetrics.peripherySalary;
  const salaryGapMetric =
    departmentSalaryGapMetric ?? specialtySalaryMetrics.salaryGap;
  const salaryMetricType =
    departmentCenterSalaryMetric || departmentPeripherySalaryMetric || departmentSalaryGapMetric
      ? "נתון מחלקתי"
      : "נתון כללי לתחום";
  const stageAMetricType = metricTypeFromMetadata(boardStageAMeta, boardStageA?.metricType);
  const stageBMetricType = metricTypeFromMetadata(boardStageBMeta, boardStageB?.metricType);
  const workforceMetrics: DisplayMetric[] = [
    {
      id: "department-residents-count",
      label: isMedicalArrayProfile
        ? "מספר מתמחים ממוצע למחלקה במערך"
        : metricLabelFromMetadata(residentsMeta, "מספר מתמחים"),
      value: activeResidents?.value ?? null,
      sourceLabel: metadataSourceLabel(residentsMeta, "משרד הבריאות"),
      tooltip: metadataTooltip(
        residentsMeta,
        isMedicalArrayProfile
          ? arrayAverageTooltip
          : "מספר מתמחים פעילים כרגע במחלקה אשר דיווחו למשרד על התמחותם"
      ),
      metricType: isMedicalArrayProfile ? "ממוצע למחלקה במערך" : "נתון מחלקתי",
      caption: isMedicalArrayProfile ? `חושב על בסיס ${arrayDepartmentCount} מחלקות` : undefined,
      sourceUrl: residentsMeta?.sourceUrl,
      displayAction: metadataDisplayAction(residentsMeta),
      className: highlightedCardClass(residentsMeta)
    },
    {
      id: "department-senior-physicians",
      label: isMedicalArrayProfile
        ? "מספר בכירים ממוצע למחלקה במערך"
        : metricLabelFromMetadata(seniorPhysiciansMeta, "מספר בכירים"),
      value: specialists?.value ?? null,
      sourceLabel: metadataSourceLabel(seniorPhysiciansMeta, "משרד הבריאות"),
      tooltip: metadataTooltip(
        seniorPhysiciansMeta,
        isMedicalArrayProfile
          ? arrayAverageTooltip
          : "מספר הבכירים במחלקה כפי שדווח מהמחלקה"
      ),
      metricType: isMedicalArrayProfile ? "ממוצע למחלקה במערך" : "נתון מחלקתי",
      caption: isMedicalArrayProfile ? `חושב על בסיס ${arrayDepartmentCount} מחלקות` : undefined,
      sourceUrl: seniorPhysiciansMeta?.sourceUrl,
      displayAction: metadataDisplayAction(seniorPhysiciansMeta),
      className: highlightedCardClass(seniorPhysiciansMeta)
    }
  ];
  const trainingMetrics: DisplayMetric[] = [
    {
      id: "residency-official-duration",
      label: "משך התמחות רשמי (שנים)",
      value: formatDurationMetricInYears(officialDurationMetric),
      sourceLabel: metadataSourceLabel(officialDurationMeta, importedSourceLabel(officialDurationMetric, "הר״י")),
      tooltip: metadataTooltip(officialDurationMeta, "משך התמחות ע״פ הרשום באתר הר״י"),
      lastUpdated: officialDurationMetric?.lastUpdated,
      sourceUrl: officialDurationMeta?.sourceUrl,
      displayAction: metadataDisplayAction(officialDurationMeta)
    },
    {
      id: "residency-average-duration",
      label: "משך התמחות ממוצע בפועל (שנים)",
      value: actualDurationMetric
        ? formatDurationMetricInYears(actualDurationMetric)
        : formatDurationTextInYears(medianDuration?.value),
      sourceLabel: metadataSourceLabel(actualDurationMeta, importedSourceLabel(actualDurationMetric, "משרד הבריאות")),
      tooltip: metadataTooltip(actualDurationMeta, "משך התמחות מחלקתי, אם סופק ברמת המחלקה."),
      lastUpdated: actualDurationMetric?.lastUpdated,
      sourceUrl: actualDurationMeta?.sourceUrl,
      displayAction: metadataDisplayAction(actualDurationMeta)
    },
    {
      id: "residency-median-waiting-time",
      label: "זמן המתנה חציוני למשרה (חודשים)",
      value: medianWaitingMetric ? formatImportedMetricValue(medianWaitingMetric) : null,
      sourceLabel: metadataSourceLabel(medianWaitingMeta, importedSourceLabel(medianWaitingMetric, "משרד הבריאות")),
      tooltip: metadataTooltip(medianWaitingMeta, "זמן המתנה חציוני למשרה לפי נתון מחלקתי מיובא."),
      lastUpdated: medianWaitingMetric?.lastUpdated,
      sourceUrl: medianWaitingMeta?.sourceUrl,
      displayAction: metadataDisplayAction(medianWaitingMeta),
      lowPriority: true
    }
  ];
  const expectedOpeningsValue = isMedicalArrayProfile
    ? formatMetricNumber(arrayExpectedOpeningsAverage)
    : expectedOpeningsDepartmentMetric
      ? formatImportedMetricValue(expectedOpeningsDepartmentMetric)
      : expectedOpeningsYearlyMetric
        ? formatImportedMetricValue(expectedOpeningsYearlyMetric)
        : null;
  const expectedOpeningsSourceLabel = importedSourceLabel(
    expectedOpeningsDepartmentMetric ?? expectedOpeningsYearlyMetric,
    "מספר המתמחים שאמורים לסיים השנה ע״ב אורך ההתמחות החציוני"
  );
  const electiveDemandMetric = findImportedMetric(
    importedDepartmentMetrics,
    "מספר אלקטיביסטים חציוני",
    "medianElectiveDemand"
  );
  const importedDuns100Metric = findImportedMetric(importedDepartmentMetrics, "DUNS100", "duns100PhysiciansCount");
  const externalDuns100Metric = metricRecord("duns100PhysiciansCount");
  const duns100Value = importedDuns100Metric
    ? formatImportedMetricValue(importedDuns100Metric)
    : externalDuns100Metric
      ? externalDuns100Metric.value
      : null;
  const duns100LastUpdated = importedDuns100Metric?.lastUpdated ?? externalDuns100Metric?.updatedAt;
  const duns100SourceLabel = importedDuns100Metric
    ? importedSourceLabel(importedDuns100Metric, "DUNS100")
    : externalDuns100Metric
      ? sourceLabelFromExternalMetricSource(externalDuns100Metric.sourceName)
      : "DUNS100";
  const aboutSectionTitle = isMedicalArrayProfile ? "קצת על המערך" : "קצת על המחלקה";
  const dataSectionTitle = isMedicalArrayProfile ? "נתוני המערך" : "נתוני המחלקה";
  const experienceSectionTitle = isMedicalArrayProfile ? "חוויות מהמערך" : "חוויות מהמחלקה";
  const managersSectionTitle = isMedicalArrayProfile ? "הנהלת המערך ויצירת קשר" : "הנהלת המחלקה ויצירת קשר";
  const expectedOpeningsLabel = isMedicalArrayProfile
    ? "צפי משרות חדשות ממוצע למחלקה במערך ב-2026"
    : metricLabelFromMetadata(expectedOpeningsMeta, "מספר משרות צפויות להתפנות");
  const showProfileDebug =
    process.env.NODE_ENV !== "production" && resolvedSearchParams.debugArray === "1";
  const profileDebug = showProfileDebug
    ? {
        requestedSlug: slug,
        requestedDepartmentId: departmentId,
        resolvedEntityType: isMedicalArrayProfile ? "array" : "department",
        specialtyName: department.specialty.name,
        hospitalName: department.institution.name,
        arrayDepartmentCount,
        underlyingDepartments: arrayDepartments.map((arrayDepartment) => ({
          id: arrayDepartment.id,
          name: formatDepartmentDisplayName(arrayDepartment.name, arrayDepartment.specialty.name),
          rawName: arrayDepartment.name,
          manager: arrayDepartment.heads[0]?.name ?? null,
          email: arrayDepartment.publicContactEmail ?? null,
          phone: arrayDepartment.publicContactPhone ?? null
        })),
        heroTitleRendered: profileTitle,
        sectionTitlesRendered: [
          aboutSectionTitle,
          dataSectionTitle,
          experienceSectionTitle,
          managersSectionTitle
        ],
        metricLabelsRendered: [
          workforceMetrics[0].label,
          expectedOpeningsLabel,
          workforceMetrics[1].label,
          isMedicalArrayProfile
            ? "מתמחים חדשים ממוצע למחלקה במערך לפי שנה"
            : "מתמחים חדשים לפי שנה"
        ],
        rawTotalMetrics: {
          activeResidents: arrayActiveResidentsTotal,
          expectedOpenings2026: arrayExpectedOpeningsTotal,
          seniorPhysicians: arraySpecialistsTotal,
          newResidentsByYear: arrayNewResidentsCalculations.map(({ year, calculation }) => ({
            year,
            rawTotal: calculation.rawTotal,
            displayedAverage:
              calculation.correctedCalculation === null
                ? null
                : Number(calculation.correctedCalculation.toFixed(1)),
            denominator: arrayDepartmentCount
          }))
        },
        arrayMetricCalculations: {
          activeResidents: arrayActiveResidentsCalculation,
          expectedOpenings2026: arrayExpectedOpeningsCalculation,
          seniorPhysicians: arraySpecialistsCalculation,
          newResidentsByYear: arrayNewResidentsCalculations.map(({ year, calculation }) => ({
            year,
            ...calculation
          }))
        },
        displayedDividedMetrics: {
          activeResidents: activeResidents?.value ?? null,
          expectedOpenings2026: expectedOpeningsValue,
          seniorPhysicians: specialists?.value ?? null,
          newResidentsByYear: arrayNewResidentsRows
        }
      }
    : null;
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
  const newResidentsSourceLabel = importedSourceLabel(firstDepartmentYearlyMetric, "משרד הבריאות");
  const specialtyOverviewHref = `/departments?specialty=${department.specialty.id}`;
  const hasMultipleDepartmentsInHospitalSpecialty = department.siblingDepartmentCount > 1;

  return (
    <PageShell className="space-y-5 py-6">
      {profileDebug ? (
        <script
          id="department-profile-debug"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: safeJsonForHtml(profileDebug) }}
        />
      ) : null}
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
                  {department.residencyOpenings.length > 0 ? "משרות פתוחות" : "אין משרות כרגע"}
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
            <SectionHeading title={aboutSectionTitle} />
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
                title={dataSectionTitle}
              />
              {isMedicalArrayDemo ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                  כולל נתוני דמו מסומנים
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {hasMultipleDepartmentsInHospitalSpecialty ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-7 text-amber-950">
                  חלק מהנתונים בעמוד זה מוצגים ברמת כלל המערך בבית החולים ולא ברמת המחלקה הספציפית.
                </div>
              ) : null}

              <div className="grid gap-2 md:grid-cols-3">
                {isMedicalArrayProfile ? (
                  <DataMetricCard
                    label="מספר מחלקות במערך"
                    value={arrayDepartmentCount}
                    sourceLabel="בי״ח"
                    tooltip="סך המחלקות הכלולות במערך בבית החולים."
                    metricType="סך הכל במערך"
                    className="border-brand-100 bg-brand-50/70"
                  />
                ) : null}
                <DataMetricCard {...workforceMetrics[0]} />
                <DataMetricCard
                  label={expectedOpeningsLabel}
                  value={expectedOpeningsValue}
                  sourceLabel={metadataSourceLabel(expectedOpeningsMeta, expectedOpeningsSourceLabel)}
                  tooltip={metadataTooltip(
                    expectedOpeningsMeta,
                    isMedicalArrayProfile
                      ? arrayAverageTooltip
                      : "צפי משרות המבוסס על המתמחים שאמורים לסיים השנה לפי אורך ההתמחות החציוני."
                  )}
                  metricType={isMedicalArrayProfile ? "ממוצע למחלקה במערך" : "נתון מחלקתי"}
                  caption={isMedicalArrayProfile ? `חושב על בסיס ${arrayDepartmentCount} מחלקות` : undefined}
                  sourceUrl={expectedOpeningsMeta?.sourceUrl}
                  displayAction={metadataDisplayAction(expectedOpeningsMeta)}
                  className={`border-amber-200 bg-amber-50/70 ${highlightedCardClass(expectedOpeningsMeta)}`}
                />
                <DataMetricCard {...workforceMetrics[1]} />
              </div>

              <div className="grid gap-2 lg:grid-cols-3">
                <ClockMetricCard
                  label="זמן המתנה חציוני למשרה (חודשים)"
                  value={medianWaitingMetric ? formatImportedMetricValue(medianWaitingMetric) : null}
                  sourceLabel={metadataSourceLabel(medianWaitingMeta, importedSourceLabel(medianWaitingMetric, "משרד הבריאות"))}
                  tooltip={metadataTooltip(medianWaitingMeta, "זמן המתנה חציוני למשרה לפי נתון מחלקתי מיובא.")}
                  lastUpdated={medianWaitingMetric?.lastUpdated}
                  sourceUrl={medianWaitingMeta?.sourceUrl}
                  displayAction={metadataDisplayAction(medianWaitingMeta)}
                />
                <AcceptanceDistributionCard
                  rows={acceptanceDistributionRows}
                  sourceLabel={metadataSourceLabel(acceptanceDisplayMeta, "משרד הבריאות")}
                  tooltip={ACCEPTANCE_DISTRIBUTION_TOOLTIP}
                  metricType={acceptanceDistributionType}
                  lastUpdated={acceptanceDistributionLastUpdated}
                  sourceUrl={acceptanceDisplayMeta?.sourceUrl}
                  displayAction={metadataDisplayAction(acceptanceDisplayMeta)}
                />
                {electiveDemandMetric && !electiveDemandMeta?.isHidden ? (
                  <DataMetricCard
                    label={metricLabelFromMetadata(electiveDemandMeta, "מספר אלקטיביסטים חציוני")}
                    value={formatImportedMetricValue(electiveDemandMetric)}
                    sourceLabel={metadataSourceLabel(electiveDemandMeta, importedSourceLabel(electiveDemandMetric, "מצביע על ביקוש המחלקה"))}
                    tooltip={metadataTooltip(electiveDemandMeta, "מדד ביקוש למחלקה לפי מספר אלקטיביסטים חציוני.")}
                    lastUpdated={electiveDemandMetric.lastUpdated}
                    sourceUrl={electiveDemandMeta?.sourceUrl}
                    displayAction={metadataDisplayAction(electiveDemandMeta)}
                  />
                ) : null}
              </div>

              <div className="grid gap-2 lg:grid-cols-3">
                <GenderBalanceCard
                  womenPercent={womenPercent}
                  menPercent={menPercent}
                  sourceLabel={metadataSourceLabel(genderMeta, importedSourceLabel(womenPercentMetric ?? menPercentMetric, "משרד הבריאות"))}
                  tooltip={metadataTooltip(genderMeta, "התפלגות מגדרית מחלקתית, אם סופקה.")}
                  lastUpdated={genderLastUpdated}
                  sourceUrl={genderMeta?.sourceUrl}
                  displayAction={metadataDisplayAction(genderMeta)}
                />
                <DataMetricCard {...trainingMetrics[0]} />
                <DurationBenchmarkCard
                  departmentYears={departmentActualDurationYears}
                  nationalYears={nationalActualDurationYears}
                  sourceLabel={metadataSourceLabel(actualDurationMeta, importedSourceLabel(actualDurationMetric ?? specialtyActualDurationMetric, "משרד הבריאות"))}
                  tooltip={metadataTooltip(actualDurationMeta, "משך התמחות מחלקתי בהשוואה לממוצע הארצי בתחום.")}
                  lastUpdated={actualDurationMetric?.lastUpdated ?? specialtyActualDurationMetric?.lastUpdated}
                  sourceUrl={actualDurationMeta?.sourceUrl}
                  displayAction={metadataDisplayAction(actualDurationMeta)}
                />
              </div>

              <YearlyResidentsChart
                rows={isMedicalArrayProfile ? arrayNewResidentsRows : departmentNewResidentsRows}
                sourceLabel={metadataSourceLabel(newResidentsMeta, newResidentsSourceLabel)}
                lastUpdated={firstDepartmentYearlyMetric?.lastUpdated}
                sourceUrl={newResidentsMeta?.sourceUrl}
                displayAction={metadataDisplayAction(newResidentsMeta)}
                title={
                  isMedicalArrayProfile
                    ? "מתמחים חדשים ממוצע למחלקה במערך לפי שנה"
                    : "מתמחים חדשים לפי שנה"
                }
                tooltip={isMedicalArrayProfile ? arrayAverageTooltip : NEW_RESIDENTS_TOOLTIP}
                metricType={isMedicalArrayProfile ? "ממוצע למחלקה במערך" : "נתון מחלקתי"}
              />

            </div>
          </Card>

          <Card className="rounded-xl !p-4">
            <SectionHeading title={experienceSectionTitle} />
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
            <SectionHeading
              title={managersSectionTitle}
            />
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
                      מייל איש קשר: {contactEmails.join(", ")}
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
                  <p className="text-sm font-black text-ink">
                    {isMedicalArrayProfile
                      ? `מנהל/ת מחלקה ${head.departmentName} - `
                      : "מנהל/ת מחלקה - "}
                    {head.name || <EmptyValue />}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[head.title, head.role, head.departmentName].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    מייל: {head.email ? head.email : <EmptyValue />}
                  </p>
                  {head.singleEmailFallback && head.email ? (
                    <p className="text-xs leading-6 text-slate-600">
                      מייל איש קשר: {head.email}
                    </p>
                  ) : null}
                  <p className="text-xs leading-6 text-slate-600">
                    טלפון: {head.phone ? head.phone : <EmptyValue />}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-xl !p-4">
            <SectionHeading title="מחקר ופרסומים" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <QuickHighlightCard
                label={metricLabelFromMetadata(publicationMeta, "מספר פרסומים")}
                value={publicationsValue}
                sourceLabel={metadataSourceLabel(publicationMeta, publicationsSourceLabel)}
                tooltip={metadataTooltip(publicationMeta, openAlexDebugTooltip)}
                metricType={latestOpenAlexResearchMetric ? "הערכה מחלקתית" : "נתון מחלקתי"}
                lastUpdated={publicationsLastUpdated}
                missingText={MISSING_IMPORTED_VALUE}
                sourceUrl={publicationMeta?.sourceUrl}
                displayAction={metadataDisplayAction(publicationMeta)}
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
                label={metricLabelFromMetadata(boardStageAMeta, "מעבר שלב א׳")}
                value={boardStageA?.value ?? null}
                sourceLabel={metadataSourceLabel(boardStageAMeta, boardStageA?.sourceLabel ?? "משרד הבריאות")}
                tooltip={metadataTooltip(boardStageAMeta, "שיעור מעבר שלב א׳ למחלקה כאשר קיים נתון מחלקתי.")}
                metricType={stageAMetricType}
                lastUpdated={boardStageA?.lastUpdated}
                sourceUrl={boardStageAMeta?.sourceUrl}
                displayAction={metadataDisplayAction(boardStageAMeta)}
              />
              <QuickHighlightCard
                label={metricLabelFromMetadata(boardStageBMeta, "מעבר שלב ב׳")}
                value={boardStageB?.value ?? null}
                sourceLabel={metadataSourceLabel(boardStageBMeta, boardStageB?.sourceLabel ?? "משרד הבריאות")}
                tooltip={metadataTooltip(boardStageBMeta, "שיעור מעבר שלב ב׳ למחלקה כאשר קיים נתון מחלקתי.")}
                metricType={stageBMetricType}
                lastUpdated={boardStageB?.lastUpdated}
                sourceUrl={boardStageBMeta?.sourceUrl}
                displayAction={metadataDisplayAction(boardStageBMeta)}
              />
              <QuickHighlightCard
                label={metricLabelFromMetadata(duns100Meta, "DUNS100")}
                value={duns100Value}
                sourceLabel={metadataSourceLabel(duns100Meta, duns100SourceLabel)}
                tooltip={metadataTooltip(
                  duns100Meta,
                  "רופאים שנספרו מנתוני DUNS100 ומוצגים כאינדיקציה לפעילות/בולטות מקצועית."
                )}
                lastUpdated={duns100LastUpdated}
                missingText={MISSING_IMPORTED_VALUE}
                sourceUrl={duns100Meta?.sourceUrl}
                displayAction={metadataDisplayAction(duns100Meta)}
              />
              <QuickHighlightCard
                label={metricLabelFromMetadata(burnoutMeta, "מדד שחיקה")}
                value={burnoutMetric ? formatImportedMetricValue(burnoutMetric) : null}
                sourceLabel={metadataSourceLabel(burnoutMeta, importedSourceLabel(burnoutMetric, "דיווחי מתמחים משרד הבריאות"))}
                tooltip={appendTooltipSentence(
                  metadataTooltip(burnoutMeta, "מדד שחיקה מחלקתי, אם סופק."),
                  BURNOUT_TOOLTIP_SENTENCE
                )}
                metricType={metricTypeFromMetadata(burnoutMeta, burnoutMetricType)}
                lastUpdated={burnoutMetric?.lastUpdated}
                sourceUrl={burnoutMeta?.sourceUrl}
                displayAction={metadataDisplayAction(burnoutMeta)}
              />
            </div>
            <div className="mt-2">
              <SalaryGapHighlight
                metadata={salaryGapMeta}
                centerMetric={centerSalaryMetric}
                peripheryMetric={peripherySalaryMetric}
                gapMetric={salaryGapMetric}
              />
            </div>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
