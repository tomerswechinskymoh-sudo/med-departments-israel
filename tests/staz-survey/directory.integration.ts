import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { prisma as db } from '../../src/lib/prisma';
import { getDepartmentPageData, getPublicExperienceReviews } from '../../src/lib/queries';
import { experienceRecommendation } from '../../src/lib/experience-recommendation';
import { getExperienceDirectoryData } from '../../src/server/staz-survey/directory';
import { publicSurveyExperiences } from '../../src/server/staz-survey/public';
import { SOURCE_ID } from '../../src/lib/staz-survey/domain';
import { getDepartmentHref } from '../../src/lib/utils';
const out = process.env.STAZ_INTEGRATION_OUT ?? 'docs/staz-survey-directory-20261113';
async function main() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.STAZ_TEST_DATABASE_HOST);
  assert.ok(!process.env.DATABASE_URL!.includes('ep-odd-pine-'));
  const source = await db.surveyReviewSource.findUniqueOrThrow({ where: { id: SOURCE_ID } });
  const fingerprint = async () => createHash('sha256').update(JSON.stringify(await db.surveyReview.findMany({ orderBy: { id: 'asc' }, include: { ratings: { orderBy: { id: 'asc' } } } }))).digest('hex');
  const before = await fingerprint();
  try {
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: true } });
    const specialty = await db.specialty.findFirstOrThrow({ where: { name: 'רפואה פנימית' } });
    const filters = { specialties: [specialty.id] }, viewer = { role: 'admin' };
    const cards = await getExperienceDirectoryData(filters, viewer);
    const populated = cards.filter(c => c.surveySummary?.experienceCount);
    assert.ok(populated.length > 10);
    const rambam = populated.find(c => c.institutionName.includes('רמב'))!;
    assert.ok(rambam);
    for (const card of populated) {
      const profile = await getDepartmentPageData(card.slug, undefined, card.hrefDepartmentId ?? card.id);
      assert.ok(profile);
      const array = profile.specialty.groupAsArray ? profile.medicalArray : null;
      const experiences = await publicSurveyExperiences(db, array ? array.departments.map(d => d.id) : [profile.id], viewer, array ? [array.id] : []);
      assert.equal(card.surveySummary!.experienceCount, experiences.length, card.institutionName);
      const ratings = experiences.flatMap(e => e.ratings).filter(r => r.code === 'ELECTIVE_RECOMMENDATION');
      assert.equal(card.surveySummary!.recommendationCount, ratings.length, card.institutionName);
      if (ratings.length) assert.ok(Math.abs(card.surveySummary!.recommendationAverage - ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length) < 1e-10);
      const native = array ? await getPublicExperienceReviews(array.departments.map(d => d.id)) : profile.reviews;
      const recommendation = experienceRecommendation(native, experiences);
      assert.equal(card.experienceRecommendation.count, recommendation.count, card.institutionName);
      assert.ok(Math.abs(card.experienceRecommendation.average - recommendation.average) < 1e-10, card.institutionName);
    }
    const sorted = await getExperienceDirectoryData({ ...filters, hasReviews: true, sort: 'reviews' }, viewer);
    const count = (c: typeof sorted[number]) => c.reviewCount + (c.surveySummary?.experienceCount ?? 0);
    assert.ok(sorted.some(c => c.id === rambam.id));
    assert.ok(sorted.every((c, i) => count(c) > 0 && (!i || count(sorted[i - 1]) >= count(c))));
    const matchingUnit = await db.department.findUniqueOrThrow({ where: { id: rambam.experienceDepartmentIds[0] }, select: { name: true } });
    const searched = await getExperienceDirectoryData({ ...filters, search: matchingUnit.name }, viewer);
    assert.deepEqual(searched.find(c => c.institutionId === rambam.institutionId)?.surveySummary, rambam.surveySummary);
    const rated = await getExperienceDirectoryData({ ...filters, sort: 'rating' }, viewer);
    assert.ok(rated.every((card, i) => !i || rated[i - 1].experienceRecommendation.average >= card.experienceRecommendation.average));
    for (const viewer of [null, { role: 'student', emailVerified: true, verificationStatus: 'PENDING' }]) {
      assert.ok((await getExperienceDirectoryData(filters, viewer)).every(c => !c.surveySummary));
    }
    assert.deepEqual((await getExperienceDirectoryData(filters, { role: 'student', emailVerified: true, verificationStatus: 'VERIFIED' })).map(c => c.surveySummary), cards.map(c => c.surveySummary));
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: false } });
    const hidden = await getExperienceDirectoryData(filters, viewer);
    assert.ok(hidden.every(c => !c.surveySummary));
    assert.ok(hidden.every(c => JSON.stringify(c.experienceRecommendation) === JSON.stringify(c.nativeRecommendation)));
    assert.ok((await getExperienceDirectoryData({ ...filters, hasReviews: true }, viewer)).every(c => c.reviewCount > 0));
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: true } });
    assert.deepEqual((await getExperienceDirectoryData(filters, viewer)).map(c => c.surveySummary), cards.map(c => c.surveySummary));
    assert.equal(await fingerprint(), before);
    await mkdir(out, { recursive: true });
    const mixed = populated.find(card => card.nativeRecommendation.count > 0)!;
    assert.ok(mixed);
    const report = { passed: true, internalMedicineCards: cards.length, populatedCardsMatchedToProfile: populated.length, rambam: { href: getDepartmentHref({ slug: rambam.slug, id: rambam.hrefDepartmentId }), ...rambam.surveySummary }, mixed: { institution: mixed.institutionName, href: getDepartmentHref({ slug: mixed.slug, id: mixed.hrefDepartmentId }), experienceCount: mixed.reviewCount + mixed.surveySummary!.experienceCount, recommendation: mixed.experienceRecommendation, nativeRecommendation: mixed.nativeRecommendation }, unifiedWeightedRecommendationVerified: true, filterAndSortPassed: true, sameViewerGate: true, cachedDirectoryRespectsHideRestore: true, allApprovalsAndRatingsUnchanged: true };
    await writeFile(out + '/integration.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: source.isPublicEnabled } });
  }
}
main().finally(() => db.$disconnect()).catch(e => { console.error(e); process.exitCode = 1; });
