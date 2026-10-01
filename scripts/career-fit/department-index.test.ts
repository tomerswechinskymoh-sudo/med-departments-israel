import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreDepartment, validCohort, sensitivity, publicDepartmentIndex, admittedCohorts, type Cohort, type IndexDepartment, type Metric } from '../../src/lib/career-fit/department-index';
import { authorizedInstruments, exploratoryInstrument, mspiStatus } from '../../src/lib/career-fit/instruments';
import { questions, scale } from '../../src/lib/career-fit/config';
import { matchDepartments, type Department } from '../../src/lib/career-fit/scoring';
const metric=(id:string):Metric=>({id,label:id,sourceField:`fixture.${id}`,source:'synthetic-only',period:'2024',scope:'department-campus',family:id,correlationGroup:id,weight:1,direction:'higher',transform:{kind:'fixed-linear',min:0,max:100},rationale:'Synthetic arithmetic fixture, never a public fact',missingPolicy:'require-complete-core',eligible:true});
const cohort:Cohort={id:'synthetic-only',version:'fixture-1',specialtyId:'s',period:'2024',referenceIds:['a','b'],metrics:[metric('training'),metric('exposure'),metric('development')]};
const dept=(id:string,a:number|null,b:number|null):IndexDepartment=>({id,specialtyId:'s',campusId:'campus',observations:Object.fromEntries([['training',a],['exposure',b],['development',id==='a'?65:66]].map(([key,value])=>[key,{value,specialtyId:'s',campusId:'campus',period:'2024',source:'synthetic-only'}]))});
const a=dept('a',80,50),b=dept('b',60,72);
test('exact formula, components and explanation agree; deterministic and immutable',()=>{
 const before=JSON.stringify({a,cohort}),r=scoreDepartment(a,cohort);
 assert.equal(r.score,65);assert.deepEqual(r.components.map(x=>x.contribution),[80/3,50/3,65/3]);assert.equal(r.status,'COMPARABLE');
 assert.deepEqual(r,scoreDepartment(a,cohort));assert.equal(JSON.stringify({a,cohort}),before);
});
test('fixed reference cohort: filtering/pagination/order cannot alter score',()=>{
 const full=[a,b].map(d=>scoreDepartment(d,cohort));
 assert.deepEqual([b].map(d=>scoreDepartment(d,cohort))[0],full[1]);
 assert.deepEqual([b,a].map(d=>scoreDepartment(d,cohort))[1],full[0]);
 assert.equal(scoreDepartment({...a,id:'not-reference'},cohort).score,null);
});
test('missing weaker metric cannot shrink denominator and raise overall score',()=>{
 const r=scoreDepartment(dept('a',80,null),cohort);assert.equal(r.score,null);assert.equal(r.coverage,2/3);assert.equal(r.components[0].score,80);assert.equal(r.components[1].score,null);
 assert.equal(scoreDepartment(dept('a',null,null),cohort).score,null);
 assert.equal(scoreDepartment(dept('a',80,null),cohort,{exposure:0}).score,null);
});
test('scope requires exact specialty, campus, period and source',()=>{
 for(const patch of [{specialtyId:'other'},{campusId:'other'},{period:'2025'},{source:'other'}]){
  const changed=structuredClone(a);Object.assign(changed.observations.training!,patch);assert.equal(scoreDepartment(changed,cohort).score,null);
 }
 assert.equal(scoreDepartment({...a,specialtyId:'other'},cohort).score,null);
});
test('duplicate declared correlated indicators and single family cannot form a core',()=>{
 const duplicate={...cohort,metrics:[...cohort.metrics,{...metric('beds'),correlationGroup:'training'}]};assert.equal(validCohort(duplicate),false);
 assert.equal(validCohort({...cohort,metrics:cohort.metrics.map(m=>({...m,family:'size'}))}),false);
 assert.equal(validCohort({...cohort,metrics:[metric('size')]}),false);
 assert.equal(scoreDepartment(a,cohort,{training:0}).score,null);
});
test('fixed bounds, lower direction, invalid configuration and observations',()=>{
 assert.equal(scoreDepartment(a,{...cohort,metrics:[{...metric('training'),direction:'lower'},metric('exposure')]}).score,null);
 assert.equal(scoreDepartment(dept('a',Infinity,50),cohort).score,null);
 assert.equal(scoreDepartment(a,{...cohort,metrics:[{...metric('training'),transform:{kind:'fixed-linear',min:1,max:1}},metric('exposure')]}).score,null);
 assert.equal(scoreDepartment(a,cohort,{training:0,exposure:0}).score,null);
});
test('real public identity/type alone never produces an index or synthetic performance',()=>{
 assert.equal(admittedCohorts.length,0);const r=publicDepartmentIndex({id:'real-id',specialtyId:'real-specialty',hospital:'real-hospital'});assert.equal(r.score,null);assert.equal(r.status,'INSUFFICIENT_DATA');assert.equal(r.components.length,0);
});
test('±20% and leave-one-family-out diagnostics reveal unstable synthetic ordering',()=>{
 const ra=sensitivity(a,cohort),rb=sensitivity(b,cohort);assert.equal(ra.variants.length,9);assert(ra.base!<rb.base!);
 assert(ra.variants.find(v=>v.family==='training'&&v.weight===1.2)!.score!>rb.variants.find(v=>v.family==='training'&&v.weight===1.2)!.score!);
 assert.equal(ra.variants.find(v=>v.family==='exposure'&&v.weight===0)!.score,72.5);
 assert.deepEqual(sensitivity(dept('a',null,20),cohort),{base:null,variants:[]});
});
const publicD:Department={id:'d',slug:'d',name:'d',specialtyId:'s',specialtyName:'s',hospital:'h',hospitalName:'h',region:null,type:'HOSPITAL'};
test('personal priorities change only documented personal contributions',()=>{
 const prefs=[{factor:'hospital' as const,values:['h'],hard:false,weight:1},{factor:'type' as const,values:['HMO'],hard:false,weight:1}];
 const r=matchDepartments([publicD],prefs).comparable[0];assert.equal(r.score,.5);assert.deepEqual(r.contributions.map(c=>c.contribution),[.5,0]);
 const changed=matchDepartments([publicD],[{...prefs[0],weight:3},prefs[1]]).comparable[0];assert.equal(changed.score,.75);
 assert.equal(publicDepartmentIndex(publicD).score,null);
 assert.equal(matchDepartments([publicD],prefs.map(p=>({...p,weight:0}))).comparable[0].score,null);
 assert.equal(matchDepartments([publicD],[]).comparable[0].score,null);
});
test('unknown soft and hard conditions remain separate, unavailable never zero',()=>{
 const p={factor:'region' as const,values:['צפון'],weight:1,hard:false};
 assert.equal(matchDepartments([publicD],[p]).insufficient[0].score,null);
 assert.equal(matchDepartments([publicD],[{...p,hard:true}]).unverified[0].score,null);
 assert.equal(matchDepartments([{...publicD,region:'דרום'}],[{...p,hard:true}]).excluded.length,1);
});
test('exploratory content/order/options and instrument gate preserved',()=>{
 assert.equal(exploratoryInstrument.items.length,28);assert.deepEqual(exploratoryInstrument.items.map(({id,text,section})=>({id,text,section})),questions.map(({id,text,section})=>({id,text,section})));
 for(const q of exploratoryInstrument.items)assert.deepEqual(q.choices,scale.map((label,value)=>({value,label})));
 assert.equal(authorizedInstruments.length,0);assert.equal(mspiStatus.status,'BLOCKED');assert.equal(exploratoryInstrument.status,'EXPLORATORY');
});
