import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base='http://127.0.0.1:3097',out='docs/staz-survey-automation-20261113',p='/private/tmp/hitmachut-staz-audit-private-20261112';
const fixture=JSON.parse(await readFile(p+'/auto-browser-fixture.json','utf8')),axe=await readFile('node_modules/axe-core/axe.min.js','utf8');
const token=role=>{const body=Buffer.from(JSON.stringify({userId:'staz-test-'+role,role,exp:Date.now()+3600000})).toString('base64url');return body+'.'+createHmac('sha256','synthetic-test-secret-'.repeat(3)).update(body).digest('base64url');};
const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();page.setDefaultTimeout(45000);
await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
const errors=[],scans=[],mutations=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{errors.push('Unexpected extra confirmation');await d.dismiss();});
page.on('request',r=>{if(r.method()==='PATCH')mutations.push(r.postDataJSON());});
const queue=async()=>{const r=await context.request.get(base+'/api/admin/survey-reviews');assert.equal(r.status(),200);return r.json();};
try{
 for(const role of [null,'student']){await context.clearCookies();if(role)await context.addCookies([{name:'med_departments_session',value:token(role),url:base}]);assert.equal((await context.request.get(base+'/api/admin/survey-reviews')).status(),403);assert.equal((await context.request.patch(base+'/api/admin/survey-reviews/source',{headers:{Origin:base},data:{action:'ENABLE',confirmed:true,revision:0}})).status(),403);}
 await context.clearCookies();await context.addCookies([{name:'med_departments_session',value:token('admin'),url:base}]);
 assert.equal((await context.request.patch(base+'/api/admin/survey-reviews/source',{headers:{Origin:'https://invalid.example'},data:{}})).status(),403);
 const initial=await queue();assert.ok(initial.rows.length);assert.ok(initial.rows.every(r=>r.automationCategory==='UNCERTAIN'&&!r.publishText&&r.sourceColumnLetter!=='BG'));assert.equal(initial.source.isPublicEnabled,false);
 await page.goto(base+'/admin/survey-reviews');await page.getByRole('button',{name:/החזרת כל התגובות והציונים המאושרים/}).click();await page.getByRole('button',{name:'הסתרת כל התגובות והציונים',exact:true}).waitFor();
 let current=await queue();assert.equal(current.source.isPublicEnabled,true);const visibleCount=current.counts.displayed;assert.ok(visibleCount>0);
 await page.getByRole('button',{name:'הסתרת כל התגובות והציונים',exact:true}).click();await page.getByRole('button',{name:'החזרת כל התגובות והציונים המאושרים',exact:true}).waitFor();current=await queue();assert.equal(current.counts.displayed,0);assert.equal(current.counts.APPROVED,initial.counts.APPROVED);
 await page.getByRole('button',{name:'החזרת כל התגובות והציונים המאושרים',exact:true}).click();await page.getByRole('button',{name:'הסתרת כל התגובות והציונים',exact:true}).waitFor();current=await queue();assert.equal(current.counts.displayed,visibleCount);assert.equal(mutations.length,3);
 await page.getByText('חיפוש וסינון התגובות',{exact:true}).click();await page.getByPlaceholder('טקסט לחיפוש').fill(fixture.search);await page.getByRole('button',{name:'חפש',exact:true}).click();
 const card=page.locator(`[data-review-id="${fixture.reviewId}"]`);await card.waitFor();assert.equal(await page.locator('[data-review-id]').count(),1);
 for(const width of [1440,375]){await page.setViewportSize({width,height:1100});await page.evaluate(()=>scrollTo(0,0));await page.addScriptTag({content:axe});const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})));const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);scans.push({width,violations,overflow});await page.screenshot({path:`${out}/queue-${width}.png`});}
 const before=await (await context.request.get(base+'/api/admin/survey-reviews/'+fixture.reviewId)).json();assert.equal(before.publishRatings,true);
 await card.getByRole('button',{name:'לא לפרסם את הטקסט',exact:true}).click();await card.waitFor({state:'detached'});
 const after=await (await context.request.get(base+'/api/admin/survey-reviews/'+fixture.reviewId)).json();assert.equal(after.publishText,false);assert.equal(after.publishRatings,true);assert.equal(after.automationCategory,'MANUAL');assert.deepEqual(after.ratings,before.ratings);
 assert.equal(mutations.length,4);assert.deepEqual(errors,[]);assert.ok(scans.every(s=>!s.overflow&&!s.violations.length),JSON.stringify(scans));
 const report={passed:true,defaultOnlyUncertain:true,anonymousAndStudentDenied:true,foreignOriginDenied:true,oneRequestPerToggle:true,noConfirmationDialog:true,hideAndRestorePreserveApprovals:true,manualSkipPreservesRating:true,desktopAndMobile:scans};await writeFile(out+'/browser-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
