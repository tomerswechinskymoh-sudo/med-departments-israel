"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { InstitutionLogo } from "@/components/departments/institution-logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SearchState = {
  start: string;
  end: string;
  search: string;
  specialties: string[];
  regions: string[];
};

type RatingSummary = {
  average: number | null;
  count: number;
};

type ElectiveMatch = {
  ok: boolean;
  error: string | null;
  capacity: number | null;
  approvedOverlapCount: number | null;
  remainingCapacity: number | null;
} | null;

type AvailabilityWindow = {
  id: string;
  status: "OPEN" | "CLOSED";
  startsAt: string;
  endsAt: string;
  capacityOverride: number | null;
  reason: string | null;
  note: string | null;
};

export type StudentElectiveCatalogDepartment = {
  id: string;
  slug: string;
  name: string;
  hospital: string;
  city: string | null;
  region: string | null;
  specialty: string;
  institution: {
    name: string;
    city: string | null;
    region: string | null;
    slug: string | null;
    coverImageUrl: string | null;
  };
  notes: string | null;
  availabilityMode: "OPEN_BY_DEFAULT" | "CLOSED_BY_DEFAULT" | null;
  maxStudentsAtOnce: number | null;
  minDurationDays: number | null;
  maxDurationDays: number | null;
  rating: RatingSummary;
  openWindows: AvailabilityWindow[];
  closedWindows: AvailabilityWindow[];
  bookedRanges: Array<{
    id: string;
    requestedStartDate: string;
    requestedEndDate: string;
  }>;
  electiveMatch: ElectiveMatch;
};

type Props = {
  departments: StudentElectiveCatalogDepartment[];
  search: SearchState;
};

type MatchState = {
  status: "idle" | "loading" | "ready" | "error";
  match: ElectiveMatch;
  message: string | null;
};

function formatRating(rating: RatingSummary) {
  if (!rating.count || rating.average === null) return "עדיין אין נתונים";

  return `${rating.average.toFixed(1)} ★ (${rating.count})`;
}

function createSearchFromDates(search: SearchState, start: string, end: string) {
  return {
    ...search,
    start,
    end
  };
}

function createQuery(search: SearchState) {
  const params = new URLSearchParams();

  if (search.start) params.set("start", search.start);
  if (search.end) params.set("end", search.end);
  if (search.specialties.length > 0) params.set("specialties", search.specialties.join(","));
  if (search.regions.length > 0) params.set("regions", search.regions.join(","));
  if (search.search) params.set("search", search.search);

  return params.toString();
}

function applyHref(slug: string, search: SearchState, start: string, end: string) {
  const query = createQuery(createSearchFromDates(search, start, end));
  return `/electives/${encodeURIComponent(slug)}/apply${query ? `?${query}` : ""}`;
}

