import type { PublicSurveyExperience } from './staz-survey/domain';

export type RecommendationSummary = { count: number; average: number };
export function recommendationSummary(values: number[]): RecommendationSummary {
  const valid = values.filter(value => Number.isFinite(value) && value >= 1 && value <= 5);
  return { count: valid.length, average: valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0 };
}
export function combineRecommendations(...summaries: RecommendationSummary[]): RecommendationSummary {
  const count = summaries.reduce((sum, item) => sum + item.count, 0);
  return { count, average: count ? summaries.reduce((sum, item) => sum + item.average * item.count, 0) / count : 0 };
}
export function experienceRecommendation(reviews: { overallRecommendation: number }[], experiences: PublicSurveyExperience[]): RecommendationSummary {
  return recommendationSummary([
    ...reviews.map(review => review.overallRecommendation),
    ...experiences.filter(experience => !experience.hospitalScope).flatMap(experience =>
      experience.ratings.filter(rating => rating.code === 'ELECTIVE_RECOMMENDATION').map(rating => rating.value))
  ]);
}
