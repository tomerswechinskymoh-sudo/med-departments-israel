import Link from "next/link";
import { FavoriteToggleButton } from "@/components/departments/favorite-toggle-button";
import { InstitutionLogo } from "@/components/departments/institution-logo";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import { departmentNewResidentsChartRows } from "@/lib/department-yearly-residents";
import { formatDate, getDepartmentHref } from "@/lib/utils";

function MetricChip({
  label,
  value
}: {
  label: string;
  value: number;
}) {
  const tone =
    value >= 4
      ? "border-emerald-100 bg-emerald-50 text-emerald-900"
      : value >= 3
        ? "border-brand-100 bg-brand-50 text-brand-900"
        : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className={`min-w-0 rounded-xl border px-3 py-2.5 ${tone}`}>
      <span className="block truncate text-[0.68rem] font-semibold opacity-80">{label}</span>
      {value ? (
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-white/70">
            <div className="rounded-full bg-current" style={{ width: `${(value / 5) * 100}%` }} />
          </div>
          <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-current/15 bg-white/75 px-2 py-0.5 text-xs font-bold">
            {value.toFixed(1)}
          </span>
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-500">אין עדיין</p>
      )}
    </div>
  );
}

function DataPill({
  label,
  value,
  helper
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2" title={helper}>
      <p className="text-[0.68rem] font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-ink">{value}</p>
      {helper ? <p className="mt-0.5 truncate text-[0.65rem] font-semibold text-slate-400">{helper}</p> : null}
    </div>
  );
}

const DEPARTMENT_NEW_RESIDENTS_TREND_LABEL = "מתמחים חדשים במחלקה לפי שנה";

