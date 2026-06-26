"use client";

import { useMemo, useState } from "react";
import { ReviewCard } from "@/components/departments/review-card";
import { RatingStars } from "@/components/ui/rating-stars";
import { cn } from "@/lib/utils";

type ExperiencePerspective = "student" | "intern" | "resident_or_physician";

type DepartmentExperienceReview = {
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
  publishedAt: string | Date | null;
  perspective: ExperiencePerspective;
};

type Summary = {
  reviewCount: number;
  teachingQuality: number;
  seniorsApproachability: number;
  researchExposure: number;
  lifestyleBalance: number;
  clinicalExposure: number;
  overallRecommendation: number;
};

const tabs: Array<{
  key: ExperiencePerspective;
  buttonLabel: string;
  title: string;
  emptyText: string;
}> = [
  {
    key: "student",
    buttonLabel: "סטודנטים",
    title: "חוויות סטודנטים",
    emptyText: "אין עדיין חוויות סטודנטים במחלקה הזו."
  },
  {
    key: "intern",
    buttonLabel: "סטאז׳רים",
    title: "חוויות סטאז׳רים",
    emptyText: "אין עדיין חוויות סטאז׳רים במחלקה הזו."
  },
  {
    key: "resident_or_physician",
    buttonLabel: "מתמחים ורופאים",
    title: "חוויות מתמחים ורופאים",
    emptyText: "אין עדיין חוויות מתמחים או רופאים במחלקה הזו."
  }
];

function defaultTabKey(counts: Record<ExperiencePerspective, number>) {
  if (counts.resident_or_physician > 0) return "resident_or_physician";
  if (counts.intern > 0) return "intern";
  return "student";
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <div className="mt-2">
        <RatingStars value={value || 0} />
      </div>
    </div>
  );
}

export function DepartmentExperienceTabs({
  title,
  reviews,
  summary,
  canReport
}: {
  title: string;
  reviews: DepartmentExperienceReview[];
  summary: Summary;
  canReport: boolean;
}) {
  const counts = useMemo(
    () =>
      reviews.reduce<Record<ExperiencePerspective, number>>(
        (accumulator, review) => {
          accumulator[review.perspective] += 1;
          return accumulator;
        },
        {
          student: 0,
          intern: 0,
          resident_or_physician: 0
        }
      ),
    [reviews]
  );
  const [selectedTab, setSelectedTab] = useState<ExperiencePerspective>(() => defaultTabKey(counts));
  const selected = tabs.find((tab) => tab.key === selectedTab) ?? tabs[0];
  const selectedReviews = reviews.filter((review) => review.perspective === selected.key);
  const hasAnyReviews = reviews.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-700">{title}</p>
          <h2 className="mt-1 text-2xl font-black text-ink">{selected.title}</h2>
        </div>
        {hasAnyReviews ? (
          <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-black text-brand-900">
            {summary.reviewCount} חוויות מאושרות
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryMetric label="דירוג כללי" value={summary.overallRecommendation} />
        <SummaryMetric label="איכות הוראה" value={summary.teachingQuality} />
        <SummaryMetric label="זמינות בכירים" value={summary.seniorsApproachability} />
        <SummaryMetric label="חשיפה למחקר" value={summary.researchExposure} />
        <SummaryMetric label="עומס ואיזון חיים" value={summary.lifestyleBalance} />
        <SummaryMetric label="חשיפה קלינית" value={summary.clinicalExposure} />
      </div>

      {hasAnyReviews ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedTab(tab.key)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-black transition",
                selectedTab === tab.key
                  ? "border-brand-700 bg-brand-900 text-white shadow-sm"
                  : "border-brand-100 bg-white text-slate-700 hover:bg-brand-50"
              )}
            >
              {tab.buttonLabel} ({counts[tab.key]})
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4">
        {!hasAnyReviews ? (
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            אין עדיין נתונים
          </p>
        ) : selectedReviews.length === 0 ? (
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {selected.emptyText}
          </p>
        ) : (
          selectedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} canReport={canReport} />
          ))
        )}
      </div>
    </div>
  );
}
