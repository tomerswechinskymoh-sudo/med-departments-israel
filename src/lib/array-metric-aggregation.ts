export type ArrayMetricContributionRow = {
  value: number | null | undefined;
  countsAsPhysicalDepartment?: boolean;
};

function normalizedNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sumPresentNumber(values: Array<number | null | undefined>) {
  const presentValues = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );

  return presentValues.length > 0
    ? presentValues.reduce((sum, value) => sum + value, 0)
    : null;
}

export function duplicateAwareArrayMetricContributionCalculation(
  rows: ArrayMetricContributionRow[],
  physicalDepartmentCount?: number
) {
  const normalizedRows = rows.map((row) => ({
    value: normalizedNumber(row.value),
    countsAsPhysicalDepartment: row.countsAsPhysicalDepartment !== false
  }));
  const underlyingValues = normalizedRows.map((row) => row.value);
  const physicalRows = normalizedRows.filter((row) => row.countsAsPhysicalDepartment);
  const contributionRows = normalizedRows.filter((row) => !row.countsAsPhysicalDepartment);
  const denominator = physicalDepartmentCount ?? physicalRows.length;
  const physicalValues = physicalRows.map((row) => row.value);
  const contributionValues = contributionRows.map((row) => row.value);
  const presentPhysicalValues = physicalValues.filter((value): value is number => value !== null);
  const physicalRawTotal = sumPresentNumber(physicalValues);
  const metricContributionTotal = sumPresentNumber(contributionValues);
  const rawTotal = sumPresentNumber(underlyingValues);
  const currentCalculation =
    rawTotal === null || denominator === 0 ? null : rawTotal / denominator;
  const duplicatedAcrossPhysicalRows =
    denominator > 1 &&
    presentPhysicalValues.length === denominator &&
    presentPhysicalValues.every((value) => Math.abs(value - presentPhysicalValues[0]) < 0.000001);
  const correctedPhysicalTotal = duplicatedAcrossPhysicalRows
    ? presentPhysicalValues[0]
    : physicalRawTotal;
  const correctedTotal =
    correctedPhysicalTotal === null && metricContributionTotal === null
      ? null
      : (correctedPhysicalTotal ?? 0) + (metricContributionTotal ?? 0);
  const correctedCalculation =
    correctedTotal === null || denominator === 0 ? null : correctedTotal / denominator;

  return {
    underlyingValues,
    rawTotal,
    physicalRawTotal,
    metricContributionTotal,
    denominator,
    duplicatedAcrossAllRows: duplicatedAcrossPhysicalRows,
    duplicatedAcrossPhysicalRows,
    currentCalculation,
    correctedTotal,
    correctedCalculation
  };
}

export function duplicateAwareArrayMetricContributionAverage(
  rows: ArrayMetricContributionRow[],
  physicalDepartmentCount?: number
) {
  const calculation = duplicateAwareArrayMetricContributionCalculation(rows, physicalDepartmentCount);
  return calculation.correctedCalculation === null
    ? null
    : Number(calculation.correctedCalculation.toFixed(1));
}
