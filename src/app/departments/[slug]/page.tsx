import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { DepartmentPageActions } from "@/components/departments/department-page-actions";
import {
  FavoriteToggleButton,
  LoginRequiredBookmarkButton
} from "@/components/departments/favorite-toggle-button";
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
  className = ""
}: {
  label: string;
  value: string | number | null | undefined;
  sourceLabel: string;
  tooltip?: string;
  lastUpdated?: string | Date | null;
  metricType?: string;
  className?: string;
}) {
  const hasValue = value !== null && value !== undefined && String(value).trim().length > 0;

  return (
    <div className={`flex min-h-[8rem] flex-col rounded-2xl border border-slate-100 bg-white px-4 py-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold leading-5 text-slate-600">{label}</p>
        <MetricInfoTip
          sourceLabel={sourceLabel}
          text={tooltip}
          lastUpdated={lastUpdated}
          metricType={metricType}
        />
      </div>
      <p className={`mt-3 text-xl font-black leading-tight ${hasValue ? "text-ink" : "text-slate-400"}`}>
        {hasValue ? value : MISSING_IMPORTED_VALUE}
      </p>
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
  lowPriority?: boolean;
};

function hasDisplayValue(metric: DisplayMetric) {
  return metric.value !== null && metric.value !== undefined && String(metric.value).trim().length > 0;
}

function DataMetricGrid({
  metrics
}: {
  metrics: DisplayMetric[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <DataMetricCard key={metric.id} {...metric} />
      ))}
    </div>
  );
}

function MetricGroup({
  title,
  metrics,
  children
}: {
  title: string;
  metrics?: DisplayMetric[];
  children?: ReactNode;
}) {
  const visibleMetrics = (metrics ?? []).filter((metric) => hasDisplayValue(metric) || !metric.lowPriority);
  const hiddenMetrics = (metrics ?? []).filter((metric) => !hasDisplayValue(metric) && metric.lowPriority);

  if (visibleMetrics.length === 0 && hiddenMetrics.length === 0 && !children) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <h3 className="text-base font-black text-ink">{title}</h3>
      {children ? <div className="mt-4">{children}</div> : null}
      {visibleMetrics.length > 0 ? (
        <div className="mt-4">
          <DataMetricGrid metrics={visibleMetrics} />
        </div>
      ) : null}
      {hiddenMetrics.length > 0 ? (
        <details className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-black text-brand-800">
            הצג את כל הנתונים
          </summary>
          <div className="mt-4">
            <DataMetricGrid metrics={hiddenMetrics} />
          </div>
        </details>
      ) : null}
    </section>
  );
}

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
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
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
        <p className="mt-3 text-lg font-black text-slate-400">{MISSING_IMPORTED_VALUE}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div key={row.year} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-3">
              <span className="text-xs font-black text-slate-500">{row.year}</span>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
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
  acceptedImmediatelyReports: "מצאו התמחות מיד",
  acceptedWithinSixMonthsReports: "מצאו התמחות עד חצי שנה",
  acceptedWithinOneYearReports: "מצאו התמחות עד שנה",
  acceptedWithinTwoYearsReports: "מצאו התמחות עד שנתיים",
  acceptedAfterTwoYearsReports: "מצאו התמחות אחרי שנתיים",
  centerSalary: "שכר לא פריפריה",
  peripherySalary: "שכר פריפריה",
  peripherySalaryGap: "פער שכר פריפריה",
  residentsCount: "מספר מתמחים",
  activeResidentsCount: "מספר מתמחים",
  womenPercent: "אחוז נשים",
  menPercent: "אחוז גברים",
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

function metricCardFromDepartmentOrSpecialty(
  departmentMetrics: ImportedMetric[],
  specialtyMetrics: ImportedMetric[],
  input: {
    id: string;
    label?: string;
    departmentKeys: string[];
    specialtyKeys?: string[];
    sourceLabel: string;
    specialtySourceLabel?: string;
    tooltip?: string;
    lowPriority?: boolean;
    fallbackMetricType?: string;
  }
): DisplayMetric {
  const departmentMetric = findImportedMetric(departmentMetrics, ...input.departmentKeys);
  const specialtyMetric = departmentMetric
    ? null
    : findImportedMetric(specialtyMetrics, ...(input.specialtyKeys ?? input.departmentKeys));
  const metric = departmentMetric ?? specialtyMetric;
  const isSpecialtyMetric = Boolean(!departmentMetric && specialtyMetric);

  return {
    id: input.id,
    label: input.label ?? readableMetricLabel(metric?.metricKey ?? input.departmentKeys[0] ?? input.id),
    value: metric ? formatImportedMetricValue(metric) : null,
    sourceLabel: importedSourceLabel(
      metric,
      isSpecialtyMetric ? input.specialtySourceLabel ?? input.sourceLabel : input.sourceLabel
    ),
    tooltip: input.tooltip,
    lastUpdated: metric?.lastUpdated,
    metricType: isSpecialtyMetric ? "נתון כללי לתחום" : input.fallbackMetricType ?? "נתון מחלקתי",
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
  const arrayDepartments = isMedicalArrayProfile ? department.medicalArray?.departments ?? [] : [];
  const importedDepartmentMetrics = department.metrics;
  const importedDepartmentYearlyMetrics = department.yearlyMetrics;
  const importedSpecialtyMetrics = department.specialty.metrics;
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
  const latestOpenAlexResearchMetric = openAlexResearchMetrics.find((metric) => !metric.needsMapping) ?? null;
  const publicationMetric = findImportedMetric(importedDepartmentMetrics, "departmentalPublicationsCount");
  const expectedOpeningsDepartmentMetric = findImportedMetric(importedDepartmentMetrics, "expectedOpenings2026");
  const expectedOpeningsYearlyMetric = latestYearlyMetric(importedDepartmentYearlyMetrics, "newResidents", { year: 2026 });
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
  const averageDurationMetric = metricCardFromDepartmentOrSpecialty(
    importedDepartmentMetrics,
    importedSpecialtyMetrics,
    {
      id: "residency-average-duration",
      label: "משך ממוצע בפועל",
      departmentKeys: ["actualAverageDuration", "medianResidencyDurationMonths"],
      specialtyKeys: ["actualAverageDuration"],
      sourceLabel: "משרד הבריאות",
      tooltip: "משך ההתמחות בפועל לפי הנתונים הזמינים. כאשר אין נתון מחלקתי, מוצג נתון כללי לתחום."
    }
  );
  const trainingMetrics: DisplayMetric[] = [
    {
      id: "department-residents-count",
      label: "מספר מתמחים",
      value: activeResidents?.value ?? null,
      sourceLabel: "משרד הבריאות",
      tooltip: "נתון מחלקתי מתוך Master_Dept.csv כאשר קיים."
    },
    {
      id: "department-senior-physicians",
      label: "מספר בכירים",
      value: specialists?.value ?? null,
      sourceLabel: "משרד הבריאות",
      tooltip: "מספר רופאים בכירים כפי שיובא עבור המחלקה."
    },
    metricCardFromDepartmentOrSpecialty(importedDepartmentMetrics, importedSpecialtyMetrics, {
      id: "residency-official-duration",
      label: "משך התמחות רשמי",
      departmentKeys: ["officialResidencyDuration"],
      specialtyKeys: ["officialResidencyDuration"],
      sourceLabel: "הר״י",
      tooltip: "משך ההתמחות הרשמי. כאשר אין נתון מחלקתי, מוצג נתון כללי לתחום."
    }),
    {
      ...averageDurationMetric,
      label: medianDuration ? "משך התמחות במחלקה" : averageDurationMetric.label,
      value: medianDuration?.value ?? averageDurationMetric.value,
      sourceLabel: medianDuration ? "משרד הבריאות" : averageDurationMetric.sourceLabel,
      tooltip: medianDuration
        ? "משך התמחות מחלקתי, אם סופק ברמת המחלקה."
        : averageDurationMetric.tooltip,
      metricType: medianDuration ? "נתון מחלקתי" : averageDurationMetric.metricType
    },
    metricCardFromDepartmentOrSpecialty(importedDepartmentMetrics, importedSpecialtyMetrics, {
      id: "residency-median-waiting-time",
      label: "זמן המתנה חציוני לתקן",
      departmentKeys: ["medianWaitingTime"],
      specialtyKeys: ["medianWaitingTime"],
      sourceLabel: "משרד הבריאות",
      tooltip: "זמן המתנה חציוני לתקן. כאשר אין נתון מחלקתי, מוצג נתון כללי לתחום.",
      lowPriority: true
    })
  ];
  const demandMetrics: DisplayMetric[] = [
    {
      id: "department-expected-openings-2026",
      label: "צפי תקנים חדשים ב-2026",
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
    metricCardFromDepartmentOrSpecialty(importedDepartmentMetrics, importedSpecialtyMetrics, {
      id: "accepted-immediately",
      label: "מצאו התמחות מיד",
      departmentKeys: ["acceptedImmediatelyReports"],
      specialtyKeys: ["acceptedImmediatelyReports"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות",
      tooltip: "מספר דיווחים על מציאת התמחות מיד. כאשר אין נתון מחלקתי, מוצג נתון כללי לתחום.",
      lowPriority: true
    }),
    metricCardFromDepartmentOrSpecialty(importedDepartmentMetrics, importedSpecialtyMetrics, {
      id: "accepted-within-six-months",
      label: "מצאו עד חצי שנה",
      departmentKeys: ["acceptedWithinSixMonthsReports"],
      specialtyKeys: ["acceptedWithinSixMonthsReports"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות",
      tooltip: "מספר דיווחים על מציאת התמחות עד חצי שנה. כאשר אין נתון מחלקתי, מוצג נתון כללי לתחום.",
      lowPriority: true
    }),
    metricCardFromDepartmentOrSpecialty(importedDepartmentMetrics, importedSpecialtyMetrics, {
      id: "accepted-within-one-year",
      label: "מצאו עד שנה",
      departmentKeys: ["acceptedWithinOneYearReports"],
      specialtyKeys: ["acceptedWithinOneYearReports"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות",
      tooltip: "מספר דיווחים על מציאת התמחות עד שנה. כאשר אין נתון מחלקתי, מוצג נתון כללי לתחום.",
      lowPriority: true
    }),
    metricCardFromImported(importedDepartmentMetrics, {
      id: "department-median-elective-demand",
      label: "מספר אלקטיביסטים חציוני",
      keys: ["medianElectiveDemand"],
      sourceLabel: "מצביע על ביקוש המחלקה",
      tooltip: "מדד ביקוש למחלקה לפי מספר אלקטיביסטים חציוני.",
      lowPriority: true
    }),
    {
      id: "department-openings-on-site",
      label: "תקנים פתוחים באתר",
      value: openingsCount > 0 ? openingsCount : null,
      sourceLabel: "נתוני האתר",
      tooltip: "תקנים פעילים שפורסמו באתר.",
      lowPriority: true
    }
  ];
  const salaryMetrics: DisplayMetric[] = [
    metricCardFromDepartmentOrSpecialty(importedDepartmentMetrics, importedSpecialtyMetrics, {
      id: "center-salary",
      label: "שכר לא פריפריה",
      departmentKeys: ["centerSalary"],
      specialtyKeys: ["centerSalary"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות",
      lowPriority: true
    }),
    metricCardFromDepartmentOrSpecialty(importedDepartmentMetrics, importedSpecialtyMetrics, {
      id: "periphery-salary",
      label: "שכר פריפריה",
      departmentKeys: ["peripherySalary"],
      specialtyKeys: ["peripherySalary"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות",
      lowPriority: true
    }),
    metricCardFromDepartmentOrSpecialty(importedDepartmentMetrics, importedSpecialtyMetrics, {
      id: "periphery-salary-gap",
      label: "פער שכר פריפריה",
      departmentKeys: ["peripherySalaryGap"],
      specialtyKeys: ["peripherySalaryGap"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות",
      tooltip: "פער בין שכר פריפריה לשכר לא פריפריה.",
      lowPriority: true
    })
  ];
  const examMetrics: DisplayMetric[] = [
    {
      id: "department-stage-a",
      label: "מעבר שלב א׳",
      value: boardStageA?.value ?? null,
      sourceLabel: "משרד הבריאות",
      tooltip: "נתון מחלקתי מתוך שורת המחלקה ב-Master_Dept.csv."
    },
    {
      id: "department-stage-b",
      label: "מעבר שלב ב׳",
      value: boardStageB?.value ?? null,
      sourceLabel: "משרד הבריאות",
      tooltip: "נתון מחלקתי מתוך שורת המחלקה ב-Master_Dept.csv."
    },
    {
      id: "department-gender-balance",
      label: "איזון מגדרי במחלקה",
      value: department.genderBalance,
      sourceLabel: "משרד הבריאות",
      tooltip: "התפלגות מגדרית מחלקתית, אם סופקה.",
      lowPriority: true
    },
    metricCardFromDepartmentOrSpecialty(importedDepartmentMetrics, importedSpecialtyMetrics, {
      id: "women-percent",
      label: "אחוז נשים",
      departmentKeys: ["womenPercent"],
      specialtyKeys: ["womenPercent"],
      sourceLabel: "משרד הבריאות",
      lowPriority: true
    }),
    metricCardFromDepartmentOrSpecialty(importedDepartmentMetrics, importedSpecialtyMetrics, {
      id: "men-percent",
      label: "אחוז גברים",
      departmentKeys: ["menPercent"],
      specialtyKeys: ["menPercent"],
      sourceLabel: "משרד הבריאות",
      lowPriority: true
    }),
    metricCardFromDepartmentOrSpecialty(importedDepartmentMetrics, importedSpecialtyMetrics, {
      id: "burnout-index",
      label: "מדד שחיקה",
      departmentKeys: ["burnoutIndex"],
      specialtyKeys: ["burnoutIndex"],
      sourceLabel: "דיווחי מתמחים משרד הבריאות",
      lowPriority: true
    })
  ];
  const researchMetrics: DisplayMetric[] = [
    {
      id: "department-publications",
      label: "פרסומים מחלקתיים",
      value: publicationMetric ? formatImportedMetricValue(publicationMetric) : null,
      sourceLabel: importedSourceLabel(publicationMetric, "משרד הבריאות"),
      tooltip: "מספר פרסומים מחלקתי מיובא כאשר קיים.",
      lastUpdated: publicationMetric?.lastUpdated
    },
    latestOpenAlexResearchMetric
      ? {
          id: "openalex-publications",
          label: `פעילות מחקרית משוערת ${latestOpenAlexResearchMetric.year}`,
          value: latestOpenAlexResearchMetric.publicationsCount ?? 0,
          sourceLabel: "OpenAlex",
          tooltip: `הערכה לפי OpenAlex. רמת ביטחון: ${latestOpenAlexResearchMetric.confidenceScore ?? "לא צוינה"}.`,
          metricType: "הערכה"
        }
      : {
          id: "openalex-publications",
          label: "פעילות מחקרית משוערת",
          value: null,
          sourceLabel: "OpenAlex",
          tooltip: "יוצג לאחר רענון מדדי OpenAlex על ידי אדמין.",
          metricType: "הערכה",
          lowPriority: true
        },
    metricCardFromImported(importedDepartmentMetrics, {
      id: "department-duns100",
      label: "רופאים ב-DUNS100",
      keys: ["duns100PhysiciansCount"],
      sourceLabel: "DUNS100",
      tooltip: "רופאים שנספרו מנתוני DUNS100 מיובאים.",
      lowPriority: true
    })
  ];
  const newResidentsSourceLabel = importedSourceLabel(firstDepartmentYearlyMetric, "משרד הבריאות");
  const specialtyOverviewHref = `/departments?specialty=${department.specialty.id}`;

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
            {!hasOfficialDescription ? (
              <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm leading-7 text-brand-900">
                עדיין אין מידע רשמי מלא מהמחלקה. אפשר כבר לשמור את העמוד, לשתף חוויה ולחזור
                כשיתווספו עדכונים.
              </div>
            ) : null}
            <p className="mt-4 text-sm leading-8 text-slate-700">{department.practicalInfo}</p>
            <Link
              href={specialtyOverviewHref}
              className="mt-4 inline-flex rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-black text-brand-900 transition hover:bg-brand-100"
            >
              סקירת תחום ההתמחות
            </Link>
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
              קודם מוצגים נתוני המחלקה. נתונים כלליים של תחום ההתמחות מופיעים רק כאשר הם עוזרים להשלים הקשר.
            </p>

            <div className="mt-5 space-y-4">
              <MetricGroup title="התמחות וזמן" metrics={trainingMetrics}>
                <YearlyResidentsChart
                  rows={departmentNewResidentsRows}
                  sourceLabel={newResidentsSourceLabel}
                  lastUpdated={firstDepartmentYearlyMetric?.lastUpdated}
                />
              </MetricGroup>
              <MetricGroup title="ביקוש ותקנים" metrics={demandMetrics} />
              <MetricGroup title="שכר" metrics={salaryMetrics} />
              <MetricGroup title="בחינות ומגדר" metrics={examMetrics} />
            </div>
          </Card>

          <Card className="rounded-xl">
            <SectionHeading title="מחקר ופרסומים" />
            <div className="mt-5">
              <MetricGroup title="מחקר" metrics={researchMetrics} />
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

        <aside className="space-y-5">
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
        </aside>
      </section>
    </PageShell>
  );
}
