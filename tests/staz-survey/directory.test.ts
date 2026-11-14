import test from 'node:test';
import assert from 'node:assert/strict';
import { surveyDirectorySummaries } from '../../src/server/staz-survey/directory';
import { publicSurveyExperiences, publicSurveyWhere } from '../../src/server/staz-survey/public';

test('directory counts array and department targets once and averages only published elective recommendations', async () => {
  const row = { targetDepartmentId: null as string | null, targetMedicalArrayId: 'array', sourceColumnLetter: 'BL', publishRatings: true, ratings: [{ normalizedValue: 5 }] };
  const db = { surveyReview: { findMany: async (query: any) => {
    assert.deepEqual(query.where, publicSurveyWhere(['a', 'b', 'c'], ['array']));
    assert.deepEqual(query.select.ratings.where, { selected: true, verified: true, normalizedValue: { not: null }, metricCode: 'ELECTIVE_RECOMMENDATION' });
    assert.equal(query.select.approvedPublicText, undefined);
    assert.equal(query.select.rawEncrypted, undefined);
    return [row, { ...row, targetDepartmentId: 'a', targetMedicalArrayId: null, ratings: [{ normalizedValue: 3 }] },
      { ...row, targetDepartmentId: 'b', publishRatings: false }, // text + saved unpublished rating
      { ...row, sourceColumnLetter: 'BG' }]; // hospital ratings never become elective ratings
  } } };
  const result = await surveyDirectorySummaries(db as any, [
    { id: 'group', experienceDepartmentIds: ['a', 'b'], experienceMedicalArrayIds: ['array', 'array'] },
    { id: 'individual', experienceDepartmentIds: ['a'], experienceMedicalArrayIds: [] },
    { id: 'empty', experienceDepartmentIds: ['c'], experienceMedicalArrayIds: [] }
  ]);
  assert.deepEqual(result.get('group'), { experienceCount: 4, recommendationCount: 2, recommendationAverage: 4 });
  assert.deepEqual(result.get('individual'), { experienceCount: 1, recommendationCount: 1, recommendationAverage: 3 });
  assert.equal(result.has('empty'), false);
});

test('public directory summaries contain aggregates only while individual text keeps its viewer gate', async () => {
  const db = { surveyReview: { findMany: async (query: any) => {
    assert.deepEqual(Object.keys(query.select).sort(), ['publishRatings', 'ratings', 'sourceColumnLetter', 'targetDepartmentId', 'targetMedicalArrayId']);
    return [{ targetDepartmentId: 'a', targetMedicalArrayId: null, sourceColumnLetter: 'BL', publishRatings: true, ratings: [{ normalizedValue: 4 }] }];
  } } };
  const cards = [{ id: 'a', experienceDepartmentIds: ['a'], experienceMedicalArrayIds: [] }];
  assert.deepEqual((await surveyDirectorySummaries(db as any, cards)).get('a'), { experienceCount: 1, recommendationCount: 1, recommendationAverage: 4 });
  for (const viewer of [null, { role: 'student', emailVerified: false, verificationStatus: 'VERIFIED' }, { role: 'student', emailVerified: true, verificationStatus: 'PENDING' }]) {
    assert.deepEqual(await publicSurveyExperiences(db as any, ['a'], viewer), []);
  }
});

test('empty directory never queries review data', async () => {
  const db = { surveyReview: { findMany: async () => { throw new Error('must not query'); } } };
  assert.equal((await surveyDirectorySummaries(db as any, [])).size, 0);
});
