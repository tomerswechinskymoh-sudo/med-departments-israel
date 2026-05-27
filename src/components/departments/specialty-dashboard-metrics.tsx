import type { SpecialtyMetricResult } from "@/lib/specialty-metrics";

function parseFirstNumber(value: string) {
  const match = value.match(/\d+(?:[.,]\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function GenderDonut({ value }: { value: string }) {
  const women = Math.max(0, Math.min(100, parseFirstNumber(value) ?? 0));
  const men = Math.max(0, 100 - women);

  return (
    <div className="mt-3 flex items-center gap-4">
      <div
        className="grid h-20 w-20 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#0f766e 0 ${women}%, #dbeafe ${women}% 100%)`
        }}
        aria-label={`נשים ${women}%, גברים ${men}%`}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-sm font-black text-ink">
          {Math.round(women)}%
        </div>
      </div>
      <div className="space-y-2 text-xs font-bold text-slate-600">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-700" />
          <span>נשים {Math.round(women)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-100" />
          <span>גברים {Math.round(men)}%</span>
        </div>
      </div>
    </div>
  );
}

function parseYearValues(value: string) {
  return value
    .split("·")
    .map((item) => {
      const [yearPart, valuePart] = item.split(":").map((part) => part.trim());
      const year = Number(yearPart);
      const numericValue = Number((valuePart ?? "").replace(/[^\d.-]/g, ""));

      return Number.isFinite(year) && Number.isFinite(numericValue)
        ? { year, value: numericValue }
        : null;
    })
    .filter((item): item is { year: number; value: number } => Boolean(item));
}

function YearTrend({ value }: { value: string }) {
  const rows = parseYearValues(value);
  const max = Math.max(...rows.map((row) => row.value), 1);

  if (rows.length === 0) {
    return (
      <p className="mt-2 text-2xl font-black text-ink">
        {value}
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {rows.map((row) => (
        <div key={row.year}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>{row.year}</span>
            <span>{row.value.toLocaleString("he-IL")}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-brand-700"
              style={{ width: `${Math.round((row.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricInfo({ metric }: { metric: SpecialtyMetricResult }) {
  const source = metric.sourceLabel ?? "מקור נתונים לא צוין";
  const text = [metric.tooltip ?? metric.description, `מקור נתונים: ${source}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <span className="relative inline-flex">
      <span
        tabIndex={0}
        title={text}
        aria-label={text}
        className="group grid h-7 w-7 cursor-help place-items-center rounded-full border border-slate-200 bg-white text-[0.72rem] font-black text-slate-500 transition hover:border-brand-200 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-200"
      >
        i
        <span className="pointer-events-none absolute left-0 top-9 z-20 hidden w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs font-semibold leading-5 text-slate-700 shadow-xl group-hover:block group-focus:block">
          {text}
        </span>
      </span>
    </span>
  );
}

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
            className={`flex min-h-[8rem] flex-col rounded-[1.25rem] border p-4 ${
              index === 0
                ? "border-brand-200 bg-gradient-to-l from-brand-50 to-white"
                : "border-slate-100 bg-slate-50/70"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold text-slate-500">{metric.label}</p>
              <MetricInfo metric={metric} />
            </div>
            {metric.key === "genderDistribution" && !metric.isPlaceholder ? (
              <GenderDonut value={metric.value} />
            ) : metric.key === "newResidentsTrend" && !metric.isPlaceholder ? (
              <YearTrend value={metric.value} />
            ) : (
              <p className={`mt-2 text-2xl font-black ${metric.isPlaceholder ? "text-slate-400" : "text-ink"}`}>
                {metric.value}
              </p>
            )}
            <div className="mt-auto flex items-center gap-2 pt-3 text-[0.68rem] font-black text-slate-400">
              <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-200 bg-white">
                i
              </span>
              <span>מקור נתונים</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
