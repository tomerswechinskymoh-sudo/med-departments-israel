import {
  metadataDisplayAction,
  metadataSourceLabel,
  metadataTooltip,
  type MetricDisplayMetadata,
  type MetricVisualType
} from "@/lib/metric-display";
import {
  resolveImportedMetric,
  resolveImportedSalaryMetrics,
  resolveImportedYearlyMetric,
  resolveMetricDisplayMetadata
} from "@/lib/imported-metric-resolver";

export const specialtyMetricKeys = [
  "programsCount",
  "activeResidents",
  "genderDistribution",
  "residencyDuration",
  "medianWaitingTime",
  "acceptanceDistribution",
  "boardPassA",
  "boardPassB",
  "burnoutIndex",
  "centerSalary",
  "peripherySalary",
  "salaryGap",
  "newResidentsTrend",
  "expectedOpenings",
  "israelVsAbroad",
  "dutyLoad",
  "researchExposure",
  "residentToAttendingRatio",
  "userRating",
  "applicationsPerPosition",
  "duns100PhysiciansCount",
  "custom"
] as const;

export type SpecialtyMetricKey = (typeof specialtyMetricKeys)[number];

export type SpecialtyMetricUnit = "%" | "count" | "months" | "ratio" | "score" | "text";

export type SpecialtyMetricResult = {
  key: SpecialtyMetricKey;
  label: string;
  description: string;
  value: string;
  unit: SpecialtyMetricUnit;
  sourceLabel?: string;
  sourceUrl?: string | null;
  tooltip?: string;
  displayAction?: string | null;
  metricLevel?: "מחלקתי" | "ארצי לתחום" | "מחושב";
  isPlaceholder?: boolean;
  isHighlighted?: boolean;
  visualType?: MetricVisualType | null;
};

export type SpecialtyMetricDepartment = {
  residentsCount?: number | null;
  medianResidencyLength?: string | null;
  shlavAlephPassRate?: number | null;
  shlavBetPassRate?: number | null;
  genderBalance?: string | null;
  educationLocationBreakdown?: unknown;
  reviewCount?: number | null;
  averageOverall?: number | null;
  lifestyleBalance?: number | null;
  researchExposure?: number | null;
  hasResearch?: boolean | null;
  externalMetrics?: Array<{
    metricKey: string;
    value: number;
    sourceName: string;
    approved: boolean;
  }>;
  yearlyMetrics?: Array<{
    metricKey: string;
    year: number;
    value: number | null;
    rawValue?: string | null;
    unit?: string | null;
  }>;
};

export type SpecialtyImportedMetric = {
  metricKey: string;
  label?: string | null;
  value: number | null;
  rawValue?: string | null;
  unit?: string | null;
  sourceNotes?: string | null;
  lastUpdated?: string | Date | null;
};

export type SpecialtyImportedYearlyMetric = {
  metricKey: string;
  year: number;
  value: number | null;
  rawValue?: string | null;
  unit?: string | null;
  sourceNotes?: string | null;
  lastUpdated?: string | Date | null;
};

export type SpecialtyMetricContext = {
  specialtyMetrics?: SpecialtyImportedMetric[];
  specialtyYearlyMetrics?: SpecialtyImportedYearlyMetric[];
  dataExplanations?: MetricDisplayMetadata[];
};

type SpecialtyMetricCalculation =
  | string
  | {
      value: string;
      sourceLabel?: string;
      tooltip?: string;
      metricLevel?: "מחלקתי" | "ארצי לתחום" | "מחושב";
    }
  | null;

type SpecialtyMetricDefinition = {
  key: SpecialtyMetricKey;
  label: string;
  description: string;
  unit: SpecialtyMetricUnit;
  sourceLabel?: string;
  metadataKeys?: string[];
  calculate: (
    departments: SpecialtyMetricDepartment[],
    context: SpecialtyMetricContext
  ) => SpecialtyMetricCalculation;
};

