import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base='http://127.0.0.1:3096', out='docs/staz-survey-repair-20261112';
const browser=await chromium.launch({channel:'chrome'}), context=await browser.newContext({viewport:{width:1440,height:1100}});
await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
const actors=JSON.parse(await readFile(process.env.STAZ_REPAIR_PRIVATE_DIR+'/browser-actors.json','utf8'));
const token=role=>{const p=Buffer.from(JSON.stringify({userId:actors[role],role,exp:Date.now()+3600000})).toString('base64url');return p+'.'+createHmac('sha256','synthetic-test-secret-'.repeat(3)).update(p).digest('base64url');};
const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[],scans=[];
page.on('pageerror',e=>errors.push(e.message));
try {
  assert.equal((await context.request.get(base+'/api/admin/survey-reviews')).status(),403);
  await context.addCookies([{name:'med_departments_session',value:token('student'),url:base}]);
  assert.equal((await context.request.get(base+'/api/admin/survey-reviews')).status(),403);
  await context.addCookies([{name:'med_departments_session',value:token('admin'),url:base}]);
  const response=await context.request.get(base+'/api/admin/survey-reviews?q='+encodeURIComponent('מטופלות המאושפזות'));
  assert.equal(response.status(),200);const q=await response.json();const r=q.rows.find(r=>r.sourceReviewKey.endsWith(':R84:CBP'));assert.ok(r);
  assert.equal(q.source.isPublicEnabled,false);assert.equal(r.originalHospital,'איכילוב - סוראסקי');assert.equal(r.ratings[0].sourceColumn,'BK');assert.equal(r.ratings[0].normalizedValue,5);assert.ok(r.electiveCorrection);
  // Restrict the visible queue to this already user-provided example. Other real
  // respondent text must not enter browser screenshots or diagnostics.
  await page.route('**/api/admin/survey-reviews?*',async route=>{
    const res=await context.request.get(base+'/api/admin/survey-reviews?q='+encodeURIComponent('מטופלות המאושפזות'));
    const body=await res.json();body.rows=body.rows.filter(x=>x.id===r.id);body.total=1;body.nextCursor=null;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(base+'/admin/survey-reviews');const card=page.locator(`[data-review-id="${r.id}"]`);await card.waitFor();
  await card.getByText(/שיוך האלקטיב תוקן/).waitFor();await card.getByRole('button',{name:'מקור ואפשרויות נוספות'}).click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();await dialog.getByText('שני האלקטיבים בשורת המקור',{exact:true}).click();
  await dialog.getByText('אלקטיב 1 · נבחר בתיקון',{exact:true}).waitFor();
  assert.ok((await dialog.textContent()).includes('רבין בילינסון'));
  const axe=await readFile('node_modules/axe-core/axe.min.js','utf8');
  for(const width of [1440,375]){
    await page.setViewportSize({width,height:1100});await page.addScriptTag({content:axe});
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('[role=dialog]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact})));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    scans.push({width,violations,overflow});
  }
  assert.deepEqual(errors,[]);assert.ok(scans.every(s=>!s.overflow&&s.violations.length===0));
  await writeFile(out+'/browser-checks.json',JSON.stringify({passed:true,adminOnly:true,sourceHidden:true,correctedHospitalAndRating:true,bothElectivesVisible:true,scans,errors},null,2)+'\n');
  console.log(JSON.stringify({passed:true,scans,errors}));
} finally {await browser.close();}
