import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
const base='http://localhost:3097',out='docs/resident-survey-local-20261114';
async function main(){
 const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext(),page=await context.newPage(),errors:string[]=[],scans:unknown[]=[];
 page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 try{
  await page.goto(base+'/signup');const role=page.getByRole('combobox',{name:'סטטוס מקצועי'});
  await role.selectOption('post_intern');assert.equal(await page.getByRole('combobox',{name:'בית החולים שבו עשית סטאז׳'}).count(),1);assert.equal(await page.getByRole('combobox',{name:'מחלקה נוכחית או אחרונה'}).count(),0);
  await role.selectOption('specialist');const workplace=page.getByRole('combobox',{name:'מסגרת העבודה'});await workplace.selectOption('community');
  assert.equal(await page.getByRole('combobox',{name:'בית חולים נוכחי או אחרון'}).count(),0);assert.equal(await page.getByRole('combobox',{name:'מחלקה נוכחית או אחרונה'}).count(),0);
  const clinic=page.getByRole('textbox',{name:'קופה או מרפאה בקהילה (רשות)'});await clinic.fill('מרפאה לדוגמה');
  await workplace.selectOption('both');assert.equal(await page.getByRole('combobox',{name:'בית חולים נוכחי או אחרון'}).count(),1);assert.equal(await page.getByRole('combobox',{name:'מחלקה נוכחית או אחרונה'}).count(),1);assert.equal(await clinic.inputValue(),'מרפאה לדוגמה');
  for(const width of [1440,375]){
   await page.setViewportSize({width,height:1000});await workplace.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.addScriptTag({content:await readFile('node_modules/axe-core/axe.min.js','utf8')});
   const violations=await workplace.locator('..').locator('..').evaluate(async el=>(await (window as any).axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map((v:any)=>v.id));assert.deepEqual(violations,[]);scans.push({width,violations,overflow:false});await page.screenshot({path:out+'/signup-'+width+'.png'});
  }
  await workplace.selectOption('hospital');assert.equal(await clinic.count(),0);await role.selectOption('resident');assert.equal(await workplace.count(),0);assert.equal(await page.getByRole('combobox',{name:'מחלקה נוכחית או אחרונה'}).count(),1);
  assert.deepEqual(errors,[]);const report={passed:true,postInternOption:true,communityOnlyAndCombinedOptions:true,residentRequirementsPreserved:true,scans,errors};await writeFile(out+'/signup-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
