import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { chromium } from 'playwright';
import { prisma } from '../../src/lib/prisma';
import { assertLocalTestDatabase, seedFixtures } from './fixtures';

// Start the isolated server with TZ=UTC. Browser zones deliberately differ.
assertLocalTestDatabase();
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3110';
assert.equal(new URL(base).hostname, '127.0.0.1');
async function main() {
  console.log('Preparing isolated synthetic admin fixture');
  await seedFixtures();
  await prisma.auditLog.upsert({ where: { id: 'synthetic-hydration-crawler-run' }, update: {}, create: {
    id: 'synthetic-hydration-crawler-run', action: 'openalex.synthetic_hydration_check', entityType: 'SyntheticTest',
    createdAt: new Date('2026-11-10T18:05:00Z'), metadata: { done: true, requested: 0, results: [] }
  }});
  const payload = Buffer.from(JSON.stringify({ userId: 'test-admin', role: 'admin', exp: Date.now() + 3600000 })).toString('base64url');
  const cookie = payload + '.' + createHmac('sha256', process.env.AUTH_SECRET!).update(payload).digest('base64url');
  const browser = await chromium.launch({ headless: true, timeout: 15000 });
  console.log('Started isolated hydration browser');
  try {
    for (const timezoneId of ['Asia/Jerusalem', 'America/Los_Angeles']) {
      const context = await browser.newContext({ timezoneId });
      console.log(`Created isolated browser context: ${timezoneId}`);
      await context.addCookies([{ name: 'med_departments_session', value: cookie, url: base }]);
      await context.route('**/*', route => route.request().url().startsWith(base + '/') && route.request().method() === 'GET' ? route.continue() : route.abort());
      const page = await context.newPage(); const errors: string[] = [];
      page.setDefaultTimeout(15000);
      page.on('pageerror', error => errors.push(error.message.split('\n')[0]));
      const response = await page.goto(base + '/admin', { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('Loaded synthetic admin route');
      assert.equal(new URL(page.url()).pathname, '/admin', 'Synthetic admin session must authenticate');
      assert.equal(response?.status(), 200);
      await page.getByRole('heading', { name: 'מקורות נתונים בתצוגה הציבורית', exact: true }).waitFor();
      await page.waitForTimeout(1000); // Allow the initial client hydration to finish.
      assert.deepEqual(errors, [], `Admin hydration in ${timezoneId}`);
      console.log(`PASS admin hydration: UTC server / ${timezoneId} browser, synthetic crawler timestamp`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().finally(() => prisma.$disconnect()).catch(error => { console.error(error); process.exitCode = 1; });
