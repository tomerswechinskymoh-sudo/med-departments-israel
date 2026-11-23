import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as cheerio from 'cheerio';
const base=process.env.DEMAND_HTTP_BASE??'http://localhost:3117';
assert(['http://localhost:3117','https://www.hitmachut.org'].includes(base));
const live=base.startsWith('https://www.hitmachut.org');
const samples=[{id:'cmoel26vd001de7j441a5um4o',level:'veryHigh'},{id:'cmoel26vd001me7j4zkf44qnp',level:'similar'},{id:'cmoel26vd001se7j4mzi891ic',level:'low'}];
// Reattach streamed server-rendered fragments for static HTML assertions.
// This does not execute page scripts or automate a browser.
function documentFromHtml(html:string) {
 const $=cheerio.load(html);
 for(const match of html.matchAll(/\$RS\("([^"]+)","([^"]+)"\)/g)) {
  const segment=$(`[id="${match[1]}"]`), placeholder=$(`[id="${match[2]}"]`);
  if(segment.length&&placeholder.length){placeholder.replaceWith(segment.contents());segment.remove();}
 }
 return $;
}
async function main(){
 const results=[];
 for(const {id,level} of samples){
  const r=await fetch(base+'/departments?specialty='+id);assert.equal(r.status,200);
  const $=documentFromHtml(await r.text());const card=$('[data-metric-key="relativeDemandIndex"]');assert.equal(card.length,1);assert.equal(card.find('.demand-average').text(),'0.82');assert.equal(card.find('[data-demand-level]').attr('data-demand-level'),level);assert(card.find('.demand-sample-size').text().includes('28'));
  assert.match($('[data-metric-key="genderDistribution"] .dashboard-value').text(),/^\d+% נשים$/);
  assert.equal($('[data-metric-key="salaryGap"]').length,0);assert.equal($('[data-metric-key="boardPassA"]').length,1);
  results.push({specialty:id,average:card.find('.demand-average').text(),level,women:$('[data-metric-key="genderDistribution"] .dashboard-value').text()});
 }
 const filtered=await fetch(base+'/departments?specialty='+samples[0].id+'&search=רמבם');assert.equal(filtered.status,200);const filteredDom=documentFromHtml(await filtered.text());assert.equal(filteredDom('.demand-average').text(),'0.82');assert.equal(filteredDom('[data-demand-level]').attr('data-demand-level'),'veryHigh');
 if(!live){
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({email:'academic-student@example.invalid',password:'Academic-Isolated-Test-2026!'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0];
  const target=JSON.parse(fs.readFileSync('docs/academic-metrics-20261122/test-target.json','utf8'));
  const response=await fetch(base+'/departments/'+encodeURIComponent(target.slug)+'?departmentId='+target.id,{headers:{Cookie:cookie}});assert.equal(response.status,200);const $=documentFromHtml(await response.text());
  const women=$('.gender-breakdown > div').filter((_,node)=>$(node).find('span').text()==='נשים').find('strong').text();assert.match(women,/^\d+%$/);
  assert.equal($('#profile-exams').length,1);assert.equal($('.profile-senior-pair').length,1);results.push({department:target.id,women});
 }
 const report={passed:true,live,filterIndependent:true,results};fs.writeFileSync(`docs/demand-benchmark-20261123/${live?'live':'local'}-http.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
main();
