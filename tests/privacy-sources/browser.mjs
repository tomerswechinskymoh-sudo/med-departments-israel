import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3109';
if (new URL(base).hostname !== '127.0.0.1') throw new Error('Local test server only');
const output = new URL('../../docs/privacy-sources-20261110/evidence/',import.meta.url).pathname;
await mkdir(output,{recursive:true});
const axe = await readFile(new URL('../../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');
const browser = await chromium.launch({channel:'chrome'});
const summary = [];
function token(userId,role) { const payload=Buffer.from(JSON.stringify({userId,role,exp:Date.now()+3600000})).toString('base64url');return payload+'.'+createHmac('sha256','synthetic-auth-secret-at-least-32-characters').update(payload).digest('base64url'); }
async function account(context,role) {await context.clearCookies();if(role) await context.addCookies([{name:'med_departments_session',value:token(role==='admin'?'test-admin':'test-member',role),url:base}]);}
const context=await browser.newContext({viewport:{width:1440,height:1000}});
// Never transmit fixtures to another origin; fonts/logos can simply remain unavailable in QA.
await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
const page=await context.newPage();
page.setDefaultTimeout(12000);
async function scan(path,role,viewport) {
 await account(context,role);await page.setViewportSize(viewport);const res=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:45000});
 const status=res?.status();assert(status<500,`${path}: ${status}`);
 await page.evaluate(() => document.fonts.ready);
 await page.addScriptTag({content:axe});
 console.log(`Scanning ${path} at ${viewport.width}px (${role??'public'})`);
 const results=await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth, ...(document.documentElement.scrollWidth>innerWidth+1?{elements:Array.from(document.querySelectorAll('main *')).filter(e=>e.getBoundingClientRect().right>innerWidth+1||e.getBoundingClientRect().left < -1).map(e=>({tag:e.tagName,cls:e.className})).slice(0,10)}:{})}));
 summary.push({path,role:role??'public',width:viewport.width,status,overflow,violations:results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
}
try {
 if (!process.env.INTERACTIONS_ONLY) for (const viewport of [{width:1440,height:1000},{width:320,height:800}]) for(const [path,role] of [
  ['/',null],['/departments?specialty=test-specialty',null],['/departments/test-department?id=test-department',null],['/departments/test-department?id=test-department','student'],['/compare?departments=test-department,test-department-two',null],['/compare?departments=test-department,test-department-two','student'],['/career-fit',null],['/career-fit/departments',null],['/faq',null],['/signup',null],['/login',null],['/forgot-password',null],['/reset-password?token=synthetic-invalid',null],['/privacy',null],['/terms',null],['/accessibility',null],['/cookies',null],['/contact',null],['/about',null],['/dashboard','student'],['/favorites','student'],['/admin','admin']]) await scan(path,role,viewport);
 await account(context,null);await page.setViewportSize({width:1440,height:1000});await page.goto(base);await page.keyboard.press('Tab');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement?.id),'main-content');
 await page.goto(base+'/departments?specialty=test-specialty');const opener=page.getByRole('button',{name:'הוספת חוויה',exact:true}).first();await opener.click();const dialog=page.getByRole('dialog',{name:'הוספת חוויה'});await dialog.waitFor();
 assert(await dialog.evaluate(el=>el.contains(document.activeElement)));
 const radios=dialog.getByRole('radio');await radios.first().focus();await page.keyboard.press('ArrowLeft');assert.equal(await dialog.locator('input[type=radio]:checked').count(),1);
 const upload=dialog.getByLabel('העלאת הוכחה לחוויה (רשות)');assert.equal(await upload.getAttribute('type'),'file');assert(await upload.getAttribute('aria-describedby'));assert.equal(await upload.getAttribute('required'),null);
 await dialog.getByRole('button',{name:'המשך',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'ספרו על החוויה בקצרה');assert.equal(await dialog.locator('[aria-current=step]').count(),1);
 await dialog.getByRole('button',{name:'חזרה',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'מאיפה נקודת המבט שלך?');
 await dialog.getByRole('button',{name:'סגירה',exact:true}).focus();await page.keyboard.press('Shift+Tab');assert(await dialog.evaluate(el=>el.contains(document.activeElement)));await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert(await opener.evaluate(el=>el===document.activeElement));
 await opener.click();await dialog.waitFor();await page.setViewportSize({width:320,height:800});await page.screenshot({path:output+'experience-320.png',fullPage:false});await page.addScriptTag({content:axe});const modalAxe=await page.evaluate(async()=>axe.run(document.querySelector('[role=dialog]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));summary.push({path:'experience-modal',width:320,violations:modalAxe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});await page.keyboard.press('Escape');
 // Text enlargement supplements 320px reflow; this is not a physical-device or screen-reader test.
 await page.setViewportSize({width:1280,height:900});await page.goto(base+'/privacy');await page.addStyleTag({content:'html { font-size: 200% !important; }'});await page.screenshot({path:output+'privacy-text-200.png',fullPage:false});summary.push({path:'privacy-text-200',overflow:await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}))});
 await page.goto(base+'/faq');await page.waitForLoadState('load');const faq=page.locator('details').first();const wasOpen=await faq.evaluate(el=>el.open);await faq.locator('summary').focus();await page.keyboard.press('Enter');await page.waitForFunction(previous=>document.querySelector('details')?.open!==previous,wasOpen);
 await page.goto(base+'/career-fit');await page.waitForLoadState('load');await page.getByRole('checkbox',{name:/קראתי והבנתי/}).check();await page.getByRole('button',{name:/התחילו את שאלון ההתאמה/}).click();
 const answer=page.getByRole('radio').first();await answer.focus();await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('input[type=radio]:checked').count(),1);
 const questionBefore=await page.locator('h2[tabindex="-1"]').textContent();await page.getByRole('button',{name:'המשך',exact:true}).click();await page.waitForFunction(previous=>document.activeElement?.tagName==='H2' && document.activeElement?.textContent!==previous,questionBefore);
 await account(context,'student');await page.goto(base+'/departments/test-department?id=test-department');const info=page.getByRole('button',{name:/מידע ומקור: .*מתמחים/}).first();await info.focus();await page.keyboard.press('Enter');assert.equal(await info.getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await info.getAttribute('aria-expanded'),'false');assert(await info.evaluate(el=>el===document.activeElement));
 await page.goto(base+'/dashboard');const preference=page.getByRole('checkbox',{name:/אני מעוניין/});await preference.focus();await page.keyboard.press('Space');await page.getByRole('status').filter({hasText:'העדפת הדיוור נשמרה'}).waitFor();const selected=await preference.isChecked();
 await page.route('**/api/account/marketing-consent',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));await preference.click();await page.getByRole('status').filter({hasText:'השמירה נכשלה'}).waitFor();assert.equal(await preference.isChecked(),selected);await page.unroute('**/api/account/marketing-consent');
 for(const [path,role] of [['/',null],['/departments?specialty=test-specialty',null],['/departments/test-department?id=test-department','student'],['/compare?departments=test-department,test-department-two','student'],['/signup',null],['/admin','admin']]) {
  await account(context,role);await page.goto(base+path);await page.addStyleTag({content:'html { font-size: 200% !important; }'});summary.push({path:path+' text-200',overflow:await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}))});
 }
 // Admin authority and each independent switch through the real HTTP route.
 for (const role of [null,'student']) {await account(context,role);const r=await context.request.patch(base+'/api/admin/source-visibility',{data:{source:'ima',enabled:false}});assert.equal(r.status(),403);}
 await account(context,'admin');
 for(const ima of [true,false]) for(const duns100 of [true,false]) {
  for(const [source,enabled] of [['ima',ima],['duns100',duns100]]) {const r=await context.request.patch(base+'/api/admin/source-visibility',{data:{source,enabled}});assert.equal(r.status(),200);}
  await account(context,'student');
  for(const path of ['/','/departments?specialty=test-specialty','/departments/test-department?id=test-department','/compare?departments=test-department,test-department-two','/api/career-fit/catalog','/favorites']) {
   const r=await context.request.get(base+path);assert.equal(r.status(),200);const body=await r.text();
   if(!ima) {assert(!body.includes('IMA_PRIVATE_SENTINEL'),path);assert(!body.includes('87.654321'),path);assert(!body.includes('45678.1234'),path);}
   if(!duns100) assert(!body.includes('9876.54321'),path);
  }
  const legacy=await context.request.get(base+'/career-fit/departments');const html=await legacy.text();if(!ima) assert(!html.includes('תיאור בחינת ההתמחות כולל אבחון תכשירים'));
  await account(context,'admin');
 }
 for(const source of ['ima','duns100']) await context.request.patch(base+'/api/admin/source-visibility',{data:{source,enabled:true}});
 await page.goto(base+'/admin');const toggle=page.getByRole('switch',{name:/הצגת נתוני הר״י/});await toggle.focus();await page.keyboard.press('Space');await page.getByRole('status').filter({hasText:'ההגדרה נשמרה'}).waitFor();assert.equal(await toggle.getAttribute('aria-checked'),'false');await toggle.click();await page.getByRole('switch',{name:/הצגת נתוני הר״י/,checked:true}).waitFor();
 await page.route('**/api/admin/source-visibility',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));await toggle.click();await page.getByRole('status').filter({hasText:'העדכון לא אושר'}).waitFor();assert.equal(await toggle.getAttribute('aria-checked'),'true');await page.unroute('**/api/admin/source-visibility');
 summary.push({checks:'keyboard, dialog, source matrix, permissions, HTML/hydration, restoration',passed:true});
} finally {await writeFile(output+(process.env.INTERACTIONS_ONLY?'interaction-results.json':'browser-results.json'),JSON.stringify(summary,null,2));await browser.close();}
assert.equal(summary.filter(x=>x.violations?.length).length,0,'axe violations');assert.equal(summary.filter(x=>x.overflow&&x.overflow.scroll>x.overflow.width+1).length,0,'unexpected page overflow');
console.log(JSON.stringify({scans:summary.length,violations:summary.filter(x=>x.violations?.length).map(x=>({path:x.path,width:x.width,ids:x.violations.map(v=>v.id)})),overflow:summary.filter(x=>x.overflow&&x.overflow.scroll>x.overflow.width+1).map(x=>({path:x.path,...x.overflow}))},null,2));
