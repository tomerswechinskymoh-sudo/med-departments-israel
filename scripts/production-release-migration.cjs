// Explicit, one-release opt-in. Normal builds never migrate a database.
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const migration = '202611100001_privacy_sources_mail';
const host = 'ep-odd-pine-amqmgo7p.c-5.us-east-1.aws.neon.tech';
// Verified against git 1d21601 and c84480b: only IF NOT EXISTS was added.
// Keep deployed history intact; allow only this exact, pre-existing hash pair.
const legacy = { name: '202604290001_residency_navigator_profile_fields',
  applied: '18c8fda9605821ebc8ba284b5d3cdc3fc691ab87ba525b5573eda4b11ecf2d03',
  current: 'cbecd9b59ecbf814de11cf7ab1225c9330e7eace4422dea95efe76e19e19ae27' };

function requested(env) {
  if (!env.HITMACHUT_RELEASE_APPLY_MIGRATIONS) return false;
  assert.equal(env.HITMACHUT_RELEASE_APPLY_MIGRATIONS, migration, 'RELEASE_NOT_APPROVED');
  assert.equal(env.VERCEL_ENV, 'production', 'PRODUCTION_BUILD_REQUIRED');
  assert.equal(env.HITMACHUT_RELEASE_RESTORE_POINT, 'snap-nameless-star-amcmcepf', 'VERIFIED_RESTORE_POINT_REQUIRED');
  const app = new URL(env.DATABASE_URL), direct = new URL(env.DIRECT_URL);
  assert.equal(app.hostname.replace('-pooler.', '.'), host, 'DATABASE_TARGET_MISMATCH');
  assert.equal(direct.hostname, host, 'DIRECT_TARGET_MISMATCH');
  assert.equal(app.pathname, '/neondb', 'DATABASE_NAME_MISMATCH');
  assert.equal(direct.pathname, '/neondb', 'DIRECT_DATABASE_NAME_MISMATCH');
  assert.equal(app.username, direct.username, 'DATABASE_ROLE_MISMATCH');
  assert(['https://hitmachut.org', 'https://www.hitmachut.org'].includes(new URL(env.APP_URL).origin), 'APP_ORIGIN_MISMATCH');
  assert((env.AUTH_SECRET || '').length >= 32, 'AUTH_CONFIGURATION_REQUIRED');
  assert(env.RESEND_API_KEY && env.EMAIL_FROM, 'EMAIL_CONFIGURATION_REQUIRED');
  return true;
}

function verifyHistory(rows, files) {
  assert(!rows.some(r => !r.finished_at && !r.rolled_back_at), 'UNRESOLVED_MIGRATION');
  const applied = rows.filter(r => r.finished_at && !r.rolled_back_at);
  assert.equal(new Set(applied.map(r => r.migration_name)).size, applied.length, 'DUPLICATE_MIGRATION');
  for (const row of applied) {
    const documentedLegacy = row.migration_name === legacy.name && row.checksum === legacy.applied && files.get(row.migration_name) === legacy.current;
    if (!documentedLegacy) assert.equal(files.get(row.migration_name), row.checksum, 'MIGRATION_CHECKSUM_MISMATCH');
  }
  const pending = [...files.keys()].filter(name => !applied.some(r => r.migration_name === name));
  assert(pending.length === 0 || (pending.length === 1 && pending[0] === migration), 'UNEXPECTED_PENDING_MIGRATIONS');
  assert.equal(files.size, 40, 'RELEASE_MIGRATION_MANIFEST_MISMATCH');
  return pending;
}

async function main() {
  if (!requested(process.env)) return;
  const directory = join(__dirname, '../prisma/migrations');
  const files = new Map(readdirSync(directory, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => [e.name,
    createHash('sha256').update(readFileSync(join(directory, e.name, 'migration.sql'))).digest('hex')]));
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient({ log: [] });
  try {
    const history = () => db.$queryRawUnsafe('SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"');
    const pending = verifyHistory(await history(), files);
    console.log('PRODUCTION_MIGRATION_PREFLIGHT_OK ' + JSON.stringify({ migration, pending: pending.length, restorePoint: process.env.HITMACHUT_RELEASE_RESTORE_POINT }));
    // Use the project's established deploy command, with secrets only in Vercel.
    const result = spawnSync('npm', ['run', 'prisma:migrate:deploy'], { env: process.env, encoding: 'utf8', timeout: 180000 });
    assert.equal(result.status, 0, 'MIGRATION_DEPLOY_COMMAND_FAILED');
    assert.deepEqual(verifyHistory(await history(), files), [], 'MIGRATION_NOT_APPLIED');
    const [visibility] = await db.$queryRawUnsafe('SELECT ima, duns100 FROM "SourceVisibility" WHERE id = \'global\'');
    assert(visibility?.ima && visibility?.duns100, 'SOURCES_MUST_REMAIN_VISIBLE');
    console.log('PRODUCTION_MIGRATION_DEPLOY_OK ' + JSON.stringify({ migration, checksum: files.get(migration), applied: 40, ima: true, duns100: true, historicalCleanupRun: false }));
  } finally { await db.$disconnect(); }
}
module.exports = { requested, verifyHistory, migration, host, legacy };
if (require.main === module) main().catch(error => {
  // Never echo connection strings or raw database/provider diagnostics.
  console.error('PRODUCTION_MIGRATION_STOPPED ' + (error?.code === 'ERR_ASSERTION' ? String(error.message).split('\n')[0] : 'CHECK_FAILED'));
  process.exitCode = 1;
});
