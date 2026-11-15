const { PrismaClient } = require('@prisma/client');
const { lookup } = require('node:dns/promises');
const { execFileSync } = require('node:child_process');
const { readFileSync, readdirSync, writeFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const migration = '202611150001_career_fit_visibility';
async function main() {
  const production = process.argv.includes('--production');
  const url = new URL(process.env.DATABASE_URL);
  const host = production ? 'ep-odd-pine-amqmgo7p.c-5.us-east-1.aws.neon.tech' : 'ep-icy-meadow-amxew6gx.c-5.us-east-1.aws.neon.tech';
  assert.equal(url.hostname.replace('-pooler.', '.'), host);
  url.hostname = host; url.searchParams.set('host', (await lookup(host, { family: 4 })).address);
  url.searchParams.set('options', 'endpoint=' + host.split('.')[0]);
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });
  const files = new Map(readdirSync('prisma/migrations', { withFileTypes: true }).filter(e => e.isDirectory()).map(e => [e.name, createHash('sha256').update(readFileSync('prisma/migrations/' + e.name + '/migration.sql')).digest('hex')]));
  try {
    const history = await db.$queryRaw`SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations`;
    assert.ok(!history.some(r => !r.finished_at && !r.rolled_back_at));
    const applied = history.filter(r => r.finished_at && !r.rolled_back_at);
    for (const row of applied) {
      const legacy = row.migration_name === '202604290001_residency_navigator_profile_fields' && row.checksum === '18c8fda9605821ebc8ba284b5d3cdc3fc691ab87ba525b5573eda4b11ecf2d03' && files.get(row.migration_name) === 'cbecd9b59ecbf814de11cf7ab1225c9330e7eace4422dea95efe76e19e19ae27';
      assert.ok(legacy || row.checksum === files.get(row.migration_name), 'Migration history mismatch');
    }
    const pending = [...files.keys()].filter(name => !applied.some(r => r.migration_name === name));
    assert.deepEqual(pending, [migration]);
    const snapshot = async () => {
      const result = {};
      for (const table of ['Review', 'ReviewSubmission', 'ExternalSurveyResponse', 'ExternalSurveyAggregate', 'SurveyReview', 'SurveyReviewRating', 'SurveyReviewSource', 'ExternalSurveySource', 'SourceVisibility']) {
        result[table] = (await db.$queryRawUnsafe('SELECT count(*)::int AS count, md5(string_agg(md5(row_to_json(t)::text), \'\' ORDER BY id)) AS digest FROM "' + table + '" t'))[0];
      }
      return result;
    };
    const before = await snapshot();
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString() }, stdio: ['ignore', 'pipe', 'pipe'] });
    assert.deepEqual(await snapshot(), before, 'Existing data changed');
    const feature = await db.siteFeature.findUniqueOrThrow({ where: { key: 'career_fit' } });
    assert.equal(feature.enabled, false);
    const recorded = await db.$queryRaw`SELECT checksum FROM _prisma_migrations WHERE migration_name = ${migration} AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    assert.equal(recorded.length, 1); assert.equal(recorded[0].checksum, files.get(migration));
    const report = { passed: true, production, migration, directConnection: true, careerFitEnabled: false, previousDataUnchanged: true, tablesVerified: Object.keys(before), migrationChecksum: files.get(migration) };
    writeFileSync('docs/career-fit-visibility-20261115/' + (production ? 'production-migration' : 'test-migration') + '.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally { await db.$disconnect(); }
}
main().catch(e => { console.error(e.code || e.name, e.code === 'ERR_ASSERTION' ? e.message : 'Migration verification failed; no credentials logged'); process.exitCode = 1; });
