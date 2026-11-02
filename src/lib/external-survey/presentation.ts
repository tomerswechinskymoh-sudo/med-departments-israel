import { METRICS, type MetricKey } from "./parse";
import { MIN_RESPONDENTS } from "./aggregate";
export type SurveyMetric = { key: MetricKey; value: number; respondents: number; method: string; calculated: boolean; startYear: number; endYear: number };
export type SurveySummary = { state: "locked" | "empty" | "unavailable" | "published"; sourceTitle?: string; metrics: SurveyMetric[]; quotes: string[] };
export function publicMetric(row: { metricKey: string; respondentCount: number; value: number | null; method: string; calculatedCount: number; periodStartYear: number | null; periodEndYear: number | null; status: string; institutionId: string | null; datasetHash: string; privacyReviewHash: string | null }, currentDatasetHash: string): SurveyMetric | null {
  if (!(row.metricKey in METRICS) || row.status !== "PUBLISHED" || row.institutionId !== null || row.respondentCount < MIN_RESPONDENTS || row.value === null || !Number.isFinite(row.value) || !row.periodStartYear || !row.periodEndYear || row.datasetHash !== currentDatasetHash || row.privacyReviewHash !== currentDatasetHash) return null;
  const key = row.metricKey as MetricKey;
  if (row.method !== METRICS[key].method) return null;
  if (["calm", "peers", "seniors", "family"].includes(key) && (row.value < 1 || row.value > 5)) return null;
  if (key === "shifts" && (row.value < 0 || row.value > 31) || key === "hours" && (row.value < 3 || row.value > 16)) return null;
  // Explicit DTO: never spread a database response into client/server-rendered data.
  return { key, value: Math.round(row.value * 10) / 10, respondents: row.respondentCount, method: row.method, calculated: row.calculatedCount > 0, startYear: row.periodStartYear, endYear: row.periodEndYear };
}
