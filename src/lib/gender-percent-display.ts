import type { ImportedMetricLike } from './imported-metric-resolver';
import { isSpreadsheetErrorValue } from './spreadsheet-errors';

/** Display precision only; stored values and calculations retain their precision. */
export function formatGenderPercent(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
    ? `${value.toLocaleString('he-IL', { maximumFractionDigits: 0 })}%`
    : null;
}

export function formatImportedGenderPercent(metric: ImportedMetricLike) {
  if (isSpreadsheetErrorValue(metric.rawValue)) return null;
  const raw = metric.rawValue?.replace(/%/g, '').trim();
  const value = typeof metric.value === 'number' ? metric.value : raw
    ? Number(raw.includes('.') ? raw.replace(/,/g, '') : raw.replace(',', '.')) : null;
  return formatGenderPercent(value);
}
