import { ReportReviewButton } from "@/components/departments/report-review-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DoctorAvatarIcon, ReviewBubbleIcon } from "@/components/ui/med-icons";
import { RatingStars } from "@/components/ui/rating-stars";
import { reviewerTypeLabel } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

function textOrFallback(text: string, fallback: string) {
  return text.trim() ? text : fallback;
}

export function ReviewCard({
  review,
  canReport
}: {
  review: {
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
  };
  canReport: boolean;
}) {
  return (
    <Card className="border border-white/90 bg-white/90">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-900">
            {review.isAnonymous ? (
              <ReviewBubbleIcon className="h-5 w-5" />
            ) : (
              <DoctorAvatarIcon className="h-8 w-8" />
            )}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="default">{reviewerTypeLabel(review.reviewerType)}</Badge>
            <Badge tone={review.isAnonymous ? "warning" : "success"}>
              {review.isAnonymous ? "בעילום שם" : review.displayName ?? "בשם מלא"}
            </Badge>
          </div>
        </div>
        <span className="text-xs text-slate-500">{formatDate(review.publishedAt)}</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">הוראה</p>
          <RatingStars value={review.teachingQuality} />
        </div>
        <div>
          <p className="text-xs text-slate-500">אווירה</p>
          <RatingStars value={review.workAtmosphere} />
        </div>
        <div>
          <p className="text-xs text-slate-500">זמינות בכירים</p>
          <RatingStars value={review.seniorsApproachability} />
        </div>
        <div>
          <p className="text-xs text-slate-500">חשיפה למחקר</p>
          <RatingStars value={review.researchExposure} />
        </div>
        <div>
          <p className="text-xs text-slate-500">איזון עומס</p>
          <RatingStars value={review.lifestyleBalance} />
        </div>
        <div>
          <p className="text-xs text-slate-500">המלצה כוללת</p>
          <RatingStars value={review.overallRecommendation} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-brand-50/60 p-4">
          <p className="text-sm font-semibold text-ink">מה עבד טוב</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {textOrFallback(review.pros, "לא הושאר פירוט נוסף בשדה הזה.")}
          </p>
        </div>
        <div className="rounded-2xl bg-brand-50/60 p-4">
          <p className="text-sm font-semibold text-ink">מה פחות עבד</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {textOrFallback(review.cons, "לא נכתב כאן טקסט חופשי.")}
          </p>
        </div>
        <div className="rounded-2xl bg-brand-50/60 p-4">
          <p className="text-sm font-semibold text-ink">מה הייתי אומר/ת למי שמגיע/ה</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {textOrFallback(review.tips, "לא הושאר טיפ נוסף.")}
          </p>
        </div>
      </div>

      {canReport ? <ReportReviewButton reviewId={review.id} /> : null}
    </Card>
  );
}
