import {
  LICENSE_TO_RESIDENCY_WAIT_TIME_LABEL,
  findMetricDisplayMetadata,
  normalizeCriterion,
  readableLabelFromCriterion,
  type DataExplanationSheet,
  type MetricDisplayMetadata
} from "@/lib/metric-display";
import { isSpreadsheetErrorValue } from "@/lib/spreadsheet-errors";

export type ImportedMetricLike = {
  metricKey: string;
  label?: string | null;
  value: number | null;
  rawValue?: string | null;
  unit?: string | null;
  sourceNotes?: string | null;
  lastUpdated?: string | Date | null;
};

export type ImportedYearlyMetricLike = {
  metricKey: string;
  year: number;
  value: number | null;
  rawValue?: string | null;
  unit?: string | null;
  sourceNotes?: string | null;
  lastUpdated?: string | Date | null;
};

type MetricFieldDefinition = {
  label: string;
  importedKeys: string[];
  dbKeys: string[];
  uiCards: string[];
  legacyKeys?: string[];
  years?: number[];
};

export const metricFieldDefinitions = {
  centerSalary: {
    label: "שכר מרכז",
    importedKeys: ["שכר_לא_פריפריה"],
    dbKeys: ["שכר_לא_פריפריה"],
    uiCards: ["specialtyDashboard.salaryGap", "departmentSidebar.centerSalary", "departmentSidebar.salaryGap"],
    legacyKeys: ["centerSalary"]
  },
  peripherySalary: {
    label: "שכר פריפריה",
    importedKeys: ["שכר_פריפריה", "שכר_פריפריה 1"],
    dbKeys: ["שכר_פריפריה", "שכר_פריפריה 1"],
    uiCards: ["specialtyDashboard.salaryGap", "departmentSidebar.peripherySalary", "departmentSidebar.salaryGap"],
    legacyKeys: ["peripherySalary"]
  },
  peripherySalaryGap: {
    label: "פער שכר",
    importedKeys: ["פער_שכר_פריפריה"],
    dbKeys: ["פער_שכר_פריפריה"],
    uiCards: ["specialtyDashboard.salaryGap", "departmentSidebar.salaryGap"],
    legacyKeys: ["peripherySalaryGap", "salaryGap"]
  },
  residentsCount: {
    label: "מספר מתמחים",
    importedKeys: ["מספר_מתמחים"],
    dbKeys: ["מספר_מתמחים"],
    uiCards: ["specialtyDashboard.activeResidents", "departmentMain.residentsCount"],
    legacyKeys: ["residentsCount", "activeResidentsCount"]
  },
  medianWaitingTime: {
    label: LICENSE_TO_RESIDENCY_WAIT_TIME_LABEL,
    importedKeys: ["זמן_המתנה_חציוני_לתקן"],
    dbKeys: ["זמן_המתנה_חציוני_לתקן"],
    uiCards: ["specialtyDashboard.medianWaitingTime", "departmentMain.medianWaitingTime"],
    legacyKeys: ["medianWaitingTime"]
  },
  officialResidencyDuration: {
    label: "משך התמחות רשמי",
    importedKeys: ["משך_התמחות_רשמי", "משך_התמחות_רשמי (שנים)"],
    dbKeys: ["משך_התמחות_רשמי", "משך_התמחות_רשמי (שנים)"],
    uiCards: ["specialtyDashboard.residencyDuration", "departmentMain.officialResidencyDuration"],
    legacyKeys: ["officialResidencyDuration"]
  },
  actualAverageDuration: {
    label: "משך ממוצע בפועל",
    importedKeys: ["משך_ממוצע_בפועל"],
    dbKeys: ["משך_ממוצע_בפועל"],
    uiCards: ["specialtyDashboard.residencyDuration", "departmentMain.actualAverageDuration"],
    legacyKeys: ["actualAverageDuration", "medianResidencyDurationMonths"]
  },
  seniorPhysiciansCount: {
    label: "מספר בכירים",
    importedKeys: ["מספר_בכירים"],
    dbKeys: ["seniorPhysiciansCount"],
    uiCards: ["departmentMain.seniorPhysiciansCount"]
  },
  duns100PhysiciansCount: {
    label: "DUNS100",
    importedKeys: ["DUNS100"],
    dbKeys: ["duns100PhysiciansCount"],
    uiCards: ["specialtyDashboard.duns100PhysiciansCount", "departmentSidebar.duns100PhysiciansCount"]
  },
  departmentalPublicationsCount: {
    label: "מספר פרסומים מחלקתי",
    importedKeys: ["מספר פרסומים מחלקתי"],
    dbKeys: ["departmentalPublicationsCount"],
    uiCards: ["departmentResearch.publicationsCount"]
  },
  acceptedImmediatelyReports: {
    label: "מצאו התמחות מיד",
    importedKeys: ["מספר המתקבלים שדיווחו שמצאו מיד התמחות"],
    dbKeys: ["acceptedImmediatelyReports"],
    uiCards: ["specialtyDashboard.acceptanceDistribution", "departmentMain.acceptanceDistribution"]
  },
  acceptedWithinSixMonthsReports: {
    label: "מצאו עד חצי שנה",
    importedKeys: ["מספר המתקבלים שדיווחו שמצאו עד חצי שנה"],
    dbKeys: ["acceptedWithinSixMonthsReports"],
    uiCards: ["specialtyDashboard.acceptanceDistribution", "departmentMain.acceptanceDistribution"]
  },
  acceptedWithinOneYearReports: {
    label: "מצאו עד שנה",
    importedKeys: ["מספר המתקבלים שדיווחו שמצאו עד שנה"],
    dbKeys: ["acceptedWithinOneYearReports"],
    uiCards: ["specialtyDashboard.acceptanceDistribution", "departmentMain.acceptanceDistribution"]
  },
  acceptedWithinTwoYearsReports: {
    label: "מצאו עד שנתיים",
    importedKeys: ["מספר המתקבלים שדיווחו שמצאו עד שנתיים"],
    dbKeys: ["acceptedWithinTwoYearsReports"],
    uiCards: ["specialtyDashboard.acceptanceDistribution", "departmentMain.acceptanceDistribution"]
  },
  acceptedAfterTwoYearsReports: {
    label: "מצאו אחרי שנתיים",
    importedKeys: ["מספר המתקבלים שדיווחו שמצאו אחרי שנתיים"],
    dbKeys: ["acceptedAfterTwoYearsReports"],
    uiCards: ["specialtyDashboard.acceptanceDistribution", "departmentMain.acceptanceDistribution"]
  },
  newResidents2020: {
    label: "מספר מתמחים חדשים 2020",
    importedKeys: ["מספר מתמחים חדשים 2020"],
    dbKeys: ["newResidents"],
    uiCards: ["specialtyDashboard.newResidentsTrend", "departmentMain.newResidentsTrend"],
    years: [2020]
  },
  newResidents2021: {
    label: "מספר מתמחים חדשים 2021",
    importedKeys: ["מספר מתמחים חדשים 2021"],
    dbKeys: ["newResidents"],
    uiCards: ["specialtyDashboard.newResidentsTrend", "departmentMain.newResidentsTrend"],
    years: [2021]
  },
  newResidents2022: {
    label: "מספר מתמחים חדשים 2022",
    importedKeys: ["מספר מתמחים חדשים 2022"],
    dbKeys: ["newResidents"],
    uiCards: ["specialtyDashboard.newResidentsTrend", "departmentMain.newResidentsTrend"],
    years: [2022]
  },
  newResidents2023: {
    label: "מספר מתמחים חדשים 2023",
    importedKeys: ["מספר מתמחים חדשים 2023"],
    dbKeys: ["newResidents"],
    uiCards: ["specialtyDashboard.newResidentsTrend", "departmentMain.newResidentsTrend"],
    years: [2023]
  },
  newResidents2024: {
    label: "מספר מתמחים חדשים 2024",
    importedKeys: ["מספר מתמחים חדשים 2024"],
    dbKeys: ["newResidents"],
    uiCards: ["specialtyDashboard.newResidentsTrend", "departmentMain.newResidentsTrend"],
    years: [2024]
  },
  newResidents2026: {
    label: "מספר מתמחים חדשים 2026",
    importedKeys: ["מספר מתמחים חדשים 2026"],
    dbKeys: ["newResidents"],
    uiCards: ["departmentMain.expectedOpenings"],
    years: [2026]
  },
  newResidents: {
    label: "מספר מתמחים חדשים",
    importedKeys: ["מספר מתמחים חדשים"],
    dbKeys: ["newResidents"],
    uiCards: ["specialtyDashboard.newResidentsTrend", "departmentMain.newResidentsTrend"]
  },
  womenPercent: {
    label: "אחוז נשים",
    importedKeys: ["אחוז_נשים"],
    dbKeys: ["womenPercent"],
    uiCards: ["specialtyDashboard.genderDistribution", "departmentMain.genderBalance"],
    legacyKeys: ["femaleResidentsPercent"]
  },
  menPercent: {
    label: "אחוז גברים",
    importedKeys: ["אחוז_גברים"],
    dbKeys: ["menPercent"],
    uiCards: ["specialtyDashboard.genderDistribution", "departmentMain.genderBalance"],
    legacyKeys: ["maleResidentsPercent"]
  },
  womenCount: {
    label: "מספר נשים",
    importedKeys: ["מספר נשים"],
    dbKeys: ["womenCount"],
    uiCards: ["specialtyDashboard.genderDistribution", "departmentMain.genderBalance"]
  },
  menCount: {
    label: "מספר גברים",
    importedKeys: ["מספר גברים"],
    dbKeys: ["menCount"],
    uiCards: ["specialtyDashboard.genderDistribution", "departmentMain.genderBalance"]
  },
  boardStageAPassRate: {
    label: "מעבר שלב א׳",
    importedKeys: ["מעבר_שלב_א"],
    dbKeys: ["boardStageAPassRate"],
    uiCards: ["specialtyDashboard.boardPassA", "departmentSidebar.boardStageA"],
    legacyKeys: ["inherited_boardStageAPassRate"]
  },
  boardStageBPassRate: {
    label: "מעבר שלב ב׳",
    importedKeys: ["מעבר_שלב_ב"],
    dbKeys: ["boardStageBPassRate"],
    uiCards: ["specialtyDashboard.boardPassB", "departmentSidebar.boardStageB"],
    legacyKeys: ["inherited_boardStageBPassRate"]
  },
  burnoutIndex: {
    label: "מדד שחיקה",
    importedKeys: ["מדד_שחיקה"],
    dbKeys: ["burnoutIndex"],
    uiCards: ["specialtyDashboard.burnoutIndex", "departmentSidebar.burnoutIndex"]
  },
  expectedNationalOpenings: {
    label: "מספר משרות שצפויות להיפתח ארצי",
    importedKeys: ["מספר_תקנים_שצפויים להיפתח_ארצי"],
    dbKeys: ["expectedNationalOpenings"],
    uiCards: ["specialtyDashboard.expectedOpenings"]
  },
  expectedOpenings2026: {
    label: "צפי משרות חדשות ב-2026",
    importedKeys: ["צפי תקנים חדשים ב2026"],
    dbKeys: ["expectedOpenings2026"],
    uiCards: ["departmentMain.expectedOpenings"]
  },
  medianElectiveDemand: {
    label: "מספר אלקטיביסטים חציוני",
    importedKeys: ["מספר אלקטיביסטים חציוני"],
    dbKeys: ["medianElectiveDemand"],
    uiCards: ["departmentMain.electiveDemand"]
  }
} satisfies Record<string, MetricFieldDefinition>;

