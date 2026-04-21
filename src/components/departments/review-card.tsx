import { ReportReviewButton } from "@/components/departments/report-review-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import { reviewerTypeLabel } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

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
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="default">{reviewerTypeLabel(review.reviewerType)}</Badge>
          <Badge tone={review.isAnonymous ? "warning" : "success"}>
            {review.isAnonymous ? "פורסם באנונימיות" : review.displayName ?? "הגשה מזוהה"}
          </Badge>
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
          <p className="mt-2 text-sm leading-7 text-slate-600">{review.pros}</p>
        </div>
        <div className="rounded-2xl bg-brand-50/60 p-4">
          <p className="text-sm font-semibold text-ink">מה היה מאתגר</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{review.cons}</p>
        </div>
        <div className="rounded-2xl bg-brand-50/60 p-4">
          <p className="text-sm font-semibold text-ink">טיפ למי שמגיע/ה</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{review.tips}</p>
        </div>
      </div>

      {canReport ? <ReportReviewButton reviewId={review.id} /> : null}
    </Card>
  );
}
