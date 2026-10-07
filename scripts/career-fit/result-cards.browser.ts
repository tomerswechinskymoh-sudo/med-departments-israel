import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {makeDraft,DRAFT_KEY} from '../../src/lib/career-fit/evidence/draft';
import {medical,RIASEC} from '../../src/lib/career-fit/evidence/model';
import {rankSpecialties} from '../../src/lib/career-fit/evidence/scoring';
const out='/Users/tomerswechinsky/Documents/CODEX/artifacts/hitmachut-medical-first/result-cards';
mkdirSync(out,{recursive:true});
async function main(){
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const receipts=[];
 try{for(const [name,width,height] of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844]] as const){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage(),errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  const draft={...makeDraft('quick'),stage:'results' as const,answers:Object.fromEntries(medical.map(i=>[i.id,[3,4,0,3,1,2][RIASEC.indexOf(i.dimension!)]]))};
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:DRAFT_KEY,value:JSON.stringify(draft)});
  await page.goto('http://127.0.0.1:3112/career-fit');const cards=page.locator('article[id^="occupation-"]');await cards.first().waitFor();
  const ranked=rankSpecialties('quick',draft.answers).ranked;assert.equal(await cards.count(),17);
  assert.deepEqual(await cards.evaluateAll(xs=>xs.map(x=>x.id)),ranked.map(r=>'occupation-'+r.specialty.code));
  for(let i=0;i<17;i++){const card=cards.nth(i);assert(await card.getByRole('heading',{name:ranked[i].specialty.specialty,exact:true}).isVisible());assert(await card.getByText(`${ranked[i].displayIndex}/100`,{exact:true}).isVisible());assert.equal(await card.locator('[data-fit-explanation]').getAttribute('open'),null);}
  const exampleIndex=ranked.findIndex(r=>r.dimensions.some(d=>d.contribution< -1e-12));assert(exampleIndex>=0);const first=cards.nth(exampleIndex),toggle=first.locator('[data-fit-explanation] > summary');
  await toggle.focus();await page.keyboard.press('Enter');assert(await first.getByRole('heading',{name:'כדאי לקחת בחשבון',exact:true}).isVisible());assert(!(await first.locator('table').isVisible()));
  assert(!(await first.getByText('מתאם פירסון (Pearson correlation):',{exact:false}).isVisible()));
  await first.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${name}-explanation.png`,fullPage:false});
  const calculation=first.locator('[data-fit-calculation] > summary');await calculation.focus();await page.keyboard.press('Enter');assert(await first.locator('table').isVisible());assert.equal(await first.locator('tbody tr').count(),6);assert(await first.getByText('מתאם פירסון (Pearson correlation):',{exact:false}).isVisible());
  await first.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${name}-calculation.png`,fullPage:false});
  await calculation.click();assert(!(await first.locator('table').isVisible()));assert(await first.getByRole('heading',{name:'כדאי לקחת בחשבון',exact:true}).isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  receipts.push({viewport:name,ranked:17,unchangedScores:true,nestedDisclosure:true,keyboard:true,rtl:await page.locator('html').getAttribute('dir'),overflow:false});await context.close();
 }}finally{await browser.close();}
 writeFileSync(out+'/receipt.json',JSON.stringify(receipts,null,2));console.log(JSON.stringify(receipts,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
