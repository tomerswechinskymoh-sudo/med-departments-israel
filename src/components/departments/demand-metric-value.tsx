import { DEMAND_COMPARISON_EXPLANATION, demandLevelLabels, type DemandComparison } from '@/lib/demand-benchmark';

export function DemandMetricValue({ value, comparison }: { value: string | null; comparison?: DemandComparison }) {
  const average = comparison?.average;
  const hasAverage = typeof average === 'number' && Number.isFinite(average);
  return <div className="demand-comparison">
    <div className="demand-comparison-data">
      <div className="demand-comparison-values">
        <div><span>מדד המקצוע</span>{value === null ? <p className="dashboard-missing">אין נתון זמין</p> : <strong className="dashboard-value" dir="ltr">{value}</strong>}</div>
        <div><span>ממוצע כלל המקצועות</span><strong className="demand-average" dir={hasAverage ? 'ltr' : undefined}>{hasAverage ? average.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'אין נתון זמין'}</strong></div>
      </div>
      {comparison?.level && <p className="demand-level" data-demand-level={comparison.level}>{demandLevelLabels[comparison.level]}</p>}
      {hasAverage && <p className="demand-sample-size">ממוצע מחושב מ־{comparison!.specialtyCount} מקצועות עם נתון</p>}
    </div>
    <div className="demand-methodology"><h5>מה משמעות רמת הביקוש?</h5><p>{DEMAND_COMPARISON_EXPLANATION}</p></div>
  </div>;
}
