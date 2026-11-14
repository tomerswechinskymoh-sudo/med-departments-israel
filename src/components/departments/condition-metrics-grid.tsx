import { METRICS } from '@/lib/external-survey/parse';
import type { SurveyMetric } from '@/lib/external-survey/presentation';

export function ConditionMetricsGrid({ metrics }: { metrics: SurveyMetric[] }) {
  return <dl className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))' }}>
    {metrics.map(metric => <div key={metric.key} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-[13px] font-bold leading-5 text-slate-700">{METRICS[metric.key].label}</dt>
      <dd className="mt-1"><span className="text-[22px] font-black text-brand-900">{new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 }).format(metric.value)}</span> <span className="text-xs text-slate-600">{METRICS[metric.key].unit}</span></dd>
      <dd className="mt-1 text-xs leading-5 text-slate-600">{metric.method === 'MEDIAN' ? 'חציון' : 'ממוצע'} · {metric.respondents} משיבים<br /><bdi>{metric.startYear === metric.endYear ? metric.startYear : `${metric.startYear}–${metric.endYear}`}</bdi></dd>
    </div>)}
  </dl>;
}
