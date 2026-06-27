"use client";

import type { ReactNode } from "react";
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
  perspective?: ExperiencePerspective | null;
  submission?: {
    roleDetails: unknown;
  } | null;
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
  if (counts.student > 0) return "student";
  return "resident_or_physician";
}

function perspectiveForReview(review: DepartmentExperienceReview): ExperiencePerspective {
  if (
    review.perspective === "student" ||
    review.perspective === "intern" ||
    review.perspective === "resident_or_physician"
  ) {
    return review.perspective;
  }

  const reviewerType = review.reviewerType.toLocaleLowerCase();
  if (reviewerType === "student" || reviewerType === "medical_student") return "student";
  if (reviewerType === "intern") return "intern";

  return "resident_or_physician";
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

function average(values: number[]) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function numberFromRoleDetails(roleDetails: unknown, key: string) {
  if (!roleDetails || typeof roleDetails !== "object" || Array.isArray(roleDetails)) {
    return 0;
  }

  const value = (roleDetails as Record<string, unknown>)[key];
  return typeof value === "number" ? value : 0;
}

export function DepartmentExperienceTabs({
  title,
  reviews,
  canReport,
  emptyAction
}: {
  title: string;
  reviews: DepartmentExperienceReview[];
  canReport: boolean;
  emptyAction?: ReactNode;
}) {
  const counts = useMemo(
    () =>
      reviews.reduce<Record<ExperiencePerspective, number>>(
        (accumulator, review) => {
          accumulator[perspectiveForReview(review)] += 1;
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
  const selectedReviews = reviews.filter((review) => perspectiveForReview(review) === selected.key);
  const hasAnyReviews = reviews.length > 0;
  const selectedSummary = {
    teachingQuality: average(selectedReviews.map((review) => review.teachingQuality)),
    seniorsApproachability: average(selectedReviews.map((review) => review.seniorsApproachability)),
    researchExposure: average(selectedReviews.map((review) => review.researchExposure)),
    lifestyleBalance: average(selectedReviews.map((review) => review.lifestyleBalance)),
    clinicalExposure: average(
      selectedReviews
        .map((review) => numberFromRoleDetails(review.submission?.roleDetails, "clinicalExposure"))
        .filter((value) => value > 0)
    ),
    overallRecommendation: average(selectedReviews.map((review) => review.overallRecommendation))
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-700">חוויות מאושרות</p>
          <h2 className="mt-1 text-2xl font-black text-ink">{title}</h2>
        </div>
        <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-black text-brand-900">
          {counts[selected.key]} חוויות בקטגוריה
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedTab(tab.key)}
            aria-pressed={selectedTab === tab.key}
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

      <div className="grid gap-4">
        {!hasAnyReviews ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">אין עדיין חוויות מאושרות במחלקה הזו.</p>
            {emptyAction ? <div className="mt-3">{emptyAction}</div> : null}
          </div>
        ) : selectedReviews.length === 0 ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">עדיין אין חוויות בקטגוריה זו</p>
            <p className="mt-1">{selected.emptyText}</p>
            {emptyAction ? <div className="mt-3">{emptyAction}</div> : null}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryMetric label="דירוג כללי" value={selectedSummary.overallRecommendation} />
              <SummaryMetric label="איכות הוראה" value={selectedSummary.teachingQuality} />
              <SummaryMetric label="זמינות בכירים" value={selectedSummary.seniorsApproachability} />
              <SummaryMetric label="חשיפה למחקר" value={selectedSummary.researchExposure} />
              <SummaryMetric label="עומס ואיזון חיים" value={selectedSummary.lifestyleBalance} />
              <SummaryMetric label="חשיפה קלינית" value={selectedSummary.clinicalExposure} />
            </div>
            {selectedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} canReport={canReport} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
