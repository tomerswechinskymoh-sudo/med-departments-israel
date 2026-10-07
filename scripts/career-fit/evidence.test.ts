import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {medical as mini,medical as short,israeli,mms,crosswalk,RIASEC,domains,itemsFor,type Item,type AnswerMap} from '../../src/lib/career-fit/evidence/model';
import {interestProfile,motivationProfile,rankSpecialties,correlate} from '../../src/lib/career-fit/evidence/scoring';
const source=(name:string)=>readFileSync(`scripts/career-fit/evidence/${name}`,'utf8');
const normalize=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const answers=(items:typeof mini,values=[3,4,0,3,1,2])=>Object.fromEntries(items.map(i=>[i.id,i.dimension?values[RIASEC.indexOf(i.dimension)]:4]));
test('medical item banks: counts, balanced constructs, metadata and no generic activities',()=>{
 assert.equal(mini.length,30);assert.equal(israeli.length,26);assert.equal(mms.length,26);assert.equal(itemsFor('deep').length,82);
 for(const d of RIASEC)assert.equal(mini.filter(i=>i.dimension===d).length,5);
 const all=itemsFor('deep');assert.equal(new Set(all.map(i=>i.id)).size,82);
 for(const i of all){
  assert(i.hebrew&&i.english&&i.sourceItemId&&i.sourceLocator&&i.adaptation&&i.sourceFramework&&i.sourceUrl&&i.construct&&i.medicalDomain&&i.wording);
  assert.equal(i.reverseScored,false);assert(i.hebrew.endsWith('?'));assert.match(i.translationStatus,/^AI-(drafted|adapted)-human-review-pending$/);
  assert(!/cabinets|plays$|install.*software|appliances|ארונות מטבח|ספר או מחזה|להתקין תוכנה/i.test(JSON.stringify(i)));
 }
 for(const i of mini){assert.equal(i.source,'medical-riasec');assert.equal(i.wording,'original');assert.equal(i.sourceFramework,'RIASEC');assert.match(i.hebrew,/רפוא|קליני|טיפול|מטופל|מחלקה|ניתוח|אולטרסאונד|מחלה|מחקרי|חולה/);}
 for(const i of israeli)assert(normalize(source('israeli-questionnaire-source.txt')).includes(normalize(i.english)),i.english);
 for(const i of mms)assert(normalize(source('mmsccq-appendix-source.txt')).includes(normalize(i.english)),i.english);
});
test('final26 factor assignments independently match both published tables, not original33 groups',()=>{
 for(const table of [3,4]){
  const html=source(`mmsccq-table${table}.html`),text=html.replace(/<[^>]+>/g,' ');
  const chunks=text.split(/Construct\s+[1-7]/).slice(1);
  assert.equal(chunks.length,7);
  chunks.forEach((chunk,n)=>{
   const ids=[...chunk.matchAll(/\b([A-G])\s*(\d+)\b/g)].map(m=>m[1]+m[2]);
   assert.deepEqual(mms.filter(i=>i.domain===domains[n]).map(i=>i.sourceItemId),ids);
  });
 }
 for(const removed of ['A2','B6','B7','C10','D18','D19','G33'])assert(!mms.some(i=>i.sourceItemId===removed));
});
test('complete source scoring uses sums0–20 in both tracks; unsure2 is scored and skipped is not',()=>{
 for(const [mode,items,max] of [['quick',mini,20],['deep',short,20]] as const){
  const a=answers(items,[2,2,2,2,2,2]);for(const p of Object.values(interestProfile(mode,a))){assert.equal(p.sum,max/2);assert.equal(p.normalized,.5);}
  a[items[0].id]=0;assert.notEqual(interestProfile(mode,a).R.sum,null);
  for(const invalid of [null,undefined,-1,5,NaN,Infinity,1.5]){const p=interestProfile(mode,{...a,[items[0].id]:invalid});assert.equal(p.R.sum,null);assert.equal(rankSpecialties(mode,{...a,[items[0].id]:invalid}).status,'INCOMPLETE');}
 }
});
test('Pearson mathematical fixtures, affine invariance, exact explanation and flat guard',()=>{
 const x=[0,1,2,3,4,5],y=[5,4,3,2,1,0];assert.equal(correlate(x,x)?.index,100);assert.equal(correlate(x,y)?.index,0);
 assert.equal(correlate(x,[1,1,1,1,1,1]),null);assert.equal(correlate([0,0,0,0,0,0],x),null);
 const a=correlate(x,[4,1,0,5,2,3])!,b=correlate(x.map(v=>v*10+50),[4,1,0,5,2,3].map(v=>v*2+1))!;
 assert(Math.abs(a.r-b.r)<1e-12);assert(Math.abs(a.r-a.contributions.reduce((s,v)=>s+v,0))<1e-12);
 assert.equal(rankSpecialties('quick',answers(mini,[4,4,4,4,4,4])).status,'UNDIFFERENTIATED');
});
test('real31.0 crosswalk values exactly reproduce source CSV rows and cover entire catalog',()=>{
 const lines=source('onet-31.0-physician-interest-rows.csv').trim().split(/\r?\n/);
 // Source CSV has quoted titles with commas; parse standard CSV fields without a dependency.
 const parse=(line:string)=>[...line.matchAll(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g)].map(m=>m[1].replace(/^"|"$/g,'').replace(/""/g,'"'));
 const headers=parse(lines[0]);const rows=lines.slice(1).map(l=>Object.fromEntries(parse(l).map((v,i)=>[headers[i],v])));
 const catalog=JSON.parse(readFileSync('scripts/career-fit/fixtures/phase4c-catalog.json','utf8'));
 assert.equal(crosswalk.filter(c=>c.catalog).length,28);
 assert.deepEqual(crosswalk.filter(c=>c.catalog).map(c=>c.specialty).sort(),catalog.specialties.map((s:{name:string})=>s.name).sort());
 assert.equal(crosswalk.filter(c=>c.mapping==='direct').length,17);
 for(const c of crosswalk.filter(c=>c.scores))for(const d of RIASEC){const row=rows.find(r=>r['O*NET-SOC Code']===c.code&&r['Element Name'][0]===d);assert(row);assert.equal(Number(row['Data Value']),c.scores![d]);assert.equal(row.Date,c.sourceDate);assert.equal(row['Domain Source'],c.sourceMethod);}
 assert.equal(crosswalk.find(c=>c.specialty.includes('א.א.ג'))?.scores,null);
 assert.equal(crosswalk.find(c=>c.specialty==='כירורגיה כללית')?.scores,null);
});
test('bounded deterministic direct-only ranking, candidate order independence, explanations reconcile',()=>{
 for(let seed=0;seed<30;seed++){
  const a=Object.fromEntries(mini.map((i,n)=>[i.id,(n*n+seed+n*seed)%5]));const r=rankSpecialties('quick',a);
  assert.deepEqual(r,rankSpecialties('quick',a,[...crosswalk].reverse()));
  for(const row of r.ranked){assert(row.index>=0&&row.index<=100);assert.equal(row.specialty.mapping,'direct');assert(Math.abs(row.index-(50+50*row.dimensions.reduce((s,d)=>s+d.contribution,0)))<1e-10);}
 }
 const a=answers(mini),c=crosswalk.find(c=>c.mapping==='direct')!;
 const r=rankSpecialties('quick',a,[{...c,code:'z'},{...c,code:'a'}]);assert.deepEqual(r.ranked.map(r=>r.specialty.code),['a','z']);
});
test('MMSCCQ final-domain means, fixed completeness and complete separation from ranking',()=>{
 const a:Record<string,number|null>=answers(short);for(const i of mms)a[i.id]=5;
 const original=rankSpecialties('deep',a);for(const d of Object.values(motivationProfile(a)))assert.equal(d.normalized,1);
 a[mms[0].id]=null;assert.equal(motivationProfile(a).schedule.mean,null);
 for(const i of [...mms,...israeli])a[i.id]=1;assert.deepEqual(rankSpecialties('deep',a),original);
 for(const d of Object.values(motivationProfile(a)))assert.equal(d.mean,1);
});
test('public route serves finalized instrument; legacy question IDs cannot contaminate it',()=>{
 const route=readFileSync('src/app/career-fit/page.tsx','utf8');assert(route.includes('return <EvidenceQuestionnaire/>'));assert(!/previewEnabled|CAREER_FIT_EVIDENCE_PREVIEW|CareerFitClient/.test(route));
 const a=answers(mini);assert.deepEqual(rankSpecialties('quick',{...a,q1:4,q28:0,procedural:3}),rankSpecialties('quick',a));
 assert.deepEqual(rankSpecialties('quick',answers(short)),rankSpecialties('deep',answers(short)));
 assert.equal(rankSpecialties('quick',{'mini-1':4,q1:4}).status,'INCOMPLETE');
});
