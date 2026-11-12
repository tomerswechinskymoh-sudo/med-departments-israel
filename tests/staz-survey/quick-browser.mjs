import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = 'http://127.0.0.1:3094';
const out = new URL('../../docs/staz-survey-ux-20261112/', import.meta.url).pathname;
const fixture = JSON.parse(await readFile('/private/tmp/hitmachut-staz-ux-private-20261112/browser-fixture.json', 'utf8'));
const axe = await readFile(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const token = role => { const p = Buffer.from(JSON.stringify({ userId: 'staz-test-'+role, role, exp: Date.now()+3600000 })).toString('base64url'); return p+'.'+createHmac('sha256','synthetic-test-secret-'.repeat(3)).update(p).digest('base64url'); };
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await context.route('**/*', route => route.request().url().startsWith(base+'/') ? route.continue() : route.abort());
const page = await context.newPage(); page.setDefaultTimeout(45000);
const errors = [], scans = [], patches = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', async d => { errors.push('Unexpected confirmation dialog: '+d.type()); await d.dismiss(); });
page.on('request', r => { if (r.method()==='PATCH' && r.url().endsWith('/'+fixture.reviewId)) patches.push(r.postDataJSON()); });
const getRow = async id => (await context.request.get(base+'/api/admin/survey-reviews/'+id)).json();
async function scan(label) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await axe.run(document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n=>n.target) })));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1);
  scans.push({ label, violations, overflow });
}
try {
  await mkdir(out, { recursive: true });
  for (const role of [null, 'student']) {
    await context.clearCookies();
    if (role) await context.addCookies([{ name: 'med_departments_session', value: token(role), url: base }]);
    assert.equal((await context.request.get(base+'/api/admin/survey-reviews')).status(), 403);
    assert.equal((await context.request.patch(base+'/api/admin/survey-reviews/'+fixture.reviewId, { headers: { Origin: base }, data: { component: 'TEXT', action: 'PUBLISH' } })).status(), 403);
  }
  await context.clearCookies(); await context.addCookies([{ name: 'med_departments_session', value: token('admin'), url: base }]);
  assert.equal((await context.request.patch(base+'/api/admin/survey-reviews/'+fixture.reviewId, { headers: { Origin: 'https://invalid.example' }, data: {} })).status(), 403);
  await page.goto(base+'/admin/survey-reviews');
  await page.getByText('חיפוש וסינון התגובות', { exact: true }).click();
  await page.getByLabel('שאלת מקור', { exact: true }).selectOption(fixture.question);
  await page.locator(`[data-review-id="${fixture.reviewId}"]`).waitFor();
  await page.getByLabel('סטטוס', { exact: true }).selectOption('PENDING_REVIEW');
  await page.waitForResponse(r => r.url().includes('/api/admin/survey-reviews?') && r.url().includes('PENDING_REVIEW') && r.status() === 200);
  await page.getByText('חיפוש וסינון התגובות', { exact: true }).click();
  const card = page.locator(`[data-review-id="${fixture.reviewId}"]`);
  await card.getByText(/^(המחלקה המוצעת|מחלקה שנבחרה)$/).waitFor();
  assert.equal(await card.getByRole('button', { name: 'פרסום תגובה', exact: true }).isEnabled(), true);
  assert.equal(await page.getByRole('dialog').count(), 0);
  const before = await getRow(fixture.rowIds[1]);
  await card.getByRole('button', { name: 'פרסום תגובה', exact: true }).click();
  await card.getByRole('button', { name: 'התגובה אושרה ✓', exact: true }).waitFor();
  let row = await getRow(fixture.reviewId); assert.equal(row.status, 'APPROVED'); assert.equal(row.publishText, true); assert.equal(row.publishRatings, false);
  assert.equal(patches.length, 1);
  await card.getByRole('button', { name: 'פרסום ציון המלצה', exact: true }).click();
  await card.getByRole('button', { name: 'הציון אושר ✓', exact: true }).waitFor();
  row = await getRow(fixture.reviewId); assert.equal(row.publishText, true); assert.equal(row.publishRatings, true); assert.equal(patches.length, 2);
  assert.equal((await getRow(fixture.rowIds[1])).revision, before.revision);
  assert.equal(await page.getByRole('dialog').count(), 0);
  const queue = await (await context.request.get(base+'/api/admin/survey-reviews?question='+encodeURIComponent(fixture.question))).json();
  assert.equal(queue.source.isPublicEnabled, false); assert.equal(queue.source.permissionConfirmedAt, null);
  // The approved first card stays available for its second action; cursor pagination does not skip the next pending row.
  await page.getByRole('button', { name: 'טעינת תגובות נוספות', exact: true }).scrollIntoViewIfNeeded();
  await page.locator(`[data-review-id="${fixture.rowIds.at(-1)}"]`).waitFor();
  const ids = await page.locator('[data-review-id]').evaluateAll(nodes => nodes.map(n=>n.dataset.reviewId));
  assert.equal(ids.length,25); assert.equal(new Set(ids).size,25); assert.ok(fixture.rowIds.every(id=>ids.includes(id)));
  await page.evaluate(()=>scrollTo(0,0));
  for (const width of [1440,375]) {
    await page.setViewportSize({ width, height: 1100 }); await page.evaluate(()=>scrollTo(0,0));
    await scan('inline-queue-'+width); await page.screenshot({ path: out+'queue-'+width+'.png' });
    await card.screenshot({ path: out+'card-'+width+'.png' });
    await card.getByRole('button', { name: 'מקור ואפשרויות נוספות', exact: true }).click();
    const dialog = page.getByRole('dialog'); await dialog.waitFor();
    assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));
    await scan('advanced-editor-'+width);
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
  }
  // Each removal is also independent and does not require opening the advanced editor.
  await card.getByRole('button',{name:'ביטול אישור התגובה',exact:true}).click();
  await card.getByRole('button',{name:'פרסום תגובה',exact:true}).waitFor();
  row=await getRow(fixture.reviewId);assert.equal(row.publishText,false);assert.equal(row.publishRatings,true);
  await card.getByRole('button',{name:'ביטול אישור הציון',exact:true}).click();
  await card.getByRole('button',{name:'פרסום ציון המלצה',exact:true}).waitFor();
  row=await getRow(fixture.reviewId);assert.equal(row.publishText,false);assert.equal(row.publishRatings,false);
  await page.goto(base+'/admin');
  const entry=page.getByRole('link',{name:'ניהול תגובות סקר הסטאז׳'});await entry.waitFor();
  assert.ok((await entry.boundingBox()).height >=44);assert.ok(['flex','inline-flex'].includes(await entry.evaluate(el=>getComputedStyle(el).display)));
  await entry.screenshot({path:out+'admin-entry.png'});
  assert.deepEqual(errors,[]);assert.ok(scans.every(s=>!s.overflow&&!s.violations.length),JSON.stringify(scans));
  await writeFile(out+'browser-results.json',JSON.stringify({passed:true,syntheticOnly:true,oneClickPerComponent:true,noConfirmDialog:true,keepsCardInPlace:true,cursorNoSkippedRows:true,sourceRemainedOff:true,independentRemoval:true,adminEntry:true,scans},null,2));
  console.log('PASS: one-click components, stable cursor queue, isolated source off, admin entry, 4 accessibility scans.');
} finally { await writeFile(out+'browser-diagnostics.json',JSON.stringify({errors,scans},null,2));await browser.close(); }
