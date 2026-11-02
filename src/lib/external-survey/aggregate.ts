import { METRICS, type MetricKey, type Normalized } from "./parse";
export const MIN_RESPONDENTS = 10;
export type AggregateInput = { specialtyId: string | null; institutionId: string | null; reportYear: number | null; normalized: Normalized };
export type Aggregate = { groupKey: string; specialtyId: string; institutionId: string | null; metricKey: MetricKey; respondentCount: number; value: number | null; method: string; calculatedCount: number; periodStartYear: number | null; periodEndYear: number | null };
export function metricValue(row: AggregateInput, metric: MetricKey) {
  if (!row.reportYear) return null;
  const parsed = row.normalized[metric];
  if (!["EXACT", "RANGE"].includes(parsed.parseStatus) || parsed.estimate === null || !Number.isFinite(parsed.estimate)) return null;
  if (metric === "calm" && !(row.normalized.shifts.estimate !== null && row.normalized.shifts.estimate > 0 && ["EXACT", "RANGE"].includes(row.normalized.shifts.parseStatus))) return null;
  if (metric === "shifts" && (parsed.estimate < 0 || parsed.estimate > 31)) return null;
  if (metric === "hours" && (parsed.estimate < 3 || parsed.estimate > 16)) return null;
  if (!["shifts", "hours"].includes(metric) && (parsed.estimate < 1 || parsed.estimate > 5)) return null;
  return parsed.estimate;
}
export function aggregateRows(rows: AggregateInput[]): Aggregate[] {
  const groups = new Map<string, AggregateInput[]>();
  for (const row of rows) {
    if (!row.specialtyId) continue;
    const keys = [`specialty:${row.specialtyId}`];
    if (row.institutionId) keys.push(`institution:${row.institutionId}:specialty:${row.specialtyId}`);
    for (const key of keys) groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups].flatMap(([groupKey, members]) => (Object.keys(METRICS) as MetricKey[]).map(metricKey => {
    const valid = members.filter(r => metricValue(r, metricKey) !== null);
    const values = valid.map(r => metricValue(r, metricKey)!).sort((a, b) => a - b);
    const n = values.length, middle = Math.floor(n / 2);
    const years = valid.map(r => r.reportYear!);
    return {
      groupKey, specialtyId: members[0].specialtyId!, institutionId: groupKey.startsWith("institution:") ? members[0].institutionId : null,
      metricKey, respondentCount: n, value: n < MIN_RESPONDENTS ? null : METRICS[metricKey].method === "MEDIAN" ? n % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2 : values.reduce((a, b) => a + b, 0) / n,
      method: METRICS[metricKey].method, calculatedCount: valid.filter(r => r.normalized[metricKey].calculated).length,
      periodStartYear: years.length ? Math.min(...years) : null, periodEndYear: years.length ? Math.max(...years) : null,
    };
  }));
}
export function publicationStatus(input: { respondentCount: number; value: number | null; institutionId: string | null; rights: string; datasetHash: string; privacyReviewHash: string | null; evidence: unknown }) {
  if (input.rights !== "DOCUMENTED") return "PENDING_PUBLICATION_RIGHTS" as const;
  if (input.respondentCount < MIN_RESPONDENTS || input.value === null) return "SUPPRESSED" as const;
  // Institution slices are never released in v1, preventing nested-group
  // differencing and a hospital league table. They remain internal diagnostics.
  if (input.institutionId || !input.datasetHash || input.privacyReviewHash !== input.datasetHash || !input.evidence) return "PENDING_PRIVACY_REVIEW" as const;
  return "PUBLISHED" as const;
}
export function canReadSurvey(session: { role: string; emailVerified: boolean; verificationStatus: string } | null) {
  return Boolean(session && (session.role === "admin" || session.emailVerified && session.verificationStatus === "VERIFIED"));
}
