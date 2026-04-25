import type { ReactNode } from "react";
import Link from "next/link";
import { FavoriteToggleButton } from "@/components/departments/favorite-toggle-button";
import { PlaceholderVisual } from "@/components/media/placeholder-visual";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ClipboardHeartIcon,
  DepartmentDirectoryIcon,
  HospitalBuildingIcon,
  SearchPulseIcon,
  ShieldCheckIcon
} from "@/components/ui/med-icons";
import { RatingStars } from "@/components/ui/rating-stars";
import { buildDepartmentHref } from "@/lib/utils";

function MetricChip({
  label,
  value,
  icon
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  const tone =
    value >= 4
      ? "border-emerald-100 bg-emerald-50 text-emerald-900"
      : value >= 3
        ? "border-brand-100 bg-brand-50 text-brand-900"
        : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className={`rounded-2xl border px-3 py-3 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.68rem] font-semibold tracking-wide opacity-80">{label}</span>
        <span className="opacity-80">{icon}</span>
      </div>
      {value ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-white/70">
            <div className="rounded-full bg-current" style={{ width: `${(value / 5) * 100}%` }} />
          </div>
          <span className="inline-flex min-w-11 items-center justify-center rounded-full border border-current/15 bg-white/75 px-2.5 py-1 text-xs font-bold">
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
  showFavoriteButton = false
}: {
  department: {
    id: string;
    slug: string;
    name: string;
    institutionName: string;
    city?: string | null;
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
    isFavorite?: boolean;
    coverImageUrl?: string | null;
  };
  showFavoriteButton?: boolean;
}) {
  const departmentHref = buildDepartmentHref(department.slug);

  return (
    <Card className="group relative flex h-full flex-col justify-between overflow-hidden border border-white/90 bg-white/94 p-0 transition hover:-translate-y-0.5 hover:shadow-panel">
      <Link
        href={departmentHref}
        aria-label={`לצפייה בעמוד המחלקה ${department.name}`}
        className="absolute inset-0 z-10 rounded-[2rem]"
      />

      <div className="relative z-0 p-3">
        <PlaceholderVisual
          label={department.name}
          caption={`${department.institutionName}${department.city ? ` · ${department.city}` : ""}`}
          variant="department"
          className="aspect-[1.48/1] w-full"
        />
      </div>

      <div className="relative z-20 flex flex-1 flex-col justify-between px-6 pb-6">
        <div className="pointer-events-none">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={department.hasOpenResidency ? "success" : "warning"}>
              {department.hasOpenResidency ? "יש תקנים פתוחים" : "אין תקנים פתוחים כרגע"}
            </Badge>
            {department.hasUpcomingCommittee ? (
              <Badge tone="default">ועדה מתוכננת</Badge>
            ) : null}
            <Badge tone={department.hasResearch ? "success" : "default"}>
              {department.hasResearch ? "מחקר פעיל" : "ללא מחקר פתוח"}
            </Badge>
          </div>

          <h3 className="mt-4 text-2xl font-bold text-ink">{department.name}</h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-brand-50/70 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <HospitalBuildingIcon className="h-4 w-4" />
                <p className="text-xs font-semibold">מוסד</p>
              </div>
              <p className="mt-1 text-sm font-semibold text-ink">
                {department.institutionName}
                {department.city ? ` · ${department.city}` : ""}
              </p>
            </div>
            <div className="rounded-2xl bg-brand-50/70 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <DepartmentDirectoryIcon className="h-4 w-4" />
                <p className="text-xs font-semibold">תחום</p>
              </div>
              <p className="mt-1 text-sm font-semibold text-ink">{department.specialtyName}</p>
            </div>
          </div>

          <p className="mt-4 max-h-14 overflow-hidden text-sm leading-7 text-slate-600">
            {department.shortSummary}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricChip
              label="הוראה"
              value={department.teachingQuality ?? 0}
              icon={<ShieldCheckIcon className="h-4 w-4" />}
            />
            <MetricChip
              label="עומס / איזון"
              value={department.lifestyleBalance ?? 0}
              icon={<ClipboardHeartIcon className="h-4 w-4" />}
            />
            <MetricChip
              label="חשיפה קלינית"
              value={department.clinicalExposure ?? 0}
              icon={<SearchPulseIcon className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="relative z-30 mt-6 space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{department.reviewCount} שיתופים מהשטח</span>
            <RatingStars value={department.averageOverall || 0} />
          </div>

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
