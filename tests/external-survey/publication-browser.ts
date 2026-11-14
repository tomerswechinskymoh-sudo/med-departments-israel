import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ log: [] }), base = 'http://localhost:3097', out = 'docs/resident-survey-publication-20261114';
async function main() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.RESIDENT_TEST_HOST);
  assert.ok(process.env.RESIDENT_TEST_HOST?.startsWith('ep-icy-meadow-'));
  const specialty = await db.specialty.findUniqueOrThrow({ where: { slug: 'internal-medicine' } });
  const expected = await db.externalSurveyResponse.findMany({ where: { sourceId: 'resident-conditions-survey-2024', specialtyId: specialty.id, status: 'PUBLISHED', tipStatus: 'APPROVED' } });
  assert.equal(expected.length, 4);
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext(), page = await context.newPage(), errors: string[] = [], scans: unknown[] = [];
  page.setDefaultTimeout(60000);
  page.on('pageerror', e => errors.push(e.message));
  await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
  const payload = Buffer.from(JSON.stringify({ userId: 'staz-test-student', role: 'student', exp: Date.now() + 3600000 })).toString('base64url');
  await context.addCookies([{ name: 'med_departments_session', value: payload + '.' + createHmac('sha256', 'synthetic-test-secret-'.repeat(3)).update(payload).digest('base64url'), url: base }]);
  try {
    await page.goto(base + '/departments?specialty=' + specialty.id);
    const panel = page.locator('[data-survey-state="published"]');
    await panel.waitFor().catch(async error => { console.log(JSON.stringify({url:page.url(),states:await page.locator('[data-survey-state]').evaluateAll(els=>els.map(el=>el.getAttribute('data-survey-state'))),heading:await page.locator('h1').allTextContents()})); throw error; });
    assert.equal(await panel.locator('dl > div').count(), 7);
    assert.ok((await panel.innerText()).includes('22,000'));
    const carousel = panel.getByRole('region', { name: 'חוויות בתחום ההתמחות' });
    assert.equal(await carousel.locator('blockquote').count(), 1);
    const seen = new Set<string>();
    for (let i = 0; i < expected.length; i++) {
      const text = await carousel.locator('blockquote').textContent();
      assert.ok(expected.some(t => t.approvedTip === text)); seen.add(text!);
      assert.ok((await carousel.innerText()).includes('2024'));
      await carousel.getByRole('button', { name: 'התגובה הבאה' }).click();
    }
    assert.equal(seen.size, expected.length);
    const first = await carousel.locator('blockquote').textContent();
    await carousel.focus(); await page.keyboard.press('ArrowLeft');
    assert.notEqual(await carousel.locator('blockquote').textContent(), first);
    await page.keyboard.press('Home'); assert.equal(await carousel.locator('blockquote').textContent(), first);
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 1000 }); await panel.scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const tiles = await panel.locator('dl > div').evaluateAll(els => els.map(el => el.getBoundingClientRect().height));
      assert.ok(tiles.every(height => height < 185));
      await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
      const violations = await panel.evaluate(async el => (await (window as any).axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id));
      assert.deepEqual(violations, []); scans.push({ width, tiles, violations, overflow: false });
      await panel.screenshot({ path: out + '/survey-' + width + '.png' });
    }
    const departmentHref = await page.locator('.department-card').filter({ hasText: 'רמב' }).getByRole('link', { name: 'לעמוד המחלקה' }).getAttribute('href');
    assert.ok(departmentHref?.startsWith('/departments/'));
    await page.goto(base + departmentHref);
    await panel.waitFor().catch(async error => { console.log(JSON.stringify({departmentUrl:page.url(),heading:await page.locator('h1').allTextContents()}));throw error; }); assert.ok((await panel.innerText()).includes('אינם ביקורת על מחלקה זו'));
    await context.clearCookies();
    const response = await page.goto(base + '/departments?specialty=' + specialty.id);
    const html = await response!.text();
    assert.equal(await page.locator('[data-survey-state="published"]').count(), 0);
    assert.equal(await page.locator('[data-survey-state="locked"]').count(), 1);
    for (const tip of expected) assert.ok(!html.includes(tip.approvedTip!));
    assert.ok(!html.includes('rawEncrypted')); assert.ok(!html.includes('salaryGross'));
    assert.deepEqual(errors, []);
    const report = { passed: true, verifiedViewerMetrics: 7, exactQuotesNavigated: seen.size, departmentContextVerified: true, guestProtectedHtmlVerified: true, keyboardNavigationPassed: true, scans, errors };
    await writeFile(out + '/browser-checks.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e?.name?.startsWith('Prisma') ? { name: e.name, code: e.code } : e); process.exitCode = 1; }).finally(() => db.$disconnect());
