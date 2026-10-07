import { RIASEC,domains,medical,mms,crosswalk,type AnswerMap,type Mode,type Interest,type Item,type Domain,type Crosswalk } from './model';
const valid=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
export function interestProfile(mode:Mode,answers:AnswerMap) {
 const items=medical; // Both tracks use the same original medical instrument.
 return Object.fromEntries(RIASEC.map(d=>{
  const group=items.filter(i=>i.dimension===d),values=group.map(i=>answers[i.id]).filter(v=>valid(v,0,4));
  const complete=values.length===group.length;
  const sum=complete?values.reduce((a,b)=>a+b,0):null;
  return [d,{count:values.length,total:group.length,sum,max:group.length*4,normalized:sum===null?null:sum/(group.length*4)}];
 })) as Record<Interest,{count:number;total:number;sum:number|null;max:number;normalized:number|null}>;
}
/** Experimental shape comparison, retaining the prior Pearson implementation.
 * The original medical items have NOT established equivalence to O*NET constructs.
 * Contributions sum to r, not to a probability. Constant vectors have no correlation. */
export function correlate(x:readonly number[],y:readonly number[]) {
 if(x.length!==6||y.length!==6||[...x,...y].some(v=>!Number.isFinite(v)))return null;
 const center=(v:readonly number[])=>{const mean=v.reduce((a,b)=>a+b,0)/v.length;return v.map(n=>n-mean);};
 const a=center(x),b=center(y),den=Math.sqrt(a.reduce((s,v)=>s+v*v,0)*b.reduce((s,v)=>s+v*v,0));
 if(den<1e-12)return null;
 const contributions=a.map((v,i)=>v*b[i]/den);
 const r=Math.max(-1,Math.min(1,contributions.reduce((s,v)=>s+v,0)));
 return {r,index:50*(r+1),contributions,userCentered:a,occupationCentered:b};
}
export function rankSpecialties(mode:Mode,answers:AnswerMap,candidates:readonly Crosswalk[]=crosswalk) {
 const profile=interestProfile(mode,answers),complete=RIASEC.every(d=>profile[d].normalized!==null);
 if(!complete)return {profile,status:'INCOMPLETE' as const,ranked:[]};
 const user=RIASEC.map(d=>profile[d].normalized!);
 if(correlate(user,user)===null)return {profile,status:'UNDIFFERENTIATED' as const,ranked:[]};
 const ranked=candidates.filter(c=>c.mapping==='direct'&&c.code&&c.scores).flatMap(c=>{
  const occupation=RIASEC.map(d=>c.scores![d]);
  if(occupation.some(v=>!Number.isFinite(v)||v<1||v>7))return [];
  const comparison=correlate(user,occupation);if(!comparison)return [];
  return [{specialty:c,correlation:comparison.r,index:comparison.index,displayIndex:Math.round(comparison.index),
   // Stable numerical ties at 12 decimal places; not tuned to any specialty.
   sortKey:Math.round(comparison.r*1e12),
   dimensions:RIASEC.map((dimension,i)=>({dimension,user:user[i],occupation:occupation[i],occupationNormalized:(occupation[i]-1)/6,contribution:comparison.contributions[i],userCentered:comparison.userCentered[i],occupationCentered:comparison.occupationCentered[i]}))}];
 }).sort((a,b)=>b.sortKey-a.sortKey||(a.specialty.code!<b.specialty.code!?-1:a.specialty.code!>b.specialty.code!?1:0));
 return {profile,status:'READY' as const,ranked};
}
export function motivationProfile(answers:AnswerMap) {
 return Object.fromEntries(domains.map(d=>{
  const group=mms.filter(i=>i.domain===d),values=group.map(i=>answers[i.id]).filter(v=>valid(v,1,5));
  const mean=values.length===group.length?values.reduce((s,v)=>s+v,0)/group.length:null;
  return [d,{count:values.length,total:group.length,mean,normalized:mean===null?null:(mean-1)/4}];
 })) as Record<Domain,{count:number;total:number;mean:number|null;normalized:number|null}>;
}
export function answered(item:Item,answers:AnswerMap) {return valid(answers[item.id],item.dimension?0:1,item.dimension?4:5);}
