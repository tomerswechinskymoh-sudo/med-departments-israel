import test from 'node:test';
import assert from 'node:assert/strict';
import { componentDecision, componentActionSchema, type ComponentAction } from '../../src/server/staz-survey/moderation';
const row = { revision: 1, status: 'APPROVED', targetDepartmentId: 'department-a', mappingConfirmed: true, mappingExceptionReason: null,
  approvedPublicText: 'Previously approved text', publishText: true, publishRatings: true, privacyReviewed: true, adminNotes: null,
  ratings: [{ id: 'rating-a', selected: true }, { id: 'rating-b', selected: false }] };
const action: ComponentAction = { revision: 1, component: 'RATING', action: 'PUBLISH', targetDepartmentId: 'department-a', mappingExceptionReason: '', reviewed: true, metricId: 'rating-b' };
test('publishing one metric preserves approved text and other approved metrics', () => {
  const { decision } = componentDecision(row, action);
  assert.equal(decision.publishText, true); assert.equal(decision.approvedPublicText, row.approvedPublicText);
  assert.deepEqual(decision.selectedMetricIds, ['rating-a', 'rating-b']);
});
test('pending and rejected selections are never approved by a different component button', () => {
  for (const status of ['PENDING_REVIEW', 'REJECTED', 'NEEDS_MAPPING']) {
    const { decision } = componentDecision({ ...row, status }, action);
    assert.equal(decision.publishText, false); assert.deepEqual(decision.selectedMetricIds, ['rating-b']);
  }
});
test('mapping changes invalidate the other component instead of silently moving its approval', () => {
  const result = componentDecision(row, { ...action, targetDepartmentId: 'department-b' });
  assert.equal(result.otherComponentReset, true); assert.equal(result.decision.publishText, false);
  assert.deepEqual(result.decision.selectedMetricIds, ['rating-b']);
});
test('hiding one component ignores unsaved mapping edits and preserves the other', () => {
  const { decision } = componentDecision(row, { ...action, component: 'TEXT', action: 'HIDE', targetDepartmentId: 'department-b' });
  assert.equal(decision.publishText, false); assert.equal(decision.publishRatings, true);
  assert.equal(decision.targetDepartmentId, 'department-a'); assert.deepEqual(decision.selectedMetricIds, ['rating-a']);
  const last = componentDecision({ ...row, publishText: false }, { ...action, action: 'HIDE', metricId: 'rating-a' });
  assert.equal(last.decision.action, 'SAVE'); assert.equal(last.decision.publishRatings, false);
});
test('only the text button accepts text changes; foreign metric IDs and missing attestations fail', () => {
  const rating = componentDecision(row, { ...action, text: 'must not change text' });
  assert.equal(rating.decision.approvedPublicText, row.approvedPublicText);
  assert.throws(() => componentDecision(row, { ...action, metricId: 'foreign' }), /INVALID_RATING_EVIDENCE/);
  assert.equal(componentActionSchema.safeParse({ ...action, reviewed: false }).success, false);
  assert.equal(componentActionSchema.safeParse({ ...action, publishText: true }).success, false);
});
