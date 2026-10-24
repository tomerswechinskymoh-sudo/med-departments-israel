import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {medical,RIASEC,interestChoices} from '../../src/lib/career-fit/evidence/model';
import {rankSpecialties} from '../../src/lib/career-fit/evidence/scoring';
import {makeDraft,respond,jump,next,completion,parseDraft} from '../../src/lib/career-fit/evidence/draft';
import {calculateSpecialtyMetrics,type SpecialtyMetricDepartment} from '../../src/lib/specialty-metrics';
import {duns100SourceYearLabel,DUNS100_TITLE,DUNS100_AGGREGATE_NOTE} from '../../src/lib/duns100-presentation';
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('all 30 construct records, order, scales and assignments match production baseline',()=>{
 const structural=medical.map(item=>Object.fromEntries(Object.entries(item).filter(([key])=>!['hebrew','helper'].includes(key))));
 assert.equal(digest(structural),'eab9b12b5bfacd4f1157a626dd77d8a214b624991864c2b9ad59d6dfa5909f7f');
 assert.deepEqual(interestChoices,['בכלל לא','במידה מעטה','במידה בינונית','במידה רבה','במידה רבה מאוד']);
});
test('1012 complete response vectors reproduce exact production scores, rank order and contributions',()=>{
 let seed=412031;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%5;};
 const vectors:number[][]=[...[0,1,2,3,4].map(v=>Array(30).fill(v)),...RIASEC.map((_,n)=>medical.map(i=>i.dimension===RIASEC[n]?4:0)),medical.map(i=>[4,3,1,4,2,0][RIASEC.indexOf(i.dimension!)]),...Array.from({length:1000},()=>medical.map(()=>random()))];
 const results=vectors.map(v=>{const answers=Object.fromEntries(medical.map((i,n)=>[i.id,v[n]]));return {answers,result:rankSpecialties('quick',answers)}});
 assert.equal(digest(results),'26936801df10b815710ebfe731659fb4a75ea935e4717fb4fb7a440c7eb6c0cf');
});
test('uncertainty remains null at every question through next/back, refresh, skip and replacement',()=>{
 for(let index=0;index<30;index++){
  let d=jump(makeDraft('quick',100),index);const id=medical[index].id;
  for(let value=0;value<5;value++){d=respond(d,value);assert.equal(d.answers[id],value);assert.equal(completion(d).answered,1);}
  d=respond(d,null,'uncertain');assert.equal(d.answers[id],null);assert.deepEqual(d.uncertain,[id]);assert.equal(completion(d).answered,0);assert.equal(rankSpecialties('quick',d.answers).status,'INCOMPLETE');
  d=jump(next(d),index);d=parseDraft(JSON.stringify(d),101)!;assert.deepEqual(d.uncertain,[id]);assert.equal(d.answers[id],null);
  d=respond(d,null);assert.deepEqual(d.uncertain,[]);assert.deepEqual(d.skipped,[id]);
  d=respond(d,2);assert.deepEqual(d.skipped,[]);assert.equal(d.answers[id],2);assert.deepEqual(d.legacyMidpoints,[]);
 }
});
test('legacy drafts preserve every numeric answer and completed scores, and identify old midpoint labels',()=>{
 const answers=Object.fromEntries(medical.map(i=>[i.id,[4,3,1,4,2,0][RIASEC.indexOf(i.dimension!)]]));
 const old={version:makeDraft('quick').version,mode:'quick',index:29,stage:'results',answers,skipped:[],updatedAt:100};
 let restored=parseDraft(JSON.stringify(old),101)!;
 assert.equal(restored.stage,'results');assert.deepEqual(restored.answers,answers);assert.deepEqual(rankSpecialties('quick',restored.answers),rankSpecialties('quick',answers));
 assert.deepEqual(restored.legacyMidpoints,medical.filter(i=>i.dimension==='E').map(i=>i.id));
 restored=parseDraft(JSON.stringify(restored),101)!;assert.equal(restored.legacyMidpoints.length,5);
 restored=respond(jump(restored,20),2);assert.equal(restored.legacyMidpoints.length,4);assert.deepEqual(restored.answers,answers);
 restored=respond(jump(restored,21),null,'uncertain');assert.equal(restored.legacyMidpoints.length,3);assert.equal(completion(restored).canSubmit,false);
 assert.deepEqual(parseDraft(JSON.stringify(restored),101)!.uncertain,['med-E2']);
});
test('DUNS missing, real zero, positive, unapproved and multi-department values retain original calculations',()=>{
 const key='duns100PhysiciansCount';
 const metric=(value:number,approved=true):SpecialtyMetricDepartment=>({externalMetrics:[{metricKey:key,value,approved,sourceName:'DUNS100'}]});
 const run=(departments:SpecialtyMetricDepartment[])=>calculateSpecialtyMetrics(departments,[key],[key])[0];
 assert.equal(run([]).isPlaceholder,true);assert.equal(run([{}]).isPlaceholder,true);assert.equal(run([metric(8,false)]).isPlaceholder,true);
 assert.equal(run([metric(0)]).value,'0');assert.equal(run([metric(0)]).isPlaceholder,false);
 assert.equal(run([metric(8),{}]).value,'8');assert.equal(run([metric(8),metric(8)]).value,'16');
 assert.equal(run([metric(8)]).label,DUNS100_TITLE);assert.match(DUNS100_AGGREGATE_NOTE,/ספירה חוזרת/);
});
test('DUNS year is disclosed only from an explicit source label, never assumed current',()=>{
 assert.match(duns100SourceYearLabel('DUNS100'),/לא צוינה/);assert.match(duns100SourceYearLabel(null),/לא צוינה/);
 assert.equal(duns100SourceYearLabel('DUNS100 Medical 2024'),'שנת מקור: 2024');
 assert.match(duns100SourceYearLabel('DUNS100 2023–2024'),/2023.*2024/);
});
