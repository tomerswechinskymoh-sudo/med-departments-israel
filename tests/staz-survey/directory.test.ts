import test from 'node:test';
import assert from 'node:assert/strict';
import { surveyDirectorySummaries } from '../../src/server/staz-survey/directory';
import { publicSurveyWhere } from '../../src/server/staz-survey/public';

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
  ], { role: 'admin' });
  assert.deepEqual(result.get('group'), { experienceCount: 4, recommendationCount: 2, recommendationAverage: 4 });
  assert.deepEqual(result.get('individual'), { experienceCount: 1, recommendationCount: 1, recommendationAverage: 3 });
  assert.equal(result.has('empty'), false);
});

test('directory uses the same viewer gate as department experiences', async () => {
  const db = { surveyReview: { findMany: async () => { throw new Error('must not query'); } } };
  const cards = [{ id: 'a', experienceDepartmentIds: ['a'], experienceMedicalArrayIds: [] }];
  for (const viewer of [null, { role: 'student', emailVerified: false, verificationStatus: 'VERIFIED' }, { role: 'student', emailVerified: true, verificationStatus: 'PENDING' }]) {
    assert.equal((await surveyDirectorySummaries(db as any, cards, viewer)).size, 0);
  }
});
