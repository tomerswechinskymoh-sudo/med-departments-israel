export const specialtyMetricKeys = [
  "programsCount",
  "activeResidents",
  "genderDistribution",
  "residencyDuration",
  "boardPassA",
  "boardPassB",
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
  isPlaceholder?: boolean;
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
};

export type SpecialtyImportedYearlyMetric = {
  metricKey: string;
  year: number;
  value: number | null;
  rawValue?: string | null;
  unit?: string | null;
};

export type SpecialtyMetricContext = {
  specialtyMetrics?: SpecialtyImportedMetric[];
  specialtyYearlyMetrics?: SpecialtyImportedYearlyMetric[];
};

type SpecialtyMetricDefinition = {
  key: SpecialtyMetricKey;
  label: string;
  description: string;
  unit: SpecialtyMetricUnit;
  calculate: (
    departments: SpecialtyMetricDepartment[],
    context: SpecialtyMetricContext
  ) => string | null;
};

export const defaultSpecialtyDashboardMetrics: SpecialtyMetricKey[] = [
  "programsCount",
  "activeResidents",
  "genderDistribution",
  "residencyDuration",
  "boardPassA",
  "boardPassB",
  "newResidentsTrend",
  "expectedOpenings",
  "duns100PhysiciansCount"
];

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
  return (
    context.specialtyMetrics?.find(
      (metric) =>
        metricKeys.includes(metric.metricKey) &&
        (typeof metric.value === "number" || Boolean(metric.rawValue))
    ) ?? null
  );
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
    .filter((metric) => metric.metricKey === "newResidents")
    .filter((metric) => metric.year >= startYear && metric.year <= endYear)
    .filter((metric) => typeof metric.value === "number" || Boolean(metric.rawValue))
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
    calculate: (departments) => formatNumber(departments.length)
  },
  {
    key: "activeResidents",
    label: "מספר מתמחים פעילים",
    description: "סך מתמחים פעילים במחלקות התחום",
    unit: "count",
    calculate: (departments, context) => {
      const total =
        sumMetric(departments, "activeResidentsCount") ??
        sumMetric(departments, "residentsCount") ??
        contextMetricValue(context, "residentsCount", "activeResidentsCount") ??
        sum(departments.map((department) => department.residentsCount));
      return total !== null ? formatNumber(total) : null;
    }
  },
  {
    key: "genderDistribution",
    label: "איזון מגדרי",
    description: "ממוצע נשים/גברים מתוך מחלקות עם נתון זמין",
    unit: "%",
    calculate: (departments, context) => {
      const specialtyWomenMetric = contextMetric(context, "womenPercent", "femaleResidentsPercent");
      if (specialtyWomenMetric) {
        const displayValue = formatMetricValue(specialtyWomenMetric);
        return displayValue ? `${displayValue} נשים` : null;
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
    calculate: (departments, context) => {
      const specialtyDurationMetric = contextMetric(
        context,
        "actualAverageDuration",
        "officialResidencyDuration",
        "medianResidencyDurationMonths"
      );
      if (specialtyDurationMetric) {
        return formatMetricValue(specialtyDurationMetric);
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
    key: "boardPassA",
    label: "שיעור מעבר שלב א׳",
    description: "ממוצע מעבר בחינות שלב א׳",
    unit: "%",
    calculate: (departments, context) => {
      const specialtyBoardMetric = contextMetric(context, "boardStageAPassRate");
      if (specialtyBoardMetric) {
        return formatMetricValue(specialtyBoardMetric);
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
    calculate: (departments, context) => {
      const specialtyBoardMetric = contextMetric(context, "boardStageBPassRate");
      if (specialtyBoardMetric) {
        return formatMetricValue(specialtyBoardMetric);
      }

      const value =
        averageMetric(departments, "boardStageBPassRate") ??
        averageMetric(departments, "inherited_boardStageBPassRate") ??
        average(departments.map((department) => department.shlavBetPassRate));
      return value !== null ? `${formatNumber(value)}%` : null;
    }
  },
  {
    key: "newResidentsTrend",
    label: "מתמחים חדשים",
    description: "מספר מתמחים חדשים לפי שנים 2020-2024",
    unit: "count",
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
    calculate: (departments, context) => {
      const specialtyExpected = contextMetric(context, "expectedNationalOpenings");
      if (specialtyExpected) {
        return formatMetricValue(specialtyExpected);
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
    calculate: () => null
  },
  {
    key: "custom",
    label: "מדד מותאם",
    description: "שמירה למדדים עתידיים לפי תחום",
    unit: "text",
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

    const value = definition.calculate(departments, context);

    if (value === null && key === "duns100PhysiciansCount") {
      return results;
    }

    results.push({
      key: definition.key,
      label: definition.label,
      description: definition.description,
      value: value ?? "אין מספיק נתונים",
      unit: definition.unit,
      isPlaceholder: value === null
    });

    return results;
  }, []);
}
