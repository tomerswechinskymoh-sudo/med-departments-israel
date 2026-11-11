const { test } = require('node:test');
const assert = require('node:assert/strict');
const { requested, verifyHistory, migration, host, legacy } = require('../../scripts/production-release-migration.cjs');
const env = { HITMACHUT_RELEASE_APPLY_MIGRATIONS: migration, VERCEL_ENV: 'production', HITMACHUT_RELEASE_RESTORE_POINT: 'snap-nameless-star-amcmcepf',
  DATABASE_URL: `postgresql://test:test@${host.replace('.', '-pooler.')}/neondb`, DIRECT_URL: `postgresql://test:test@${host}/neondb`,
  APP_URL: 'https://www.hitmachut.org', AUTH_SECRET: 'synthetic-release-test-secret-32-characters', RESEND_API_KEY: 'synthetic', EMAIL_FROM: 'test@example.invalid' };
test('ordinary builds do not migrate; explicit release requires matching target and restore point', () => {
  assert.equal(requested({}), false); assert.equal(requested(env), true);
  for (const change of [{ VERCEL_ENV: 'preview' }, { HITMACHUT_RELEASE_APPLY_MIGRATIONS: 'future' }, { HITMACHUT_RELEASE_RESTORE_POINT: '' },
    { DATABASE_URL: 'postgresql://test:test@localhost/neondb' }, { DIRECT_URL: env.DIRECT_URL.replace('/neondb', '/other') }, { APP_URL: 'https://example.invalid' }]) {
    assert.throws(() => requested({ ...env, ...change }));
  }
});
test('migration manifest rejects drift and unresolved history; completed release can rerun', () => {
  const files = new Map(Array.from({ length: 39 }, (_, i) => [`prior-${i}`, `checksum-${i}`])); files.set(migration, 'release-checksum');
  const rows = [...files].filter(([name]) => name !== migration).map(([migration_name, checksum]) => ({ migration_name, checksum, finished_at: new Date(), rolled_back_at: null }));
  assert.deepEqual(verifyHistory(rows, files), [migration]);
  assert.throws(() => verifyHistory([{ ...rows[0], checksum: 'changed' }, ...rows.slice(1)], files));
  assert.throws(() => verifyHistory([...rows, { migration_name: migration, finished_at: null, rolled_back_at: null }], files));
  assert.throws(() => verifyHistory(rows.slice(1), files));
  assert.deepEqual(verifyHistory([...rows, { migration_name: migration, checksum: 'release-checksum', finished_at: new Date(), rolled_back_at: null }], files), []);
  files.delete(rows[0].migration_name); files.set(legacy.name, legacy.current);
  const historic = [{ ...rows[0], migration_name: legacy.name, checksum: legacy.applied }, ...rows.slice(1)];
  assert.deepEqual(verifyHistory(historic, files), [migration]);
  assert.throws(() => verifyHistory([{ ...historic[0], checksum: 'unverified' }, ...historic.slice(1)], files));
});
