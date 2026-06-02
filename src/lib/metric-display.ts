export const DATA_EXPLANATION_SHEETS = ["MASTER_Spec", "Master_Dept"] as const;

export type DataExplanationSheet = (typeof DATA_EXPLANATION_SHEETS)[number];

export type MetricVisualType =
  | "badge"
  | "clock"
  | "distribution"
  | "donut"
  | "salaryComparison"
  | "trend";

export type MetricDisplayMetadata = {
  sheet: DataExplanationSheet;
  criterion: string;
  normalizedCriterion: string;
  metricKey?: string | null;
  readableLabel: string;
  explanation?: string | null;
  sourceLabel?: string | null;
  sourceLinkPolicy?: string | null;
  sourceUrl?: string | null;
  displayAction?: string | null;
  displayMode?: string | null;
  visualType?: MetricVisualType | null;
  isHidden: boolean;
  isHighlighted: boolean;
  isNationalMetric: boolean;
};

export const metricCriterionCandidates: Record<string, string[]> = {
  officialResidencyDuration: [
    "משך_התמחות_רשמי",
    "משך_התמחות_רשמי (שנים)",
    "משך_התמחות_רשמי (חודשים)"
  ],
  actualAverageDuration: ["משך_ממוצע_בפועל"],
  medianWaitingTime: ["זמן_המתנה_חציוני_לתקן"],
  acceptedImmediatelyReports: ["מספר המתקבלים שדיווחו שמצאו מיד התמחות"],
  acceptedWithinSixMonthsReports: ["מספר המתקבלים שדיווחו שמצאו עד חצי שנה"],
  acceptedWithinOneYearReports: ["מספר המתקבלים שדיווחו שמצאו עד שנה"],
  acceptedWithinTwoYearsReports: ["מספר המתקבלים שדיווחו שמצאו עד שנתיים"],
  acceptedAfterTwoYearsReports: ["מספר המתקבלים שדיווחו שמצאו אחרי שנתיים"],
  centerSalary: ["שכר_לא_פריפריה"],
  peripherySalary: ["שכר_פריפריה", "שכר_פריפריה 1"],
  peripherySalaryGap: ["פער_שכר_פריפריה"],
  residentsCount: ["מספר_מתמחים"],
  activeResidentsCount: ["מספר_מתמחים"],
  womenCount: ["מספר נשים"],
  womenPercent: ["אחוז_נשים"],
  menCount: ["מספר גברים"],
  menPercent: ["אחוז_גברים"],
  boardStageAPassRate: ["מעבר_שלב_א"],
  inherited_boardStageAPassRate: ["מעבר_שלב_א"],
  boardStageBPassRate: ["מעבר_שלב_ב"],
  inherited_boardStageBPassRate: ["מעבר_שלב_ב"],
  burnoutIndex: ["מדד_שחיקה"],
  expectedNationalOpenings: ["מספר_תקנים_שצפויים להיפתח_ארצי"],
  expectedOpenings2026: ["צפי תקנים חדשים ב2026"],
  seniorPhysiciansCount: ["מספר_בכירים"],
  duns100PhysiciansCount: ["DUNS100"],
  departmentalPublicationsCount: ["מספר פרסומים מחלקתי"],
  medianElectiveDemand: ["מספר אלקטיביסטים חציוני"],
  specialtyType: ["סוג מקצוע"],
  imaSyllabusText: ["הסבר על ההתמחות ע׳׳פ הרי"],
  imaSyllabusUrl: ["אתר של הר׳׳י על ההתמחות"],
  newResidents: ["מספר מתמחים חדשים"]
};

const normalizedMetricCriteria = Object.entries(metricCriterionCandidates).flatMap(
  ([metricKey, criteria]) =>
    criteria.map((criterion) => ({
      metricKey,
      normalizedCriterion: normalizeCriterion(criterion)
    }))
);

function normalizedSource(value: string) {
  return normalizeCriterion(value).replace(/\s+/g, "");
}

