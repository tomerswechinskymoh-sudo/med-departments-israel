// Applies only the reviewed nullable-rating migration; emits no respondent data.
const { PrismaClient } = require('@prisma/client');
const { lookup } = require('node:dns/promises');
const { execFileSync } = require('node:child_process');
const { writeFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const migration = '202611140003_resident_conditions_questionnaire';
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  const production = process.argv.includes('--production');
  const host = production ? 'ep-odd-pine-amqmgo7p.c-5.us-east-1.aws.neon.tech' : 'ep-icy-meadow-amxew6gx.c-5.us-east-1.aws.neon.tech';
  assert.equal(url.hostname.replace('-pooler.', '.'), host);
  url.hostname = host; url.searchParams.set('host', (await lookup(host, { family: 4 })).address);
  url.searchParams.set('options', 'endpoint=' + host.split('.')[0]);
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });
  try {
    const known = await db.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`;
    assert.equal(known.length, production ? 45 : 46);
    assert.equal(known.some(r => r.migration_name === migration), !production);
    const snapshot = async () => {
      const result = {};
      for (const table of ['Review', 'ReviewSubmission', 'ExternalSurveyResponse', 'ExternalSurveyAggregate', 'SurveyReview', 'SurveyReviewRating', 'SurveyReviewSource', 'ExternalSurveySource']) {
        // Table names are a fixed code-owned allowlist. Hashes only leave this process.
        const exists = await db.$queryRawUnsafe('SELECT to_regclass(\'public."' + table + '"\') IS NOT NULL AS exists');
        if (!exists[0].exists) continue;
        const rows = await db.$queryRawUnsafe('SELECT id, md5(row_to_json(t)::text) AS hash FROM "' + table + '" t ORDER BY id');
        result[table] = rows;
      }
      return result;
    };
    const before = await snapshot();
    if (production) execFileSync('npx', ['prisma', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString() }, stdio: ['ignore', 'pipe', 'pipe'] });
    const after = await snapshot(); assert.deepEqual(after, before, 'Existing records must remain unchanged');
    const cols = await db.$queryRaw`SELECT table_name, column_name, is_nullable FROM information_schema.columns WHERE table_name IN ('Review', 'ReviewSubmission') AND column_name IN ('teaching_quality','work_atmosphere','seniors_approachability','research_exposure','lifestyle_balance')`;
    assert.equal(cols.length, 10); assert.ok(cols.every(r => r.is_nullable === 'YES'));
    const overall = await db.$queryRaw`SELECT is_nullable FROM information_schema.columns WHERE table_name IN ('Review','ReviewSubmission') AND column_name = 'overall_recommendation'`;
    assert.ok(overall.every(r => r.is_nullable === 'NO'));
    const report = { passed: true, migration, production, directConnection: true, nullableColumns: 10, overallRecommendationStillRequired: true, existingRecordsUnchanged: Object.fromEntries(Object.entries(before).map(([key, rows]) => [key, rows.length])) };
    writeFileSync('docs/resident-conditions-form-20261114/' + (production ? 'production-migration' : 'test-migration') + '.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally { await db.$disconnect(); }
}
main().catch(e => { console.error(e.code || e.name, e.code === 'ERR_ASSERTION' ? e.message : 'Migration verification failed; no credentials logged'); process.exitCode = 1; });
