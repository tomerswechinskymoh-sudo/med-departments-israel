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
    <div className="mt-2 flex items-center gap-3">
      <div
        className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#0f766e 0 ${women}%, #dbeafe ${women}% 100%)`
        }}
        aria-label={`נשים ${women}%, גברים ${men}%`}
      >
        <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-xs font-black text-ink">
          {Math.round(women)}%
        </div>
      </div>
      <div className="space-y-1.5 text-xs font-bold text-slate-600">
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
    <div className="mt-2 space-y-1.5">
      {rows.map((row) => (
        <div key={row.year}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>{row.year}</span>
            <span>{row.value.toLocaleString("he-IL")}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">
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

function ClockVisual({ value }: { value: string }) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-50 text-xl font-black text-brand-800">
        ◷
      </span>
      <p className="text-xl font-black text-ink">{value}</p>
    </div>
  );
}

function parseDistributionValues(value: string) {
  return value
    .split("·")
    .map((item) => {
      const [label, rawValue] = item.split(":").map((part) => part.trim());
      const numericValue = Number((rawValue ?? "").replace(/[^\d.-]/g, ""));

      return label && Number.isFinite(numericValue)
        ? { label, value: numericValue, displayValue: rawValue ?? "" }
        : null;
    })
    .filter((item): item is { label: string; value: number; displayValue: string } => Boolean(item));
}

function DistributionChart({ value }: { value: string }) {
  const rows = parseDistributionValues(value);
  const max = Math.max(...rows.map((row) => row.value), 1);

  if (rows.length === 0) {
    return <p className="mt-2 text-xl font-black text-ink">{value}</p>;
  }

  return (
    <div className="mt-2 space-y-1.5">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[4.8rem_1fr_2.8rem] items-center gap-2">
          <span className="truncate text-[0.68rem] font-bold text-slate-500">{row.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-teal-600"
              style={{ width: `${Math.max(8, Math.round((row.value / max) * 100))}%` }}
            />
          </div>
          <span className="text-left text-xs font-black text-ink">{row.displayValue}</span>
        </div>
      ))}
    </div>
  );
}

function SalaryComparison({ value, tooltip }: { value: string; tooltip?: string }) {
  const numbers = [...(tooltip ?? "").matchAll(/([\d,.]+)\s*₪/g)].map((match) =>
    Number(match[1]?.replace(/,/g, ""))
  );
  const center = Number.isFinite(numbers[0]) ? numbers[0] : 16954;
  const periphery = Number.isFinite(numbers[1]) ? numbers[1] : 19965.92;
  const max = Math.max(center, periphery, 1);

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xl font-black text-ink">{value}</p>
      <div className="grid grid-cols-[4rem_1fr] items-center gap-2">
        <span className="text-[0.68rem] font-bold text-slate-500">מרכז</span>
        <div className="h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${(center / max) * 100}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-[4rem_1fr] items-center gap-2">
        <span className="text-[0.68rem] font-bold text-slate-500">פריפריה</span>
        <div className="h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-amber-500" style={{ width: `${(periphery / max) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function BurnoutComparison({ value }: { value: string }) {
  const burnout = parseFirstNumber(value) ?? 0;
  const nationalAverage = 4.5;
  const max = 6;

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xl font-black text-ink">{value}</p>
      <div className="space-y-1.5">
        <div className="grid grid-cols-[4rem_1fr] items-center gap-2">
          <span className="text-[0.68rem] font-bold text-slate-500">תחום</span>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-rose-500" style={{ width: `${(burnout / max) * 100}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-[4rem_1fr] items-center gap-2">
          <span className="text-[0.68rem] font-bold text-slate-500">ארצי 4.5</span>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-slate-400" style={{ width: `${(nationalAverage / max) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricInfo({ metric }: { metric: SpecialtyMetricResult }) {
  const source = metric.sourceLabel ?? "מקור נתונים לא צוין";
  const lines = [
    metric.tooltip ?? metric.description,
    metric.displayAction ? `Display/action: ${metric.displayAction}` : null,
    `Source: ${source}`,
    metric.sourceUrl ? `Source link: ${metric.sourceUrl}` : null,
    `Metric level: ${metric.metricLevel ?? "ארצי לתחום"}`
  ].filter((line): line is string => Boolean(line));
  const text = lines.join("\n");

  return (
    <span className="relative inline-flex">
      <span
        tabIndex={0}
        title={text}
        aria-label={text}
        className="group grid h-7 w-7 cursor-help place-items-center rounded-full border border-slate-200 bg-white text-[0.72rem] font-black text-slate-500 transition hover:border-brand-200 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-200"
      >
        i
        <span className="pointer-events-auto absolute left-0 top-9 z-20 hidden w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs font-semibold leading-5 text-slate-700 shadow-xl group-hover:block group-focus:block">
          <span className="space-y-1">
            {lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </span>
          {metric.sourceUrl ? (
            <a
              href={metric.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto mt-2 block font-black text-brand-800 underline"
            >
              Source link
            </a>
          ) : null}
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
    <section className="rounded-[1.25rem] border border-brand-100 bg-white/95 p-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-700">דשבורד {specialtyName}</p>
          <h2 className="mt-1 text-lg font-bold text-ink">תמונת מצב כללית של תחום ההתמחות</h2>
        </div>
        <p className="max-w-md text-xs leading-6 text-slate-500">
          הנתונים מבוססים על מידע זמין במערכת ועשויים להיות חלקיים
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric, index) => (
          <div
            key={metric.key}
            className={`flex min-h-[5.75rem] flex-col rounded-2xl border p-2.5 ${
              metric.isHighlighted
                ? "border-amber-200 bg-gradient-to-l from-amber-50 to-white"
                : index === 0
                ? "border-brand-200 bg-gradient-to-l from-brand-50 to-white"
                : "border-slate-100 bg-slate-50/70"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold text-slate-500">{metric.label}</p>
              <MetricInfo metric={metric} />
            </div>
            {(metric.visualType === "donut" || metric.key === "genderDistribution") && !metric.isPlaceholder ? (
              <GenderDonut value={metric.value} />
            ) : (metric.visualType === "clock" || metric.key === "medianWaitingTime") && !metric.isPlaceholder ? (
              <ClockVisual value={metric.value} />
            ) : (metric.visualType === "distribution" || metric.key === "acceptanceDistribution") && !metric.isPlaceholder ? (
              <DistributionChart value={metric.value} />
            ) : (metric.visualType === "salaryComparison" || metric.key === "salaryGap") && !metric.isPlaceholder ? (
              <SalaryComparison value={metric.value} tooltip={metric.tooltip} />
            ) : metric.key === "burnoutIndex" && !metric.isPlaceholder ? (
              <BurnoutComparison value={metric.value} />
            ) : (metric.visualType === "trend" || metric.key === "newResidentsTrend") && !metric.isPlaceholder ? (
              <YearTrend value={metric.value} />
            ) : (
              <p className={`mt-2 text-xl font-black ${metric.isPlaceholder ? "text-slate-400" : "text-ink"}`}>
                {metric.value}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
