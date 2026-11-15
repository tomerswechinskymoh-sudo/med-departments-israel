import type { PrismaClient } from '@prisma/client';

export const CAREER_FIT_FEATURE = 'career_fit';
export async function readCareerFitVisibility(db: Pick<PrismaClient, 'siteFeature'>) {
  try {
    const feature = await db.siteFeature.findUnique({ where: { key: CAREER_FIT_FEATURE }, select: { enabled: true } });
    return { enabled: feature?.enabled === true, available: true };
  } catch {
    // Missing configuration or an unavailable database must not reopen the survey.
    return { enabled: false, available: false };
  }
}

export async function setCareerFitVisibility(db: PrismaClient, enabled: boolean, actorUserId: string) {
  return db.$transaction(async tx => {
    const feature = await tx.siteFeature.upsert({
      where: { key: CAREER_FIT_FEATURE },
      create: { key: CAREER_FIT_FEATURE, enabled },
      update: { enabled },
      select: { enabled: true }
    });
    await tx.auditLog.create({ data: {
      actorUserId, action: 'admin.career_fit_visibility_updated',
      entityType: 'SiteFeature', entityId: CAREER_FIT_FEATURE, metadata: { enabled }
    } });
    return feature;
  });
}
