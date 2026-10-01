import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const root=process.env.CAREER_FIT_URL??'http://localhost:3106';
const live=!root.includes('localhost');
const out='/private/tmp/hitmachut-phase4a/screenshots';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const records=[];
async function heading(p,name){await p.getByRole('heading',{name,exact:true}).waitFor();}
async function noOverflow(p){assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');assert.equal(await p.locator('html').getAttribute('dir'),'rtl');}
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});
  const page=await context.newPage();let leaks=[];let monitoring=false;
  page.on('request',r=>{records.push({url:r.url(),method:r.method(),body:!!r.postData()});if(monitoring&&(r.method()!=='GET'||r.postData()||new URL(r.url()).origin!==new URL(root).origin||/q\d+=|answers|priorities/.test(r.url())))leaks.push(r.url());});
  const response=await page.goto(root+'/career-fit');assert.equal(response.status(),200);await heading(page,'בחירת התמחות — מתחילים במה שחשוב לך');
  await page.getByRole('button',{name:'להתחלת השאלון',exact:true}).click();monitoring=true;
  await page.locator('input[name=q1][value="4"]').focus();await page.keyboard.press('Space');assert(await page.locator('input[name=q1][value="4"]').isChecked());
  await page.locator('input[name=q2][value=unknown]').check();
  await page.getByRole('button',{name:'סיכום ביניים',exact:true}).click();await heading(page,'אין עדיין מידע מספיק להצעת כיוונים');
  await page.getByRole('button',{name:'עריכת תשובות',exact:true}).click();assert(await page.locator('input[name=q1][value="4"]').isChecked());
  await page.screenshot({path:`${out}/${live?'live':'local'}-questions-${mobile?'mobile':'desktop'}.png`,fullPage:false});
  for(let section=0;section<4;section++){
   const inputs=page.locator('main input[type=radio][value="4"]');for(let i=0;i<await inputs.count();i++)await inputs.nth(i).check();
   if(section===1){await page.getByRole('button',{name:'חזרה',exact:true}).click();assert(await page.locator('input[name=q1][value="4"]').isChecked());await page.getByRole('button',{name:'המשך',exact:true}).click();}
   await page.getByRole('button',{name:'המשך',exact:true}).click();
  }
  await heading(page,'מה חשוב לי יותר?');await page.getByRole('button',{name:'להצגת הכיוונים',exact:true}).click();await heading(page,'כיוונים שכדאי לבדוק');
  assert(await page.locator('main article').count()>0);await noOverflow(page);
  await page.screenshot({path:`${out}/${live?'live':'local'}-results-${mobile?'mobile':'desktop'}.png`,fullPage:false});
  const expand=page.getByRole('button',{name:/הצג את כל/});if(await expand.count()){await expand.click();assert(await page.locator('main article').count()>5);}
  await page.getByRole('button',{name:'למחלקות ולהעדפות בתחום',exact:true}).first().click();await heading(page,'אילו מחלקות מתאימות למה שחשוב לי?');
  await page.getByLabel('תחום בקטלוג המחלקות').waitFor();const options=await page.getByLabel('תחום בקטלוג המחלקות').locator('option').evaluateAll(os=>os.filter(o=>o.value).map(o=>({value:o.value,text:o.textContent})));
  assert(options.length>0);await page.getByLabel('תחום בקטלוג המחלקות').selectOption(options.find(o=>o.text==='כירורגיה כללית')?.value??options[0].value);
  await heading(page,'התאמה להעדפות שהגדרת');
  const region=page.locator('fieldset').filter({has:page.locator('legend',{hasText:/^אזור$/})});
  const regions=await region.locator('select').first().locator('option').evaluateAll(os=>os.filter(o=>o.value).map(o=>o.value));
  if(!live)assert(regions.length>0,'synthetic regions must be known');if(regions.length){await region.locator('select').first().selectOption(regions.includes('צפון')?'צפון':regions[0]);await page.getByText('תיקו בהעדפות הנתמכות',{exact:true}).first().waitFor();
   if(!live){await page.getByRole('heading',{name:'מידע חסר — ללא דירוג (1)',exact:true}).waitFor();await region.getByLabel('תנאי חובה מפורש').check();await page.getByRole('heading',{name:'תנאי חובה שטרם אומתו (1)',exact:true}).waitFor();}
  }
  await page.getByLabel('הוראה וחניכה',{exact:true}).check();await noOverflow(page);await page.screenshot({path:`${out}/${live?'live':'local'}-departments-${mobile?'mobile':'desktop'}.png`,fullPage:false});
  assert.equal(leaks.length,0,JSON.stringify(leaks));monitoring=false;
  assert.equal(await page.evaluate(()=>localStorage.length),0);assert.equal(await page.evaluate(()=>sessionStorage.length),0);
  await page.getByLabel('בחירה להשוואה',{exact:true}).first().check();await page.getByRole('link',{name:/השוואת 1 מחלקות/}).click();await page.getByRole('heading',{name:'כדי לצפות בהשוואה יש להתחבר או להירשם.'}).waitFor();
  await page.goto(root+'/career-fit/departments');await heading(page,'אילו מחלקות מתאימות למה שחשוב לי?');await page.getByLabel('תחום בקטלוג המחלקות').waitFor();assert.equal(await page.getByLabel('תחום בקטלוג המחלקות').inputValue(),'');
  await page.getByRole('button',{name:'מחק את התשובות שלי והתחל מחדש'}).click();assert.equal(await page.getByLabel('תחום בקטלוג המחלקות').inputValue(),'');
  if(!live){await page.route('**/api/career-fit/catalog',r=>r.fulfill({status:503,json:{error:'CATALOG_UNAVAILABLE'}}));await page.reload();await heading(page,'לא ניתן לטעון כרגע את נתוני המחלקות');await page.unroute('**/api/career-fit/catalog');await page.getByRole('button',{name:'נסה/י שוב'}).click();await page.getByLabel('תחום בקטלוג המחלקות').waitFor();}
  await context.close();console.log(`PASS ${mobile?'mobile':'desktop'} full questions, keyboard, unknown, insufficient, back/edit, ties, continuation, preferences, public compare gate, reset, privacy${!live?', API failure/retry':''}`);
 }
 const context=await browser.newContext();const p=await context.newPage();
 const catalogResponse=await p.request.get(root+'/api/career-fit/catalog');assert.equal(catalogResponse.status(),200);const catalog=await catalogResponse.json();assert(catalog.departments.length>0);assert.deepEqual(Object.keys(catalog.departments[0]).sort(),['id','slug','name','specialtyId','specialtyName','hospital','hospitalName','region','type'].sort());
 writeFileSync('/private/tmp/hitmachut-phase4a/'+(live?'live':'local')+'-catalog-summary.json',JSON.stringify({count:catalog.departments.length,specialties:catalog.specialties,regionKnown:catalog.departments.filter(d=>d.region).length,typeKnown:catalog.departments.filter(d=>d.type).length},null,2));
 if(!live){await p.goto(root+'/login');await p.locator('input[type=email]').fill('career-fit@example.test');await p.locator('input[type=password]').fill('Synthetic-Career-Fit-Only!');await p.locator('button[type=submit]').click();await p.waitForURL(u=>u.pathname!='/login');await p.goto(root+`/compare?specialty=surgery&departments=career-fit-surgery-0,career-fit-surgery-1`);assert.equal(await p.getByRole('heading',{name:'כדי לצפות בהשוואה יש להתחבר או להירשם.'}).count(),0);await p.getByRole('heading',{name:'השוואה בתחום כירורגיה כללית',exact:true}).waitFor();await p.getByText('מוסד בדיקה 0',{exact:true}).first().waitFor();console.log('PASS authenticated isolated comparison');}
 for(const path of ['/','/departments','/login','/placements','/career-fit/methodology']){const r=await p.goto(root+path);assert.equal(r.status(),200,path);if(path==='/placements')assert((await p.locator('body').innerText()).includes('טרם נפתח'));}
 // Safe, empty requests to pre-write guards, no real payloads or accounts.
 for(const path of ['/api/placements/documents','/api/clinical-rotations/applications','/api/clinical-rotations/hospital/offerings','/api/electives/applications']){const r=await p.request.post(root+path,{data:{},headers:{origin:root}});assert.equal(r.status(),403);assert.equal((await r.json()).code,'PILOT_NOT_ENABLED');}
 console.log('PASS public catalog whitelist, branding routes, guarded admissions/uploads/offerings');
 await context.close();writeFileSync('/private/tmp/hitmachut-phase4a/'+(live?'live':'local')+'-requests.json',JSON.stringify(records,null,2));
}finally{await browser.close();}
