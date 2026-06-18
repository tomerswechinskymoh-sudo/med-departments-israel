const SPREADSHEET_ERROR_VALUES = new Set([
  "#DIV/0!",
  "#VALUE!",
  "#N/A",
  "#REF!",
  "#NAME?",
  "#NUM!",
  "#NULL!"
]);

export const missingImportedDataText = "הנתון עוד לא סופק";

export function normalizeSpreadsheetCell(value: string | null | undefined) {
  return (value ?? "")
    .replace(/^\ufeff/, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .trim();
}

export function isSpreadsheetErrorValue(value: string | null | undefined) {
  const normalized = normalizeSpreadsheetCell(value).toUpperCase();
  return SPREADSHEET_ERROR_VALUES.has(normalized);
}

export function nullIfSpreadsheetError(value: string | null | undefined) {
  const normalized = normalizeSpreadsheetCell(value);
  return isSpreadsheetErrorValue(normalized) ? null : normalized || null;
}

export function spreadsheetErrorValues() {
  return Array.from(SPREADSHEET_ERROR_VALUES);
}
