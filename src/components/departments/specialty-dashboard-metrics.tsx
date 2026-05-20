import type { SpecialtyMetricResult } from "@/lib/specialty-metrics";

export function SpecialtyDashboardMetrics({
  specialtyName,
  metrics,
  salaryAssumption
}: {
  specialtyName: string;
  metrics: SpecialtyMetricResult[];
  salaryAssumption?: {
    centerMonthlySalary: number;
    peripheryMonthlySalary: number;
  } | null;
}) {
  if (metrics.length === 0 && !salaryAssumption) {
    return null;
  }

  const salaryGap = salaryAssumption
    ? salaryAssumption.peripheryMonthlySalary - salaryAssumption.centerMonthlySalary
    : 0;
  const salaryGapPercent =
    salaryAssumption && salaryAssumption.centerMonthlySalary > 0
      ? Math.round((salaryGap / salaryAssumption.centerMonthlySalary) * 100)
      : 0;
  const maxSalary = salaryAssumption
    ? Math.max(salaryAssumption.centerMonthlySalary, salaryAssumption.peripheryMonthlySalary)
    : 1;

  return (
    <section className="rounded-[1.5rem] border border-brand-100 bg-white/95 p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-700">דשבורד {specialtyName}</p>
          <h2 className="mt-1 text-xl font-bold text-ink">תמונת מצב כללית של תחום ההתמחות</h2>
        </div>
        <p className="max-w-md text-xs leading-6 text-slate-500">
          הנתונים מבוססים על מידע זמין במערכת ועשויים להיות חלקיים
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric, index) => (
          <div
            key={metric.key}
            className={`rounded-[1.25rem] border p-4 ${
              index === 0
                ? "border-brand-200 bg-gradient-to-l from-brand-50 to-white"
                : "border-slate-100 bg-slate-50/70"
            }`}
          >
            <p className="text-xs font-bold text-slate-500">{metric.label}</p>
            <p className={`mt-2 text-2xl font-black ${metric.isPlaceholder ? "text-slate-400" : "text-ink"}`}>
              {metric.value}
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-600">{metric.description}</p>
          </div>
        ))}
        {salaryAssumption ? (
          <div className="rounded-[1.25rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-500">שכר בסיס משוער</p>
                <p className="mt-2 text-sm font-black text-ink">פער לטובת פריפריה</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-amber-900">
                +{salaryGapPercent}%
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>מרכז</span>
                  <span>₪{salaryAssumption.centerMonthlySalary.toLocaleString("he-IL")}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-slate-400"
                    style={{
                      width: `${Math.round((salaryAssumption.centerMonthlySalary / maxSalary) * 100)}%`
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>פריפריה</span>
                  <span>₪{salaryAssumption.peripheryMonthlySalary.toLocaleString("he-IL")}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{
                      width: `${Math.round((salaryAssumption.peripheryMonthlySalary / maxSalary) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs leading-6 text-slate-600">
              פער: +{salaryGapPercent}% · נתון משוער המבוסס על הבדלי שכר מקובלים
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
