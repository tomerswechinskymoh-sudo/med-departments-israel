import { DUNS100_TITLE, DUNS100_DESCRIPTION } from "@/lib/duns100-presentation";

import { LICENSE_TO_RESIDENCY_WAIT_TIME_LABEL } from "@/lib/metric-display";
import type { SpecialtyMetricKey, SpecialtyMetricResult } from "@/lib/specialty-metrics";
import { MetricContentTitle, MetricExplanationInfo, MetricExplanationProvider } from "@/components/metrics/metric-explanation";
import type { MetricExplanationOverrideRecord } from "@/lib/metric-explanations";
import { ProductIcon, type ProductIconName } from "@/components/ui/product-icon";
import { MetricChart, type MetricChartRow } from "./metric-chart";

const groups: { title: string; icon: ProductIconName; keys: SpecialtyMetricKey[] }[] = [
  { title: "סקירה כללית", icon: "people", keys: ["programsCount", "activeResidents", "genderDistribution", "israelVsAbroad"] },
  { title: "משך ההתמחות וקבלה", icon: "clock", keys: ["residencyDuration", "medianWaitingTime", "relativeDemandIndex", "expectedOpenings", "acceptanceDistribution", "applicationsPerPosition"] },
  { title: "הכשרה ותוצאות", icon: "award", keys: ["boardPassA", "boardPassB", "newResidentsTrend", "duns100PhysiciansCount", "researchExposure", "residentToAttendingRatio"] },
  { title: "תנאי עבודה וקריירה", icon: "pulse", keys: ["burnoutIndex", "salaryGap", "centerSalary", "peripherySalary", "dutyLoad", "userRating", "custom"] },
];
const icons: Partial<Record<SpecialtyMetricKey, ProductIconName>> = {
  programsCount: "building", activeResidents: "people", genderDistribution: "people", residencyDuration: "calendar", medianWaitingTime: "clock", relativeDemandIndex: "trend", expectedOpenings: "building", acceptanceDistribution: "clock", boardPassA: "award", boardPassB: "award", newResidentsTrend: "trend", duns100PhysiciansCount: "award", burnoutIndex: "pulse", salaryGap: "wallet", centerSalary: "wallet", peripherySalary: "wallet",
};
function numeric(value?: string | null) {
  if (!value || !/\d/.test(value)) return null;
  const match = value.match(/-?\d[\d,]*(?:\.\d+)?/);
  const result = Number(match?.[0].replace(/,/g, ""));
  return Number.isFinite(result) ? result : null;
}
function distribution(value: string): MetricChartRow[] {
  return value.split("·").flatMap(item => {
    const [label, raw] = item.split(":").map(part => part.trim());
    const number = numeric(raw);
    return label && number !== null ? [{ label, value: number, displayValue: raw }] : [];
  });
}
function MetricValue({ metric }: { metric: SpecialtyMetricResult }) {
  if (metric.isPlaceholder) return <p className="dashboard-missing">אין נתון זמין</p>;
  if (metric.key === "residencyDuration") {
    const rows = distribution(metric.value);
    // Related duration values share a compact panel; their original units stay visible.
    if (rows.length) return <div className="dashboard-duration-pair">{rows.map(row => <div key={row.label}><span>{row.label}</span><strong>{row.displayValue}</strong></div>)}</div>;
  }
  if (metric.key === "newResidentsTrend") {
    const rows = distribution(metric.value);
    if (rows.length) return <MetricChart rows={rows} unit="מתמחים חדשים לפי שנה" vertical />;
  }
  if (metric.key === "acceptanceDistribution") {
    const rows = distribution(metric.value);
    if (rows.length) return <MetricChart rows={rows} unit="מספר דיווחים" />;
  }
  if (metric.key === "salaryGap") {
    const values = metric.comparisonValues;
    const rows = [ { label: "לא פריפריה", value: numeric(values?.centerSalary), displayValue: values?.centerSalary ?? undefined }, { label: "פריפריה", value: numeric(values?.peripherySalary), displayValue: values?.peripherySalary ?? undefined } ];
    return <><p className={`dashboard-value ${numeric(metric.value) === null ? "dashboard-missing" : ""}`}>{metric.value}{numeric(metric.value) !== null && !metric.value.includes("₪") ? " ₪" : ""}</p>{rows.some(row => row.value !== null) && <MetricChart rows={rows} unit="שכר בש״ח, לפי הגדרת המקור" />}</>;
  }
  return <p className="dashboard-value">{metric.value}{["centerSalary", "peripherySalary"].includes(metric.key) && !metric.value.includes("₪") ? " ₪" : ""}</p>;
}
export function SpecialtyDashboardMetrics({ specialtyId, specialtyName, metrics, explanationOverrides, isAdmin, contextItems = [] }: {
  specialtyId: string; specialtyName: string; metrics: SpecialtyMetricResult[]; explanationOverrides: MetricExplanationOverrideRecord[]; isAdmin: boolean;
  contextItems?: { key: string; label: string; value: string; href?: string }[];
}) {
  if (!metrics.length && !contextItems.length) return null;
  return <MetricExplanationProvider context={{ specialtyId }} overrides={explanationOverrides} isAdmin={isAdmin}>
    <section className="specialty-dashboard" aria-labelledby="dashboard-title">

      <header className="dashboard-heading"><div><p className="eyebrow">תמונת מצב ארצית</p><h2 id="dashboard-title">{specialtyName} — נתונים ומגמות</h2></div><p>נתוני התחום כולו, ללא תלות בסינון המחלקות. נתונים מחושבים ומקורות מצוינים לצד המדדים.</p></header>
      {contextItems.length > 0 && <div className="dashboard-context">{contextItems.map(item => <p key={item.key}><strong>{item.label}: </strong>{item.href ? <a href={item.href} target="_blank" rel="noreferrer">{item.value} ↗</a> : item.value}</p>)}</div>}
      {groups.map((group, index) => {
        const items = metrics.filter(metric => group.keys.includes(metric.key));
        // Bundles change presentation only. Every enabled metric retains its own
        // key, value, explanation, source and publication-filtered result.
        const chartKeys = ["acceptanceDistribution", "newResidentsTrend", "salaryGap"];
        const compact = items.filter(metric => !chartKeys.includes(metric.key));
        const charts = items.filter(metric => chartKeys.includes(metric.key));
        const sourceText = (metric: SpecialtyMetricResult) => `${metric.metricLevel === "מחושב" ? "מחושב · " : ""}${metric.sourceLabel ?? "מקור נתונים לא צוין"}`;
        const commonSource = compact.length > 1 && compact.every(metric => sourceText(metric) === sourceText(compact[0])) ? sourceText(compact[0]) : null;
        const renderMetric = (metric: SpecialtyMetricResult) => <article key={metric.key} data-metric-key={metric.key} className={`dashboard-metric ${metric.isPlaceholder ? "dashboard-metric--missing" : ""} ${metric.isHighlighted ? "dashboard-metric--highlighted" : ""}`}>
          <div className="dashboard-metric-title"><ProductIcon name={icons[metric.key] ?? group.icon}/><h4><MetricContentTitle metricKey={metric.key} fallbackTitle={metric.key === "duns100PhysiciansCount" ? DUNS100_TITLE : metric.key === "medianWaitingTime" && metric.label === LICENSE_TO_RESIDENCY_WAIT_TIME_LABEL ? "מרישיון לתחילת התמחות" : metric.label}/></h4><MetricExplanationInfo metricKey={metric.key} metricLabel={metric.key === "duns100PhysiciansCount" ? DUNS100_TITLE : metric.label} fallbackText={metric.key === "duns100PhysiciansCount" ? DUNS100_DESCRIPTION : metric.tooltip ?? metric.description} sourceLabel={metric.sourceLabel ?? "מקור נתונים לא צוין"} sourceUrl={metric.sourceUrl}/></div>
          <MetricValue metric={metric}/>{!(commonSource && compact.includes(metric)) && <p className="dashboard-source">{sourceText(metric)}</p>}
        </article>;
        return items.length > 0 && <section className={`dashboard-group dashboard-group--${index}`} key={group.title}>
          <h3><ProductIcon name={group.icon} />{group.title}</h3>
          <div className={`dashboard-topic ${charts.length ? "dashboard-topic--with-chart" : ""}`}>
            {compact.length > 0 && <div className="dashboard-metric-bundle">{compact.map(renderMetric)}{commonSource && <p className="dashboard-bundle-source">מקור לכל המדדים בקבוצה: {commonSource}</p>}</div>}
            {charts.map(metric => <div key={metric.key} className={`dashboard-chart-panel ${metric.isPlaceholder ? "dashboard-chart-panel--missing" : ""}`}>{renderMetric(metric)}</div>)}
          </div>
        </section>;
      })}
    </section>
  </MetricExplanationProvider>;
}
