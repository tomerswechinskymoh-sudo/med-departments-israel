import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { publicMetric } from '../../src/lib/external-survey/presentation';
import { readSurveySummary, RESIDENT_SOURCE_ID } from '../../src/server/external-survey/public';
const db = new PrismaClient({ log: [] });
const viewer = { role: 'student', emailVerified: true, verificationStatus: 'VERIFIED' };
async function main() {
  assert.ok(process.env.RESIDENT_TEST_HOST?.startsWith('ep-icy-meadow-'));
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.RESIDENT_TEST_HOST);
  const source = await db.externalSurveySource.findUniqueOrThrow({ where: { id: RESIDENT_SOURCE_ID } });
  const rows = await db.externalSurveyAggregate.findMany({ where: { sourceId: RESIDENT_SOURCE_ID, institutionId: null, status: 'PUBLISHED' } });
  const specialties = [...new Set(rows.map(r => r.specialtyId))];
  let cells = 0;
  for (let i = 0; i < specialties.length; i += 3) {
    await Promise.all(specialties.slice(i, i + 3).map(async id => {
      assert.ok(id);
      const guest = await readSurveySummary(db, id, null);
      const expected = rows.filter(r => r.specialtyId === id).flatMap(r => { const metric = publicMetric(r, source.datasetHash); return metric ? [metric] : []; });
      assert.equal(guest.state, 'published'); assert.deepEqual(guest.quotes, []);
      assert.deepEqual([...guest.metrics].sort((a, b) => a.key.localeCompare(b.key)), expected.sort((a, b) => a.key.localeCompare(b.key)));
      cells += guest.metrics.length;
    }));
  }
  const id = specialties[0]!;
  assert.deepEqual(await readSurveySummary(db, id, null), await readSurveySummary(db, id, viewer));
  assert.equal((await readSurveySummary(db, id, null, { institutionName: 'Any hospital', specialtyName: 'Any specialty', isArray: true, siblingCount: 1 })).state, 'locked');
  // Simulate hiding the source on the isolated branch, then rollback every write.
  const rollback = new Error('rollback test');
  await assert.rejects(db.$transaction(async tx => {
    await tx.externalSurveySource.update({ where: { id: RESIDENT_SOURCE_ID }, data: { aggregateRightsStatus: 'PENDING_PUBLICATION_RIGHTS' } });
    assert.deepEqual(await readSurveySummary(tx as unknown as PrismaClient, id, null), { state: 'empty', metrics: [], quotes: [] });
    throw rollback;
  }, { timeout: 30000 }), e => e === rollback);
  assert.deepEqual(await db.externalSurveySource.findUniqueOrThrow({ where: { id: RESIDENT_SOURCE_ID } }), source);
  assert.equal((await readSurveySummary(db, id, null)).state, 'published');
  const report = { passed: true, specialties: specialties.length, nationalMetrics: cells, guestMetricsExact: true, guestMatchesVerifiedViewer: true, quotesAlwaysEmpty: true, localGuestAccessLocked: true, sourceHideRestoreVerified: true, writesRolledBack: true };
  await writeFile('docs/public-resident-metrics-20261115/integration.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
}
main().catch(e => { console.error(e?.name?.startsWith('Prisma') ? { name: e.name, code: e.code } : e); process.exitCode = 1; }).finally(() => db.$disconnect());