export const defaultSpecialtyDashboardMetrics: SpecialtyMetricKey[] = [
  "programsCount",
  "activeResidents",
  "genderDistribution",
  "residencyDuration",
  "medianWaitingTime",
  "acceptanceDistribution",
  "boardPassA",
  "boardPassB",
  "burnoutIndex",
  "centerSalary",
  "peripherySalary",
  "salaryGap",
  "newResidentsTrend",
  "expectedOpenings",
  "duns100PhysiciansCount"
];

const missingMetricValue = "הנתון עדיין לא סופק";

const dashboardMetricDataExpKeys: Partial<Record<SpecialtyMetricKey, string[]>> = {
  activeResidents: ["מספר_מתמחים", "residentsCount", "activeResidentsCount"],
  genderDistribution: ["אחוז_נשים", "אחוז_גברים", "womenPercent", "menPercent"],
  residencyDuration: ["משך_ממוצע_בפועל", "משך_התמחות_רשמי", "actualAverageDuration", "officialResidencyDuration"],
  medianWaitingTime: ["זמן_המתנה_חציוני_לתקן", "medianWaitingTime"],
  acceptanceDistribution: ["מספר המתקבלים שדיווחו שמצאו מיד התמחות", "acceptedImmediatelyReports"],
  boardPassA: ["מעבר_שלב_א", "boardStageAPassRate"],
  boardPassB: ["מעבר_שלב_ב", "boardStageBPassRate"],
  burnoutIndex: ["מדד_שחיקה", "burnoutIndex"],
  centerSalary: ["שכר_לא_פריפריה", "centerSalary"],
  peripherySalary: ["שכר_פריפריה", "שכר_פריפריה 1", "peripherySalary"],
  salaryGap: ["פער_שכר_פריפריה", "peripherySalaryGap"],
  newResidentsTrend: ["מספר מתמחים חדשים 2024", "newResidents"],
  expectedOpenings: ["מספר_תקנים_שצפויים להיפתח_ארצי", "expectedNationalOpenings"],
  duns100PhysiciansCount: ["DUNS100", "duns100PhysiciansCount"]
};

const compositeDashboardLabels = new Set<SpecialtyMetricKey>([
  "genderDistribution",
  "acceptanceDistribution",
  "newResidentsTrend"
]);

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function sum(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((total, value) => total + value, 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 }).format(value);
}

function formatNumberWithUnit(value: number, unit?: string | null) {
  const formatted = formatNumber(value);

  if (unit === "%") return `${formatted}%`;
  if (unit === "currency") return `${formatted} ₪`;
  if (unit === "months") return `${formatted} חודשים`;
  if (unit === "years") return `${formatted} שנים`;
  if (unit === "score") return formatted;
  if (unit && unit !== "count") return `${formatted} ${unit}`;

  return formatted;
}

function formatMetricValue(metric: SpecialtyImportedMetric | SpecialtyImportedYearlyMetric) {
  if (metric.rawValue) {
    const rawNumber = Number(metric.rawValue.replace(/[,₪$%]/g, "").trim());
    if (Number.isFinite(rawNumber) && metric.unit && !metric.rawValue.includes("%")) {
      return formatNumberWithUnit(rawNumber, metric.unit);
    }

    return metric.rawValue;
  }

  if (typeof metric.value !== "number" || !Number.isFinite(metric.value)) {
    return null;
  }

  return formatNumberWithUnit(metric.value, metric.unit);
}

