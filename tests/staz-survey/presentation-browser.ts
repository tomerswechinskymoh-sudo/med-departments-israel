import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { prisma as db } from '../../src/lib/prisma';
import { SOURCE_ID } from '../../src/lib/staz-survey/domain';
const base = 'http://127.0.0.1:3097', out = 'docs/staz-survey-presentation-20261113';
async function main() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.STAZ_TEST_DATABASE_HOST);
  assert.ok(!process.env.DATABASE_URL!.includes('ep-odd-pine-'));
  const fixture = JSON.parse(await readFile(out + '/integration.json', 'utf8'));
  const source = await db.surveyReviewSource.findUniqueOrThrow({ where: { id: SOURCE_ID } });
  const browser = await chromium.launch({ channel: 'chrome' }), context = await browser.newContext(), page = await context.newPage();
  page.setDefaultTimeout(60000);
  await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
  const errors: string[] = [], scans: unknown[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const payload = Buffer.from(JSON.stringify({ userId: 'staz-test-admin', role: 'admin', exp: Date.now() + 3600000 })).toString('base64url');
  await context.addCookies([{ name: 'med_departments_session', value: payload + '.' + createHmac('sha256', 'synthetic-test-secret-'.repeat(3)).update(payload).digest('base64url'), url: base }]);
  const card = page.locator('.department-card').filter({ hasText: fixture.mixed.institution });
  const summary = card.locator('[data-department-experiences]');
  try {
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: true } });
    await page.goto(base + '/departments'); await card.waitFor();
    assert.equal(await summary.getByRole('img').count(), 1);
    assert.ok((await summary.innerText()).includes(fixture.mixed.recommendation.average.toFixed(1)));
    assert.ok((await summary.innerText()).includes(fixture.mixed.recommendation.count + ' דירוגים'));
    assert.ok((await summary.innerText()).includes(fixture.mixed.experienceCount + ' חוויות מאושרות'));
    assert.ok(!(await page.locator('main').innerText()).includes('מקור נפרד'));
    assert.equal(await page.locator('[data-survey-state="empty"]').count(), 0);
    for (const width of [1920, 1440, 768, 375]) {
      await page.setViewportSize({ width, height: 1050 });
      const group = page.locator('.dashboard-group--1'); await group.scrollIntoViewIfNeeded();
      const dimensions = await group.evaluate(el => {
        const bundle = el.querySelector('.dashboard-metric-bundle')!.getBoundingClientRect();
        const charts = el.querySelector('.dashboard-chart-stack')!.getBoundingClientRect();
        const heights = [...el.querySelectorAll('.dashboard-metric-bundle > .dashboard-metric')].map(metric => metric.getBoundingClientRect().height);
        return { bundleHeight: bundle.height, chartsBelow: charts.top >= bundle.bottom, heights };
      });
      assert.ok(dimensions.chartsBelow); assert.ok(dimensions.heights.every(height => height < 220));
      if (width >= 1024) assert.ok(dimensions.bundleHeight < 220);
      await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
      const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.deepEqual(violations, []); assert.equal(overflow, false);
      scans.push({ width, dimensions, violations, overflow });
      await group.screenshot({ path: out + '/metrics-' + width + '.png' });
      await card.scrollIntoViewIfNeeded(); await card.screenshot({ path: out + '/card-' + width + '.png' });
    }
    await card.getByRole('link', { name: /חוויות מאושרות/ }).click();
    await page.waitForURL('**#department-experiences');
    const header = page.locator('.profile-identity-meta'); await header.waitFor();
    assert.equal(await header.getByRole('img').count(), 1);
    assert.ok((await header.innerText()).includes(fixture.mixed.recommendation.average.toFixed(1)));
    assert.ok((await header.innerText()).includes(fixture.mixed.experienceCount + ' חוויות מאושרות'));
    await page.getByRole('button', { name: /^סטאז׳רים \(/ }).click();
    assert.ok(!(await page.locator('#department-experiences').locator('..').innerText()).includes('המלצה על סבב אלקטיב'));
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: false } });
    await page.goto(base + '/departments'); await card.waitFor();
    assert.ok((await summary.innerText()).includes(fixture.mixed.nativeRecommendation.average.toFixed(1)));
    assert.ok((await summary.innerText()).includes(fixture.mixed.nativeRecommendation.count + ' דירוגים'));
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: true } });
    await page.reload(); await card.waitFor();
    assert.ok((await summary.innerText()).includes(fixture.mixed.recommendation.average.toFixed(1)));
    assert.deepEqual(errors, []);
    const report = { passed: true, singleWeightedRating: true, directoryMatchesProfile: true, noSourceHeadingOrEmptyPanel: true, hideRestoreRecalculatesAverage: true, scans, errors };
    await writeFile(out + '/browser-checks.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
  } finally {
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: source.isPublicEnabled } });
    await browser.close();
  }
}
main().finally(() => db.$disconnect()).catch(e => { console.error(e); process.exitCode = 1; });
