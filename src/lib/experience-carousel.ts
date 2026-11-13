import type { PublicSurveyExperience } from './staz-survey/domain';

export type QuoteReview = {
  id: string; reviewerType: 'RESIDENT' | 'INTERN' | 'STUDENT'; displayName: string | null; isAnonymous: boolean;
  overallRecommendation: number; teachingQuality: number; workAtmosphere: number; seniorsApproachability: number;
  researchExposure: number; lifestyleBalance: number; pros: string; cons: string; tips: string; publishedAt: string | Date | null;
};
export type ExperienceQuote = {
  id: string; nativeReviewId?: string; year: number | null; role: QuoteReview['reviewerType']; author: string | null;
  rating: number | null; parts: { label: string | null; text: string }[]; otherRatings: { label: string; value: number }[]; hospitalScope: boolean;
};
const validRating = (value?: number) => typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5 ? value : null;

export function experienceQuotes(reviews: QuoteReview[], experiences: PublicSurveyExperience[]): ExperienceQuote[] {
  const native = reviews.flatMap(review => {
    const parts = [
      { label: 'מה עבד טוב', text: review.pros }, { label: 'מה פחות עבד', text: review.cons }, { label: 'טיפים למי שמגיעים', text: review.tips }
    ].filter(part => part.text.trim());
    if (!parts.length) return [];
    const date = review.publishedAt ? new Date(review.publishedAt) : null;
    const year = date && Number.isFinite(date.getTime()) ? date.getUTCFullYear() : null;
    return [{ id: `native:${review.id}`, nativeReviewId: review.id, year, role: review.reviewerType, author: review.isAnonymous ? null : review.displayName,
      rating: validRating(review.overallRecommendation), parts,
      otherRatings: [
        { label: 'הוראה', value: review.teachingQuality }, { label: 'אווירה', value: review.workAtmosphere },
        { label: 'זמינות בכירים', value: review.seniorsApproachability }, { label: 'חשיפה למחקר', value: review.researchExposure },
        { label: 'איזון עומס', value: review.lifestyleBalance }
      ].filter(rating => validRating(rating.value) !== null), hospitalScope: false }];
  });
  const imported = experiences.flatMap(experience => experience.text?.trim() ? [{
    id: `import:${experience.id}`, year: experience.year, role: 'INTERN' as const, author: null,
    rating: experience.hospitalScope ? null : validRating(experience.ratings.find(rating => rating.code === 'ELECTIVE_RECOMMENDATION')?.value),
    parts: [{ label: null, text: experience.text }],
    otherRatings: experience.ratings.filter(rating => rating.code !== 'ELECTIVE_RECOMMENDATION' && validRating(rating.value) !== null).map(rating => ({ label: rating.label, value: rating.value })),
    hospitalScope: experience.hospitalScope
  }] : []);
  return [...native, ...imported].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.id.localeCompare(b.id));
}

export function filterExperienceQuotes(quotes: ExperienceQuote[], rating: string) {
  return quotes.filter(quote => rating === 'all' || (rating === 'unrated' ? quote.rating === null : quote.rating === Number(rating)));
}
export function wrapQuoteIndex(index: number, count: number) {
  return count ? ((index % count) + count) % count : 0;
}
