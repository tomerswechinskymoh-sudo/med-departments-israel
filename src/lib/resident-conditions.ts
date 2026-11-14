import { z } from 'zod';
import { METRICS, type MetricKey } from './external-survey/parse';
import type { SurveyMetric } from './external-survey/presentation';

export const RESIDENT_CONDITIONS_VERSION = 'resident-conditions-v1' as const;
const empty = (v: unknown) => v === '' || v == null ? undefined : v;
const optionalNumber = (schema: z.ZodNumber) => z.preprocess(empty, schema.optional());
const rating = optionalNumber(z.coerce.number().int().min(1).max(5));
const time = z.preprocess(empty, z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'יש להזין שעה תקינה.').optional());
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

// The four scales match the source questionnaire. They are not a recommendation score.
export const residentConditionsSchema = z.object({
  version: z.literal(RESIDENT_CONDITIONS_VERSION),
  year: z.coerce.number().int().min(2000).max(new Date().getFullYear(), 'שנת הדיווח אינה יכולה להיות עתידית.'),
  workStart: time,
  workEnd: time,
  monthlyDuties: optionalNumber(z.coerce.number().min(0).max(31).multipleOf(0.5)),
  salaryGross: optionalNumber(z.coerce.number().min(1000, 'יש להזין שכר בשקלים מלאים.').max(100000)),
  calm: rating,
  peers: rating,
  seniors: rating,
  family: rating
}).superRefine((data, ctx) => {
  if (Boolean(data.workStart) !== Boolean(data.workEnd)) {
    ctx.addIssue({ code: 'custom', path: [data.workStart ? 'workEnd' : 'workStart'], message: 'יש למלא גם שעת התחלה וגם שעת סיום, או להשאיר את שתיהן ריקות.' });
  }
  if (data.workStart && data.workEnd) {
    const hours = (minutes(data.workEnd) - minutes(data.workStart)) / 60;
    if (hours <= 0 || hours > 16) ctx.addIssue({ code: 'custom', path: ['workEnd'], message: 'ביום ללא תורנות, שעת הסיום צריכה להיות אחרי ההתחלה ועד 16 שעות עבודה.' });
  }
  if (data.monthlyDuties === 0 && data.calm !== undefined) {
    ctx.addIssue({ code: 'custom', path: ['calm'], message: 'אין לדרג רוגע בתורנות כשאין תורנויות.' });
  }
});
export type ResidentConditions = z.infer<typeof residentConditionsSchema>;

export function readResidentConditions(details: unknown): ResidentConditions | null {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const result = residentConditionsSchema.safeParse((details as Record<string, unknown>).residentConditions);
  return result.success ? result.data : null;
}

export function residentConditionValues(data: ResidentConditions): Partial<Record<MetricKey, number>> {
  return {
    shifts: data.monthlyDuties, salaryGross: data.salaryGross,
    calm: data.calm, peers: data.peers, seniors: data.seniors, family: data.family,
    hours: data.workStart && data.workEnd ? (minutes(data.workEnd) - minutes(data.workStart)) / 60 : undefined
  };
}

// Call only with reviews already admitted by the verified/publication query.
// No legacy score, unreported value or external aggregate is imputed here.
export function residentConditionMetrics(reviews: Array<{ reviewerType: string; submission?: { roleDetails: unknown } | null }>): SurveyMetric[] {
  const reports = reviews.filter(r => r.reviewerType === 'RESIDENT').flatMap(r => {
    const data = readResidentConditions(r.submission?.roleDetails);
    return data ? [{ year: data.year, values: residentConditionValues(data) }] : [];
  });
  return (Object.keys(METRICS) as MetricKey[]).flatMap(key => {
    const samples = reports.flatMap(r => r.values[key] === undefined ? [] : [{ value: r.values[key]!, year: r.year }]);
    if (!samples.length) return [];
    const values = samples.map(s => s.value).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    const value = METRICS[key].method === 'MEDIAN'
      ? values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2
      : values.reduce((sum, n) => sum + n, 0) / values.length;
    return [{ key, value, respondents: samples.length, method: METRICS[key].method, calculated: key === 'hours', startYear: Math.min(...samples.map(s => s.year)), endYear: Math.max(...samples.map(s => s.year)) }];
  });
}

export function residentConditionRows(details: unknown): Array<[string, string | number]> {
  const data = readResidentConditions(details);
  if (!data) return [];
  const rows: Array<[string, string | number]> = [['שנת הדיווח', data.year]];
  if (data.workStart && data.workEnd) rows.push(['יום עבודה ללא תורנות', `${data.workStart}–${data.workEnd}`]);
  for (const [key, value] of Object.entries(residentConditionValues(data))) {
    if (value !== undefined) rows.push([METRICS[key as MetricKey].label, `${new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 }).format(value)} ${METRICS[key as MetricKey].unit}`]);
  }
  return rows;
}