function formatSalaryMetricValue(metric: SpecialtyImportedMetric | null | undefined) {
  if (!metric) return null;
  if (metric.rawValue?.trim()) return metric.rawValue.trim();
  if (typeof metric.value !== "number" || !Number.isFinite(metric.value)) return null;

  return new Intl.NumberFormat("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(metric.value);
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

function sourceLabelForMetric(
  metric: SpecialtyImportedMetric | SpecialtyImportedYearlyMetric | null | undefined,
  fallback: string
) {
  return sourceLabelFromNotes(metric?.sourceNotes) ?? fallback;
}

function parsePercentForLabel(value: string | null | undefined, label: string) {
  if (!value) return null;
  const match = value.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%?\\s*${label}`));
  if (!match?.[1]) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMonths(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseEducationBreakdown(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const israel = typeof record.israel === "number" ? record.israel : null;
  const abroad = typeof record.abroad === "number" ? record.abroad : null;
  if (israel === null || abroad === null) return null;
  return { israel, abroad };
}

function externalMetricValue(department: SpecialtyMetricDepartment, metricKey: string) {
  return department.externalMetrics?.find((metric) => metric.metricKey === metricKey && metric.approved)?.value ?? null;
}

function contextMetric(
  context: SpecialtyMetricContext,
  ...metricKeys: string[]
) {
  const [fieldOrKey, ...aliases] = metricKeys;
  if (!fieldOrKey) return null;

  return resolveImportedMetric(context.specialtyMetrics ?? [], fieldOrKey, {
    aliases,
    entityLabel: "specialty dashboard"
  });
}

function contextMetricValue(context: SpecialtyMetricContext, ...metricKeys: string[]) {
  return contextMetric(context, ...metricKeys)?.value ?? null;
}

function yearlyValueRows(
  departments: SpecialtyMetricDepartment[],
  context: SpecialtyMetricContext,
  startYear: number,
  endYear: number
) {
  const specialtyRows = (context.specialtyYearlyMetrics ?? [])
    .filter((metric) => metric.year >= startYear && metric.year <= endYear)
    .map((metric) =>
      resolveImportedYearlyMetric([metric], `מספר מתמחים חדשים ${metric.year}`, {
        aliases: ["newResidents"],
        year: metric.year
      })
    )
    .filter((metric): metric is SpecialtyImportedYearlyMetric => Boolean(metric))
    .sort((left, right) => left.year - right.year);

  if (specialtyRows.length > 0) {
    return specialtyRows.map((metric) => ({
      year: metric.year,
      displayValue: formatMetricValue(metric) ?? "0"
    }));
  }

  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index)
    .map((year) => {
      const total = sum(
        departments.map((department) => {
          const metric = department.yearlyMetrics?.find(
            (item) => item.metricKey === "newResidents" && item.year === year
          );
          return metric?.value;
        })
      );

      return total === null
        ? null
        : {
            year,
            displayValue: formatNumber(total)
          };
    })
    .filter((row): row is { year: number; displayValue: string } => Boolean(row));
}

const acceptanceMetricRows = [
  {
    key: "מספר המתקבלים שדיווחו שמצאו מיד התמחות",
    alias: "acceptedImmediatelyReports",
    label: "מיד"
  },
  {
    key: "מספר המתקבלים שדיווחו שמצאו עד חצי שנה",
    alias: "acceptedWithinSixMonthsReports",
    label: "עד חצי שנה"
  },
  {
    key: "מספר המתקבלים שדיווחו שמצאו עד שנה",
    alias: "acceptedWithinOneYearReports",
    label: "עד שנה"
  },
  {
    key: "מספר המתקבלים שדיווחו שמצאו עד שנתיים",
    alias: "acceptedWithinTwoYearsReports",
    label: "עד שנתיים"
  },
  {
    key: "מספר המתקבלים שדיווחו שמצאו אחרי שנתיים",
    alias: "acceptedAfterTwoYearsReports",
    label: "אחרי שנתיים"
  }
];

function acceptanceDistributionRows(
  departments: SpecialtyMetricDepartment[],
  context: SpecialtyMetricContext
) {
  const specialtyRows = acceptanceMetricRows
    .map((input) => {
      const metric = contextMetric(context, input.key, input.alias);
      if (!metric) return null;
      const displayValue = formatMetricValue(metric);
      const numericValue = typeof metric.value === "number" ? metric.value : null;

      return displayValue && numericValue !== null
        ? {
            label: input.label,
            value: numericValue,
            displayValue
          }
        : null;
    })
    .filter((row): row is { label: string; value: number; displayValue: string } => Boolean(row));

  if (specialtyRows.length > 0) {
    return specialtyRows;
  }

  return acceptanceMetricRows
    .map((input) => {
      const total = sumMetric(departments, input.alias);
      return total === null
        ? null
        : {
            label: input.label,
            value: total,
            displayValue: formatNumber(total)
          };
    })
    .filter((row): row is { label: string; value: number; displayValue: string } => Boolean(row));
}

function averageMetric(departments: SpecialtyMetricDepartment[], metricKey: string) {
  return average(departments.map((department) => externalMetricValue(department, metricKey)));
}

function sumMetric(departments: SpecialtyMetricDepartment[], metricKey: string) {
  return sum(departments.map((department) => externalMetricValue(department, metricKey)));
}

export const specialtyMetricDefinitions: SpecialtyMetricDefinition[] = [
  {
    key: "programsCount",
    label: "מספר תוכניות",
    description: "מספר המחלקות והתוכניות שמוצגות בתחום ההתמחות",
    unit: "count",
    sourceLabel: "נתוני ייבוא האתר",
    calculate: (departments) => formatNumber(departments.length)
  },
  {
    key: "activeResidents",
    label: "מספר מתמחים פעילים",
    description: "סך מתמחים פעילים במחלקות התחום",
    unit: "count",
    sourceLabel: "משרד הבריאות",
    calculate: (departments, context) => {
      const total =
        sumMetric(departments, "activeResidentsCount") ??
        sumMetric(departments, "residentsCount") ??
        contextMetricValue(context, "מספר_מתמחים", "residentsCount", "activeResidentsCount") ??
        sum(departments.map((department) => department.residentsCount));
      return total !== null ? formatNumber(total) : null;
    }
  },
  {
    key: "genderDistribution",
    label: "איזון מגדרי",
    description: "ממוצע נשים/גברים מתוך מחלקות עם נתון זמין",
    unit: "%",
    sourceLabel: "משרד הבריאות",
    calculate: (departments, context) => {
      const specialtyWomenMetric = contextMetric(context, "אחוז_נשים", "womenPercent", "femaleResidentsPercent");
      if (specialtyWomenMetric) {
        const displayValue = formatMetricValue(specialtyWomenMetric);
        return displayValue
          ? {
              value: `${displayValue} נשים`,
              sourceLabel: sourceLabelForMetric(specialtyWomenMetric, "משרד הבריאות")
            }
          : null;
      }

      const womenAverage =
        averageMetric(departments, "femaleResidentsPercent") ??
        averageMetric(departments, "womenPercent") ??
        average(departments.map((department) => parsePercentForLabel(department.genderBalance, "נשים")));
      if (womenAverage === null) return null;
      return `${formatNumber(womenAverage)}% נשים`;
    }
  },
  {
    key: "residencyDuration",
    label: "אורך התמחות חציוני",
    description: "משך התמחות טיפוסי לפי נתונים זמינים",
    unit: "months",
    sourceLabel: "הר״י",
    calculate: (departments, context) => {
      const specialtyDurationMetric = contextMetric(
        context,
        "משך_ממוצע_בפועל",
        "משך_התמחות_רשמי",
        "actualAverageDuration",
        "officialResidencyDuration",
        "medianResidencyDurationMonths"
      );
      if (specialtyDurationMetric) {
        const displayValue = formatMetricValue(specialtyDurationMetric);
        return displayValue
          ? {
              value: displayValue,
              sourceLabel: sourceLabelForMetric(specialtyDurationMetric, "הר״י")
            }
          : null;
      }

      const duration =
        averageMetric(departments, "medianResidencyDurationMonths") ??
        averageMetric(departments, "actualAverageDuration") ??
        averageMetric(departments, "officialResidencyDuration") ??
        average(departments.map((department) => parseMonths(department.medianResidencyLength)));
      return duration !== null ? `${formatNumber(duration)} חודשים` : null;
    }
  },
  {
    key: "medianWaitingTime",
    label: "זמן המתנה חציוני לתקן",
    description: "הזמן החציוני מקבלת רישיון ועד לתחילת התמחות בכלל הארץ",
    unit: "months",
    sourceLabel: "משרד הבריאות",
    calculate: (departments, context) => {
      const specialtyWaitingMetric = contextMetric(context, "זמן_המתנה_חציוני_לתקן", "medianWaitingTime");
      if (specialtyWaitingMetric) {
        const displayValue = formatMetricValue(specialtyWaitingMetric);
        return displayValue
          ? {
              value: displayValue,
              sourceLabel: sourceLabelForMetric(specialtyWaitingMetric, "משרד הבריאות"),
              metricLevel: "ארצי לתחום"
            }
          : null;
      }

      const value = averageMetric(departments, "medianWaitingTime");
      return value !== null
        ? {
            value: formatNumberWithUnit(value, "months"),
            sourceLabel: "משרד הבריאות",
            metricLevel: "מחושב"
          }
        : null;
    }
  },
  {
    key: "acceptanceDistribution",
    label: "התפלגות מציאת התמחות",
    description: "התפלגות דיווחי מציאת התמחות לפי משך המתנה",
    unit: "count",
    sourceLabel: "משרד הבריאות",
    calculate: (departments, context) => {
      const rows = acceptanceDistributionRows(departments, context);
      return rows.length > 0
        ? {
            value: rows.map((row) => `${row.label}: ${row.displayValue}`).join(" · "),
            sourceLabel: "משרד הבריאות",
            metricLevel: "ארצי לתחום"
          }
        : null;
    }
  },
  {
    key: "boardPassA",
    label: "שיעור מעבר שלב א׳",
    description: "ממוצע מעבר בחינות שלב א׳",
    unit: "%",
    sourceLabel: "משרד הבריאות",
    calculate: (departments, context) => {
      const specialtyBoardMetric = contextMetric(context, "מעבר_שלב_א", "boardStageAPassRate");
      if (specialtyBoardMetric) {
        const displayValue = formatMetricValue(specialtyBoardMetric);
        return displayValue
          ? {
              value: displayValue,
              sourceLabel: sourceLabelForMetric(specialtyBoardMetric, "משרד הבריאות")
            }
          : null;
      }

      const value =
        averageMetric(departments, "boardStageAPassRate") ??
        averageMetric(departments, "inherited_boardStageAPassRate") ??
        average(departments.map((department) => department.shlavAlephPassRate));
      return value !== null ? `${formatNumber(value)}%` : null;
    }
  },
  {
    key: "boardPassB",
    label: "שיעור מעבר שלב ב׳",
    description: "ממוצע מעבר בחינות שלב ב׳",
    unit: "%",
    sourceLabel: "משרד הבריאות",
    calculate: (departments, context) => {
      const specialtyBoardMetric = contextMetric(context, "מעבר_שלב_ב", "boardStageBPassRate");
      if (specialtyBoardMetric) {
        const displayValue = formatMetricValue(specialtyBoardMetric);
        return displayValue
          ? {
              value: displayValue,
              sourceLabel: sourceLabelForMetric(specialtyBoardMetric, "משרד הבריאות")
            }
          : null;
      }

      const value =
        averageMetric(departments, "boardStageBPassRate") ??
        averageMetric(departments, "inherited_boardStageBPassRate") ??
        average(departments.map((department) => department.shlavBetPassRate));
      return value !== null ? `${formatNumber(value)}%` : null;
    }
  },
  {
    key: "burnoutIndex",
    label: "מדד שחיקה",
    description: "מדד שחיקה מיובא ברמת תחום ההתמחות",
    unit: "score",
    sourceLabel: "דיווחי מתמחים משרד הבריאות",
    calculate: (departments, context) => {
      const specialtyBurnoutMetric = contextMetric(context, "מדד_שחיקה", "burnoutIndex");
      if (specialtyBurnoutMetric) {
        const displayValue = formatMetricValue(specialtyBurnoutMetric);
        return displayValue
          ? {
              value: displayValue,
              sourceLabel: sourceLabelForMetric(specialtyBurnoutMetric, "דיווחי מתמחים משרד הבריאות")
            }
          : null;
      }

      const value = averageMetric(departments, "burnoutIndex");
      return value !== null
        ? {
            value: formatNumber(value),
            sourceLabel: "דיווחי מתמחים משרד הבריאות"
          }
        : null;
    }
  },
  {
    key: "salaryGap",
    label: "פער שכר פריפריה",
    description: "פער השכר המיובא בין מסלול פריפריה למסלול שאינו פריפריה",
    unit: "text",
    sourceLabel: "דיווחי מתמחים משרד הבריאות",
    calculate: (_departments, context) => {
      const {
        centerSalary: centerMetric,
        peripherySalary: peripheryMetric,
        salaryGap: gapMetric
      } = resolveImportedSalaryMetrics(context.specialtyMetrics ?? [], {
        entityLabel: "specialty salary dashboard",
        logMissing: true
      });
      const displayGap =
        formatSalaryMetricValue(gapMetric) ??
        (typeof centerMetric?.value === "number" && typeof peripheryMetric?.value === "number"
          ? formatSalaryMetricValue({
              metricKey: "פער_שכר_פריפריה",
              value: peripheryMetric.value - centerMetric.value,
              rawValue: null,
              unit: "currency"
            })
          : null);

      if (!displayGap) {
        return null;
      }

      const details = [
        centerMetric ? `שכר לא פריפריה: ${formatMetricValue(centerMetric) ?? missingMetricValue}` : null,
        peripheryMetric ? `שכר פריפריה: ${formatMetricValue(peripheryMetric) ?? missingMetricValue}` : null
      ].filter(Boolean);

      return {
        value: displayGap,
        sourceLabel: sourceLabelForMetric(
          gapMetric ?? peripheryMetric ?? centerMetric,
          "דיווחי מתמחים משרד הבריאות"
        ),
        tooltip: details.length > 0 ? details.join(" · ") : undefined
      };
    }
  },
  {
    key: "centerSalary",
    label: "שכר מרכז",
    description: "שכר למתמחה במסלול שאינו מוגדר פריפריה",
    unit: "text",
    sourceLabel: "סימולטור שכר של הר״י",
    calculate: (_departments, context) => {
      const { centerSalary: centerMetric } = resolveImportedSalaryMetrics(context.specialtyMetrics ?? [], {
        entityLabel: "specialty center salary",
        logMissing: true
      });
      const displayValue = formatSalaryMetricValue(centerMetric);

      return displayValue
        ? {
            value: displayValue,
            sourceLabel: sourceLabelForMetric(centerMetric, "סימולטור שכר של הר״י"),
            metricLevel: "ארצי לתחום"
          }
        : null;
    }
  },
  {
    key: "peripherySalary",
    label: "שכר פריפריה",
    description: "שכר למתמחה במסלול שמוגדר פריפריה",
    unit: "text",
    sourceLabel: "סימולטור שכר של הר״י",
    calculate: (_departments, context) => {
      const { peripherySalary: peripheryMetric } = resolveImportedSalaryMetrics(context.specialtyMetrics ?? [], {
        entityLabel: "specialty periphery salary",
        logMissing: true
      });
      const displayValue = formatSalaryMetricValue(peripheryMetric);

      return displayValue
        ? {
            value: displayValue,
            sourceLabel: sourceLabelForMetric(peripheryMetric, "סימולטור שכר של הר״י"),
            metricLevel: "ארצי לתחום"
          }
        : null;
    }
  },
  {
    key: "newResidentsTrend",
    label: "מתמחים חדשים",
    description: "מספר מתמחים חדשים לפי שנים 2020-2024",
    unit: "count",
    sourceLabel: "משרד הבריאות",
    calculate: (departments, context) => {
      const rows = yearlyValueRows(departments, context, 2020, 2024);
      return rows.length > 0
        ? rows.map((row) => `${row.year}: ${row.displayValue}`).join(" · ")
        : null;
    }
  },
  {
    key: "expectedOpenings",
    label: "צפי תקנים",
    description: "צפי תקנים חדשים לפי נתוני ייבוא זמינים",
    unit: "count",
    sourceLabel: "משרד הבריאות",
    calculate: (departments, context) => {
      const specialtyExpected = contextMetric(
        context,
        "מספר_תקנים_שצפויים להיפתח_ארצי",
        "expectedNationalOpenings"
      );
      if (specialtyExpected) {
        const displayValue = formatMetricValue(specialtyExpected);
        return displayValue
          ? {
              value: displayValue,
              sourceLabel: sourceLabelForMetric(specialtyExpected, "משרד הבריאות")
            }
          : null;
      }

      const departmentExpectedTotal = sumMetric(departments, "expectedOpenings2026");
      if (departmentExpectedTotal !== null) {
        return `${formatNumber(departmentExpectedTotal)} ב-2026`;
      }

      const yearlyExpectedTotal = sum(
        departments.map((department) => {
          const metric = department.yearlyMetrics?.find(
            (item) => item.metricKey === "newResidents" && item.year === 2026
          );
          return metric?.value;
        })
      );

      return yearlyExpectedTotal !== null ? `${formatNumber(yearlyExpectedTotal)} ב-2026` : null;
    }
  },
  {
    key: "israelVsAbroad",
    label: "בוגרי ישראל / חו״ל",
    description: "התפלגות מקום לימודים כשקיימים נתונים",
    unit: "%",
    sourceLabel: "משרד הבריאות",
    calculate: (departments) => {
      const israelAverage =
        averageMetric(departments, "israelGraduatesPercent") ??
        average(departments.map((department) => parseEducationBreakdown(department.educationLocationBreakdown)?.israel));
      return israelAverage !== null ? `${formatNumber(israelAverage)}% ישראל` : null;
    }
  },
  {
    key: "dutyLoad",
    label: "עומס ואיזון חיים",
    description: "ממוצע חוויות משתמשים לגבי עומס ואיזון",
    unit: "score",
    sourceLabel: "חוויות משתמשים",
    calculate: (departments) => {
      const value = average(departments.map((department) => department.lifestyleBalance));
      return value !== null ? `${formatNumber(value)} / 5` : null;
    }
  },
  {
    key: "researchExposure",
    label: "חשיפה למחקר",
    description: "ממוצע חשיפה למחקר ושיוך הזדמנויות מחקר",
    unit: "score",
    sourceLabel: "חוויות משתמשים",
    calculate: (departments) => {
      const value = average(departments.map((department) => department.researchExposure));
      if (value !== null) return `${formatNumber(value)} / 5`;
      const activeDepartments = departments.filter((department) => department.hasResearch).length;
      return activeDepartments > 0 ? `${activeDepartments} מחלקות עם מחקר` : null;
    }
  },
  {
    key: "residentToAttendingRatio",
    label: "יחס מתמחים לבכירים",
    description: "יחס משוער בין מספר מתמחים פעילים לבכירים",
    unit: "ratio",
    sourceLabel: "משרד הבריאות",
    calculate: (departments) => {
      const residents =
        sumMetric(departments, "activeResidentsCount") ??
        sum(departments.map((department) => department.residentsCount));
      const attendings = sumMetric(departments, "seniorPhysiciansCount");

      if (residents === null || attendings === null || attendings <= 0) return null;

      return `${formatNumber(residents / attendings)} מתמחים לבכיר`;
    }
  },
  {
    key: "duns100PhysiciansCount",
    label: "מספר רופאים ב-DUNS100",
    description: "רופאים שנספרו מייבוא DUNS100 מאושר",
    unit: "count",
    sourceLabel: "DUNS100",
    calculate: (departments) => {
      const total = sumMetric(departments, "duns100PhysiciansCount");
      return total !== null ? formatNumber(total) : null;
    }
  },
  {
    key: "userRating",
    label: "דירוג משתמשים",
    description: "ממוצע המלצה כללית מחוויות מאושרות",
    unit: "score",
    sourceLabel: "חוויות משתמשים",
    calculate: (departments) => {
      const reviewedDepartments = departments.filter((department) => (department.reviewCount ?? 0) > 0);
      const value = average(reviewedDepartments.map((department) => department.averageOverall));
      return value !== null ? `${formatNumber(value)} / 5` : null;
    }
  },
  {
    key: "applicationsPerPosition",
    label: "מועמדויות לכל תקן",
    description: "יוצג כשנתוני תקנים ומועמדויות יהיו זמינים לציבור",
    unit: "ratio",
    sourceLabel: "נתוני האתר",
    calculate: () => null
  },
  {
    key: "custom",
    label: "מדד מותאם",
    description: "שמירה למדדים עתידיים לפי תחום",
    unit: "text",
    sourceLabel: "נתוני האתר",
    calculate: () => null
  }
];

export function isSpecialtyMetricKey(value: unknown): value is SpecialtyMetricKey {
  return typeof value === "string" && specialtyMetricKeys.includes(value as SpecialtyMetricKey);
}

export function normalizeMetricKeys(value: unknown, fallback: SpecialtyMetricKey[]) {
  if (!Array.isArray(value)) return fallback;
  const keys = value.filter(isSpecialtyMetricKey);
  return keys.length > 0 ? Array.from(new Set(keys)) : fallback;
}

export function orderedMetricKeys(enabled: SpecialtyMetricKey[], order: SpecialtyMetricKey[]) {
  const ordered = order.filter((key) => enabled.includes(key));
  const missing = enabled.filter((key) => !ordered.includes(key));
  return [...ordered, ...missing];
}

export function calculateSpecialtyMetrics(
  departments: SpecialtyMetricDepartment[],
  enabledMetrics: SpecialtyMetricKey[],
  displayOrder: SpecialtyMetricKey[],
  context: SpecialtyMetricContext = {}
): SpecialtyMetricResult[] {
  const orderedKeys = orderedMetricKeys(enabledMetrics, displayOrder);

  return orderedKeys.reduce<SpecialtyMetricResult[]>((results, key) => {
    const definition = specialtyMetricDefinitions.find((metric) => metric.key === key);
    if (!definition) return results;
    const metadataKeys = definition.metadataKeys ?? dashboardMetricDataExpKeys[key] ?? [definition.key];
    const metadata = resolveMetricDisplayMetadata(
      context.dataExplanations ?? [],
      "MASTER_Spec",
      metadataKeys[0] ?? definition.key,
      metadataKeys.slice(1)
    );

    if (metadata?.isHidden) return results;

    const calculated = definition.calculate(departments, context);
    const value = typeof calculated === "string" || calculated === null ? calculated : calculated.value;
    const calculatedSourceLabel =
      typeof calculated === "string" || calculated === null
        ? definition.sourceLabel
        : calculated.sourceLabel ?? definition.sourceLabel;
    const metadataExplanation = metadataTooltip(metadata, definition.description);

    results.push({
      key: definition.key,
      label: compositeDashboardLabels.has(definition.key)
        ? definition.label
        : metadata?.readableLabel ?? definition.label,
      description: metadataExplanation,
      value: value ?? missingMetricValue,
      unit: definition.unit,
      sourceLabel: metadataSourceLabel(metadata, calculatedSourceLabel ?? "מקור נתונים לא צוין"),
      sourceUrl: metadata?.sourceUrl,
      tooltip: metadataExplanation,
      displayAction: metadataDisplayAction(metadata),
      metricLevel:
        typeof calculated === "object" && calculated !== null && calculated.metricLevel
          ? calculated.metricLevel
          : metadata
            ? "ארצי לתחום"
            : "מחושב",
      isPlaceholder: value === null,
      isHighlighted: metadata?.isHighlighted,
      visualType: metadata?.visualType
    });

    return results;
  }, []);
}
