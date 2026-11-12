import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = 'http://127.0.0.1:3094', out = new URL('../../docs/staz-survey-20261112/', import.meta.url).pathname;
const fixture = JSON.parse(await readFile('/private/tmp/hitmachut-staz-private-20261112/browser-fixture.json', 'utf8'));
const axe = await readFile(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const token = (id, role) => { const p = Buffer.from(JSON.stringify({ userId: id, role, exp: Date.now()+3600000 })).toString('base64url'); return p+'.'+createHmac('sha256','synthetic-test-secret-'.repeat(3)).update(p).digest('base64url'); };
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext();
await context.route('**/*', route => route.request().url().startsWith(base+'/') ? route.continue() : route.abort());
const page = await context.newPage(); page.setDefaultTimeout(45000);
const failures = []; page.on('pageerror', e => failures.push(e.message));
const summary = [];
async function account(role) { await context.clearCookies(); if (role) await context.addCookies([{ name: 'med_departments_session', value: token('staz-test-'+(role === 'admin' ? 'admin' : 'student'), role), url: base }]); }
async function scan(label) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await axe.run(document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1);
  summary.push({ label, violations, overflow });
}
try {
  await mkdir(out, { recursive: true });
  for (const role of [null,'student']) {
    await account(role);
    for (const path of ['/api/admin/survey-reviews','/api/admin/survey-reviews/'+fixture.reviewId]) assert.equal((await context.request.get(base+path)).status(),403);
    for (const path of ['/api/admin/survey-reviews/'+fixture.reviewId,'/api/admin/survey-reviews/source']) assert.equal((await context.request.patch(base+path,{headers:{Origin:base},data:{}})).status(),403);
    assert.equal((await context.request.post(base+'/api/admin/survey-reviews/import',{headers:{Origin:base},data:{}})).status(),403);
    await page.goto(base+'/admin/survey-reviews'); assert.ok(!page.url().endsWith('/admin/survey-reviews'));
  }
  await account('admin');
  assert.equal((await context.request.patch(base+'/api/admin/survey-reviews/source',{headers:{Origin:'https://untrusted.example'},data:{}})).status(),403);
  assert.equal((await context.request.patch(base+'/api/admin/survey-reviews/source',{data:{}})).status(),403);
  const response=await context.request.get(base+'/api/admin/survey-reviews');assert.equal(response.status(),200);assert.match(response.headers()['cache-control'],/no-store/);
  const data=await response.json();assert.equal(data.source.isPublicEnabled,false);
  for (const width of [1440,375]) {
    await page.setViewportSize({width,height:1000}); await page.goto(base+'/admin/survey-reviews');
    await page.getByRole('button',{name:'בדוק פריט'}).first().waitFor(); await scan('queue-'+width);
    await page.screenshot({path:out+'admin-'+width+'.png',fullPage:true});
    await page.getByRole('button',{name:'בדוק פריט'}).first().click();
    const dialog=page.getByRole('dialog');await dialog.waitFor();await page.getByText('טקסט המקור — לשימוש פנימי').waitFor();
    assert(await dialog.evaluate(el=>el.contains(document.activeElement)));
    await page.keyboard.press('Shift+Tab');assert(await dialog.evaluate(el=>el.contains(document.activeElement)));
    await scan('detail-'+width);await page.screenshot({path:out+'detail-'+width+'.png',fullPage:false});
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  }
  // Real HTTP decision route, source switches and no-store public query are exercised with synthetic evidence only.
  let row=await (await context.request.get(base+'/api/admin/survey-reviews/'+fixture.reviewId)).json();
  const decision={revision:row.revision,action:'APPROVE',targetDepartmentId:row.targetDepartmentId,mappingConfirmed:true,mappingExceptionReason:row.mappingExceptionReason??'',approvedPublicText:'STAZ_SYNTHETIC_PUBLIC_SENTINEL',publishText:true,publishRatings:true,selectedMetricIds:row.ratings.map(r=>r.id),privacyReviewed:true,adminNotes:'synthetic browser check'};
  let result=await context.request.patch(base+'/api/admin/survey-reviews/'+fixture.reviewId,{headers:{Origin:base},data:decision});assert.equal(result.status(),200);
  const approved=await result.json();assert.equal(approved.status,'APPROVED');
  let source=(await (await context.request.get(base+'/api/admin/survey-reviews')).json()).source;
  const sourceAction=async(action,extra={})=>{const r=await context.request.patch(base+'/api/admin/survey-reviews/source',{headers:{Origin:base},data:{revision:source.revision,action,confirmed:true,...extra}});assert.equal(r.status(),200);source=await r.json();};
  await sourceAction('CONFIRM_PERMISSION',{evidence:'Synthetic browser test permission',authorizedByController:true,permitsTextAndRatings:true});await sourceAction('ENABLE');
  const depPath='/departments/'+encodeURIComponent(fixture.departmentSlug)+'?id='+fixture.departmentId;
  await page.goto(base+depPath);const staz=page.getByRole('button',{name:/סטאז׳רים/});
  if(await staz.count()){await staz.click();await page.getByText('STAZ_SYNTHETIC_PUBLIC_SENTINEL',{exact:true}).waitFor();await page.screenshot({path:out+'public-synthetic.png',fullPage:false});}
  else throw new Error('Target department page unavailable');
  // Hide via the actual single admin button, then request all derived surfaces.
  await page.goto(base+'/admin/survey-reviews');await page.getByRole('button',{name:'הסתר את כל חוויות סקר הסטאז׳ מהאתר'}).waitFor();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'הסתר את כל חוויות סקר הסטאז׳ מהאתר'}).click();await page.getByText('הגדרת המקור נשמרה.').waitFor();
  for (const path of [depPath,'/','/departments','/compare','/api/career-fit/catalog','/sitemap.xml']) {const r=await context.request.get(base+path);assert.ok(!(await r.text()).includes('STAZ_SYNTHETIC_PUBLIC_SENTINEL'),path);}
  await page.goto(base+depPath);assert.equal(await page.getByText('STAZ_SYNTHETIC_PUBLIC_SENTINEL',{exact:true}).count(),0);
  assert.equal(failures.length,0,JSON.stringify(failures));assert.ok(summary.every(r=>!r.overflow&&!r.violations.length),JSON.stringify(summary));
  console.log(JSON.stringify({passed:true,permissions:true,csrf:true,noStore:true,singleButtonHide:true,publicAndDerivedSurfacesClean:true,scans:summary}));
} finally {await writeFile(out+'browser-results.json',JSON.stringify({summary,failures},null,2));await browser.close();}
