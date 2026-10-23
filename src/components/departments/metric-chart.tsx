/** Numeric chart rows retain their text values: zero and missing are distinct. */
export type MetricChartRow = { label: string; value: number | null; displayValue?: string };
export function MetricChart({ rows, unit, vertical = false }: { rows: MetricChartRow[]; unit: string; vertical?: boolean }) {
  const max = Math.max(1, ...rows.map(row => row.value ?? 0));
  return <div className={`metric-chart ${vertical ? "metric-chart--vertical" : ""}`} role="group" aria-label={unit}>
    <p className="metric-chart-unit">{unit}</p>
    <div className="metric-chart-rows" dir={vertical ? "ltr" : "rtl"}>
      {rows.map(row => <div className="metric-chart-row" key={row.label}>
        <span className="metric-chart-label">{row.label}</span>
        <span className="metric-chart-track" aria-hidden="true"><span style={vertical ? { height: `${Math.max(0, (row.value ?? 0) / max * 100)}%` } : { width: `${Math.max(0, (row.value ?? 0) / max * 100)}%` }} /></span>
        <strong className="metric-chart-value">{row.value === null ? "אין נתון" : row.displayValue ?? row.value.toLocaleString("he-IL", { maximumFractionDigits: 1 })}</strong>
      </div>)}
    </div>
  </div>;
}