function sourceUrlForSource(source: string | null | undefined, linkPolicy?: string | null) {
  const normalizedPolicy = normalizeCriterion(linkPolicy ?? "");
  if (normalizedPolicy === "לא") return null;
  if (/^https?:\/\//i.test(linkPolicy ?? "")) return linkPolicy?.trim() ?? null;

  const normalized = normalizedSource(source ?? "");
  if (!normalized) return null;

  if (normalized.includes("openalex")) return "https://openalex.org";
  if (normalized.includes("duns100")) return "https://www.duns100.co.il/rating/Duns_100_medical";
  if (normalized.includes("משרדהבריאות")) return "https://www.gov.il/he/departments/ministry_of_health";
  if (normalized.includes("הריי") || normalized.includes("הר״י") || normalized.includes("הרי")) {
    return "https://www.ima.org.il";
  }

  return null;
}

export function canonicalSheet(value: string): DataExplanationSheet | null {
  const normalized = value.trim();
  if (normalized === "MASTER_Spec") return "MASTER_Spec";
  if (normalized === "Master_Dept") return "Master_Dept";
  return null;
}

export function normalizeCriterion(value: string) {
  return value
    .replace(/^\ufeff/, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[״"׳'`]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+1$/g, "")
    .trim()
    .toLocaleLowerCase("he");
}

export function terminologyForDisplay(value: string) {
  return value
    .replace(/לתקן/g, "למשרה")
    .replace(/בתקן/g, "במשרה")
    .replace(/התקנים/g, "המשרות")
    .replace(/התקן/g, "המשרה")
    .replace(/תקנים/g, "משרות")
    .replace(/תקן/g, "משרה");
}

export function readableLabelFromCriterion(value: string) {
  return terminologyForDisplay(value)
    .replace(/\s*\((?:שנים|חודשים)\)\s*/g, "")
    .replace(/_/g, " ")
    .replace(/\s+1$/g, "")
    .replace(/שלב א\b/g, "שלב א׳")
    .replace(/שלב ב\b/g, "שלב ב׳")
    .replace(/ב2026/g, "ב-2026")
    .replace(/הר׳׳י/g, "הר״י")
    .replace(/\s+/g, " ")
    .trim();
}

export function metricKeyFromCriterion(criterion: string) {
  const normalized = normalizeCriterion(criterion);

  if (normalized.startsWith(normalizeCriterion("מספר מתמחים חדשים"))) {
    return "newResidents";
  }

  return (
    normalizedMetricCriteria.find((item) => item.normalizedCriterion === normalized)?.metricKey ??
    null
  );
}

export function criterionCandidatesForMetric(metricKey: string) {
  return metricCriterionCandidates[metricKey] ?? [metricKey];
}

export function visualTypeFromAction(action: string | null | undefined): MetricVisualType | null {
  const normalized = normalizeCriterion(action ?? "");
  if (!normalized) return null;
  if (normalized.includes("badge")) return "badge";
  if (normalized.includes("שעון")) return "clock";
  if (normalized.includes("התפלגות")) return "distribution";
  if (normalized.includes("דונאט")) return "donut";
  if (normalized.includes("גרף השוואה") || normalized.includes("להשוות")) return "salaryComparison";
  if (normalized.includes("גרף רב שנתי") || normalized === "גרף" || normalized.includes(" בגרף")) {
    return "trend";
  }

  return null;
}

export function displayModeFromAction(action: string | null | undefined) {
  const visualType = visualTypeFromAction(action);
  if (visualType) return visualType;
  const normalized = normalizeCriterion(action ?? "");
  if (normalized.includes("כפתור")) return "button";
  return null;
}

export function hiddenFromAction(action: string | null | undefined) {
  const normalized = normalizeCriterion(action ?? "");
  return normalized.includes("לא מוצג") || normalized.includes("לא צריך להציג");
}

export function highlightedFromAction(action: string | null | undefined) {
  const normalized = normalizeCriterion(action ?? "");
  return normalized.includes("נתון חשוב") || normalized.includes("להדגיש");
}

export function nationalMetricFromAction(action: string | null | undefined) {
  const normalized = normalizeCriterion(action ?? "");
  return (
    normalized.includes("נתון ארצי") ||
    normalized.includes("לא מחלקתי") ||
    normalized.includes("כללי לתחום")
  );
}

export function buildMetricDisplayMetadata(input: {
  sheet: DataExplanationSheet;
  criterion: string;
  explanation?: string | null;
  sourceLabel?: string | null;
  sourceLinkPolicy?: string | null;
  displayAction?: string | null;
}) {
  const criterion = input.criterion.trim();
  const metricKey = metricKeyFromCriterion(criterion);
  const displayAction = input.displayAction?.trim() || null;

  return {
    sheet: input.sheet,
    criterion,
    normalizedCriterion: normalizeCriterion(criterion),
    metricKey,
    readableLabel: readableLabelFromCriterion(criterion),
    explanation: input.explanation?.trim() || null,
    sourceLabel: input.sourceLabel?.trim() || null,
    sourceLinkPolicy: input.sourceLinkPolicy?.trim() || null,
    sourceUrl: sourceUrlForSource(input.sourceLabel, input.sourceLinkPolicy),
    displayAction,
    displayMode: displayModeFromAction(displayAction),
    visualType: visualTypeFromAction(displayAction),
    isHidden: hiddenFromAction(displayAction),
    isHighlighted: highlightedFromAction(displayAction),
    isNationalMetric: nationalMetricFromAction(displayAction)
  } satisfies MetricDisplayMetadata;
}

export function findMetricDisplayMetadata(
  metadata: MetricDisplayMetadata[],
  sheet: DataExplanationSheet,
  ...metricKeysOrCriteria: string[]
) {
  const normalizedCandidates = metricKeysOrCriteria.flatMap((keyOrCriterion) => [
    normalizeCriterion(keyOrCriterion),
    ...criterionCandidatesForMetric(keyOrCriterion).map(normalizeCriterion)
  ]);

  return (
    metadata.find(
      (item) =>
        item.sheet === sheet &&
        ((item.metricKey && metricKeysOrCriteria.includes(item.metricKey)) ||
          normalizedCandidates.includes(item.normalizedCriterion))
    ) ?? null
  );
}

export function metadataSourceLabel(
  metadata: MetricDisplayMetadata | null | undefined,
  fallback: string
) {
  return metadata?.sourceLabel?.trim() || fallback;
}

export function metadataTooltip(
  metadata: MetricDisplayMetadata | null | undefined,
  fallback: string
) {
  return terminologyForDisplay(metadata?.explanation?.trim() || fallback);
}

export function metadataDisplayAction(metadata: MetricDisplayMetadata | null | undefined) {
  return metadata?.displayAction?.trim() || null;
}
