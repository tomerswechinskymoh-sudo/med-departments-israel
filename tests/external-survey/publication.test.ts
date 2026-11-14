import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateRows } from '../../src/lib/external-survey/aggregate';
import { parseSalary, parseHours, parseShifts, parseLikert, LIKERT_SCALE, type Normalized } from '../../src/lib/external-survey/parse';
import { publicMetric } from '../../src/lib/external-survey/presentation';
import { selectionSchema } from '../../src/lib/external-survey/selection';

test('salary summaries separate gross/net, suppress small groups and never infer ambiguous units', () => {
  const normalized: Normalized = { salary: parseSalary('20000', 2024), shifts: parseShifts('5'), hours: parseHours('8-16'), calm: parseLikert('4'), peers: parseLikert('5'), seniors: parseLikert('2'), family: parseLikert('3'), scale: LIKERT_SCALE };
  const inputs = [...Array(10).fill('20000'), ...Array(9).fill('10000 נטו'), '18', 'נטו 18 לא זוכרת ברוטו'].map(salary => ({ specialtyId: 'specialty', institutionId: null, reportYear: 2024, normalized: { ...normalized, salary: parseSalary(salary, 2024) } }));
  let result = aggregateRows(inputs);
  assert.equal(result.find(r => r.metricKey === 'salaryGross')?.value, 20000);
  assert.equal(result.find(r => r.metricKey === 'salaryGross')?.respondentCount, 10);
  assert.equal(result.find(r => r.metricKey === 'salaryNet')?.value, null);
  inputs.push({ ...inputs[0], normalized: { ...normalized, salary: parseSalary('12000 נטו', 2024) } });
  result = aggregateRows(inputs);
  assert.equal(result.find(r => r.metricKey === 'salaryNet')?.value, 10000);
  // Low ratings contribute even when a text selection includes only positive tips.
  assert.equal(result.find(r => r.metricKey === 'seniors')?.value, 2);
  assert.equal(result.find(r => r.metricKey === 'seniors')?.respondentCount, 22);
  const row = { ...result.find(r => r.metricKey === 'salaryNet')!, status: 'PUBLISHED', datasetHash: 'hash', privacyReviewHash: 'hash' };
  assert.equal(publicMetric(row, 'hash')?.value, 10000);
  assert.equal(publicMetric({ ...row, value: 18 }, 'hash'), null);
  assert.equal(publicMetric({ ...row, institutionId: 'hospital' }, 'hash'), null);
});

test('delegated selection requires explicit owner authorization, exact decisions and privacy checks', () => {
  const checks = { personalInformation: true, patientInformation: true, personalAllegations: true, indirectIdentification: true };
  const plan = { sourceId: 'resident-conditions-survey-2024', datasetHash: 'a'.repeat(64), fileHash: 'b'.repeat(64), reviewMethod: 'ASSISTANT_REVIEW_UNDER_OWNER_INSTRUCTION', ownerInstructionReference: 'Synthetic test owner instruction, not real authorization', sourcePermissionReference: 'Synthetic test permission, not real authorization', groupKeys: ['specialty:test'], aggregateChecks: { allValidResponsesIncluded: true, noDemographicSlices: true, smallGroupsSuppressed: true, noInstitutionComparisons: true, historicalPeriodClear: true, salaryBasesSeparated: true, indirectIdentification: true }, tips: [{ fingerprint: 'c'.repeat(64), exactText: 'Synthetic positive example with a caveat', sentiment: 'POSITIVE_OVERALL', status: 'APPROVED', rationale: 'Synthetic explicit test assessment', privacyChecks: checks }] };
  assert.equal(selectionSchema.safeParse(plan).success, true);
  assert.equal(selectionSchema.safeParse({ ...plan, ownerInstructionReference: '' }).success, false);
  assert.equal(selectionSchema.safeParse({ ...plan, tips: [...plan.tips, ...plan.tips] }).success, false);
  assert.equal(selectionSchema.safeParse({ ...plan, tips: [{ ...plan.tips[0], sentiment: 'UNCERTAIN' }] }).success, false);
  assert.equal(selectionSchema.safeParse({ ...plan, tips: [{ ...plan.tips[0], privacyChecks: undefined }] }).success, false);
});
