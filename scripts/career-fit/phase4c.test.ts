import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicDepartmentIndex,scoreDepartment,validCohort,type Cohort,type IndexDepartment} from '../../src/lib/career-fit/department-index';
import {matchDepartments,type Catalog} from '../../src/lib/career-fit/scoring';
const audit=JSON.parse(readFileSync('docs/career-fit/phase4c-data-audit.json','utf8'));
const real:Catalog=JSON.parse(readFileSync('scripts/career-fit/fixtures/phase4c-catalog.json','utf8'));
test('real database: 586 departments/28 specialties, zero published surveys, no admitted core',()=>{
 assert.equal(real.departments.length,586);assert.equal(real.specialties.length,28);
 assert.equal(audit.publishedReviewResponses,0);
 for(const d of real.departments){const r=publicDepartmentIndex(d);assert.equal(r.score,null);assert.equal(r.status,'INSUFFICIENT_DATA');assert.equal(r.coverage,0);assert.deepEqual(r,publicDepartmentIndex(d));}
});
test('real national specialty exam/burnout values never become departmental components',()=>{
 for(const key of ['מעבר_שלב_א','מעבר_שלב_ב','מדד_שחיקה']){const m=audit.metrics.find((m:{field:string})=>m.field===key);assert.equal(m.maxDistinctWithinSpecialty,1);assert.equal(m.suitability,'C');}
 assert(audit.metrics.filter((m:{field:string})=>/המתנה|duns/i.test(m.field)).every((m:{suitability:string})=>m.suitability==='C'));
});
test('real personal preference changes arithmetic only; unsupported counts/private ENT cannot add bonuses',()=>{
 const d=real.departments.find(d=>d.type==='HOSPITAL')!;
 const p=[{factor:'hospital' as const,values:[d.hospital!],hard:false,weight:1},{factor:'type' as const,values:['HMO'],hard:false,weight:1}];
 const a=matchDepartments([d],p).comparable[0];const b=matchDepartments([d],[{...p[0],weight:3},p[1]]).comparable[0];
 assert.equal(a.score,.5);assert.equal(b.score,.75);
 assert.equal(publicDepartmentIndex(d).score,null);
 const extra={...d,residentsCount:999,beds:999,duns:999,entPrivate:100};
 assert.deepEqual(matchDepartments([extra],p).comparable[0].contributions,a.contributions);
});
const c:Cohort={id:'sample-fixture',version:'fixture',specialtyId:'s',period:'2024',referenceIds:['a','b'],metrics:['training','work','development'].map(id=>({id,label:id,sourceField:`Review.${id}`,source:'verified-resident-survey-fixture',period:'2024',scope:'department-campus',family:id,correlationGroup:id,weight:1,direction:'higher',transform:{kind:'fixed-linear',min:1,max:5},rationale:'Synthetic behavior only',missingPolicy:'require-complete-core',eligible:true,survey:{population:'RESIDENT',minN:5}}))};
const d:IndexDepartment={id:'a',specialtyId:'s',campusId:'h',observations:Object.fromEntries(c.metrics.map(m=>[m.id,{value:4,specialtyId:'s',campusId:'h',period:'2024',source:m.source,sampleN:5,population:'RESIDENT'}]))};
test('N safeguard, population separation and exact explanation reconciliation',()=>{
 const r=scoreDepartment(d,c);assert.equal(r.score,75);assert.equal(r.score,r.components.reduce((n,x)=>n+x.contribution!,0));
 assert(r.components.every(x=>x.metrics[0].sampleN===5&&x.metrics[0].period==='2024'));
 for(const patch of [{sampleN:1},{sampleN:4},{sampleN:undefined},{population:'INTERN'},{population:'STUDENT'}]){const x=structuredClone(d);Object.assign(x.observations.training!,patch);assert.equal(scoreDepartment(x,c).score,null);}
 assert(!validCohort({...c,metrics:c.metrics.map(m=>({...m,survey:undefined}))}));
});
test('bounds/ties/specialty cohort/missing core/duplicate source are deterministic',()=>{
 for(const value of [-10,1,3,5,100]){const x=structuredClone(d);Object.values(x.observations).forEach(o=>{o!.value=value;});const r=scoreDepartment(x,c);assert(r.score!==null&&r.score>=0&&r.score<=100);assert.deepEqual(r,scoreDepartment(x,c));assert.equal(r.score,scoreDepartment({...x,id:'b'},c).score);}
 assert.equal(scoreDepartment({...d,specialtyId:'other'},c).score,null);
 for(const m of c.metrics){const x={...structuredClone(d),observations:{...d.observations}};delete x.observations[m.id];assert.equal(scoreDepartment(x,c).score,null);assert.equal(scoreDepartment(x,c,{[m.family]:0}).score,null);}
 assert(!validCohort({...c,metrics:c.metrics.map(m=>({...m,sourceField:'Review.training'}))}));
});
