import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SOURCE_ID } from '../../src/lib/staz-survey/domain';
const migration = '202611120001_staz_survey_reviews';
export async function baseline(db: PrismaClient) {
  const out: Record<string, unknown> = {};
  for (const table of ['Review','ReviewSubmission','Department','DepartmentMetric','DepartmentYearlyMetric','SpecialtyMetric','SpecialtyYearlyMetric']) out[table] = await db.$queryRawUnsafe(`SELECT count(*)::int AS n, md5(string_agg(to_jsonb(r)::text, '' ORDER BY id)) AS digest FROM "${table}" r`);
  return out;
}
async function main() {
  assert.equal(new URL(process.env.DIRECT_URL!).hostname, 'ep-odd-pine-amqmgo7p.c-5.us-east-1.aws.neon.tech');
  const db = new PrismaClient({ log: [] });
  try {
    const applied = await db.$queryRaw<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }[]>`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"`;
    assert(!applied.some(r => !r.finished_at && !r.rolled_back_at));
    const files = await readdir('prisma/migrations', { withFileTypes: true }); const checksums = new Map<string,string>();
    for (const f of files.filter(f => f.isDirectory())) checksums.set(f.name, createHash('sha256').update(await readFile(`prisma/migrations/${f.name}/migration.sql`)).digest('hex'));
    for (const r of applied.filter(r => r.finished_at && !r.rolled_back_at)) {
      const documented = r.migration_name === '202604290001_residency_navigator_profile_fields' && r.checksum === '18c8fda9605821ebc8ba284b5d3cdc3fc691ab87ba525b5573eda4b11ecf2d03' && checksums.get(r.migration_name) === 'cbecd9b59ecbf814de11cf7ab1225c9330e7eace4422dea95efe76e19e19ae27';
      if (!documented) assert.equal(checksums.get(r.migration_name), r.checksum, 'MIGRATION_CHECKSUM_MISMATCH');
    }
    const pending = [...checksums.keys()].filter(k => !applied.some(r => r.migration_name === k && r.finished_at && !r.rolled_back_at));
    assert(pending.length === 0 || (pending.length === 1 && pending[0] === migration));
    const report: Record<string, unknown> = { targetVerified: true, appliedMigrations: applied.filter(r => r.finished_at && !r.rolled_back_at).length, pending, baseline: await baseline(db) };
    if (!pending.length) {
      const source = await db.surveyReviewSource.findUnique({ where: { id: SOURCE_ID } });
      report.sourceEnabled = source?.isPublicEnabled ?? false; report.permissionConfirmed = Boolean(source?.permissionConfirmedAt);
      report.counts = await db.surveyReview.groupBy({ by: ['status'], where: { sourceId: SOURCE_ID }, _count: true });
      report.publishText = await db.surveyReview.count({ where: { sourceId: SOURCE_ID, publishText: true } });
      report.publishRatings = await db.surveyReview.count({ where: { sourceId: SOURCE_ID, publishRatings: true } });
      assert(!source?.isPublicEnabled && !source?.permissionConfirmedAt); assert.equal(report.publishText, 0); assert.equal(report.publishRatings, 0);
    }
    const path = process.argv[2]; if (path) await writeFile(path, JSON.stringify(report, null, 2)+'\n', { mode: 0o600 });
    console.log(JSON.stringify(report));
  } finally { await db.$disconnect(); }
}
main().catch(e => { console.error(e instanceof assert.AssertionError ? e.message : 'PRODUCTION_PREFLIGHT_FAILED'); process.exitCode=1; });
