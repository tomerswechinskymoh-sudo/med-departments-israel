import { z } from 'zod';

export const ACADEMIC_MISSING_VALUE = 'הנתון עדיין לא סופק';
export const academicMetricDefinitions = [
  { key: 'professorsAmongSeniors', label: 'שיעור פרופסורים מתוך הבכירים', description: 'אחוז הרופאים בעלי תואר פרופסור מתוך כלל הרופאים הבכירים במחלקה.' },
  { key: 'departmentBoardPassA', label: 'מעבר שלב א׳ במחלקה', description: 'שיעור מעבר שלב א׳ של נבחני המחלקה. נתון מחלקתי נפרד מנתון התחום.' },
  { key: 'departmentBoardPassB', label: 'מעבר שלב ב׳ במחלקה', description: 'שיעור מעבר שלב ב׳ של נבחני המחלקה. נתון מחלקתי נפרד מנתון התחום.' }
] as const;
export type AcademicMetricKey = typeof academicMetricDefinitions[number]['key'];
export type AcademicMetricValues = Record<AcademicMetricKey, number | null>;
const percentage = z.number().finite().min(0, 'יש להזין אחוז בין 0 ל־100.').max(100, 'יש להזין אחוז בין 0 ל־100.').nullable();
export const departmentAcademicSchema = z.object({
  professorsAmongSeniors: percentage,
  departmentBoardPassA: percentage,
  departmentBoardPassB: percentage
}).strict();

// Only explicitly supplied department metrics qualify. Imported national rates
// copied into legacy department fields must never become department results.
export function departmentAcademicValues(metrics: { metricKey: string; value: number | null }[]): AcademicMetricValues {
  return Object.fromEntries(academicMetricDefinitions.map(({ key }) => {
    const value = metrics.find(metric => metric.metricKey === key)?.value;
    return [key, typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null];
  })) as AcademicMetricValues;
}

export function formatAcademicPercent(value: number | null) {
  return value === null ? null : `${value.toLocaleString('he-IL', { maximumFractionDigits: 2 })}%`;
}
