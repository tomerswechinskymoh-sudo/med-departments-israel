import type { SpecialtyMetricResult } from "@/lib/specialty-metrics";

export function SpecialtyDashboardMetrics({
  specialtyName,
  metrics
}: {
  specialtyName: string;
  metrics: SpecialtyMetricResult[];
}) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[1.5rem] border border-brand-100 bg-white/95 p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-700">דשבורד {specialtyName}</p>
          <h2 className="mt-1 text-xl font-bold text-ink">תמונת מצב מהירה לפי המדדים שנבחרו</h2>
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
      </div>
    </section>
  );
}
