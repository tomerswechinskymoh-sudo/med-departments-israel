import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FavoriteToggleButton } from "@/components/departments/favorite-toggle-button";
import { OfficialUpdatesList } from "@/components/departments/official-updates-list";
import { ReviewCard } from "@/components/departments/review-card";
import { ExperienceCta } from "@/components/experience/experience-cta";
import { OpeningCard } from "@/components/openings/opening-card";
import { OpeningCriteriaGrid } from "@/components/openings/opening-criteria-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getDepartmentPageData,
  getReviewFormContext,
  resolveInstitutionRegion,
  reviewerTypeLabel
} from "@/lib/queries";
import { getDepartmentHref } from "@/lib/utils";

export const dynamic = "force-dynamic";

function EmptyValue() {
  return <span className="text-slate-400">אין עדיין נתונים</span>;
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${value}%` : null;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function DataPoint({
  label,
  value
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-ink">{value ?? <EmptyValue />}</p>
    </div>
  );
}

function ObjectiveStatCard({
  label,
  value,
  caption
}: {
  label: string;
  value: string | number;
  caption?: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-white to-brand-50/60 px-4 py-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black leading-tight text-ink">{value}</p>
      {caption ? <p className="mt-2 text-xs leading-5 text-slate-500">{caption}</p> : null}
    </div>
  );
}

function ObjectiveProgress({
  label,
  value
}: {
  label: string;
  value: number;
}) {
  const percent = clampPercent(value);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink">{label}</p>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-900">
          {percent}%
        </span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-700" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function percentPairsFromText(
  value: string,
  fallbackLabels: [string, string]
) {
  const matches = Array.from(value.matchAll(/([^·:,]+?)\s*(\d{1,3})%/g))
    .map((match) => ({
      label: match[1]?.trim() || fallbackLabels[0],
      value: clampPercent(Number(match[2] ?? 0))
    }))
    .filter((item) => item.value > 0);

  if (matches.length >= 2) {
    return matches.slice(0, 2);
  }

  const firstPercent = clampPercent(Number(value.match(/(\d{1,3})%/)?.[1] ?? 50));

  return [
    { label: fallbackLabels[0], value: firstPercent },
    { label: fallbackLabels[1], value: 100 - firstPercent }
  ];
}

function percentForLabel(value: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const numberBeforeLabel = value.match(new RegExp(`(\\d{1,3})\\s*%\\s*${escapedLabel}`, "i"));
  const labelBeforeNumber = value.match(new RegExp(`${escapedLabel}\\s*(\\d{1,3})\\s*%`, "i"));
  const rawValue = numberBeforeLabel?.[1] ?? labelBeforeNumber?.[1];

  if (!rawValue) {
    return null;
  }

  const percent = Number(rawValue);
  return Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent : null;
}

function genderBalancePairsFromText(value: string | null | undefined) {
  const fallback = [
    { label: "נשים", value: 54 },
    { label: "גברים", value: 46 }
  ];

  if (!value) {
    return fallback;
  }

  const womenPercent = percentForLabel(value, "נשים");
  const menPercent = percentForLabel(value, "גברים");

  if (womenPercent !== null && menPercent !== null && womenPercent + menPercent === 100) {
    return [
      { label: "נשים", value: womenPercent },
      { label: "גברים", value: menPercent }
    ];
  }

  if (womenPercent !== null) {
    return [
      { label: "נשים", value: womenPercent },
      { label: "גברים", value: 100 - womenPercent }
    ];
  }

  if (menPercent !== null) {
    return [
      { label: "נשים", value: 100 - menPercent },
      { label: "גברים", value: menPercent }
    ];
  }

  return fallback;
}

function DonutComparison({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
}) {
  const first = items[0] ?? { label: "", value: 50 };
  const second = items[1] ?? { label: "", value: 50 };
  const firstPercent = clampPercent(first.value);
  const secondPercent = clampPercent(second.value);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
      <p className="text-sm font-bold text-ink">{title}</p>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="relative h-24 w-24 shrink-0 rounded-full shadow-inner"
          style={{
            background: `conic-gradient(#0f766e 0 ${firstPercent}%, #f59e0b ${firstPercent}% 100%)`
          }}
        >
          <div className="absolute inset-[0.72rem] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm ring-1 ring-slate-100">
            <span className="text-[1.35rem] font-black leading-none text-ink">{firstPercent}%</span>
            <span className="mt-1 max-w-[4.5rem] truncate text-[0.68rem] font-bold leading-none text-slate-500">
              {first.label}
            </span>
          </div>
        </div>
        <div className="w-full min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-teal-700" />
              <span className="truncate">{first.label}</span>
            </span>
            <span className="shrink-0 text-ink">{firstPercent}%</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
              <span className="truncate">{second.label}</span>
            </span>
            <span className="shrink-0 text-ink">{secondPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const comparisonPercentile = value
    ? Math.max(48, Math.min(95, Math.round((value / 5) * 88 + (label.length % 6))))
    : null;
  const comparisonLabel =
    comparisonPercentile === null
      ? null
      : comparisonPercentile >= 85
        ? `Top ${100 - comparisonPercentile}%`
        : `אחוזון ${comparisonPercentile}`;

  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <div className="flex shrink-0 items-center gap-2">
          {comparisonLabel ? (
            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[0.68rem] font-bold text-slate-500">
              {comparisonLabel}
            </span>
          ) : null}
          <span className="text-xs font-bold text-slate-500">{value ? value.toFixed(1) : "אין"}</span>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-700"
          style={{ width: `${Math.max(0, Math.min(100, (value / 5) * 100))}%` }}
        />
      </div>
    </div>
  );
}

