import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveCandidate, ratingMatchesCandidate, type Candidate, type ElectiveEvidence } from '../../src/lib/staz-survey/domain';
import { fingerprint } from '../../src/server/staz-survey/parse';
import { applyReviewedElectiveCorrection, electiveContextHash } from '../../src/server/staz-survey/association';
function source(): Candidate {
  const elective = (n: 1 | 2): ElectiveEvidence => ({ hospital: `מוסד בדיקה ${n}`, department: `מחלקת בדיקה ${n}`, text: `טקסט בדיקה ${n}`, rating: { metricCode: 'ELECTIVE_RECOMMENDATION', label: 'המלצה', questionCode: n === 1 ? 'qus_70' : 'qus_73', question: 'שאלת בדיקה', sourceRowNumber: 84, sourceColumn: n === 1 ? 'BK' : 'BO', rawAnswer: n === 1 ? '5-מאוד' : '3-בינוני', scale: '1–5', normalizedValue: n === 1 ? 5 : 3, rotationContext: `ELECTIVE_${n}`, confidence: 'SAME_ROW', verified: true } });
  return { sourceReviewKey: 'STAZ_SURVEY_2020_2025:R84:CBP', sourceRowNumber: 84, sourceColumnLetter: 'BP', sourceYear: 2024, originalHospital: 'מוסד בדיקה 2', originalDepartmentOrScope: 'מחלקת בדיקה 2', sourceQuestion: 'פירוט', rawHospital: 'מוסד בדיקה 2', rawDepartment: 'מחלקת בדיקה 2', proposedText: 'טקסט בדיקה', originalText: 'טקסט בדיקה', sourceVerified: true, workbookHash: 'synthetic', privacyFlags: [], ratings: [elective(2).rating], electives: { ELECTIVE_1: elective(1), ELECTIVE_2: elective(2) } };
}
test('a reviewed association moves hospital, department and exact same-row rating together without changing original evidence', () => {
  const original = source(), originalCopy = structuredClone(original), before = fingerprint(original);
  const corrected = { ...original, electiveCorrection: { version: 'synthetic', rotation: 'ELECTIVE_1' as const, reason: 'synthetic review', contextHash: electiveContextHash(original), requiresManualTarget: false } };
  const result = effectiveCandidate(corrected);
  assert.equal(result.rawHospital, 'מוסד בדיקה 1'); assert.equal(result.rawDepartment, 'מחלקת בדיקה 1');
  assert.equal(result.ratings[0].sourceColumn, 'BK'); assert.equal(result.ratings[0].normalizedValue, 5);
  assert.equal(result.sourceColumnLetter, 'BP'); assert.equal(fingerprint(corrected), before);
  assert.deepEqual(original, originalCopy); assert.equal(corrected.ratings[0].normalizedValue, 3);
  assert.equal(ratingMatchesCandidate(corrected, result.ratings[0]), true);
  assert.equal(ratingMatchesCandidate(corrected, original.ratings[0]), false);
  assert.equal(ratingMatchesCandidate(corrected, { ...result.ratings[0], sourceRowNumber: 85 }), false);
  assert.equal(ratingMatchesCandidate(corrected, { ...result.ratings[0], normalizedValue: 4 }), false);
  assert.equal(ratingMatchesCandidate(corrected, { ...result.ratings[0], questionCode: 'qus_73' }), false);
});
test('null or irrelevant replacement answers never inherit the former numeric score', () => {
  const c = source(); c.electives!.ELECTIVE_1.rating = { ...c.electives!.ELECTIVE_1.rating, rawAnswer: '99-לא רלוונטי', normalizedValue: null, verified: false };
  c.electiveCorrection = { version: 'synthetic', rotation: 'ELECTIVE_1', reason: 'review', contextHash: electiveContextHash(c), requiresManualTarget: false };
  const r = effectiveCandidate(c).ratings[0]; assert.equal(r.normalizedValue, null); assert.equal(ratingMatchesCandidate(c, r), false);
});
test('reviewed manifest cannot be applied to changed source text or contexts', () => {
  const c = source(); assert.throws(() => applyReviewedElectiveCorrection(c), /SOURCE_CHANGED/);
  const before = electiveContextHash(c); c.electives!.ELECTIVE_1.hospital = 'changed'; assert.notEqual(electiveContextHash(c), before);
  const unknown = { ...c, sourceReviewKey: 'STAZ_SURVEY_2020_2025:R49001:CBP' }; assert.equal(applyReviewedElectiveCorrection(unknown), unknown);
});
