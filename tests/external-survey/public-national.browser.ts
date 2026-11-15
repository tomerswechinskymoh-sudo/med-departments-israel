import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.PUBLIC_METRICS_BASE ?? 'http://localhost:3097';
const live = base !== 'http://localhost:3097', out = 'docs/public-resident-metrics-20261115';
async function main() {
  assert.ok(!live || base === 'https://www.hitmachut.org');
  const browser = await chromium.launch({ channel: 'chrome' }), context = await browser.newContext(), page = await context.newPage();
  const errors: string[] = [], scans: unknown[] = [], samples: unknown[] = [];
  page.setDefaultTimeout(60000); page.on('pageerror', e => errors.push(e.message));
  await context.route('**/*', r => ['GET', 'HEAD'].includes(r.request().method()) && r.request().url().startsWith(base + '/') ? r.continue() : r.abort());
  try {
    await page.goto(base + '/departments');
    const options = await page.locator('.directory-specialty select option').evaluateAll(els => els.map(el => ({ id: (el as HTMLOptionElement).value, label: el.textContent ?? '' })));
    const targets = [options.find(o => /פנימית/.test(o.label)), options.find(o => /^(רפואת )?ילדים$/.test(o.label)), options.find(o => o.label === 'פסיכיאטריה')];
    assert.ok(targets.every(Boolean));
    for (const target of targets) {
      assert.ok(target); await context.clearCookies();
      const response = await page.goto(base + '/departments?specialty=' + target.id);
      assert.equal(response?.status(), 200);
      const panel = page.locator('[data-survey-state="published"]'); await panel.waitFor();
      assert.equal(await page.locator('[data-survey-state="locked"]').count(), 0);
      const cells = await panel.locator('dl > div').allTextContents(); assert.ok(cells.length >= 6);
      assert.ok(cells.every(text => /משיבים/.test(text) && /20\d\d/.test(text)));
      assert.ok((await panel.innerText()).includes('מקור: מתמחים מדברים על תנאים'));
      assert.ok((await panel.innerText()).includes('דיווחים היסטוריים'));
      assert.equal(await panel.locator('blockquote').count(), 0);
      const html = await response!.text(); assert.ok(!html.includes('rawEncrypted')); assert.ok(!html.includes('approvedTip'));
      if (!live) {
        const payload = Buffer.from(JSON.stringify({ userId: 'staz-test-student', role: 'student', exp: Date.now() + 3600000 })).toString('base64url');
        await context.addCookies([{ name: 'med_departments_session', value: payload + '.' + createHmac('sha256', 'synthetic-test-secret-'.repeat(3)).update(payload).digest('base64url'), url: base }]);
        await page.reload(); assert.deepEqual(await panel.locator('dl > div').allTextContents(), cells);
        await context.clearCookies(); await page.reload();
      }
      if (target === targets[0]) for (const width of [1440, 768, 375]) {
        await page.setViewportSize({ width, height: 1000 }); await panel.scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
        const violations = await panel.evaluate(async el => (await (window as any).axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id));
        assert.deepEqual(violations, []); scans.push({ width, violations, overflow: false });
        await panel.screenshot({ path: out + '/' + (live ? 'live' : 'local') + '-' + width + '.png' });
      }
      const href = await page.locator('.department-card').first().getByRole('link', { name: 'לעמוד המחלקה' }).getAttribute('href'); assert.ok(href);
      await page.goto(base + href);
      assert.equal(await page.locator('[data-survey-state="published"]').count(), 0);
      assert.equal(await page.locator('[data-experience-quote]').count(), 0);
      samples.push({ specialty: target.label, specialtyId: target.id, metricCount: cells.length, countAndYearsShown: true, localGuestDetailsLocked: true });
    }
    assert.deepEqual(errors, []);
    const report = { passed: true, live, anonymous: true, samples, scans, guestMatchesVerified: live ? 'Verified on isolated branch' : true, rawRowsAndQuotesAbsent: true, sourceExplanationPreserved: true, errors };
    await writeFile(out + '/' + (live ? 'live-browser' : 'browser') + '.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
