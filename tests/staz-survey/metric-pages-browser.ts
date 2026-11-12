import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {makeDraft,DRAFT_KEY} from '../../src/lib/career-fit/evidence/draft';
import {medical} from '../../src/lib/career-fit/evidence/model';
const base='http://127.0.0.1:3094',out='docs/staz-survey-mapping-20261112/';
async function main(){
 const fixture=JSON.parse(await readFile('/private/tmp/hitmachut-staz-mapping-private-20261112/browser-fixture.json','utf8'));
 const axe=await readFile('node_modules/axe-core/axe.min.js','utf8');
 const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();page.setDefaultTimeout(45000);
 const errors:string[]=[],scans:unknown[]=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
 const p=Buffer.from(JSON.stringify({userId:'staz-test-admin',role:'admin',exp:Date.now()+3600000})).toString('base64url');
 await context.addCookies([{name:'med_departments_session',value:p+'.'+createHmac('sha256','synthetic-test-secret-'.repeat(3)).update(p).digest('base64url'),url:base}]);
 async function scan(label:string){for(const width of [1440,375]){await page.setViewportSize({width,height:1100});await page.addScriptTag({content:axe});
  const violations=await page.evaluate(async()=>(await (window as any).axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)})));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);scans.push({label,width,violations,overflow});assert.deepEqual(violations,[]);assert.equal(overflow,false);
  await page.screenshot({path:out+label+'-'+width+'.png'});
 }}
 try{
  const toggle=()=>context.request.post(base+'/api/favorites/toggle',{data:{departmentId:fixture.departmentId}});
  if(!(await(await toggle()).json()).isFavorite)await toggle();
  await page.goto(base+'/favorites');await page.locator('.department-card').first().waitFor();await scan('favorites');
  const draft=makeDraft('quick');draft.stage='results';draft.answers=Object.fromEntries(medical.map((q,i)=>[q.id,[3,4,0,3,1,2][Math.floor(i/5)]]));
  await page.evaluate(({key,draft})=>localStorage.setItem(key,JSON.stringify(draft)),{key:DRAFT_KEY,draft});
  await page.goto(base+'/career-fit');const results=page.getByRole('region',{name:'שלושת הכיוונים המובילים'});await results.waitFor();await results.scrollIntoViewIfNeeded();
  const sizes=await results.locator('bdi').evaluateAll(nodes=>nodes.map(n=>parseFloat(getComputedStyle(n).fontSize)));assert.ok(sizes.length&&sizes.every(n=>n<=24));await scan('career-results');
  await page.goto(base+'/career-fit/departments');const selector=page.getByLabel('תחום בקטלוג המחלקות');await selector.waitFor();await page.waitForFunction(()=>document.querySelector('select')?.options.length!>1);
  await selector.selectOption({label:'כירורגיה כללית'});await page.getByRole('group',{name:'מוסד',exact:true}).getByLabel('ערך מועדף').selectOption({index:1});await page.locator('[data-personal-score]').first().waitFor();
  assert.ok((await page.locator('[data-personal-score]').evaluateAll(nodes=>nodes.map(n=>parseFloat(getComputedStyle(n).fontSize)))).every(n=>n<=24));await page.locator('[data-personal-score]').first().scrollIntoViewIfNeeded();await scan('department-fit');
  assert.deepEqual(errors,[]);await writeFile(out+'metric-pages-browser.json',JSON.stringify({passed:true,scans,errors},null,2));console.log('PASS: populated favorites, questionnaire results and department fit metric cards at desktop/mobile widths.');
 }finally{await writeFile(out+'metric-pages-diagnostics.json',JSON.stringify({scans,errors},null,2));await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
