// Read-only checks of the exact existing department URL and separate filters.
const assert=require('node:assert/strict');const fs=require('node:fs');const {execFileSync}=require('node:child_process');const cheerio=require('cheerio');
const dir='docs/lev-hasharon-20261118';const phase=process.argv[2];assert(['staged','live'].includes(phase));
const deployment=JSON.parse(fs.readFileSync(dir+'/deployment.json'));const integration=JSON.parse(fs.readFileSync(dir+'/integration.json'));
const origin=phase==='live'?'https://www.hitmachut.org':'https://'+deployment.url;const headers={'User-Agent':'Hitmachut-Hospital-Identity-Verification'};
if(phase==='staged'){const p=JSON.parse(execFileSync('vercel',['api','/v9/projects/prj_0YCcPYlSvFYIveAzKWI1wDO6PNaE','--scope','team_Jj2tczP8vf4XPr74gxyasW5A','--raw','--non-interactive'],{encoding:'utf8'}));headers['x-vercel-protection-bypass']=Object.entries(p.protectionBypass).find(([,v])=>v.scope==='automation-bypass')[0];}
async function read(path){const r=await fetch(origin+path,{headers,redirect:'manual'});const html=await r.text();return {status:r.status,html,$:cheerio.load(html)};}
(async()=>{
 const checks=[];for(const [path,status] of [['/',200],['/departments',200],['/compare',200],['/sitemap',200],['/api/admin/survey-reviews',403]]){const r=await read(path);assert.equal(r.status,status);checks.push({path,status});}
 const path='/departments/'+encodeURIComponent(integration.departmentSlug);const r=await read(path);assert.equal(r.status,200);const h1=r.$('title').text();assert(h1.includes('לב השרון'),h1);assert(!h1.includes('רבין'),h1);assert(r.$('main').text().includes('לב השרון'));assert(r.$('main').text().includes('העמוד המלא פתוח למשתמשים מאומתים'));
 assert(!r.$('img[alt*="לב השרון"]').toArray().some(e=>(r.$(e).attr('src')||'').includes(encodeURIComponent('השרון רבין'))));
 const all=await read('/departments?search='+encodeURIComponent('לב השרון'));assert.equal(all.status,200);assert(all.$('a').toArray().some(e=>decodeURIComponent(all.$(e).attr('href')||'').includes(integration.departmentSlug)));
 const levFilter=await read('/departments?institution='+encodeURIComponent('effective:לב השרון')+'&search='+encodeURIComponent('לב השרון'));assert.equal(levFilter.status,200);assert(levFilter.$('a').toArray().some(e=>decodeURIComponent(levFilter.$(e).attr('href')||'').includes(integration.departmentSlug)));
 const rabinFilter=await read('/departments?institution='+encodeURIComponent('effective:ביה"ח השרון מרכז רפואי רבין')+'&search='+encodeURIComponent('לב השרון'));assert.equal(rabinFilter.status,200);assert(!rabinFilter.$('a').toArray().some(e=>decodeURIComponent(rabinFilter.$(e).attr('href')||'').includes(integration.departmentSlug)));
 const report={passed:true,phase,origin,checks,departmentPath:path,heading:h1,originalLinkVerifiedByIntegration:true,guestAccessGatePreserved:true,searchFindsLev:true,filtersSeparated:true};fs.writeFileSync(dir+'/'+phase+'-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
