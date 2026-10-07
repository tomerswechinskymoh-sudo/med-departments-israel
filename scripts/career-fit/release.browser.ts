import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {medical,sectionsFor} from '../../src/lib/career-fit/evidence/model';
import {rankSpecialties} from '../../src/lib/career-fit/evidence/scoring';
import {DRAFT_KEY} from '../../src/lib/career-fit/evidence/draft';
const root=process.env.CAREER_FIT_URL??'http://127.0.0.1:3114',live=new URL(root).hostname==='www.hitmachut.org';
assert(live||['localhost','127.0.0.1'].includes(new URL(root).hostname),'Approved local/live host only');
const out=`/private/tmp/hitmachut-career-release/${live?'live':'local'}`;mkdirSync(out,{recursive:true});
const stale=/MSPI|AAMC|28 שאלות|שאלון מהיר|שאלון מעמיק|\bQuick\b|\bDeep\b|82 שאלות|82 questions/i;
async function main(){
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),receipts=[];
 try{for(const [name,width,height] of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844]] as const){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',isMobile:width<640,hasTouch:width<1024}),page=await context.newPage(),errors:string[]=[],writes:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());});
  const overflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const screenshot=async(label:string)=>{await page.screenshot({path:`${out}/${name}-${label}.png`,fullPage:true});};
  if(!live)await page.route('**/api/career-fit/catalog',r=>r.fulfill({json:JSON.parse(readFileSync('scripts/career-fit/fixtures/phase4c-catalog.json','utf8'))}));
  const response=await page.goto(root+'/career-fit');assert.equal(response?.status(),200);await page.getByRole('heading',{name:'מצאו את ההתמחות שמתאימה לכם',exact:true}).waitFor();
  assert(!stale.test(await page.locator('main').innerText()));assert.equal(await page.locator('html').getAttribute('dir'),'rtl');assert(await page.getByText('30 שאלות · כ-4–6 דקות',{exact:true}).isVisible());
  assert.equal(await page.getByRole('list',{name:'המסע שלכם להתמחות'}).count(),1);assert.equal(await page.getByRole('region',{name:'על השאלון'}).count(),1);
  const start=page.getByRole('button',{name:'התחילו את שאלון ההתאמה',exact:false});assert.equal(await start.count(),1);assert(await start.isDisabled());await screenshot('landing');await overflow();
  await page.getByRole('checkbox').check();await start.click();await page.getByRole('heading',{name:medical[0].hebrew,exact:true}).waitFor();
  const nav=width>=1024?page.getByRole('complementary',{name:'שלבי השאלון'}):page.locator('details').filter({has:page.locator('summary').filter({hasText:'כל השאלות'})});
  const openNav=async()=>{if(width<1024&&await nav.getAttribute('open')===null)await nav.locator('summary').click();};
  const jump=async(n:number)=>{await openNav();await nav.getByRole('button',{name:new RegExp('^שאלה '+n+' ·')}).click();await page.getByRole('heading',{name:medical[n-1].hebrew,exact:true}).waitFor();};
  await openNav();assert.equal(await nav.getByRole('button',{name:/^שאלה \d+ ·/}).count(),30);
  await page.getByRole('button',{name:'דלג כרגע',exact:true}).click();assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).answers['med-R1'],DRAFT_KEY),null);
  for(const section of sectionsFor('quick')){await openNav();await nav.getByRole('button',{name:section.label,exact:false}).click();await page.getByRole('heading',{name:medical[section.start].hebrew,exact:true}).waitFor();}
  await jump(30);await page.getByRole('button',{name:'לבדיקת התשובות',exact:true}).click();assert(await page.getByRole('button',{name:'צפו בתוצאות שלי',exact:true}).isDisabled());assert(await page.getByText('עניתם על 0 מתוך 30 שאלות.',{exact:true}).isVisible());
  await page.getByRole('button',{name:'השלימו 30 שאלות',exact:true}).click();await page.getByRole('heading',{name:medical[0].hebrew,exact:true}).waitFor();
  const answers:Record<string,number>={};
  for(let i=0;i<30;i++){
   const item=medical[i],value=[3,4,0,3,1,2][Math.floor(i/5)];answers[item.id]=value;
   await page.getByRole('heading',{name:item.hebrew,exact:true}).waitFor();assert.equal(await page.locator('input[type=radio]').count(),5);
   const radio=page.locator(`input[name="${item.id}"][value="${value}"]`);if(i===0){await radio.focus();await page.keyboard.press('Space');}else await radio.locator('..').click();
   assert(await radio.isChecked());assert(await page.getByRole('heading',{name:item.hebrew,exact:true}).isVisible());
   if(i===0){await page.reload();await page.getByRole('heading',{name:item.hebrew,exact:true}).waitFor();assert(await radio.isChecked());await screenshot('question');await overflow();}
   if(i===1){await page.getByRole('button',{name:'חזרה',exact:true}).click();await page.getByRole('heading',{name:medical[0].hebrew,exact:true}).waitFor();await page.getByRole('button',{name:'המשך',exact:true}).click();}
   await page.getByRole('button',{name:i===29?'לבדיקת התשובות':'המשך',exact:true}).click();
  }
  assert(await page.getByText('עניתם על 30 מתוך 30 שאלות.',{exact:true}).isVisible());await screenshot('review');await page.getByRole('button',{name:'צפו בתוצאות שלי',exact:true}).click();await page.getByRole('heading',{name:'ההתמחויות שהכי מתאימות לפרופיל שלכם',exact:true}).waitFor();
  const rows=page.locator('article[id^="occupation-"]'),expected=rankSpecialties('quick',answers).ranked;assert.equal(await rows.count(),17);assert.deepEqual(await rows.evaluateAll(xs=>xs.map(x=>x.id)),expected.map(r=>'occupation-'+r.specialty.code));
  assert.equal(await page.getByRole('region',{name:'שלושת הכיוונים המובילים'}).locator('h3').count(),3);
  for(let i=0;i<expected.length;i++)assert(await rows.nth(i).getByText(`${expected[i].displayIndex}/100`,{exact:true}).isVisible());
  assert(!/%/.test(await page.locator('main').innerText()));assert(!stale.test(await page.locator('main').innerText()));
  const first=rows.first();await first.locator('[data-fit-explanation] > summary').focus();await page.keyboard.press('Enter');assert(await first.locator('[data-fit-explanation] ul').count()>0);assert(!(await first.locator('table').isVisible()));await first.locator('[data-fit-calculation] > summary').click();assert(await first.locator('table').isVisible());await first.locator('[data-fit-calculation] > summary').click();assert(!(await first.locator('table').isVisible()));const cautionIndex=expected.findIndex(r=>r.dimensions.some(d=>d.contribution< -1e-12));if(cautionIndex>=0){const caution=rows.nth(cautionIndex);if(await caution.locator('[data-fit-explanation]').getAttribute('open')===null)await caution.locator('[data-fit-explanation] > summary').click();assert(await caution.getByRole('heading',{name:'כדאי לקחת בחשבון',exact:true}).isVisible());assert(!(await caution.locator('table').isVisible()));}await overflow();await screenshot('results');
  await page.getByRole('button',{name:'חזרה לתשובות ולהשלמה',exact:true}).click();await jump(1);await page.locator('input[name="med-R1"][value="0"]').locator('..').click();answers['med-R1']=0;
  await jump(7);await page.reload();await page.getByRole('heading',{name:medical[6].hebrew,exact:true}).waitFor();await jump(1);assert(await page.locator('input[name="med-R1"][value="0"]').isChecked());await page.getByRole('button',{name:'בדיקת התשובות',exact:true}).click();await page.getByRole('button',{name:'צפו בתוצאות שלי',exact:true}).click();
  const edited=rankSpecialties('quick',answers).ranked;assert.deepEqual(await rows.evaluateAll(xs=>xs.map(x=>x.id)),edited.map(r=>'occupation-'+r.specialty.code));await page.reload();await rows.first().waitFor();assert.deepEqual(await rows.evaluateAll(xs=>xs.map(x=>x.id)),edited.map(r=>'occupation-'+r.specialty.code));
  await page.getByRole('link',{name:'להעדפות מחלקה',exact:true}).click();await page.getByRole('heading',{name:'אילו מחלקות מתאימות למה שחשוב לי?',exact:true}).waitFor();await page.getByLabel('תחום בקטלוג המחלקות').waitFor();
  const options=await page.getByLabel('תחום בקטלוג המחלקות').locator('option').evaluateAll(os=>os.filter((o):o is HTMLOptionElement=>o instanceof HTMLOptionElement && !!o.value).map(o=>o.value));assert(options.length>0);await page.getByLabel('תחום בקטלוג המחלקות').selectOption(options[0]);await page.getByText('אין מספיק נתונים לחישוב מדד המחלקה',{exact:true}).first().waitFor();await overflow();
  for(const route of ['/career-fit/sources','/career-fit/methodology']){const r=await page.goto(root+route);assert.equal(r?.status(),200);await page.locator('main h1').waitFor();assert(!stale.test(await page.locator('main').innerText()));await overflow();}
  await page.goto(root+'/career-fit');await rows.first().waitFor();await page.getByRole('button',{name:'מחיקת התשובות והתחלה מחדש',exact:true}).click();assert.equal(await page.evaluate(key=>localStorage.getItem(key),DRAFT_KEY),null);assert(await start.isDisabled());assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  receipts.push({viewport:name,questions:30,allAnswered:true,deterministicRanking:true,jump:true,sections:true,skipNull:true,review:true,refresh:true,edit:true,reset:true,accordions:true,technicalDisclosure:true,departmentRoute:true,rtl:true,overflow:false,staleContent:false,errors:[],networkWrites:[]});await context.close();
  console.log(`PASS ${live?'LIVE':'LOCAL'} ${name}: single30 questionnaire, full flow, results and department link`);
 }}finally{await browser.close();}
 writeFileSync(out+'/receipt.json',JSON.stringify({root,checkedAt:new Date().toISOString(),receipts},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
