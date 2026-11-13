import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getDirectoryData } from '@/lib/queries';
import { canViewSurveyExperiences, publicSurveyWhere, type SurveyViewer } from './public';

type DirectoryTarget = { id: string; experienceDepartmentIds: string[]; experienceMedicalArrayIds: string[] };
export type SurveyDirectorySummary = { experienceCount: number; recommendationCount: number; recommendationAverage: number };

// Keep this overlay outside the directory cache. Hiding the source must also
// remove its counts, ratings, filter matches and review ordering on the next read.
export async function surveyDirectorySummaries(db: Pick<PrismaClient, 'surveyReview'>, cards: DirectoryTarget[], viewer: SurveyViewer) {
  const summaries = new Map<string, SurveyDirectorySummary>();
  if (!canViewSurveyExperiences(viewer) || !cards.length) return summaries;
  const departments = new Map<string, Set<string>>(), arrays = new Map<string, Set<string>>();
  for (const card of cards) {
    for (const [index, ids] of [[departments, card.experienceDepartmentIds], [arrays, card.experienceMedicalArrayIds]] as const) {
      for (const id of ids) {
        if (!index.has(id)) index.set(id, new Set());
        index.get(id)!.add(card.id);
      }
    }
  }
  const rows = await db.surveyReview.findMany({
    where: publicSurveyWhere([...departments.keys()], [...arrays.keys()]),
    select: {
      targetDepartmentId: true, targetMedicalArrayId: true, sourceColumnLetter: true, publishRatings: true,
      ratings: { where: { selected: true, verified: true, normalizedValue: { not: null }, metricCode: 'ELECTIVE_RECOMMENDATION' }, select: { normalizedValue: true } }
    }
  });
  for (const row of rows) {
    const cardIds = new Set([
      ...(row.targetDepartmentId ? departments.get(row.targetDepartmentId) ?? [] : []),
      ...(row.targetMedicalArrayId ? arrays.get(row.targetMedicalArrayId) ?? [] : [])
    ]);
    for (const id of cardIds) {
      const summary = summaries.get(id) ?? { experienceCount: 0, recommendationCount: 0, recommendationAverage: 0 };
      summary.experienceCount += 1;
      if (row.publishRatings && row.sourceColumnLetter !== 'BG') {
        for (const rating of row.ratings) {
          summary.recommendationAverage = (summary.recommendationAverage * summary.recommendationCount + rating.normalizedValue!) / (summary.recommendationCount + 1);
          summary.recommendationCount += 1;
        }
      }
      summaries.set(id, summary);
    }
  }
  return summaries;
}

export async function getExperienceDirectoryData(filters: Parameters<typeof getDirectoryData>[0], viewer: (SurveyViewer & { userId?: string }) | null) {
  // Filter after array grouping and after the current publication gate is read.
  const cards = await getDirectoryData({ ...filters, hasReviews: false }, viewer?.userId);
  let targets = cards;
  if (canViewSurveyExperiences(viewer) && cards.some(card => card.isArrayCard) && (filters.search || filters.hasOpenPositions || filters.hasResearch)) {
    // A matching unit can bring an entire array card into search results. Its
    // experience summary must still cover the same full array as the profile.
    const fullCards = await getDirectoryData({ specialties: filters.specialties, searchAcrossSpecialties: filters.searchAcrossSpecialties });
    const groups = new Map(fullCards.filter(card => card.isArrayCard).map(card => [`${card.institutionId}:${card.specialtyId}`, card]));
    targets = cards.map(card => {
      const group = card.isArrayCard ? groups.get(`${card.institutionId}:${card.specialtyId}`) : undefined;
      return group ? { ...card, experienceDepartmentIds: group.experienceDepartmentIds, experienceMedicalArrayIds: group.experienceMedicalArrayIds } : card;
    });
  }
  const summaries = await surveyDirectorySummaries(prisma, targets, viewer);
  const result = cards.map(card => ({ ...card, surveySummary: summaries.get(card.id) }));
  const visible = filters.hasReviews ? result.filter(card => card.reviewCount + (card.surveySummary?.experienceCount ?? 0) > 0) : result;
  if (filters.sort === 'reviews') visible.sort((a, b) =>
    (b.reviewCount + (b.surveySummary?.experienceCount ?? 0)) - (a.reviewCount + (a.surveySummary?.experienceCount ?? 0)));
  return visible;
}
