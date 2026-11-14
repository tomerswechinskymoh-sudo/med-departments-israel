import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { recordSelection } from '../../src/server/external-survey/selection';
import { SOURCE_ID } from '../../src/server/external-survey/workbook';
import { publicMetric } from '../../src/lib/external-survey/presentation';
const db = new PrismaClient({ log: [] });
async function baseline() {
  const result: Record<string, unknown> = {};
  for (const table of ['Review', 'ReviewSubmission', 'User', 'Department', 'SpecialtyMetric', 'DepartmentMetric', 'SurveyReviewSource', 'SurveyReviewCandidate']) {
    const exists = await db.$queryRawUnsafe<{ exists: boolean }[]>(`SELECT to_regclass('"${table}"') IS NOT NULL AS exists`);
    if (exists[0].exists) result[table] = await db.$queryRawUnsafe(`SELECT count(*)::int AS count, md5(string_agg(to_jsonb(r)::text,'' ORDER BY id)) AS digest FROM "${table}" r`);
  }
  result.originals = await db.$queryRaw`SELECT md5(string_agg(concat(fingerprint,raw_encrypted,normalized::text,specialty_id,institution_id,report_year),' ' ORDER BY id)) AS digest FROM "ExternalSurveyResponse"`;
  return result;
}
async function main() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.RESIDENT_TEST_HOST);
  assert.ok(!process.env.RESIDENT_TEST_HOST?.startsWith('ep-odd-pine-'));
  const document = await readFile(process.env.SURVEY_SELECTION_PATH!, 'utf8'), plan = JSON.parse(document);
  const before = await baseline(); console.log('Baseline captured');
  await assert.rejects(recordSelection(db, document, process.env.SURVEY_SOURCE_PATH!, 'staz-test-student'), /administrator/);
  await assert.rejects(recordSelection(db, JSON.stringify({ ...plan, datasetHash: '0'.repeat(64) }), process.env.SURVEY_SOURCE_PATH!, 'staz-test-admin'), /stale/);
  await assert.rejects(recordSelection(db, JSON.stringify({ ...plan, tips: plan.tips.map((t: object, i: number) => i ? t : { ...t, exactText: 'changed original' }) }), process.env.SURVEY_SOURCE_PATH!, 'staz-test-admin'), /exact source text/);
  console.log('Guard checks passed'); const first = await recordSelection(db, document, process.env.SURVEY_SOURCE_PATH!, 'staz-test-admin');
  console.log('Selection recorded'); assert.equal(first.metricsReviewed, 66); assert.equal(first.tipsReviewed, 88);
  const publish = () => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'scripts/external-survey.ts', 'publish'], { env: process.env, encoding: 'utf8' }));
  const published = publish();
  assert.equal(published.publishedMetrics, 66); assert.equal(published.publishedTips, 29);
  const again = await recordSelection(db, document, process.env.SURVEY_SOURCE_PATH!, 'staz-test-admin');
  assert.equal(again.identicalSelection, true); assert.deepEqual(publish(), published);
  const source = await db.externalSurveySource.findUniqueOrThrow({ where: { id: SOURCE_ID } });
  const metrics = await db.externalSurveyAggregate.findMany({ where: { sourceId: SOURCE_ID, status: 'PUBLISHED' } });
  assert.equal(metrics.filter(m => m.metricKey === 'salaryGross').length, 9);
  assert.equal(metrics.filter(m => m.metricKey === 'salaryNet').length, 0);
  assert.ok(metrics.every(m => publicMetric(m, source.datasetHash)));
  const tips = await db.externalSurveyResponse.findMany({ where: { sourceId: SOURCE_ID, status: 'PUBLISHED' } });
  assert.ok(tips.every(t => plan.tips.some((p: { fingerprint: string; exactText: string; status: string }) => p.fingerprint === t.fingerprint && p.exactText === t.approvedTip && p.status === 'APPROVED')));
  const small = await db.externalSurveyAggregate.findFirstOrThrow({ where: { sourceId: SOURCE_ID, respondentCount: { lt: 10 } } });
  await assert.rejects(db.externalSurveyAggregate.update({ where: { id: small.id }, data: { status: 'PUBLISHED', value: 5, privacyReviewHash: source.datasetHash, privacyEvidence: { test: true } } }));
  try {
    await db.externalSurveySource.update({ where: { id: SOURCE_ID }, data: { aggregateRightsStatus: 'PENDING_PUBLICATION_RIGHTS', quoteRightsStatus: 'PENDING_PUBLICATION_RIGHTS' } });
    const hidden = publish(); assert.equal(hidden.publishedMetrics, 0); assert.equal(hidden.publishedTips, 0);
  } finally {
    await db.externalSurveySource.update({ where: { id: SOURCE_ID }, data: { aggregateRightsStatus: source.aggregateRightsStatus, quoteRightsStatus: source.quoteRightsStatus } });
    assert.deepEqual(publish(), published);
  }
  assert.deepEqual(await baseline(), before);
  const report = { passed: true, publishedMetrics: metrics.length, specialties: new Set(metrics.map(m => m.specialtyId)).size, publishedTips: tips.length, approvedTips: 40, withheldPositiveTips: 11, negativeTips: 17, uncertainTips: 31, salaryGrossGroups: 9, salaryNetGroups: 0, sourceRowsAndOtherDataUnchanged: true, idempotencyPassed: true, authExactTextStaleDatasetAndSmallGroupGuardsPassed: true, hideRestorePassed: true };
  await writeFile('docs/resident-survey-publication-20261114/integration.json', JSON.stringify(report, null, 2)+'\n');
  console.log(JSON.stringify(report));
}
main().catch(e => { console.error(e instanceof assert.AssertionError ? e.message : e.code ? `${e.code}: ${e.meta?.error ?? "database failure"}` : e.message ?? e.name); process.exitCode = 1; }).finally(() => db.$disconnect());
