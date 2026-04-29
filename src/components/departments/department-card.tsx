import Link from "next/link";
import { FavoriteToggleButton } from "@/components/departments/favorite-toggle-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import { getDepartmentHref } from "@/lib/utils";

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
    shlavAlephPassRate?: number | null;
    shlavBetPassRate?: number | null;
    candidatePreferences?: string | null;
    isFavorite?: boolean;
    coverImageUrl?: string | null;
  };
  showFavoriteButton?: boolean;
  variant?: "card" | "row";
}) {
  const departmentHref = getDepartmentHref(department);
  const isRow = variant === "row";

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
          isRow ? "gap-4 p-4 md:p-5 lg:grid lg:grid-cols-[1fr_220px] lg:items-center" : "p-6"
        }`}
      >
        <div className="pointer-events-none">
          <div className="flex flex-wrap items-center gap-2">
            {department.hasOpenResidency ? <Badge tone="success">תקנים פתוחים</Badge> : null}
            {department.hasUpcomingCommittee ? (
              <Badge tone="default">ועדה מתוכננת</Badge>
            ) : null}
            {department.hasResearch ? <Badge tone="success">מחקר פתוח</Badge> : null}
            {department.region ? <Badge tone="default">{department.region}</Badge> : null}
            {!isRow && !department.hasOpenResidency ? (
              <Badge tone="warning">אין תקנים פתוחים כרגע</Badge>
            ) : null}
            {!isRow && !department.hasResearch ? <Badge tone="default">ללא מחקר פתוח</Badge> : null}
          </div>

          <div className={isRow ? "mt-3" : "mt-5 rounded-[1.25rem] border border-slate-100 bg-slate-50/90 px-4 py-4"}>
            <p className="text-xs font-semibold text-slate-500">
              {department.specialtyName}
            </p>
            <h3 className={`${isRow ? "text-xl" : "mt-2 text-2xl"} break-words font-bold leading-tight text-ink`}>
              {department.name}
            </h3>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
              {department.institutionName}
              {department.city ? ` · ${department.city}` : ""}
              {department.region ? ` · ${department.region}` : ""}
            </p>
          </div>

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
                <p className="text-slate-500">מתמחים</p>
                <p className="mt-1 font-bold text-ink">{department.residentsCount ?? "אין נתונים"}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-slate-500">שלב א׳</p>
                <p className="mt-1 font-bold text-ink">
                  {typeof department.shlavAlephPassRate === "number"
                    ? `${department.shlavAlephPassRate}%`
                    : "אין נתונים"}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Link
              href={departmentHref}
              className="pointer-events-auto rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              לעמוד המחלקה
            </Link>
            {showFavoriteButton ? (
              <div className="pointer-events-auto">
                <FavoriteToggleButton
                  departmentId={department.id}
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
