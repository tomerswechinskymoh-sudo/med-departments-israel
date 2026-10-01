import { dimensions, profiles, questions, scoredDimensions, type Dimension, type Profile, type Question } from './config';
export type Answers = Record<string, number | null>;
export type Priorities = Partial<Record<Dimension, number>>;
const stable = (a:string,b:string)=>a < b ? -1 : a > b ? 1 : 0;
export function summarize(answers:Answers, set:Question[]=questions) {
  return Object.fromEntries(Object.keys(dimensions).map(d=>{
    const values=set.filter(q=>q.dimension===d).map(q=>answers[q.id]).filter((v):v is number=>typeof v==='number' && Number.isInteger(v) && v>=0 && v<=4);
    return [d,{value:values.length ? values.reduce((a,b)=>a+b,0)/values.length/4 : null,count:values.length}];
  })) as Record<Dimension,{value:number|null;count:number}>;
}
export function matchSpecialties(answers:Answers, priorities:Priorities={}, candidates:Profile[]=profiles, set:Question[]=questions) {
  const summary=summarize(answers,set);
  const active=scoredDimensions.filter(d=>summary[d].value!==null && (priorities[d]??1)>0);
  const weight=(d:Dimension)=>Math.min(3,Math.max(0,priorities[d]??1));
  const total=active.reduce((s,d)=>s+weight(d),0);
  const informative=active.reduce((n,d)=>n+summary[d].count,0);
  const sufficient=informative>=10 && active.length>=6 && total>0;
  const evaluated=candidates.map(profile=>{
    const contributions=active.filter(d=>profile.supported.includes(d)).map(d=>({dimension:d,value:summary[d].value!,weight:weight(d),contribution:weight(d)*summary[d].value!/total}));
    const coverage=total ? contributions.reduce((s,c)=>s+c.weight,0)/total : 0;
    const lower=contributions.reduce((s,c)=>s+c.contribution,0);
    const positive=contributions.filter(c=>c.value>=.75);
    return {profile,contributions,coverage,lower,upper:lower+1-coverage,positive,
      unknown:active.filter(d=>!profile.supported.includes(d)),
      eligible:sufficient && contributions.length>=2 && coverage>=.2 && positive.length>=2};
  });
  const eligible=evaluated.filter(r=>r.eligible);
  // Only strict interval dominance distinguishes suggestions. Overlap remains unresolved.
  const suggestions=eligible.filter(r=>!eligible.some(other=>other.lower>r.upper+1e-10)).sort((a,b)=>stable(a.profile.label,b.profile.label));
  return {summary,sufficient,informative,evaluated,suggestions};
}
export type Department = {id:string;slug:string;name:string;specialtyId:string;specialtyName:string;hospital:string|null;hospitalName:string;region:string|null;type:string|null};
export type Catalog = {version:string;retrievedAt:string;departments:Department[];specialties:{id:string;name:string}[]};
export type Factor = 'region'|'hospital'|'type';
export type Preference = {factor:Factor;values:string[];hard:boolean;weight:number};
const factors:Factor[]=['region','hospital','type'];
export function matchDepartments(departments:Department[], preferences:Preference[]) {
  // Allowlist and canonical order: unsupported dimensions cannot affect any branch.
  const selected=factors.map(f=>preferences.find(p=>p.factor===f)).filter((p):p is Preference=>!!p && p.values.length>0 && (p.hard||p.weight>0));
  const soft=selected.filter(p=>!p.hard);
  const denominator=soft.reduce((s,p)=>s+Math.min(3,Math.max(0,p.weight)),0);
  const rows=departments.map(department=>{
    const facts=selected.map(p=>({factor:p.factor,value:department[p.factor],matches:department[p.factor]===null ? null : p.values.includes(department[p.factor]!),hard:p.hard,weight:Math.min(3,Math.max(0,p.weight))}));
    const failed=facts.some(f=>f.hard&&f.matches===false);
    const unverified=facts.some(f=>f.hard&&f.matches===null);
    const covered=facts.filter(f=>!f.hard&&f.matches!==null).reduce((s,f)=>s+f.weight,0);
    const coverage=denominator?covered/denominator:1;
    const contributions=facts.filter(f=>!f.hard&&f.matches!==null).map(f=>({...f,contribution:denominator?(f.matches?f.weight:0)/denominator:0}));
    const group=failed?'excluded':unverified?'unverified':coverage<1?'insufficient':'comparable';
    return {department,facts,contributions,coverage,score:group==='comparable'&&denominator>0?contributions.reduce((s,f)=>s+f.contribution,0):null,group};
  });
  const sort=(a:typeof rows[number],b:typeof rows[number])=>(b.score??0)-(a.score??0)||stable(a.department.id,b.department.id);
  return {ranked:denominator>0,comparable:rows.filter(r=>r.group==='comparable').sort(sort),insufficient:rows.filter(r=>r.group==='insufficient'),unverified:rows.filter(r=>r.group==='unverified'),excluded:rows.filter(r=>r.group==='excluded')};
}
export function catalogProfile(name:string) {
  const normalize=(s:string)=>s.replace(/[.״"׳'\s-]/g,'');
  return profiles.find(p=>[p.label,...p.aliases].some(n=>normalize(n)===normalize(name)));
}
