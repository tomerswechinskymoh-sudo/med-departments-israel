/** Fixed-cohort, complete-core editorial composite. The live aggregate audit admits no production cohort. */
export const INDEX_VERSION='2026-10-01.4c.1';
export type Metric = {
 id:string; label:string; sourceField:string; source:string; period:string; scope:'department-campus';
 family:string; correlationGroup:string; weight:number; direction:'higher'|'lower';
 transform:{kind:'fixed-linear';min:number;max:number}; rationale:string;
 missingPolicy:'require-complete-core'; eligible:true;
 survey?:{population:'RESIDENT';minN:5};
};
export type Observation = {value:number|null; specialtyId:string; campusId:string; period:string; source:string;sampleN?:number;population?:'RESIDENT'|'INTERN'|'STUDENT'};
export type IndexDepartment = {id:string;specialtyId:string;campusId:string;observations:Readonly<Record<string,Observation|undefined>>};
export type Cohort = {id:string;version:string;specialtyId:string;period:string;referenceIds:readonly string[];metrics:readonly Metric[]};
export const admittedCohorts:readonly Cohort[]=[];
const unique=(a:readonly string[])=>new Set(a).size===a.length;
export function validCohort(c:Cohort) {
 return !!c.id&&!!c.version&&c.referenceIds.length>=2&&unique(c.referenceIds)&&c.metrics.length>=3&&
 new Set(c.metrics.map(m=>m.family)).size>=3&&unique(c.metrics.map(m=>m.id))&&unique(c.metrics.map(m=>m.sourceField))&&unique(c.metrics.map(m=>m.correlationGroup))&&
 c.metrics.every(m=>(!m.sourceField.startsWith('Review.')||!!m.survey)&&(!m.survey||(m.survey.population==='RESIDENT'&&m.survey.minN===5))&&m.eligible&&m.scope==='department-campus'&&m.period===c.period&&m.missingPolicy==='require-complete-core'&&!!m.source&&!!m.sourceField&&!!m.rationale&&Number.isFinite(m.weight)&&m.weight>0&&Number.isFinite(m.transform.min)&&Number.isFinite(m.transform.max)&&m.transform.max>m.transform.min);
}
export function scoreDepartment(d:IndexDepartment,cohort?:Cohort, familyWeights:Readonly<Record<string,number>>={}) {
 const configOK=!!cohort&&validCohort(cohort);
 const scopeOK=configOK&&cohort!.specialtyId===d.specialtyId&&cohort!.referenceIds.includes(d.id);
 const metrics=configOK?cohort!.metrics.map(m=>{
  const o=d.observations[m.id];
  const sampleOK=!m.survey||(o?.population===m.survey.population&&Number.isInteger(o?.sampleN)&&(o?.sampleN??0)>=m.survey.minN);
  const known=scopeOK&&sampleOK&&!!o&&o.value!==null&&Number.isFinite(o.value)&&o.specialtyId===d.specialtyId&&o.campusId===d.campusId&&o.period===m.period&&o.source===m.source;
  const range=m.transform.max-m.transform.min;
  const n=known?Math.max(0,Math.min(1,(o!.value!-m.transform.min)/range)):null;
  return {id:m.id,label:m.label,family:m.family,weight:m.weight,value:known?o!.value:null,normalized:n===null?null:100*(m.direction==='higher'?n:1-n),sourceField:m.sourceField,source:m.source,period:m.period,sampleN:o?.sampleN??null,population:o?.population??null,direction:m.direction,transform:m.transform};
 }):[];
 const families=[...new Set(metrics.map(m=>m.family))];
 const w=(f:string)=>familyWeights[f]??1;
 const weightsOK=families.every(f=>Number.isFinite(w(f))&&w(f)>=0);
 const total=weightsOK?families.reduce((s,f)=>s+w(f),0):0;
 const components=families.map(f=>{
  const ms=metrics.filter(m=>m.family===f),den=ms.reduce((s,m)=>s+m.weight,0);
  const complete=ms.every(m=>m.normalized!==null);
  const score=complete?ms.reduce((s,m)=>s+m.normalized!*m.weight,0)/den:null;
  return {family:f,score,weight:weightsOK?w(f):0,contribution:score!==null&&total>0?score*w(f)/total:null,metrics:ms};
 });
 const complete=scopeOK&&total>0&&families.filter(f=>w(f)>0).length>=3&&components.every(c=>c.score!==null);
 const overall=complete?components.reduce((s,c)=>s+c.contribution!,0):null;
 return {score:overall,overall_score:overall,methodology_version:cohort?.version??INDEX_VERSION,peer_group:cohort?.id??null,
 status:complete?'COMPARABLE' as const:'INSUFFICIENT_DATA' as const,
 version:cohort?.version??INDEX_VERSION,cohortId:cohort?.id??null,period:cohort?.period??null,
 coverage:components.length?components.reduce((s,c)=>s+(c.score!==null?1:0),0)/components.length:0,
 limitations:complete?['Editorial composite; not clinical quality or acceptance probability']:['No complete comparable resident core; missing data is not poor performance'],
 components,reason:complete?'COMPLETE_CORE':!configOK?'NO_ADMITTED_MULTIDIMENSIONAL_CORE':!scopeOK?'SCOPE_MISMATCH':!total?'NO_ACTIVE_WEIGHTS':'MISSING_CORE_DATA'};
}
export function publicDepartmentIndex(d:{id:string;specialtyId:string;hospital:string|null}) {
 // Public projection has no admitted performance observations. Never infer them from institution/type.
 return scoreDepartment({id:d.id,specialtyId:d.specialtyId,campusId:d.hospital??'',observations:{}},admittedCohorts.find(c=>c.referenceIds.includes(d.id)));
}
export function sensitivity(d:IndexDepartment,c:Cohort) {
 const base=scoreDepartment(d,c);
 if(base.score===null)return {base:null,variants:[]};
 const families=[...new Set(c.metrics.map(m=>m.family))];
 return {base:base.score,variants:families.flatMap(f=>[.8,1.2,0].map(weight=>({family:f,weight,score:weight===0?base.components.filter(x=>x.family!==f).reduce((s,x)=>s+x.score!,0)/(families.length-1):scoreDepartment(d,c,{[f]:weight}).score,diagnosticOnly:true})))};
}