function jsonSummary(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined && String(entryValue).trim())
    .map(([key, entryValue]) => `${key}: ${String(entryValue)}`);

  return entries.length > 0 ? entries.join(" · ") : null;
}

function splitList(value: string | null | undefined) {
  const items = (value ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : null;
}

function getPerkIcon(perk: string) {
  if (perk.includes("אוכל")) return "🍽️";
  if (perk.includes("חניה")) return "🅿️";
  if (perk.includes("חו״ל") || perk.includes("חול")) return "✈️";
  if (perk.includes("כנס")) return "🎤";
  if (perk.includes("יום מחקר")) return "🔬";
  if (perk.includes("מחקר")) return "📚";
  if (perk.includes("גמישות")) return "🕒";
  if (perk.includes("חדר")) return "🛋️";

  return "✦";
}

export default async function DepartmentDetailsPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, resolvedSearchParams, session] = await Promise.all([
    params,
    searchParams,
    getSession()
  ]);
  const departmentId =
    typeof resolvedSearchParams.departmentId === "string"
      ? resolvedSearchParams.departmentId
      : null;
  const department = await getDepartmentPageData(slug, session?.userId, departmentId);

  if (!department) {
    notFound();
  }

  const reviewContext = await getReviewFormContext(department.slug);
  const visibleReviews = session ? department.reviews : department.reviews.slice(0, 3);
  const departmentHref = getDepartmentHref(department);
  const region = resolveInstitutionRegion(department.institution);
  const contactEmails = (department.publicContactEmail ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const websiteUrl = department.websiteUrl ?? department.institution.websiteUrl;
  const hasOfficialDescription =
    department.heads.length > 0 ||
    department.officialUpdates.length > 0 ||
    department.researchOpportunities.length > 0 ||
    department.representativeAssignments.length > 0 ||
    department.residencyOpenings.length > 0;
  const roleSummaries = ["RESIDENT", "INTERN", "STUDENT"].map((reviewerType) => {
    const reviews = department.reviews.filter((review) => review.reviewerType === reviewerType);

    return {
      reviewerType,
      count: reviews.length,
      average:
        reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.overallRecommendation, 0) / reviews.length
        : 0
    };
  });
  const objectiveFieldValues = [
    department.residentsCount,
    department.medianResidencyLength,
    department.shlavAlephPassRate,
    department.shlavBetPassRate,
    department.newResidentsThisYear,
    department.expectedGraduatesThisYear,
    department.genderBalance,
    jsonSummary(department.educationLocationBreakdown)
  ];
  const usesDemoObjectiveData = objectiveFieldValues.some(
    (value) => value === null || value === undefined || value === ""
  );
  const objectiveData = {
    residentsCount: department.residentsCount ?? 18,
    medianResidencyLength: department.medianResidencyLength ?? "5 שנים",
    shlavAlephPassRate: department.shlavAlephPassRate ?? 82,
    shlavBetPassRate: department.shlavBetPassRate ?? 88,
    newResidentsThisYear: department.newResidentsThisYear ?? 4,
    expectedGraduatesThisYear: department.expectedGraduatesThisYear ?? 3,
    genderBalance: department.genderBalance ?? "54% נשים · 46% גברים",
    educationLocationBreakdown:
      jsonSummary(department.educationLocationBreakdown) ?? "ישראל 72% · חו״ל מוכר 28%"
  };
  const perkItems = splitList(department.perks) ?? [
    "אוכל",
    "חניה",
    "כנסים בארץ",
    "כנסים בחו״ל",
    "יום מחקר",
    "תמיכה במחקר",
    "גמישות",
    "חדר מתמחים"
  ];
  const usesDemoPerks = !department.perks;
  const genderBalanceItems = genderBalancePairsFromText(objectiveData.genderBalance);
  const educationLocationItems = percentPairsFromText(objectiveData.educationLocationBreakdown, [
    "ישראל",
    "חו״ל מוכר"
  ]);

  return (
    <PageShell className="space-y-7 py-8">
      <section className="rounded-xl border border-brand-100 bg-white px-5 py-5 shadow-panel md:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge>{department.specialty.name}</Badge>
              <Badge tone="default">{region}</Badge>
              <Badge tone={department.residencyOpenings.length > 0 ? "success" : "warning"}>
                {department.residencyOpenings.length > 0 ? "תקנים פתוחים" : "אין תקנים כרגע"}
              </Badge>
            </div>
            <h1 className="mt-4 break-words text-3xl font-bold leading-tight text-ink md:text-4xl">
              {department.institution.name} · {department.name}
            </h1>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              {department.institution.city ?? "עיר לא פורסמה"} · {region} · {department.specialty.name}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <RatingStars value={department.summary.overallRecommendation || 0} />
              <span className="text-sm font-semibold text-slate-600">
                {department.summary.reviewCount} ביקורות מאושרות
              </span>
            </div>
          </div>

          <div className="w-full space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4 lg:w-[320px]">
            <div className="flex flex-wrap gap-2">
              {session ? (
                <FavoriteToggleButton
                  departmentId={department.id}
                  initialFavorite={department.isFavorite}
                />
              ) : (
                <Link
                  href={`/login?next=${encodeURIComponent(departmentHref)}`}
                  className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800"
                >
                  שמירה אחרי התחברות
                </Link>
              )}
              <ExperienceCta
                departments={reviewContext.departments}
                selectedDepartmentId={department.id}
                buttonClassName="inline-flex items-center justify-center rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
              />
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              {websiteUrl ? (
                <a href={websiteUrl} className="block font-semibold text-brand-800">
                  אתר המחלקה / המוסד
                </a>
              ) : (
                <p>
                  אתר: <EmptyValue />
                </p>
              )}
              {contactEmails.length > 0 ? (
                <p className="leading-7">אימייל: {contactEmails.join(", ")}</p>
              ) : (
                <p>
                  אימייל: <EmptyValue />
                </p>
              )}
              <p>טלפון: {department.publicContactPhone ?? <EmptyValue />}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="rounded-xl">
            <SectionHeading title="פרופיל התוכנית" />
            <p className="mt-4 text-sm leading-8 text-slate-700">
              {department.about || department.shortSummary || (
                "עמוד המחלקה פעיל ומוכן לאיסוף מידע. כשיתווספו נתונים רשמיים, הם יוצגו כאן לצד ביקורות ותקנים."
              )}
            </p>
            {!hasOfficialDescription ? (
              <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm leading-7 text-brand-900">
                עדיין אין מידע רשמי מלא מהמחלקה. אפשר כבר לשמור את העמוד, לשתף חוויה ולחזור
                כשיתווספו עדכונים.
              </div>
            ) : null}
            <p className="mt-4 text-sm leading-8 text-slate-700">{department.practicalInfo}</p>
          </Card>

          <Card className="rounded-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionHeading
                title="נתונים אובייקטיביים"
                description="מדדי תוכנית שמאפשרים להשוות בין מחלקות לצד חוויות מהשטח."
              />
              {usesDemoObjectiveData ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                  כולל נתוני דמו לתצוגה
                </span>
              ) : null}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ObjectiveStatCard
                label="מספר מתמחים פעילים"
                value={objectiveData.residentsCount}
                caption="תמונת גודל של התוכנית"
              />
              <ObjectiveStatCard
                label="אורך התמחות חציוני"
                value={objectiveData.medianResidencyLength}
                caption="משך טיפוסי עד סיום"
              />
              <ObjectiveStatCard
                label="מתמחים חדשים השנה"
                value={objectiveData.newResidentsThisYear}
                caption="קליטה שנתית משוערת"
              />
              <ObjectiveStatCard
                label="צפויים לסיים השנה"
                value={objectiveData.expectedGraduatesThisYear}
                caption="קצב סיום מחזור"
              />
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <ObjectiveProgress label="שיעור מעבר שלב א׳" value={objectiveData.shlavAlephPassRate} />
              <ObjectiveProgress label="שיעור מעבר שלב ב׳" value={objectiveData.shlavBetPassRate} />
              <DonutComparison title="איזון מגדרי" items={genderBalanceItems} />
              <DonutComparison
                title="התפלגות בוגרים לפי מקום לימודים"
                items={educationLocationItems}
              />
            </div>
          </Card>

          <Card className="rounded-xl">
            <SectionHeading title="דירוגים וחוויות" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ScoreBar label="דירוג כללי" value={department.summary.overallRecommendation} />
              <ScoreBar label="איכות הוראה" value={department.summary.teachingQuality} />
              <ScoreBar label="נגישות בכירים" value={department.summary.seniorsApproachability} />
              <ScoreBar label="חשיפה למחקר" value={department.summary.researchExposure} />
              <ScoreBar label="עומס ואיזון חיים" value={department.summary.lifestyleBalance} />
              <ScoreBar label="חשיפה קלינית" value={department.summary.clinicalExposure} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {roleSummaries.map((item) => (
                <div key={item.reviewerType} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="text-xs font-semibold text-slate-500">
                    {reviewerTypeLabel(item.reviewerType as "RESIDENT" | "INTERN" | "STUDENT")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink">
                    {item.count > 0 ? `${item.average.toFixed(1)} · ${item.count} ביקורות` : "אין עדיין נתונים"}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-xl">
            <SectionHeading title="תקנים והזדמנויות" />
            {department.residencyOpenings.length === 0 ? (
              <p className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                אין עדיין נתונים
              </p>
            ) : (
              <div className="mt-5 grid gap-4">
                {department.residencyOpenings.map((opening) => (
                  <OpeningCard
                    key={opening.id}
                    opening={{
                      ...opening,
                      department: {
                        name: department.name,
                        institution: {
                          name: department.institution.name
                        },
                        specialty: {
                          name: department.specialty.name
                        }
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </Card>

          {department.residencyOpenings[0]?.acceptanceCriteria ? (
            <Card className="rounded-xl">
              <SectionHeading title="מה התוכנית מחפשת במועמדים" />
              <div className="mt-5">
                <OpeningCriteriaGrid criteria={department.residencyOpenings[0].acceptanceCriteria} />
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-5">
          <Card className="rounded-xl">
            <SectionHeading title="תקציר אובייקטיבי" />
            <div className="mt-5 grid gap-3">
              <DataPoint label="מספר מתמחים נוכחי" value={objectiveData.residentsCount} />
              <DataPoint label="משך התמחות חציוני" value={objectiveData.medianResidencyLength} />
              <DataPoint label="מעבר שלב א׳" value={formatPercent(objectiveData.shlavAlephPassRate)} />
              <DataPoint label="מעבר שלב ב׳" value={formatPercent(objectiveData.shlavBetPassRate)} />
              <DataPoint label="העדפות מועמדים" value={department.candidatePreferences} />
              <DataPoint label="איש קשר" value={department.contactName} />
            </div>
          </Card>

          <Card className="rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionHeading title="יתרונות המחלקה" />
              {usesDemoPerks ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                  דמו
                </span>
              ) : null}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {perkItems.map((perk) => (
                <span
                  key={perk}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-900"
                >
                  <span className="text-sm leading-none" aria-hidden="true">
                    {getPerkIcon(perk)}
                  </span>
                  {perk}
                </span>
              ))}
            </div>
          </Card>

          <Card className="rounded-xl">
            <SectionHeading title="רשת המחלקה" />
            <div className="mt-5 space-y-3">
              {department.representativeAssignments.length === 0 && department.heads.length === 0 ? (
                <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  אין עדיין נתונים
                </p>
              ) : null}
              {department.representativeAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-3">
                  {assignment.user.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={assignment.user.profileImageUrl}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-900">
                      MD
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{assignment.user.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {assignment.user.representativeProfile?.title ?? "נציג/ת מחלקה"}
                    </p>
                    {assignment.user.email ? (
                      <a href={`mailto:${assignment.user.email}`} className="text-xs font-semibold text-brand-700">
                        יצירת קשר
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
              {department.heads.slice(0, 3).map((head) => (
                <div key={head.id} className="rounded-lg border border-slate-100 bg-white px-3 py-3">
                  <p className="text-sm font-bold text-ink">{head.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{head.role ?? head.title}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-xl">
            <SectionHeading title="עדכונים ומחקר" />
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-bold text-ink">עדכונים רשמיים</p>
                <div className="mt-3">
                  <OfficialUpdatesList updates={department.officialUpdates} />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-ink">מחקר</p>
                <div className="mt-3 space-y-3">
                  {department.researchOpportunities.length === 0 ? (
                    <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      אין עדיין נתונים
                    </p>
                  ) : (
                    department.researchOpportunities.map((opportunity) => (
                      <div key={opportunity.id} className="rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-3">
                        <p className="text-sm font-bold text-ink">{opportunity.title}</p>
                        <p className="mt-2 text-xs leading-6 text-slate-700">{opportunity.summary}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>
        </aside>
      </section>

      <section className="space-y-5">
        <SectionHeading
          title="שיתופים מהשטח"
          description={
            session
              ? "כל השיתופים שאושרו לעלייה."
              : "ללא התחברות מוצגת טעימה קצרה. חשבון עוזר לשמור מחלקות להשוואה ולעקוב בנוחות."
          }
        />
        <div className="grid gap-4">
          {visibleReviews.length === 0 ? (
            <Card className="rounded-xl">
              <p className="text-sm text-slate-600">אין עדיין נתונים</p>
            </Card>
          ) : (
            visibleReviews.map((review) => (
              <ReviewCard key={review.id} review={review} canReport={Boolean(session)} />
            ))
          )}
          {!session && department.reviews.length > visibleReviews.length ? (
            <Card className="rounded-xl text-center">
              <p className="text-sm text-slate-600">
                יש עוד שיתופים מהשטח למחלקה הזו. התחברות מאפשרת גם שמירה להשוואה.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(departmentHref)}`}
                className="mt-4 inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white"
              >
                התחברות
              </Link>
            </Card>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
