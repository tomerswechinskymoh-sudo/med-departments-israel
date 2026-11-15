import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = 'https://www.hitmachut.org', out = 'docs/career-fit-visibility-20261115';
async function main() {
  const browser = await chromium.launch({ channel: 'chrome' }), context = await browser.newContext(), page = await context.newPage();
  const errors: string[] = [], paths: unknown[] = [];
  page.on('pageerror', e => errors.push(e.message)); page.setDefaultTimeout(60000);
  await context.route('**/*', r => ['GET', 'HEAD'].includes(r.request().method()) && r.request().url().startsWith(base + '/') ? r.continue() : r.abort());
  try {
    for (const path of ['/', '/departments', '/about', '/faq', '/sitemap']) {
      const response = await page.goto(base + path); assert.equal(response!.status(), 200);
      assert.equal(await page.locator('a[href^="/career-fit"]').count(), 0);
      assert.equal(await page.locator('[data-career-fit-control]').count(), 0);
      paths.push({ path, linksAbsent: true, status: response!.status() });
    }
    for (const path of ['/career-fit', '/career-fit/departments', '/career-fit/sources', '/career-fit/methodology']) {
      await page.goto(base + path); assert.equal(await page.locator('.beta-badge').count(), 0);
      assert.ok(await page.locator('meta[name="robots"][content="noindex"]').count() > 0);
      paths.push({ path, questionnaireHidden: true });
    }
    assert.equal((await context.request.get(base + '/api/career-fit/catalog')).status(), 404);
    const scans: unknown[] = [];
    await page.goto(base + '/'); assert.equal(await page.locator('.journey-cards article').count(), 2);
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
      const violations = await page.locator('.journey-cards').evaluate(async el => (await (window as any).axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id));
      assert.deepEqual(violations, []); scans.push({ width, violations, overflow: false });
      await page.screenshot({ path: out + '/live-home-' + width + '.png', fullPage: true });
    }
    await page.goto(base + '/departments');
    const internal = await page.locator('.directory-specialty select option').evaluateAll(options => (options.find(o => /פנימית/.test(o.textContent ?? '')) as HTMLOptionElement).value);
    await page.goto(base + '/departments?specialty=' + internal);
    const metrics = await page.locator('[data-survey-state="published"] dl > div').count(); assert.ok(metrics >= 6);
    assert.deepEqual(errors, []);
    const report = { passed: true, anonymousReadOnly: true, paths, questionnaireCatalogStatus: 404, guestNationalSurveyMetricsPreserved: metrics, scans, errors };
    await writeFile(out + '/live-browser.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
