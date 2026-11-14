import Link from "next/link";
import { Card } from "@/components/ui/card";
import { METRICS } from "@/lib/external-survey/parse";
import type { SurveySummary } from "@/lib/external-survey/presentation";
export function ExternalSurveyView({ summary, specialtyName }: { summary: SurveySummary; specialtyName: string }) {
  if (summary.state === 'empty' || summary.state === 'unavailable') return null;
  return (
    <Card dir="rtl" className="space-y-3 !p-3 sm:!p-4" data-survey-state={summary.state}>
      <div>
        <h2 className="text-xl font-black text-ink">תנאי ההתמחות</h2>
        <p className="mt-1 text-sm text-slate-600">{summary.scopeLabel ?? `${specialtyName} · כלל הארץ`}</p>
      </div>
      {summary.state === "locked" ? (
        <div className="rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-700">
          <p>הצפייה בחוויות זמינה למשתמשים מאומתים, בהתאם להרשאות האתר.</p>
          <Link className="font-bold text-brand-800 underline underline-offset-4" href="/login">כניסה לחשבון</Link>
        </div>
      ) : (
        <>
          <dl className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))' }}>
            {Object.keys(METRICS).flatMap(key => {
              const metric = summary.metrics.find(m => m.key === key);
              if (!metric) return [];
              const definition = METRICS[metric.key];
              return [<div key={metric.key} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <dt className="text-[13px] font-bold leading-5 text-slate-700">{definition.label}</dt>
                <dd className="mt-1"><span className="text-[22px] font-black text-brand-900">{new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 }).format(metric.value)}</span> <span className="text-xs text-slate-600">{definition.unit}</span></dd>
                <dd className="mt-1 text-xs leading-5 text-slate-600">{metric.method === "MEDIAN" ? "חציון" : "ממוצע"} · {metric.respondents} משיבים<br /><bdi>{metric.startYear === metric.endYear ? metric.startYear : `${metric.startYear}–${metric.endYear}`}</bdi>{metric.calculated ? <span title="כולל ערכים שחושבו מטווח או משעות ההתחלה והסיום שדווחו" aria-label="כולל ערכים שחושבו מהדיווח"> *</span> : null}</dd>
              </div>];
            })}
          </dl>
          <p className="text-xs leading-6 text-slate-600">מקור: {summary.sourceTitle}. עיקר איסוף הסקר נערך באוגוסט 2024, עם תשובות נוספות בהמשך. אלה דיווחים היסטוריים ואינם מדידה עדכנית של התנאים כיום.</p>

        </>
      )}
    </Card>
  );
}
