import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
const db=new PrismaClient({log:[]}),base='http://localhost:3097',out='docs/resident-survey-local-20261114';
async function main(){
 assert.ok(process.env.RESIDENT_TEST_HOST?.startsWith('ep-icy-meadow-'));
 const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext(),page=await context.newPage(),errors:string[]=[],scans:unknown[]=[],profiles:unknown[]=[];
 page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 const payload=Buffer.from(JSON.stringify({userId:'staz-test-student',role:'student',exp:Date.now()+3600000})).toString('base64url');
 const cookie={name:'med_departments_session',value:payload+'.'+createHmac('sha256','synthetic-test-secret-'.repeat(3)).update(payload).digest('base64url'),url:base};
 const sourceId='resident-conditions-survey-2024';
 try{
  for(const [slug,match] of [['internal-medicine','רמב'],['pediatrics','מעיני'],['psychiatry','שיבא']].filter(([slug])=>!process.env.SURVEY_BROWSER_SAMPLE||slug===process.env.SURVEY_BROWSER_SAMPLE)){
   const specialty=await db.specialty.findUniqueOrThrow({where:{slug}});
   await context.addCookies([cookie]);await page.goto(base+'/departments?specialty='+specialty.id);
   const national=page.locator('[data-survey-state="published"]');await national.waitFor();
   assert.equal(await national.locator('blockquote').count(),0);
   assert.equal(await national.locator('details').count(),0);
   const expectedNational=await db.externalSurveyAggregate.count({where:{sourceId,specialtyId:specialty.id,institutionId:null,status:'PUBLISHED'}});
   assert.equal(await national.locator('dl > div').count(),expectedNational);
   const card=page.locator('.department-card').filter({hasText:match}).first();await card.waitFor();
   const href=await card.getByRole('link',{name:'לעמוד המחלקה'}).getAttribute('href');assert.ok(href);
   const countText=await card.getByRole('link',{name:/חוויות מאושרות/}).innerText();
   await context.clearCookies();const response=await page.goto(base+'/departments?specialty='+specialty.id);const html=await response!.text();
   assert.equal(await page.locator('.department-card').filter({hasText:match}).first().getByRole('link',{name:/חוויות מאושרות/}).innerText(),countText);
   assert.equal(await page.locator('[data-survey-state="published"]').count(),0);
   assert.ok(!html.includes('rawEncrypted'));
   await context.addCookies([cookie]);await page.goto(base+href);
   const tabs=page.locator('#department-experiences').locator('..');
   await tabs.getByRole('button',{name:/מתמחים ורופאים/}).click();
   const panel=tabs.locator('[data-survey-state="published"]');await panel.waitFor();
   assert.equal(await page.locator('[data-survey-state="published"]').count(),1);
   assert.ok((await panel.innerText()).includes('2024'));assert.ok(!(await panel.innerText()).includes('כלל הארץ'));assert.ok((await panel.innerText()).includes(match));assert.equal(await panel.locator('details').count(),0);
   const quotes=tabs.locator('[data-experience-quote]');assert.equal(await quotes.count(),1);
   const seen=new Set<string>();const count=Number((await tabs.locator('.experience-carousel-position').innerText()).split('מתוך')[1].trim());
   for(let i=0;i<count;i++){
    const id=await quotes.getAttribute('data-experience-quote');
    if(id?.startsWith('resident-survey:')){
     const original=await db.externalSurveyResponse.findUniqueOrThrow({where:{id:id.slice('resident-survey:'.length)}});
     assert.equal(await quotes.locator('blockquote').textContent(),original.approvedTip);
     assert.ok((await quotes.innerText()).includes(String(original.reportYear)));
     seen.add(original.id);
    }
    if(count>1)await tabs.getByRole('button',{name:'התגובה הבאה'}).click();
   }
   assert.ok(seen.size>0);assert.ok(!await tabs.locator('.experience-recommendation-summary').count());
   await tabs.getByRole('combobox',{name:'סינון לפי דירוג'}).selectOption('5');assert.equal(await quotes.count(),0);
   await tabs.getByRole('combobox',{name:'סינון לפי דירוג'}).selectOption('unrated');assert.equal(await quotes.count(),1);
   const carousel=tabs.getByRole('region',{name:'תגובות מהמחלקה'});await carousel.focus();await page.keyboard.press('End');await page.keyboard.press('Home');
   if(slug==='pediatrics')for(const width of [1440,768,375]){
    await page.setViewportSize({width,height:1000});await panel.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    const tiles=await panel.locator('dl > div').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));assert.ok(tiles.every(h=>h<185));
    await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
    const violations=await tabs.evaluate(async el=>(await (window as any).axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map((v:any)=>v.id));assert.deepEqual(violations,[]);
    await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
    await tabs.screenshot({path:out+'/local-'+width+'.png'});scans.push({width,tiles,violations,overflow:false});
   }
   profiles.push({specialty:slug,href,countText,residentQuotes:seen.size,oneQuoteAtATime:true,guestCountsMatch:true,onlyLocalMetrics:true});
  }
  assert.deepEqual(errors,[]);const report={passed:true,profiles,scans,errors,exactTextAndYearVerified:true,noFabricatedOverallScores:true};await writeFile(out+(process.env.SURVEY_BROWSER_SAMPLE?'/compact-checks.json':'/browser-checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e?.name?.startsWith('Prisma')?{name:e.name,code:e.code}:e);process.exitCode=1}).finally(()=>db.$disconnect());
