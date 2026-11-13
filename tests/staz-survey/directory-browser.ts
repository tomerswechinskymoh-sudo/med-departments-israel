import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { prisma as db } from '../../src/lib/prisma';
import { SOURCE_ID } from '../../src/lib/staz-survey/domain';
const base = 'http://127.0.0.1:3097', out = 'docs/staz-survey-directory-20261113';
async function main() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.STAZ_TEST_DATABASE_HOST);
  assert.ok(!process.env.DATABASE_URL!.includes('ep-odd-pine-'));
  const fixture = JSON.parse(await readFile(out + '/integration.json', 'utf8'));
  const source = await db.surveyReviewSource.findUniqueOrThrow({ where: { id: SOURCE_ID } });
  const browser = await chromium.launch({ channel: 'chrome' }), context = await browser.newContext(), page = await context.newPage();
  page.setDefaultTimeout(45000);
  await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
  const errors: string[] = [], scans: unknown[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const payload = Buffer.from(JSON.stringify({ userId: 'staz-test-admin', role: 'admin', exp: Date.now() + 3600000 })).toString('base64url');
  await context.addCookies([{ name: 'med_departments_session', value: payload + '.' + createHmac('sha256', 'synthetic-test-secret-'.repeat(3)).update(payload).digest('base64url'), url: base }]);
  const card = page.locator('.department-card').filter({ hasText: /רמב/ });
  try {
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: true } });
    await page.goto(base + '/departments');
    await card.waitFor();
    assert.ok((await card.locator('[data-department-experiences]').innerText()).includes(fixture.rambam.experienceCount + ' חוויות מאושרות'));
    assert.ok((await card.innerText()).includes(fixture.rambam.recommendationCount + ' דירוגים'));
    assert.ok((await card.innerText()).includes(fixture.rambam.recommendationAverage.toFixed(1)));
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1000 }); await card.scrollIntoViewIfNeeded();
      await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
      const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('.directory-cards'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.deepEqual(violations, []); assert.equal(overflow, false);
      scans.push({ width, violations, overflow }); await page.screenshot({ path: out + '/directory-' + width + '.png' });
    }
    const link = card.getByRole('link', { name: /חוויות מאושרות/ });
    const href = await link.getAttribute('href'); assert.ok(href?.endsWith('#department-experiences'));
    await link.click(); await page.waitForURL('**#department-experiences');
    await page.locator('#department-experiences').waitFor({ state: 'attached' });
    await page.getByRole('button', { name: /^סטאז׳רים \(/ }).waitFor();
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: false } });
    await page.goto(base + '/departments'); await card.waitFor();
    assert.ok(!(await card.innerText()).includes(fixture.rambam.recommendationCount + ' דירוגים'));
    assert.ok(!(await card.locator('[data-department-experiences]').innerText()).includes(fixture.rambam.experienceCount + ' חוויות מאושרות'));
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: true } });
    await page.reload(); await card.waitFor();
    assert.ok((await card.innerText()).includes(fixture.rambam.recommendationCount + ' דירוגים'));
    assert.deepEqual(errors, []);
    const report = { passed: true, rambamCountAndRatingVisible: true, profileAnchorWorks: true, immediateHideRestore: true, scans, errors };
    await writeFile(out + '/browser-checks.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
  } finally {
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: source.isPublicEnabled } });
    await browser.close();
  }
}
main().finally(() => db.$disconnect()).catch(e => { console.error(e); process.exitCode = 1; });