function detailHref(slug: string, search: SearchState, start: string, end: string) {
  const query = createQuery(createSearchFromDates(search, start, end));
  return `/electives/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
}

function statusLabel(match: ElectiveMatch, hasDateRange: boolean) {
  if (!hasDateRange) return null;
  if (match?.ok) return "התאריכים פנויים";

  return "לא פנוי בתאריכים שנבחרו";
}

function parseInputDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function utcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addDays(value: Date, days: number) {
  const next = utcDay(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(value: Date, months: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
}

function rangeIncludes(day: string, start: string, end: string) {
  return day >= start && day <= end;
}

function isDayWithinWindow(day: string, windows: AvailabilityWindow[]) {
  return windows.some((window) => rangeIncludes(day, window.startsAt, window.endsAt));
}

function capacityForDay(department: StudentElectiveCatalogDepartment, day: string) {
  const overrideWindow = department.openWindows.find((window) => window.capacityOverride && rangeIncludes(day, window.startsAt, window.endsAt));
  return overrideWindow?.capacityOverride ?? department.maxStudentsAtOnce ?? null;
}

function approvedBookingsForDay(department: StudentElectiveCatalogDepartment, day: string) {
  return department.bookedRanges.filter((booking) => rangeIncludes(day, booking.requestedStartDate, booking.requestedEndDate)).length;
}

function dayAvailability(department: StudentElectiveCatalogDepartment, day: string) {
  if (department.availabilityMode === "CLOSED_BY_DEFAULT" && !isDayWithinWindow(day, department.openWindows)) {
    return { selectable: false, label: "לא זמין", full: false };
  }

  if (department.availabilityMode === "OPEN_BY_DEFAULT" && isDayWithinWindow(day, department.closedWindows)) {
    return { selectable: false, label: "לא זמין", full: false };
  }

  const capacity = capacityForDay(department, day);
  if (!capacity) {
    return { selectable: false, label: "לא זמין", full: false };
  }

  if (approvedBookingsForDay(department, day) >= capacity) {
    return { selectable: false, label: "מלא", full: true };
  }

  return { selectable: true, label: "פנוי", full: false };
}

function getMonthCells(month: Date) {
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const startOffset = first.getUTCDay();
  const firstCell = addDays(first, -startOffset);

  return Array.from({ length: 42 }, (_, index) => addDays(firstCell, index));
}

function monthLabel(month: Date) {
  return new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(month);
}

export function StudentElectivesCatalog({ departments, search }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateByDepartment, setDateByDepartment] = useState<Record<string, { start: string; end: string }>>({});
  const [monthByDepartment, setMonthByDepartment] = useState<Record<string, Date>>({});
  const [matchByDepartment, setMatchByDepartment] = useState<Record<string, MatchState>>({});

  const initialDates = useMemo(() => ({ start: search.start, end: search.end }), [search.start, search.end]);
  const initialMonth = useMemo(() => parseInputDate(search.start) ?? new Date(), [search.start]);

  async function checkDates(department: StudentElectiveCatalogDepartment, start: string, end: string) {
    if (!start || !end) {
      setMatchByDepartment((current) => ({
        ...current,
        [department.id]: {
          status: "idle",
          match: null,
          message: "בחרו תאריך התחלה ותאריך סיום."
        }
      }));
      return;
    }

    setMatchByDepartment((current) => ({
      ...current,
      [department.id]: { status: "loading", match: null, message: null }
    }));

    try {
      const params = new URLSearchParams({ start, end });
      const response = await fetch(`/api/electives/departments/${encodeURIComponent(department.slug)}?${params.toString()}`, {
        headers: { Accept: "application/json" }
      });
      const payload = await response.json();
      const match = payload?.department?.dateAvailability?.match ?? null;
      const message = payload?.department?.dateAvailability?.message ?? payload?.error ?? null;

      setMatchByDepartment((current) => ({
        ...current,
        [department.id]: {
          status: response.ok ? "ready" : "error",
          match,
          message
        }
      }));
    } catch {
      setMatchByDepartment((current) => ({
        ...current,
        [department.id]: {
          status: "error",
          match: null,
          message: "לא ניתן לבדוק זמינות כרגע."
        }
      }));
    }
  }

  function setDepartmentDates(department: StudentElectiveCatalogDepartment, start: string, end: string) {
    setDateByDepartment((current) => ({ ...current, [department.id]: { start, end } }));
    void checkDates(department, start, end);
  }

  function selectCalendarDay(department: StudentElectiveCatalogDepartment, currentDates: { start: string; end: string }, day: string) {
    const availability = dayAvailability(department, day);
    if (!availability.selectable) return;

    if (!currentDates.start || currentDates.end) {
      setDepartmentDates(department, day, "");
      return;
    }

    if (day < currentDates.start) {
      setDepartmentDates(department, day, "");
      return;
    }

    setDepartmentDates(department, currentDates.start, day);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[1.35fr_1.2fr_1fr_0.75fr_1fr_0.85fr_0.55fr] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black text-slate-500 lg:grid">
        <span>בית חולים</span>
        <span>מחלקה</span>
        <span>תחום</span>
        <span>אזור</span>
        <span>מספר סטודנטים שיכולים להיות בו זמנית</span>
        <span>דירוג סטודנטים</span>
        <span>פרטים</span>
      </div>

      <div className="max-h-[72vh] overflow-y-auto">
        {departments.map((department) => {
          const expanded = expandedId === department.id;
          const dates = dateByDepartment[department.id] ?? initialDates;
          const localMatchState = matchByDepartment[department.id];
          const activeMatch = localMatchState?.match ?? (dates.start === search.start && dates.end === search.end ? department.electiveMatch : null);
          const hasLocalDateRange = Boolean(dates.start && dates.end);
          const activeStatusLabel = statusLabel(activeMatch, hasLocalDateRange);
          const remainingCapacity = activeMatch?.remainingCapacity ?? null;
          const currentMonth = monthByDepartment[department.id] ?? parseInputDate(dates.start) ?? initialMonth;

          return (
            <div key={department.id} className="border-b border-slate-100 last:border-b-0">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : department.id)}
                className={cn(
                  "grid w-full gap-3 px-4 py-4 text-right transition hover:bg-brand-50/40 lg:grid-cols-[1.35fr_1.2fr_1fr_0.75fr_1fr_0.85fr_0.55fr] lg:items-center",
                  expanded ? "bg-brand-50/50" : "bg-white"
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <InstitutionLogo institution={department.institution} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-ink">{department.hospital}</span>
                    <span className="block text-xs font-semibold text-slate-500 lg:hidden">
                      {[department.city, department.region].filter(Boolean).join(" · ") || "מיקום לא צוין"}
                    </span>
                  </span>
                </span>
                <span className="text-sm font-bold text-slate-800">{department.name}</span>
                <span className="text-sm font-semibold text-slate-700">{department.specialty}</span>
                <span className="hidden text-sm font-semibold text-slate-600 lg:block">{[department.city, department.region].filter(Boolean).join(" · ") || "לא צוין"}</span>
                <span className="text-sm font-black text-brand-800">{department.maxStudentsAtOnce ?? "לא הוגדר"}</span>
                <span className="text-sm font-semibold text-slate-700">{formatRating(department.rating)}</span>
                <span className="text-sm font-black text-brand-700">{expanded ? "סגור" : "פתח"}</span>
              </button>

              {expanded ? (
                <div className="bg-slate-50/70 px-4 pb-5 pt-1">
                  <div className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-4 lg:grid-cols-[1fr_1fr]">
                    <section className="space-y-4">
                      <div className="flex gap-3">
                        <InstitutionLogo institution={department.institution} size="md" />
                        <div>
                          <h3 className="text-xl font-black text-ink">{department.name}</h3>
                          <p className="mt-1 text-sm font-semibold text-slate-700">{department.hospital}</p>
                          <p className="mt-1 text-sm text-slate-600">{department.specialty}</p>
                        </div>
                      </div>

                      {department.notes ? (
                        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">{department.notes}</p>
                      ) : null}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-xs font-black text-slate-500">מספר סטודנטים שיכולים להיות בו זמנית</p>
                          <p className="mt-1 text-lg font-black text-ink">{department.maxStudentsAtOnce ?? "לא הוגדר"}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-xs font-black text-slate-500">דירוג סטודנטים</p>
                          <p className="mt-1 text-sm font-bold text-ink">
                            {department.rating.count
                              ? formatRating(department.rating)
                              : "עדיין אין נתונים מסטודנטים שביצעו אלקטיב במחלקה זו"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-black text-slate-500">משך אלקטיב</p>
                        <p className="mt-1 text-sm font-bold text-ink">
                          {department.minDurationDays ?? "?"} - {department.maxDurationDays ?? "?"} ימים
                        </p>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <ElectiveDateRangeCalendar
                        department={department}
                        month={currentMonth}
                        selectedStart={dates.start}
                        selectedEnd={dates.end}
                        onClear={() => setDepartmentDates(department, "", "")}
                        onPreviousMonth={() =>
                          setMonthByDepartment((current) => ({
                            ...current,
                            [department.id]: addMonths(currentMonth, -1)
                          }))
                        }
                        onNextMonth={() =>
                          setMonthByDepartment((current) => ({
                            ...current,
                            [department.id]: addMonths(currentMonth, 1)
                          }))
                        }
                        onSelectDay={(day) => selectCalendarDay(department, dates, day)}
                      />

                      <div className="rounded-2xl border border-slate-100 px-4 py-3">
                        {localMatchState?.status === "loading" ? (
                          <p className="text-sm font-semibold text-slate-600">בודק זמינות...</p>
                        ) : activeStatusLabel ? (
                          <div className="space-y-2">
                            <Badge tone={activeMatch?.ok ? "success" : "danger"}>{activeStatusLabel}</Badge>
                            {activeMatch?.ok ? (
                              <p className="text-sm font-bold text-emerald-800">נותרו {remainingCapacity ?? "?"} מקומות בטווח שבחרת.</p>
                            ) : (
                              <p className="text-sm font-bold text-rose-800">
                                {activeMatch?.error ?? localMatchState?.message ?? "התאריכים אינם פנויים."}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-slate-600">בחרו תאריכים כדי לבדוק התאמה.</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {hasLocalDateRange && activeMatch?.ok ? (
                          <Link href={applyHref(department.slug, search, dates.start, dates.end)} className="inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white">
                            המשך להגשת בקשה
                          </Link>
                        ) : (
                          <button disabled className="inline-flex rounded-full bg-slate-200 px-5 py-3 text-sm font-black text-slate-500">
                            בחרו טווח תאריכים פנוי
                          </button>
                        )}
                        <Link href={detailHref(department.slug, search, dates.start, dates.end)} className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">
                          פרטים נוספים
                        </Link>
                      </div>
                    </section>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ElectiveDateRangeCalendar({
  department,
  month,
  selectedStart,
  selectedEnd,
  onClear,
  onPreviousMonth,
  onNextMonth,
  onSelectDay
}: {
  department: StudentElectiveCatalogDepartment;
  month: Date;
  selectedStart: string;
  selectedEnd: string;
  onClear: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (day: string) => void;
}) {
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const today = formatInputDate(utcDay(new Date()));
  const secondMonth = addMonths(month, 1);
  const previewEnd = selectedStart && !selectedEnd && hoverDay && hoverDay > selectedStart ? hoverDay : selectedEnd;
  const parsedStart = parseInputDate(selectedStart);
  const parsedEnd = parseInputDate(selectedEnd);
  const selectedDuration = parsedStart && parsedEnd
    ? Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : null;

  function renderMonth(monthToRender: Date) {
    const cells = getMonthCells(monthToRender);
    const currentMonth = monthToRender.getUTCMonth();

    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-3">
        <div className="text-center text-sm font-black text-ink">{monthLabel(monthToRender)}</div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-black text-slate-500">
          {["א", "ב", "ג", "ד", "ה", "ו", "ש"].map((dayName) => (
            <span key={dayName}>{dayName}</span>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const day = formatInputDate(cell);
            const availability = dayAvailability(department, day);
            const inFinalSelectedRange = Boolean(selectedStart && selectedEnd && rangeIncludes(day, selectedStart, selectedEnd));
            const inPreviewRange = Boolean(selectedStart && !selectedEnd && previewEnd && rangeIncludes(day, selectedStart, previewEnd));
            const inSelectedRange = inFinalSelectedRange || inPreviewRange;
            const isSelectedStart = day === selectedStart;
            const isSelectedEnd = day === selectedEnd;
            const isSelectedEdge = isSelectedStart || isSelectedEnd;
            const isOutsideMonth = cell.getUTCMonth() !== currentMonth;
            const isToday = day === today;
            const buttonVisualClass = isSelectedEdge
              ? "rounded-2xl border-brand-950 bg-brand-900 text-white opacity-100 shadow-md ring-2 ring-brand-300 disabled:text-white disabled:opacity-100"
              : inFinalSelectedRange
                ? "rounded-md border-brand-700 bg-brand-700 text-white opacity-100 shadow-inner disabled:text-white disabled:opacity-100"
                : inPreviewRange
                  ? "rounded-md border-brand-300 bg-brand-100 text-brand-950 shadow-inner"
                  : availability.selectable
                    ? "rounded-2xl border-emerald-100 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50"
                    : availability.full
                      ? "rounded-2xl cursor-not-allowed border-amber-100 bg-amber-50 text-amber-700"
                      : "rounded-2xl cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400";
            const dayNumberClass = isSelectedEdge
              ? "text-white font-black opacity-100"
              : inFinalSelectedRange
                ? "text-white font-semibold opacity-100"
                : inPreviewRange
                  ? "text-brand-950 opacity-100"
                  : availability.selectable
                    ? "text-slate-800"
                    : availability.full
                      ? "text-amber-800"
                      : "text-slate-500";

            return (
              <button
                key={day}
                type="button"
                disabled={!availability.selectable}
                data-day-label={day}
                data-selected-start={isSelectedStart ? "true" : undefined}
                data-selected-end={isSelectedEnd ? "true" : undefined}
                data-selected-range={inFinalSelectedRange ? "true" : undefined}
                onClick={() => onSelectDay(day)}
                onMouseEnter={() => setHoverDay(day)}
                onFocus={() => setHoverDay(day)}
                aria-label={`${day} ${availability.label}`}
                className={cn(
                  "min-h-11 border px-1 py-1 text-center text-xs font-black transition",
                  isOutsideMonth && !inSelectedRange && "opacity-35",
                  buttonVisualClass,
                  isToday && !isSelectedEdge && "ring-2 ring-brand-200"
                )}
              >
                <span className={cn("relative z-10 block text-sm", dayNumberClass)}>
                  {cell.getUTCDate()}
                </span>
                {!availability.selectable ? (
                  <span className={cn("relative z-10 mt-0.5 block text-[0.58rem] font-bold", inFinalSelectedRange && "text-white opacity-100")}>{availability.label}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-base font-black text-ink">בחירת תאריכים</h4>
          <p className="mt-1 text-sm font-black text-ink">
            טווח שנבחר: {selectedStart && selectedEnd ? `${selectedStart} – ${selectedEnd}` : "עדיין לא נבחר טווח תאריכים"}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {selectedDuration ? `משך שנבחר: ${selectedDuration} ימים` : `משך אלקטיב: ${department.minDurationDays ?? "?"}–${department.maxDurationDays ?? "?"} ימים`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
          >
            נקה בחירה
          </button>
          <button
            type="button"
            onClick={onPreviousMonth}
            aria-label="חודש קודם"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
          >
            חודש קודם
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="חודש הבא"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
          >
            חודש הבא
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {renderMonth(month)}
        <div className="hidden md:block">{renderMonth(secondMonth)}</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
        <span className="rounded-full border border-emerald-100 bg-white px-3 py-1 text-emerald-800">פנוי</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">לא זמין</span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">מלא</span>
        <span className="rounded-full bg-brand-700 px-3 py-1 text-white">טווח שנבחר</span>
      </div>
    </div>
  );
}
