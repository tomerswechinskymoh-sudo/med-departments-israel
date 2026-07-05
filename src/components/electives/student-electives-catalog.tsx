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
  maxStudentsAtOnce: number | null;
  minDurationDays: number | null;
  maxDurationDays: number | null;
  rating: RatingSummary;
  openWindows: AvailabilityWindow[];
  closedWindows: AvailabilityWindow[];
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

export function StudentElectivesCatalog({ departments, search }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateByDepartment, setDateByDepartment] = useState<Record<string, { start: string; end: string }>>({});
  const [matchByDepartment, setMatchByDepartment] = useState<Record<string, MatchState>>({});

  const initialDates = useMemo(() => ({ start: search.start, end: search.end }), [search.start, search.end]);

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
                      <div>
                        <h4 className="text-base font-black text-ink">זמינות ותאריכים</h4>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1">
                            <span className="text-xs font-black text-slate-500">תאריך התחלה</span>
                            <input
                              type="date"
                              value={dates.start}
                              onChange={(event) => {
                                const next = { ...dates, start: event.target.value };
                                setDateByDepartment((current) => ({ ...current, [department.id]: next }));
                                void checkDates(department, next.start, next.end);
                              }}
                              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-black text-slate-500">תאריך סיום</span>
                            <input
                              type="date"
                              value={dates.end}
                              onChange={(event) => {
                                const next = { ...dates, end: event.target.value };
                                setDateByDepartment((current) => ({ ...current, [department.id]: next }));
                                void checkDates(department, next.start, next.end);
                              }}
                              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <WindowList title="תאריכים פתוחים" windows={department.openWindows} tone="success" />
                        <WindowList title="תאריכים חסומים" windows={department.closedWindows} tone="danger" />
                      </div>

                      {!department.openWindows.length && !department.closedWindows.length ? (
                        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                          ניתן לבחור תאריכים לבדיקה.
                        </p>
                      ) : null}

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
                            המשך להגשת בקשה
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

function WindowList({
  title,
  windows,
  tone
}: {
  title: string;
  windows: AvailabilityWindow[];
  tone: "success" | "danger";
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black text-slate-500">{title}</p>
        {windows.length ? <Badge tone={tone}>{windows.length}</Badge> : null}
      </div>
      {windows.length ? (
        <ul className="mt-2 space-y-2 text-xs font-semibold text-slate-700">
          {windows.slice(0, 3).map((window) => (
            <li key={window.id}>
              {window.startsAt} - {window.endsAt}
              {window.capacityOverride ? ` · ${window.capacityOverride} מקומות` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs font-semibold text-slate-500">לא הוגדר</p>
      )}
    </div>
  );
}