function MiniYearlyResidentsChart({
  rows
}: {
  rows?: Array<{ year: number; value: number | null }>;
}) {
  const chartRows = departmentNewResidentsChartRows(rows ?? []);

  if (chartRows.length === 0) {
    return (
      <div
        className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
        title={DEPARTMENT_NEW_RESIDENTS_TREND_LABEL}
        aria-label={DEPARTMENT_NEW_RESIDENTS_TREND_LABEL}
      >
        <p className="text-[0.68rem] font-black text-slate-600">
          {DEPARTMENT_NEW_RESIDENTS_TREND_LABEL}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-400">הנתון עדיין לא סופק</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2"
      title={DEPARTMENT_NEW_RESIDENTS_TREND_LABEL}
      aria-label={DEPARTMENT_NEW_RESIDENTS_TREND_LABEL}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[0.68rem] font-black text-sky-900">
          {DEPARTMENT_NEW_RESIDENTS_TREND_LABEL}
        </p>
      </div>
      <div className="mt-2 grid min-w-0 grid-cols-5 items-end gap-1.5" dir="ltr">
        {chartRows.map((row) => (
          <div key={row.year} className="min-w-0 text-center" dir="ltr">
            <p className="mb-1 truncate text-[0.62rem] font-black text-sky-950">
              {row.value.toLocaleString("he-IL")}
            </p>
            <div className="flex h-11 items-end justify-center rounded-md bg-white/70 px-1">
              <div
                className="w-full max-w-5 rounded-t-md bg-sky-600"
                style={{ height: row.height }}
                title={`${row.label}: ${row.value.toLocaleString("he-IL")}`}
              />
            </div>
            <p className="mt-1 truncate text-[0.58rem] font-bold text-slate-500">
              {String(row.year).slice(-2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DepartmentCard({
  department,
  showFavoriteButton = false,
  variant = "card"
}: {
  department: {
    id: string;
    slug: string;
    name: string;
    institutionName: string;
    institutionSlug?: string | null;
    institutionCoverImageUrl?: string | null;
    city?: string | null;
    region?: string | null;
    institutionType?: "HOSPITAL" | "HMO";
    specialtyName: string;
    shortSummary: string;
    reviewCount: number;
    averageOverall: number;
    teachingQuality?: number;
    lifestyleBalance?: number;
    researchExposure?: number;
    seniorsApproachability?: number;
    clinicalExposure?: number;
    hasOpenResidency: boolean;
    hasUpcomingCommittee?: boolean;
    hasResearch: boolean;
    residentsCount?: number | null;
    newResidentsLatest?: number | null;
    departmentNewResidentsYearly?: Array<{ year: number; value: number | null }>;
    seniorPhysiciansCount?: number | null;
    duns100PhysiciansCount?: number | null;
    expectedOpeningsCount?: number | null;
    estimatedPublicationsCount?: number | null;
    estimatedPublicationsYear?: number | null;
    shlavAlephPassRate?: number | null;
    shlavBetPassRate?: number | null;
    candidatePreferences?: string | null;
    sourceNotes?: string | null;
    dataLastUpdated?: string | Date | null;
    isFavorite?: boolean;
    coverImageUrl?: string | null;
    isArrayCard?: boolean;
    arrayDepartmentCount?: number;
    hrefDepartmentId?: string | null;
    favoriteDepartmentId?: string | null;
  };
  showFavoriteButton?: boolean;
  variant?: "card" | "row";
}) {
  const departmentHref = getDepartmentHref({
    slug: department.slug,
    id: department.hrefDepartmentId ?? department.id
  });
  const isRow = variant === "row";
  const favoriteDepartmentId =
    department.favoriteDepartmentId ?? (department.isArrayCard ? null : department.id);
  const activeResidentsStat =
    typeof department.residentsCount === "number"
      ? {
          label: department.isArrayCard ? "ממוצע מתמחים למחלקה" : "מתמחים פעילים",
          value: department.residentsCount
        }
      : null;

  return (
    <Card
      className={`group relative overflow-hidden border border-white/90 bg-white/96 p-0 transition hover:-translate-y-0.5 hover:shadow-panel ${
        isRow ? "rounded-[1.25rem]" : "flex h-full flex-col justify-between"
      }`}
    >
      <Link
        href={departmentHref}
        aria-label={`לצפייה בעמוד המחלקה ${department.name}`}
        className="absolute inset-0 z-10 rounded-[1.25rem]"
      />

      <div
        className={`relative z-20 flex flex-1 flex-col justify-between ${
          isRow ? "gap-4 p-4 md:p-5 lg:grid lg:grid-cols-[1fr_260px] lg:items-center" : "p-6"
        }`}
      >
        <div className="pointer-events-none">
          {isRow ? (
            <div className="flex gap-4">
              <InstitutionLogo
                institution={{
                  name: department.institutionName,
                  slug: department.institutionSlug,
                  coverImageUrl: department.institutionCoverImageUrl
                }}
                size="md"
                className="mt-0.5"
              />
              <div className="min-w-0 space-y-2">
                {department.region ? (
                  <p className="text-xs font-black text-brand-700">{department.region}</p>
                ) : null}
                <p className="text-base font-bold leading-7 text-slate-700">
                  {department.institutionName}
                </p>
                <h3 className="break-words text-2xl font-black leading-tight text-ink">
                  {department.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <p className="inline-flex rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-900">
                    {department.specialtyName}
                  </p>
                  {department.isArrayCard ? (
                    <p className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-900">
                      מערך · {department.arrayDepartmentCount === 1 ? "מחלקה אחת" : `${department.arrayDepartmentCount} מחלקות`}
                    </p>
                  ) : null}
                </div>
                {department.shortSummary ? (
                  <p className="max-w-3xl text-sm leading-7 text-slate-600">
                    {department.shortSummary}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {department.hasOpenResidency ? <Badge tone="success">משרות פתוחות</Badge> : null}
                {department.hasUpcomingCommittee ? (
                  <Badge tone="default">ועדה מתוכננת</Badge>
                ) : null}
                {department.hasResearch ? <Badge tone="success">מחקר פתוח</Badge> : null}
                {department.region ? <Badge tone="default">{department.region}</Badge> : null}
                {!department.hasOpenResidency ? (
                  <Badge tone="warning">אין משרות פתוחות כרגע</Badge>
                ) : null}
                {!department.hasResearch ? <Badge tone="default">ללא מחקר פתוח</Badge> : null}
              </div>

              <div className="mt-5 flex gap-3 rounded-[1.25rem] border border-slate-100 bg-slate-50/90 px-4 py-4">
                <InstitutionLogo
                  institution={{
                    name: department.institutionName,
                    slug: department.institutionSlug,
                    coverImageUrl: department.institutionCoverImageUrl
                  }}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">
                    {department.specialtyName}
                  </p>
                  <h3 className="mt-2 break-words text-2xl font-bold leading-tight text-ink">
                    {department.name}
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                    {department.institutionName}
                    {department.city ? ` · ${department.city}` : ""}
                    {department.region ? ` · ${department.region}` : ""}
                  </p>
                </div>
              </div>
            </>
          )}

          {!isRow ? (
            <>
              <p className="mt-4 min-h-[3.5rem] text-sm leading-7 text-slate-600">
                {department.shortSummary}
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <MetricChip label="הוראה" value={department.teachingQuality ?? 0} />
                <MetricChip label="איזון" value={department.lifestyleBalance ?? 0} />
                <MetricChip label="קליניקה" value={department.clinicalExposure ?? 0} />
              </div>
            </>
          ) : null}
        </div>

        <div className={`relative z-30 ${isRow ? "space-y-3 lg:border-r lg:border-slate-100 lg:pr-4" : "mt-6 space-y-4"}`}>
          {isRow ? (
            <div className="flex flex-wrap gap-2">
              {department.hasOpenResidency ? <Badge tone="success">משרות פתוחות</Badge> : null}
              {department.hasUpcomingCommittee ? <Badge tone="default">ועדה מתוכננת</Badge> : null}
            </div>
          ) : null}

          {isRow && (activeResidentsStat || department.departmentNewResidentsYearly?.length) ? (
            <div className="grid gap-2">
              {activeResidentsStat ? (
                <DataPill label={activeResidentsStat.label} value={activeResidentsStat.value} />
              ) : null}
              <MiniYearlyResidentsChart rows={department.departmentNewResidentsYearly} />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            {department.reviewCount > 0 ? (
              <>
                <span>{department.reviewCount} ביקורות</span>
                <div className="shrink-0">
                  <RatingStars value={department.averageOverall || 0} />
                </div>
              </>
            ) : (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                אין עדיין ביקורות
              </span>
            )}
          </div>

          {!isRow ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-slate-500">מתמחים פעילים</p>
                <p className="mt-1 font-bold text-ink">{department.residentsCount ?? "אין נתונים"}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-slate-500">שלב א׳</p>
                <p className="mt-1 font-bold text-ink">
                  {typeof department.shlavAlephPassRate === "number"
                    ? `${Math.round(department.shlavAlephPassRate).toLocaleString("he-IL")}%`
                    : "אין נתונים"}
                </p>
              </div>
            </div>
          ) : null}

          {department.dataLastUpdated ? (
            <p className="text-[0.68rem] font-semibold leading-5 text-slate-400">
              עודכן: {formatDate(department.dataLastUpdated)}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Link
              href={departmentHref}
              className="pointer-events-auto rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              לעמוד המחלקה
            </Link>
            {showFavoriteButton && favoriteDepartmentId ? (
              <div className="pointer-events-auto">
                <FavoriteToggleButton
                  departmentId={favoriteDepartmentId}
                  initialFavorite={Boolean(department.isFavorite)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
