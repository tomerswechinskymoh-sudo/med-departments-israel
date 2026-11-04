import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { chromium, webkit, devices } from 'playwright';

const root = new URL('../../', import.meta.url).pathname;
const output = process.env.UPLOAD_TEST_OUTPUT || '/private/tmp/hitmachut-upload-tests';
await mkdir(output, { recursive: true });
const js = await build({ entryPoints:[root+'tests/upload/fixture.tsx'], bundle:true, write:false, jsx:'automatic', define:{'process.env.NODE_ENV':'"test"','process.env':'{}'}, alias:{'next/navigation':root+'tests/upload/navigation.ts'}, logLevel:'silent' });
const css = await postcss([tailwind(root+'tailwind.config.ts'),autoprefixer]).process(await readFile(root+'src/app/globals.css','utf8'), {from:root+'src/app/globals.css'});
const server=createServer((req,res)=>{
  if(req.method !== 'GET'){res.writeHead(405);res.end();return;}
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/app.js'){res.setHeader('Content-Type','application/javascript');res.end(js.outputFiles[0].contents);}
  else if(path==='/app.css'){res.setHeader('Content-Type','text/css');res.end(css.css);}
  else if(path==='/signup'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html dir="rtl" lang="he"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script></html>');}
  else {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const results=[];
const fixture=(name,mimeType,buffer=Buffer.from('synthetic test document'))=>({name,mimeType,buffer});
const pdf=fixture('בדיקה.pdf','application/pdf',Buffer.from('%PDF-1.4\n% synthetic fixture\n%%EOF'));
async function textContains(locator, expected) { await locator.filter({hasText:expected}).waitFor(); }
try {
for(const config of [
  {name:'webkit-iphone16-simulation',engine:webkit,context:{...devices['iPhone 13'],viewport:{width:393,height:852},screen:{width:393,height:852}}},
  {name:'desktop-chrome',engine:chromium,launch:{channel:'chrome'},context:{viewport:{width:1440,height:1000}}},
  {name:'mobile-chrome-simulation',engine:chromium,launch:{channel:'chrome'},context:{...devices['Pixel 7'],viewport:{width:393,height:852}}},
]) {
const browser=await config.engine.launch(config.launch);
try {
  const context=await browser.newContext(config.context);
  await context.addInitScript(() => {
    window.__uploadProofs = [];
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      const file = options?.body instanceof FormData ? options.body.get('verificationProof') : null;
      if (file instanceof File) file.text().then(text => window.__uploadProofs.push({name:file.name, size:file.size, text}));
      return originalFetch.call(this, url, options);
    };
  });
  const page=await context.newPage();
  const errors=[];const requests=[];let responseMode='offline';
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
    const req=route.request();
    if(!req.url().startsWith(origin+'/'))return route.abort();
    if(req.method()!=='GET'){
      requests.push({url:req.url(),body:req.postDataBuffer()?.toString()??''});
      if(responseMode==='offline')return route.abort('internetdisconnected');
      if(responseMode==='oversize')return route.fulfill({status:413,body:'Request Entity Too Large'});
      return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'כבר קיים חשבון עם האימייל הזה.'})});
    }
    return route.continue();
  });
  await page.goto(origin+'/signup');
  const input=page.locator('#verification-file');await input.waitFor({timeout:10000}).catch(async e=>{console.error({url:page.url(),html:(await page.content()).slice(-3000),errors});throw e});
  await input.scrollIntoViewIfNeeded();
  const hit=await input.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {width:r.width,height:r.height,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e,disabled:e.disabled,display:s.display,visibility:s.visibility,pointerEvents:s.pointerEvents,capture:e.getAttribute('capture'),accept:e.accept};});
  assert.equal(hit.hit,true);assert.equal(hit.disabled,false);assert.ok(hit.height>=44&&hit.width>100);assert.equal(hit.pointerEvents,'auto');assert.equal(hit.capture,null);assert.match(hit.accept,/application\/pdf/);assert.match(hit.accept,/image\/jpeg/);assert.match(hit.accept,/image\/png/);
  const activate=async target=>{const next=page.waitForEvent('filechooser',{timeout:4000});await target[config.context.hasTouch?'tap':'click']();return next;};
  // Real touch/click activation must raise a chooser; setInputFiles alone cannot prove this.
  let chooser=await activate(input);assert.equal(chooser.isMultiple(),false);await chooser.setFiles(pdf);
  await textContains(page.locator('#verification-file-status'),'בדיקה.pdf');
  chooser=await activate(page.locator('label[for="verification-file"]'));await chooser.setFiles([]);
  await textContains(page.locator('#verification-file-status'),'בדיקה.pdf');
  for(const f of [fixture('photo.jpg','image/jpeg'),fixture('photo.png','image/png'),fixture('PROOF.PDF','')]){
    chooser=await activate(page.locator('label[for="verification-file"]'));await chooser.setFiles(f);await textContains(page.locator('#verification-file-status'),f.name);
  }
  for(const f of [fixture('photo.heic','image/heic'),fixture('empty.pdf','application/pdf',Buffer.alloc(0)),fixture('large.pdf','application/pdf',Buffer.alloc(4*1024*1024+1))]){
    await input.setInputFiles(f);await page.locator('#verification-file-error').waitFor();assert.match(await page.locator('#verification-file-error').innerText(),/[א-ת]/);await textContains(page.locator('#verification-file-status'),'טרם נבחר');
  }
  // Reselect the same valid file after cancellation/error without losing the change event.
  await input.setInputFiles(pdf);await input.setInputFiles(pdf);await textContains(page.locator('#verification-file-status'),'בדיקה.pdf');assert.equal(await page.locator('#verification-file-error').count(),0);
  assert.equal(requests.length,0,'Selection must not make network submissions');
  await page.locator('#signup-fullName').fill('בדיקת ממשק');await page.locator('#signup-email').fill('upload-test@example.invalid');await page.locator('#signup-password').fill('FixtureOnly123!');await page.locator('[name="confirmPassword"]').fill('FixtureOnly123!');await page.locator('[name="roleStatus"]').selectOption('other');await page.locator('[name="proofConfirmed"]').check();await page.locator('[name="privacyVerificationConsent"]').check();
  // Missing proof and missing consent must still block signup.
  await input.setInputFiles(fixture('photo.heic','image/heic'));await page.locator('button[type="submit"]').click();await textContains(page.locator('[role="alert"]'),'יש להעלות');assert.equal(requests.length,0);
  await input.setInputFiles(pdf);await page.locator('[name="privacyVerificationConsent"]').uncheck();await page.locator('button[type="submit"]').click();await textContains(page.locator('p'),'יש לאשר את תנאי');assert.equal(requests.length,0);await page.locator('[name="privacyVerificationConsent"]').check();
  await page.locator('button[type="submit"]').click();await textContains(page.locator('[role="alert"]'),'החיבור לאינטרנט');assert.equal(requests.length,1);assert.match(requests[0].body,/name="verificationProof"/);await page.waitForFunction(()=>window.__uploadProofs.length===1);assert.match((await page.evaluate(()=>window.__uploadProofs[0])).text,/%PDF-1.4/);await textContains(page.locator('#verification-file-status'),'בדיקה.pdf');assert.equal(await page.locator('button[type="submit"]').isEnabled(),true);
  responseMode='oversize';await page.locator('button[type="submit"]').click();await textContains(page.locator('[role="alert"]'),'גדולים מדי');
  responseMode='existing';await page.locator('button[type="submit"]').click();await textContains(page.locator('[role="alert"]'),'כבר קיים חשבון');
  // Mandatory clinical experience remains enforced, and returning retains the proof.
  const before=requests.length;await page.locator('[name="roleStatus"]').selectOption('intern');await page.locator('[name="onboardingInstitutionId"]').selectOption('fixture-hospital');await page.locator('button[type="submit"]').click();await page.getByRole('button',{name:'חזרה לפרטי ההרשמה'}).waitFor();assert.equal(requests.length,before);await page.getByRole('button',{name:'חזרה לפרטי ההרשמה'}).click();await textContains(page.locator('#verification-file-status'),'בדיקה.pdf');
  await input.scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${config.name}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  results.push({browser:config.name,version:browser.version(),passed:true,scenarios:16,nativePicker:true,labelPicker:true,formats:['PDF','JPEG','PNG','PDF without MIME'],privacy:'all submissions intercepted; no database connection',viewport:config.context.viewport,hit});
  console.log(`PASS ${config.name}: 16 scenarios`);
} finally {await browser.close();}
}
await writeFile(`${output}/results.json`,JSON.stringify({passed:true,results,physicalIPhoneTested:false},null,2));
} finally {await new Promise(resolve=>server.close(resolve));}
