import { clean } from '@/lib/staz-survey/domain';

// A format signature observed in this audited 2020–2025 export, not a year rule
// or an authoritative questionnaire version. Unknown rows must remain unknown.
export function classifySourceEncoding(cells: Record<string, string>) {
  const value = (column: string) => clean(cells[column] ?? '');
  const legacyDash = Object.keys(cells).some(column =>
    !['BL', 'BP', 'BG', 'BH'].includes(column) && value(column) === '-');
  const nonDirectBlank = value('BQ') === "מסלול מלא (שאינו ישיר לסטאז')" && value('BR') === '';
  const irrelevantSix = ['BB', 'BC', 'BD', 'BE', 'BF'].some(column => value(column) === '6-לא רלוונטי');
  const modern = nonDirectBlank || irrelevantSix;
  return { profile: modern && legacyDash ? 'CONFLICT' : modern ? 'MODERN' : legacyDash ? 'LEGACY' : 'UNKNOWN',
    legacyDash, nonDirectBlank, irrelevantSix } as const;
}
