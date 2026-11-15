import test from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaClient } from '@prisma/client';
import { readSurveySummary } from '../../src/server/external-survey/public';

const viewer = { role: 'resident', emailVerified: true, verificationStatus: 'VERIFIED' };
const local = { institutionName: 'Synthetic hospital', specialtyName: 'Synthetic specialty', isArray: true, siblingCount: 2 };
const metric = { metricKey: 'peers', value: 4.25, method: 'MEAN', respondentCount: 4, calculatedCount: 0, periodStartYear: 2024, periodEndYear: 2025, status: 'PUBLISHED', institutionId: null, datasetHash: 'current', privacyReviewHash: 'current' };
function database({ hidden = false, rows = [metric] } = {}) {
  let quoteReads = 0;
  const db = {
    specialty: { findMany: async () => [{ id: 's', slug: 'internal-medicine' }] },
    institution: { findMany: async () => [{ id: 'hospital', slug: 'synthetic', name: local.institutionName }] },
    externalSurveySource: { findFirst: async ({ where }: any) => {
      assert.equal(where.aggregateRightsStatus, 'DOCUMENTED'); assert.ok(where.aggregateRightsEvidence.not);
      return hidden ? null : { title: 'Synthetic source', datasetHash: 'current', quoteRightsStatus: 'DOCUMENTED', quoteRightsEvidence: { approved: true } };
    } },
    externalSurveyAggregate: { findMany: async ({ where, select }: any) => {
      assert.equal(where.institutionId, null); assert.equal(where.specialtyId, 's');
      assert.equal(where.status, 'PUBLISHED'); assert.equal(where.datasetHash, 'current'); assert.equal(where.privacyReviewHash, 'current');
      assert.equal(select.rawEncrypted, undefined); assert.equal(select.gender, undefined);
      return rows;
    } },
    externalSurveyResponse: { findMany: async () => { quoteReads++; throw new Error('National summaries must never query respondent rows'); } }
  } as unknown as PrismaClient;
  return { db, quoteReads: () => quoteReads };
}
test('guests and signed-in viewers receive identical approved national metric DTOs without quotes', async () => {
  const { db, quoteReads } = database();
  const guest = await readSurveySummary(db, 's', null);
  assert.equal(guest.state, 'published'); assert.deepEqual(guest.quotes, []);
  assert.deepEqual(guest.metrics, [{ key: 'peers', value: 4.3, respondents: 4, method: 'MEAN', calculated: false, startYear: 2024, endYear: 2025 }]);
  assert.deepEqual(await readSurveySummary(db, 's', viewer), guest);
  assert.deepEqual(await readSurveySummary(db, 's', { ...viewer, emailVerified: false }), guest);
  assert.equal(quoteReads(), 0);
});
test('guest access does not bypass publication, source rights, current review, sample or national-scope checks', async () => {
  const hidden = await readSurveySummary(database({ hidden: true }).db, 's', null);
  assert.equal(hidden.state, 'empty'); assert.deepEqual(hidden.metrics, []);
  const invalid = [
    { ...metric, status: 'SUPPRESSED' }, { ...metric, privacyReviewHash: 'stale' },
    { ...metric, datasetHash: 'stale' }, { ...metric, institutionId: 'hospital' },
    { ...metric, respondentCount: 0 }, { ...metric, value: 6 }
  ];
  const summary = await readSurveySummary(database({ rows: invalid as typeof metric[] }).db, 's', null);
  assert.equal(summary.state, 'empty'); assert.deepEqual(summary.metrics, []); assert.deepEqual(summary.quotes, []);
});
test('local summaries remain locked for guests and unverified users before any data is read', async () => {
  for (const who of [null, { ...viewer, emailVerified: false }, { ...viewer, verificationStatus: 'PENDING_PROOF' }]) {
    assert.deepEqual(await readSurveySummary({} as PrismaClient, 's', who, local), { state: 'locked', metrics: [], quotes: [] });
  }
});
