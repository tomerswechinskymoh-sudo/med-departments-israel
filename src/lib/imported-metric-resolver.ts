import {
  findMetricDisplayMetadata,
  normalizeCriterion,
  readableLabelFromCriterion,
  type DataExplanationSheet,
  type MetricDisplayMetadata
} from "@/lib/metric-display";

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
  aliases?: string[];
};

export const metricFieldDefinitions = {
  centerSalary: {
    label: "שכר מרכז",
    importedKeys: ["שכר_לא_פריפריה"],
    aliases: ["centerSalary", "שכר לא פריפריה"]
  },
  peripherySalary: {
    label: "שכר פריפריה",
    importedKeys: ["שכר_פריפריה", "שכר_פריפריה 1"],
    aliases: ["peripherySalary", "שכר פריפריה"]
  },
  peripherySalaryGap: {
    label: "פער שכר",
    importedKeys: ["פער_שכר_פריפריה"],
    aliases: ["salaryGap", "peripherySalaryGap", "פער שכר פריפריה"]
  },
  residentsCount: {
    label: "מספר מתמחים",
    importedKeys: ["מספר_מתמחים"],
    aliases: ["residentsCount", "activeResidentsCount", "מספר מתמחים"]
  },
  medianWaitingTime: {
    label: "זמן המתנה חציוני לתקן",
    importedKeys: ["זמן_המתנה_חציוני_לתקן"],
    aliases: ["medianWaitingTime", "זמן המתנה חציוני לתקן"]
  },
  officialResidencyDuration: {
    label: "משך התמחות רשמי",
    importedKeys: ["משך_התמחות_רשמי", "משך_התמחות_רשמי (שנים)"],
    aliases: ["officialResidencyDuration", "משך התמחות רשמי"]
  },
  actualAverageDuration: {
    label: "משך ממוצע בפועל",
    importedKeys: ["משך_ממוצע_בפועל"],
    aliases: ["actualAverageDuration", "medianResidencyDurationMonths", "משך ממוצע בפועל"]
  },
  seniorPhysiciansCount: {
    label: "מספר בכירים",
    importedKeys: ["מספר_בכירים"],
    aliases: ["seniorPhysiciansCount", "מספר בכירים"]
  },
  duns100PhysiciansCount: {
    label: "DUNS100",
    importedKeys: ["DUNS100"],
    aliases: ["duns100PhysiciansCount", "רופאים ב-DUNS100"]
  },
  departmentalPublicationsCount: {
    label: "מספר פרסומים מחלקתי",
    importedKeys: ["מספר פרסומים מחלקתי"],
    aliases: ["departmentalPublicationsCount"]
  },
  acceptedImmediatelyReports: {
    label: "מצאו התמחות מיד",
    importedKeys: ["מספר המתקבלים שדיווחו שמצאו מיד התמחות"],
    aliases: ["acceptedImmediatelyReports"]
  },
  acceptedWithinSixMonthsReports: {
    label: "מצאו עד חצי שנה",
    importedKeys: ["מספר המתקבלים שדיווחו שמצאו עד חצי שנה"],
    aliases: ["acceptedWithinSixMonthsReports"]
  },
  acceptedWithinOneYearReports: {
    label: "מצאו עד שנה",
    importedKeys: ["מספר המתקבלים שדיווחו שמצאו עד שנה"],
    aliases: ["acceptedWithinOneYearReports"]
  },
  acceptedWithinTwoYearsReports: {
    label: "מצאו עד שנתיים",
    importedKeys: ["מספר המתקבלים שדיווחו שמצאו עד שנתיים"],
    aliases: ["acceptedWithinTwoYearsReports"]
  },
  acceptedAfterTwoYearsReports: {
    label: "מצאו אחרי שנתיים",
    importedKeys: ["מספר המתקבלים שדיווחו שמצאו אחרי שנתיים"],
    aliases: ["acceptedAfterTwoYearsReports"]
  },
  newResidents2020: {
    label: "מספר מתמחים חדשים 2020",
    importedKeys: ["מספר מתמחים חדשים 2020"],
    aliases: ["newResidents"]
  },
  newResidents2021: {
    label: "מספר מתמחים חדשים 2021",
    importedKeys: ["מספר מתמחים חדשים 2021"],
    aliases: ["newResidents"]
  },
  newResidents2022: {
    label: "מספר מתמחים חדשים 2022",
    importedKeys: ["מספר מתמחים חדשים 2022"],
    aliases: ["newResidents"]
  },
  newResidents2023: {
    label: "מספר מתמחים חדשים 2023",
    importedKeys: ["מספר מתמחים חדשים 2023"],
    aliases: ["newResidents"]
  },
  newResidents2024: {
    label: "מספר מתמחים חדשים 2024",
    importedKeys: ["מספר מתמחים חדשים 2024"],
    aliases: ["newResidents"]
  },
  newResidents2026: {
    label: "מספר מתמחים חדשים 2026",
    importedKeys: ["מספר מתמחים חדשים 2026"],
    aliases: ["newResidents"]
  },
  newResidents: {
    label: "מספר מתמחים חדשים",
    importedKeys: ["מספר מתמחים חדשים"],
    aliases: ["newResidents"]
  },
  womenPercent: {
    label: "אחוז נשים",
    importedKeys: ["אחוז_נשים"],
    aliases: ["womenPercent", "femaleResidentsPercent", "אחוז נשים"]
  },
  menPercent: {
    label: "אחוז גברים",
    importedKeys: ["אחוז_גברים"],
    aliases: ["menPercent", "maleResidentsPercent", "אחוז גברים"]
  },
  womenCount: {
    label: "מספר נשים",
    importedKeys: ["מספר נשים"],
    aliases: ["womenCount"]
  },
  menCount: {
    label: "מספר גברים",
    importedKeys: ["מספר גברים"],
    aliases: ["menCount"]
  },
  boardStageAPassRate: {
    label: "מעבר שלב א׳",
    importedKeys: ["מעבר_שלב_א"],
    aliases: ["boardStageAPassRate", "inherited_boardStageAPassRate", "מעבר שלב א"]
  },
  boardStageBPassRate: {
    label: "מעבר שלב ב׳",
    importedKeys: ["מעבר_שלב_ב"],
    aliases: ["boardStageBPassRate", "inherited_boardStageBPassRate", "מעבר שלב ב"]
  },
  burnoutIndex: {
    label: "מדד שחיקה",
    importedKeys: ["מדד_שחיקה"],
    aliases: ["burnoutIndex"]
  },
  expectedNationalOpenings: {
    label: "מספר תקנים שצפויים להיפתח ארצי",
    importedKeys: ["מספר_תקנים_שצפויים להיפתח_ארצי"],
    aliases: ["expectedNationalOpenings"]
  },
  expectedOpenings2026: {
    label: "צפי תקנים חדשים ב-2026",
    importedKeys: ["צפי תקנים חדשים ב2026"],
    aliases: ["expectedOpenings2026"]
  },
  medianElectiveDemand: {
    label: "מספר אלקטיביסטים חציוני",
    importedKeys: ["מספר אלקטיביסטים חציוני"],
    aliases: ["medianElectiveDemand"]
  }
} satisfies Record<string, MetricFieldDefinition>;

export type CanonicalMetricField = keyof typeof metricFieldDefinitions;

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
  const definition = field ? metricFieldDefinitions[field] : null;
  const exact = definition?.importedKeys ?? [fieldOrKey];
  const readableExact = exact.map(readableLabelFromCriterion);
  const knownAliases = definition ? [field, ...(definition.aliases ?? [])] : [];

  return {
    exact: unique([...exact, ...readableExact]),
    aliases: unique([...aliases, ...knownAliases, fieldOrKey])
  };
}

function hasMetricValue(metric: ImportedMetricLike | ImportedYearlyMetricLike | null | undefined) {
  return Boolean(
    metric &&
      ((typeof metric.value === "number" && Number.isFinite(metric.value)) ||
        (typeof metric.rawValue === "string" && metric.rawValue.trim().length > 0))
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
