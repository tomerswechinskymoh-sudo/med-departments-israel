import { resolveImportedMetric, type ImportedMetricLike } from './imported-metric-resolver';

export const DEMAND_METRIC_KEYS = ['relativeDemandIndex', 'מדד ביקוש יחסי'];
export type DemandBenchmark = { average: number | null; specialtyCount: number };
export const demandLevelLabels = {
  veryHigh: 'ביקוש גבוה מאוד מהממוצע',
  high: 'ביקוש גבוה מהממוצע',
  similar: 'ביקוש דומה לממוצע',
  low: 'ביקוש נמוך מהממוצע',
  veryLow: 'ביקוש נמוך מאוד מהממוצע'
} as const;
export type DemandLevel = keyof typeof demandLevelLabels;
export type DemandComparison = DemandBenchmark & { level: DemandLevel | null };
export const DEMAND_COMPARISON_EXPLANATION = 'הממוצע הוא ממוצע חשבוני של כל המקצועות שיש להם מדד ביקוש תקין: כל מקצוע נספר פעם אחת, כולל המקצוע המוצג. אפס נכלל בחישוב; נתון חסר אינו נכלל. הממוצע אינו תלוי בסינון המחלקות. התיאור הוא סיווג תצוגה של האתר: עד 20% מעל או מתחת לממוצע — דומה לממוצע; יותר מ־20% ופחות מ־50% — גבוה או נמוך; 50% ומעלה — גבוה מאוד או נמוך מאוד. החישוב משתמש בערכים לפני עיגול. ערך הייחוס 1 שבהגדרת המדד אינו הממוצע המחושב של המקצועות.';

export function relativeDemandValue(metrics: ImportedMetricLike[]) {
  const value = resolveImportedMetric(metrics, DEMAND_METRIC_KEYS[0], { aliases: DEMAND_METRIC_KEYS.slice(1) })?.value;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function calculateDemandBenchmark(rows: (ImportedMetricLike & { specialtyId: string })[]): DemandBenchmark {
  const bySpecialty = new Map<string, ImportedMetricLike[]>();
  for (const row of rows) {
    if (!DEMAND_METRIC_KEYS.includes(row.metricKey)) continue;
    const metrics = bySpecialty.get(row.specialtyId) ?? [];
    metrics.push(row); bySpecialty.set(row.specialtyId, metrics);
  }
  const values = [...bySpecialty.values()].map(relativeDemandValue).filter((value): value is number => value !== null);
  return { average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null, specialtyCount: values.length };
}

export function compareDemand(value: number, benchmark: DemandBenchmark): DemandComparison {
  const mean = benchmark.average;
  if (!Number.isFinite(value) || value < 0 || mean === null || !Number.isFinite(mean) || mean < 0 || benchmark.specialtyCount < 2) return { ...benchmark, level: null };
  if (mean === 0) return { ...benchmark, level: value === 0 ? 'similar' : null };
  const ratio = value / mean;
  const level: DemandLevel = ratio >= 1.5 ? 'veryHigh' : ratio > 1.2 ? 'high' : ratio <= 0.5 ? 'veryLow' : ratio < 0.8 ? 'low' : 'similar';
  return { ...benchmark, level };
}
