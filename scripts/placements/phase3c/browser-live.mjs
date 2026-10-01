import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='/private/tmp/hitmachut-phase3c/screenshots';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results=[];
try{for(const mobile of [false,true]){const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}}),p=await c.newPage();await p.goto('https://www.hitmachut.org/placements');await p.getByRole('heading',{name:'מסלולי ההכשרה',exact:true}).waitFor();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const body=await p.locator('body').innerText();assert(!/TEST_ONLY|Synthetic-Phase|Rabin|בילינסון/.test(body));await p.screenshot({path:out+`/live-overview-${mobile?'mobile':'desktop'}.png`,fullPage:true});results.push({journey:mobile?'RTL mobile':'RTL desktop',ok:true});await c.close();}
const c=await browser.newContext(),p=await c.newPage();for(const path of ['/','/departments','/login']){const r=await p.goto('https://www.hitmachut.org'+path);assert.equal(r.status(),200);results.push({path,status:r.status()});if(path==='/departments'){const href=await p.locator('a[href^="/departments/"]').first().getAttribute('href');assert(href);const d=await c.request.get('https://www.hitmachut.org'+href);assert.equal(d.status(),200);results.push({path:href,status:d.status()});}}
await p.goto('https://www.hitmachut.org/admin/placements');assert(new URL(p.url()).pathname==='/login');results.push({path:'/admin/placements',anonymous:'login redirect'});
const apex=await c.request.get('https://hitmachut.org/placements');assert.equal(apex.status(),200);assert((await apex.text()).includes('מסלולי ההכשרה'));results.push({domain:'hitmachut.org',status:apex.status()});
// Empty payloads only. The tested release denies these before authentication, parsing or any DB write.
for(const path of ['/api/placements/operations','/api/placements/documents','/api/clinical-rotations/applications','/api/clinical-rotations/identity','/api/clinical-rotations/groups','/api/electives/applications','/api/admin/electives/applications','/api/clinical-rotations/hospital/offerings']){const r=await c.request.post('https://www.hitmachut.org'+path,{data:{}});assert.equal(r.status(),403);assert.equal((await r.json()).code,'PILOT_NOT_ENABLED');results.push({path,status:403});}
const cleanup=await c.request.get('https://www.hitmachut.org/api/internal/clinical-rotations/cleanup');assert.equal(cleanup.status(),403);results.push({path:'cleanup',unauthorized:403});
writeFileSync('/private/tmp/hitmachut-phase3c/logs/live-results.json',JSON.stringify(results,null,2));console.log('PASS live custom domains, branding/three-route overview desktop/mobile, directory/department/login, anonymous admin denial, 8 pre-write denials, unauthorized cleanup');
}finally{await browser.close();}
