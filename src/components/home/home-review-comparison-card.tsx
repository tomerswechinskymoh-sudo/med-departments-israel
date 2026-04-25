import Link from "next/link";
import { ReviewBubbleIcon } from "@/components/ui/med-icons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { reviewerTypeLabel } from "@/lib/queries";
import { buildDepartmentHref, formatDate } from "@/lib/utils";

type HomeReview = {
  id: string;
  reviewerType: "RESIDENT" | "INTERN" | "STUDENT";
  displayName: string | null;
  isAnonymous: boolean;
  teachingQuality: number;
  workAtmosphere: number;
  seniorsApproachability: number;
  researchExposure: number;
  lifestyleBalance: number;
  overallRecommendation: number;
  pros: string;
  cons: string;
  tips: string;
  publishedAt: Date | null;
  department: {
    name: string;
    slug: string;
    institution: {
      name: string;
    };
  };
};

function truncateText(text: string, maxLength = 100) {
  if (!text.trim()) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function metricTone(value: number) {
  if (value >= 4) {
    return "border-emerald-100 bg-emerald-50 text-emerald-900";
  }

  if (value >= 3) {
    return "border-brand-100 bg-brand-50 text-brand-900";
  }

  return "border-amber-200 bg-amber-50 text-amber-900";
}

function getStrengthChips(review: HomeReview) {
  const chips: string[] = [];

  if (review.teachingQuality >= 4) {
    chips.push("הוראה חזקה");
  }

  if (review.researchExposure >= 4) {
    chips.push("מחקר פעיל", "מתאים למי שמחפש מחקר");
  }

  if (review.workAtmosphere >= 4) {
    chips.push("אווירה טובה");
  }

  if (review.lifestyleBalance <= 2) {
    chips.push("עומס גבוה");
  }

  if (review.seniorsApproachability >= 4 && review.researchExposure <= 3) {
    chips.push("מתאים למי שמחפש קליניקה");
  }

  if (review.overallRecommendation >= 4) {
    chips.push("שווה בדיקה רצינית");
  }

  return Array.from(new Set(chips)).slice(0, 4);
}

function MetricStat({ label, value }: { label: string; value: number }) {
  return (
    <div className={`rounded-2xl border px-3 py-3 ${metricTone(value)}`}>
      <p className="text-[0.68rem] font-semibold tracking-wide opacity-80">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-white/70">
          <div className="rounded-full bg-current" style={{ width: `${(value / 5) * 100}%` }} />
        </div>
        <span className="inline-flex min-w-11 items-center justify-center rounded-full border border-current/15 bg-white/70 px-2.5 py-1 text-xs font-bold">
          {value.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

export function HomeReviewComparisonCard({ review }: { review: HomeReview }) {
  const chips = getStrengthChips(review);

  return (
    <Card className="flex h-full flex-col gap-4 border border-brand-100 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-brand-700">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-900">
              <ReviewBubbleIcon className="h-4 w-4" />
            </span>
            <p className="text-xs font-semibold text-brand-700">סקירה מהירה למחלקה</p>
          </div>
          <div>
            <h3 className="text-xl font-bold text-ink">
              {review.department.institution.name} · {review.department.name}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {reviewerTypeLabel(review.reviewerType)} · {formatDate(review.publishedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="default">המלצה כללית {review.overallRecommendation.toFixed(1)}</Badge>
          <Badge tone={review.isAnonymous ? "warning" : "success"}>
            {review.isAnonymous ? "בעילום שם" : review.displayName ?? "בשם מלא"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricStat label="הוראה" value={review.teachingQuality} />
        <MetricStat label="איזון / עומס" value={review.lifestyleBalance} />
        <MetricStat label="מחקר" value={review.researchExposure} />
        <MetricStat label="זמינות בכירים" value={review.seniorsApproachability} />
        <MetricStat label="אווירה" value={review.workAtmosphere} />
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Badge key={chip} tone="default">
            {chip}
          </Badge>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/75 p-4">
          <p className="text-sm font-semibold text-emerald-900">מה עבד טוב</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {truncateText(review.pros) || "לא הושאר פירוט נוסף בשדה הזה."}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/85 p-4">
          <p className="text-sm font-semibold text-amber-900">מה כדאי לדעת</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {truncateText(review.cons) || "לא נכתב כאן טקסט חופשי."}
          </p>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-brand-100 bg-brand-50/60 p-4">
        <p className="text-xs font-semibold text-slate-500">ציטוט קצר</p>
        <p className="mt-2 text-base font-medium leading-8 text-ink">
          {truncateText(review.tips, 120)
            ? `"${truncateText(review.tips, 120)}"`
            : "לא הושאר ציטוט קצר לחלק הזה."}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">כרטיס השוואה מהיר למחלקה</p>
        <Link
          href={buildDepartmentHref(review.department.slug)}
          className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          לצפייה במחלקה
        </Link>
      </div>
    </Card>
  );
}
