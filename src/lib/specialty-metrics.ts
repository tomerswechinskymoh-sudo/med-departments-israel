export const specialtyMetricKeys = [
  "activeResidents",
  "genderDistribution",
  "residencyDuration",
  "boardPassA",
  "boardPassB",
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
};

type SpecialtyMetricDefinition = {
  key: SpecialtyMetricKey;
  label: string;
  description: string;
  unit: SpecialtyMetricUnit;
  calculate: (departments: SpecialtyMetricDepartment[]) => string | null;
};

export const defaultSpecialtyDashboardMetrics: SpecialtyMetricKey[] = [
  "activeResidents",
  "genderDistribution",
  "residencyDuration",
  "boardPassA",
  "boardPassB",
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

function averageMetric(departments: SpecialtyMetricDepartment[], metricKey: string) {
  return average(departments.map((department) => externalMetricValue(department, metricKey)));
}

function sumMetric(departments: SpecialtyMetricDepartment[], metricKey: string) {
  return sum(departments.map((department) => externalMetricValue(department, metricKey)));
}

export const specialtyMetricDefinitions: SpecialtyMetricDefinition[] = [
  {
    key: "activeResidents",
    label: "מספר מתמחים פעילים",
    description: "סך מתמחים פעילים במחלקות התחום",
    unit: "count",
    calculate: (departments) => {
      const total =
        sumMetric(departments, "activeResidentsCount") ??
        sum(departments.map((department) => department.residentsCount));
      return total && total > 0 ? formatNumber(total) : null;
    }
  },
  {
    key: "genderDistribution",
    label: "איזון מגדרי",
    description: "ממוצע נשים/גברים מתוך מחלקות עם נתון זמין",
    unit: "%",
    calculate: (departments) => {
      const womenAverage =
        averageMetric(departments, "femaleResidentsPercent") ??
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
    calculate: (departments) => {
      const duration =
        averageMetric(departments, "medianResidencyDurationMonths") ??
        average(departments.map((department) => parseMonths(department.medianResidencyLength)));
      return duration ? `${formatNumber(duration)} חודשים` : null;
    }
  },
  {
    key: "boardPassA",
    label: "שיעור מעבר שלב א׳",
    description: "ממוצע מעבר בחינות שלב א׳",
    unit: "%",
    calculate: (departments) => {
      const value =
        averageMetric(departments, "boardStageAPassRate") ??
        average(departments.map((department) => department.shlavAlephPassRate));
      return value ? `${formatNumber(value)}%` : null;
    }
  },
  {
    key: "boardPassB",
    label: "שיעור מעבר שלב ב׳",
    description: "ממוצע מעבר בחינות שלב ב׳",
    unit: "%",
    calculate: (departments) => {
      const value =
        averageMetric(departments, "boardStageBPassRate") ??
        average(departments.map((department) => department.shlavBetPassRate));
      return value ? `${formatNumber(value)}%` : null;
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
      return israelAverage ? `${formatNumber(israelAverage)}% ישראל` : null;
    }
  },
  {
    key: "dutyLoad",
    label: "עומס ואיזון חיים",
    description: "ממוצע חוויות משתמשים לגבי עומס ואיזון",
    unit: "score",
    calculate: (departments) => {
      const value = average(departments.map((department) => department.lifestyleBalance));
      return value ? `${formatNumber(value)} / 5` : null;
    }
  },
  {
    key: "researchExposure",
    label: "חשיפה למחקר",
    description: "ממוצע חשיפה למחקר ושיוך הזדמנויות מחקר",
    unit: "score",
    calculate: (departments) => {
      const value = average(departments.map((department) => department.researchExposure));
      if (value) return `${formatNumber(value)} / 5`;
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

      if (!residents || !attendings || attendings <= 0) return null;

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
      return total && total > 0 ? formatNumber(total) : null;
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
      return value ? `${formatNumber(value)} / 5` : null;
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
  displayOrder: SpecialtyMetricKey[]
): SpecialtyMetricResult[] {
  const orderedKeys = orderedMetricKeys(enabledMetrics, displayOrder);

  return orderedKeys.reduce<SpecialtyMetricResult[]>((results, key) => {
    const definition = specialtyMetricDefinitions.find((metric) => metric.key === key);
    if (!definition) return results;

    const value = definition.calculate(departments);

    if (!value && key === "duns100PhysiciansCount") {
      return results;
    }

    results.push({
      key: definition.key,
      label: definition.label,
      description: definition.description,
      value: value ?? "אין מספיק נתונים",
      unit: definition.unit,
      isPlaceholder: !value
    });

    return results;
  }, []);
}
