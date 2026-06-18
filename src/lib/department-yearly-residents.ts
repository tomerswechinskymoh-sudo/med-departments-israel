import { isSpreadsheetErrorValue } from "@/lib/spreadsheet-errors";

export const DEPARTMENT_NEW_RESIDENTS_YEARS = [2020, 2021, 2022, 2023, 2024] as const;

type DepartmentYearlyMetricLike = {
  metricKey: string;
  year: number;
  value: number | null;
  rawValue?: string | null;
};

export type DepartmentNewResidentsYearlyRow = {
  year: number;
  value: number;
  rawValue?: string | null;
};

export type DepartmentNewResidentsChartRow = DepartmentNewResidentsYearlyRow & {
  height: number;
  label: string;
};

function parseRawNumber(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized || isSpreadsheetErrorValue(normalized)) return null;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function departmentNewResidentsRowsFromYearlyMetrics(
  yearlyMetrics: DepartmentYearlyMetricLike[]
): DepartmentNewResidentsYearlyRow[] {
  const rows: DepartmentNewResidentsYearlyRow[] = [];

  for (const year of DEPARTMENT_NEW_RESIDENTS_YEARS) {
    const metric = yearlyMetrics.find(
      (item) => item.metricKey === "newResidents" && item.year === year
    );

    if (!metric) continue;

    const value =
      typeof metric.value === "number" && Number.isFinite(metric.value)
        ? metric.value
        : parseRawNumber(metric.rawValue);

    if (typeof value !== "number") continue;

    rows.push({
      year,
      value,
      rawValue: metric.rawValue
    });
  }

  return rows;
}

export function departmentNewResidentsChartRows(
  rows: Array<{ year: number; value: number | null; rawValue?: string | null }>
): DepartmentNewResidentsChartRow[] {
  const validRows = rows
    .filter(
      (row): row is DepartmentNewResidentsYearlyRow =>
        typeof row.value === "number" && Number.isFinite(row.value)
    )
    .sort((left, right) => left.year - right.year);
  const maxValue = Math.max(...validRows.map((row) => row.value), 1);

  return validRows.map((row) => ({
    ...row,
    height: Math.max(12, Math.round((row.value / maxValue) * 42)),
    label: String(row.year)
  }));
}
