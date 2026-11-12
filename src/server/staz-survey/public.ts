import { publicVisibleDepartmentWhere } from '@/lib/queries';
import type { Prisma, PrismaClient } from '@prisma/client';
import { SOURCE_ID, type PublicSurveyExperience } from '@/lib/staz-survey/domain';
// Intentionally uncached. Every public read joins the current source gate in SQL.
// This is the sole public adapter. No import is inserted into verified Review data.
export const publicSurveyWhere = (departmentIds?: string[], medicalArrayIds?: string[]): Prisma.SurveyReviewWhereInput => ({
  sourceId: SOURCE_ID, source: { isPublicEnabled: true, permissionConfirmedAt: { not: null }, permissionEvidence: { not: null } },
  status: 'APPROVED', sourceVerified: true, privacyReviewed: true, mappingConfirmed: true,
  AND: [{ OR: [
    { department: { is: publicVisibleDepartmentWhere }, targetDepartmentId: departmentIds ? { in: departmentIds } : { not: null } },
    { medicalArray: { is: { departments: { some: publicVisibleDepartmentWhere } } }, targetMedicalArrayId: medicalArrayIds ? { in: medicalArrayIds } : departmentIds ? { in: [] } : { not: null } }
  ] }],
  OR: [{ publishText: true, approvedPublicText: { not: null } }, { publishRatings: true, ratings: { some: { selected: true, verified: true, normalizedValue: { not: null } } } }]
});
export async function publicSurveyExperiences(db: PrismaClient, departmentIds: string[], viewer: { role: string; emailVerified?: boolean; verificationStatus?: string } | null, medicalArrayIds: string[] = []): Promise<PublicSurveyExperience[]> {
  if (!viewer || !(viewer.role === 'admin' || (viewer.emailVerified && viewer.verificationStatus === 'VERIFIED')) || (!departmentIds.length && !medicalArrayIds.length)) return [];
  const rows = await db.surveyReview.findMany({ where: publicSurveyWhere(departmentIds, medicalArrayIds), select: {
    id: true, sourceYear: true, sourceColumnLetter: true, publishText: true, approvedPublicText: true, publishRatings: true,
    ratings: { where: { selected: true, verified: true, normalizedValue: { not: null } }, select: { metricCode: true, label: true, normalizedValue: true } }
  }, orderBy: [{ sourceYear: 'desc' }, { id: 'asc' }] });
  return rows.map(r => ({ id: r.id, year: r.sourceYear, text: r.publishText ? r.approvedPublicText : null, hospitalScope: r.sourceColumnLetter === 'BG',
    ratings: r.publishRatings && r.sourceColumnLetter !== 'BG' ? r.ratings.map(v => ({ code: v.metricCode, label: v.label, value: v.normalizedValue! })) : [] }));
}