export type CanonicalMetricField = keyof typeof metricFieldDefinitions;
export type MetricRegistryEntry = MetricFieldDefinition & { id: CanonicalMetricField };

export const salaryMetricFields = {
  centerSalary: "שכר_לא_פריפריה",
  peripherySalary: "שכר_פריפריה",
  salaryGap: "פער_שכר_פריפריה"
} as const;

const normalizedFieldByImportedKey = Object.entries(metricFieldDefinitions).reduce<Record<string, CanonicalMetricField>>(
  (map, [field, definition]) => {
    for (const key of definition.importedKeys) {
      map[normalizeCriterion(key)] = field as CanonicalMetricField;
      map[normalizeCriterion(readableLabelFromCriterion(key))] = field as CanonicalMetricField;
    }

    return map;
  },
  {}
);

function isCanonicalMetricField(value: string): value is CanonicalMetricField {
  return value in metricFieldDefinitions;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function metricRegistryEntries(): MetricRegistryEntry[] {
  return Object.entries(metricFieldDefinitions).map(([id, definition]) => ({
    id: id as CanonicalMetricField,
    ...definition
  }));
}

export function metricRegistryEntryFor(fieldOrKey: string): MetricRegistryEntry | null {
  const field = canonicalMetricFieldFor(fieldOrKey);
  return field
    ? {
        id: field,
        ...metricFieldDefinitions[field]
      }
    : null;
}

export function canonicalMetricFieldFor(value: string) {
  if (isCanonicalMetricField(value)) return value;

  return normalizedFieldByImportedKey[normalizeCriterion(value)] ?? null;
}

export function metricFieldLabel(fieldOrKey: string) {
  const field = canonicalMetricFieldFor(fieldOrKey);
  if (field) return metricFieldDefinitions[field].label;

  return readableLabelFromCriterion(fieldOrKey);
}

export function metricKeyCandidates(fieldOrKey: string, aliases: string[] = []) {
  const field = canonicalMetricFieldFor(fieldOrKey);
  const definition: MetricFieldDefinition | null = field ? metricFieldDefinitions[field] : null;
  const exact = definition?.importedKeys ?? [fieldOrKey];
  const readableExact = exact.map(readableLabelFromCriterion);
  const registeredDbKeys = definition ? [...definition.dbKeys, ...(definition.legacyKeys ?? [])] : [];

  return {
    exact: unique([...exact, ...readableExact]),
    aliases: definition ? unique([...registeredDbKeys]) : unique([fieldOrKey, ...aliases])
  };
}

function hasMetricValue(metric: ImportedMetricLike | ImportedYearlyMetricLike | null | undefined) {
  return Boolean(
    metric &&
      ((typeof metric.value === "number" && Number.isFinite(metric.value)) ||
        (typeof metric.rawValue === "string" &&
          metric.rawValue.trim().length > 0 &&
          !isSpreadsheetErrorValue(metric.rawValue)))
  );
}

function metricMatchesCandidate(metric: ImportedMetricLike | ImportedYearlyMetricLike, candidate: string) {
  const normalizedCandidate = normalizeCriterion(candidate);
  const normalizedReadableCandidate = normalizeCriterion(readableLabelFromCriterion(candidate));
  const values = [
    metric.metricKey,
    "label" in metric && typeof metric.label === "string" ? metric.label : null,
    readableLabelFromCriterion(metric.metricKey)
  ].filter((value): value is string => Boolean(value));

  return values.some((value) => {
    if (value === candidate) return true;
    const normalizedValue = normalizeCriterion(value);
    return normalizedValue === normalizedCandidate || normalizedValue === normalizedReadableCandidate;
  });
}

function findMetricByCandidates<T extends ImportedMetricLike | ImportedYearlyMetricLike>(
  metrics: T[],
  candidates: string[],
  options: { year?: number } = {}
) {
  for (const candidate of candidates) {
    const match = metrics.find(
      (metric) =>
        (options.year === undefined || ("year" in metric && metric.year === options.year)) &&
        hasMetricValue(metric) &&
        metricMatchesCandidate(metric, candidate)
    );

    if (match) return match;
  }

  return null;
}

export function availableImportedMetricKeys(metrics: ImportedMetricLike[] | ImportedYearlyMetricLike[]) {
  return metrics.map((metric) =>
    "label" in metric && metric.label
      ? `${metric.metricKey} (${metric.label})`
      : "year" in metric
        ? `${metric.metricKey} ${metric.year}`
        : metric.metricKey
  );
}

function logMissingMetric(input: {
  fieldOrKey: string;
  aliases?: string[];
  entityLabel?: string;
  metrics: ImportedMetricLike[] | ImportedYearlyMetricLike[];
}) {
  if (process.env.NODE_ENV === "production") return;

  console.warn(
    `[metric-resolver] Missing "${input.fieldOrKey}"${
      input.entityLabel ? ` for ${input.entityLabel}` : ""
    }. Available keys: ${availableImportedMetricKeys(input.metrics).join(", ") || "none"}`
  );
}

export function resolveImportedMetric(
  metrics: ImportedMetricLike[],
  fieldOrKey: string,
  options: { aliases?: string[]; entityLabel?: string; logMissing?: boolean } = {}
) {
  const candidates = metricKeyCandidates(fieldOrKey, options.aliases);
  const exactMatch = findMetricByCandidates(metrics, candidates.exact);
  if (exactMatch) return exactMatch;

  const aliasMatch = findMetricByCandidates(metrics, candidates.aliases);
  if (aliasMatch) return aliasMatch;

  if (options.logMissing) {
    logMissingMetric({
      fieldOrKey,
      aliases: options.aliases,
      entityLabel: options.entityLabel,
      metrics
    });
  }

  return null;
}

export function resolveImportedMetricNumber(
  metrics: ImportedMetricLike[],
  fieldOrKey: string,
  options: { aliases?: string[]; entityLabel?: string; logMissing?: boolean } = {}
) {
  const metric = resolveImportedMetric(metrics, fieldOrKey, options);
  return typeof metric?.value === "number" && Number.isFinite(metric.value) ? metric.value : null;
}

export function resolveImportedSalaryMetrics(
  metrics: ImportedMetricLike[],
  options: { entityLabel?: string; logMissing?: boolean } = {}
) {
  return {
    centerSalary: resolveImportedMetric(metrics, salaryMetricFields.centerSalary, {
      aliases: ["centerSalary"],
      entityLabel: options.entityLabel,
      logMissing: options.logMissing
    }),
    peripherySalary: resolveImportedMetric(metrics, salaryMetricFields.peripherySalary, {
      aliases: ["שכר_פריפריה 1", "peripherySalary"],
      entityLabel: options.entityLabel,
      logMissing: options.logMissing
    }),
    salaryGap: resolveImportedMetric(metrics, salaryMetricFields.salaryGap, {
      aliases: ["peripherySalaryGap", "salaryGap"],
      entityLabel: options.entityLabel,
      logMissing: options.logMissing
    })
  };
}

export function resolveImportedYearlyMetric(
  metrics: ImportedYearlyMetricLike[],
  fieldOrKey: string,
  options: { aliases?: string[]; entityLabel?: string; year?: number; beforeYear?: number; logMissing?: boolean } = {}
) {
  const candidates = metricKeyCandidates(fieldOrKey, options.aliases);
  const matchingYear = (rows: ImportedYearlyMetricLike[]) =>
    rows
      .filter((metric) => (options.year ? metric.year === options.year : true))
      .filter((metric) => (options.beforeYear ? metric.year < options.beforeYear : true))
      .sort((left, right) => right.year - left.year);

  const exactMatch = matchingYear(metrics).find(
    (metric) => hasMetricValue(metric) && candidates.exact.some((candidate) => metricMatchesCandidate(metric, candidate))
  );
  if (exactMatch) return exactMatch;

  const aliasMatch = matchingYear(metrics).find(
    (metric) => hasMetricValue(metric) && candidates.aliases.some((candidate) => metricMatchesCandidate(metric, candidate))
  );
  if (aliasMatch) return aliasMatch;

  if (options.logMissing) {
    logMissingMetric({
      fieldOrKey,
      aliases: options.aliases,
      entityLabel: options.entityLabel,
      metrics
    });
  }

  return null;
}

export function resolveMetricDisplayMetadata(
  metadata: MetricDisplayMetadata[],
  sheet: DataExplanationSheet,
  fieldOrKey: string,
  aliases: string[] = []
) {
  const candidates = metricKeyCandidates(fieldOrKey, aliases);
  const exactNormalized = candidates.exact.flatMap((candidate) => [
    normalizeCriterion(candidate),
    normalizeCriterion(readableLabelFromCriterion(candidate))
  ]);
  const exactMatch = metadata.find(
    (item) => item.sheet === sheet && exactNormalized.includes(item.normalizedCriterion)
  );

  if (exactMatch) return exactMatch;

  return findMetricDisplayMetadata(metadata, sheet, ...candidates.aliases);
}
