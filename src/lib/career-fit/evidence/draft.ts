import {VERSION,itemsFor,medical,type Mode,type AnswerMap} from './model';
import {answered} from './scoring';
export const DRAFT_KEY='hitmachut:medical-fit:draft:v2';
export const MAX_AGE=30*24*60*60*1000;
export type Stage='questions'|'review'|'results';
export type Draft={version:typeof VERSION;mode:Mode;index:number;stage:Stage;answers:AnswerMap;skipped:string[];updatedAt:number};
type StorageLike=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export const makeDraft=(mode:Mode,now=Date.now()):Draft=>({version:VERSION,mode,index:0,stage:'questions',answers:Object.fromEntries(itemsFor(mode).map(i=>[i.id,null])),skipped:[],updatedAt:now});
export function completion(draft:Draft){
 const items=itemsFor(draft.mode),missing=items.filter(i=>!answered(i,draft.answers));
 return {answered:items.length-missing.length,missing,coreMissing:medical.filter(i=>!answered(i,draft.answers)),canSubmit:medical.every(i=>answered(i,draft.answers))};
}
export function jump(draft:Draft,index:number):Draft{
 if(!Number.isInteger(index)||index<0||index>=itemsFor(draft.mode).length)return draft;
 return {...draft,index,stage:'questions'};
}
export function respond(draft:Draft,value:number|null):Draft{
 const item=itemsFor(draft.mode)[draft.index];
 if(value!==null&&!answered(item,{[item.id]:value}))return draft;
 return {...draft,answers:{...draft.answers,[item.id]:value},skipped:value===null?[...new Set([...draft.skipped,item.id])]:draft.skipped.filter(id=>id!==item.id)};
}
export function next(draft:Draft):Draft{return draft.index===itemsFor(draft.mode).length-1?{...draft,stage:'review'}:jump(draft,draft.index+1);}
export function parseDraft(raw:string|null,now=Date.now()):Draft|null{
 try{
  if(!raw||raw.length>30000)return null;
  const d=JSON.parse(raw);
  if(d.version!==VERSION||d.mode!=='quick'||!Number.isFinite(d.updatedAt)||d.updatedAt>now+60000||now-d.updatedAt>MAX_AGE)return null;
  const clean=makeDraft(d.mode,d.updatedAt),items=itemsFor(d.mode);
  if(!Number.isInteger(d.index)||d.index<0||d.index>=items.length||!['questions','review','results'].includes(d.stage)||!d.answers||typeof d.answers!=='object'||!Array.isArray(d.skipped))return null;
  for(const item of items)if(answered(item,d.answers))(clean.answers as Record<string,number|null>)[item.id]=d.answers[item.id];
  clean.index=d.index;clean.stage=d.stage;clean.skipped=items.filter(i=>!answered(i,clean.answers)&&d.skipped.includes(i.id)).map(i=>i.id);
  if(clean.stage==='results'&&!completion(clean).canSubmit)clean.stage='review';
  return clean;
 }catch{return null;}
}
export function readDraft(storage:StorageLike,now=Date.now()){const raw=storage.getItem(DRAFT_KEY),draft=parseDraft(raw,now);if(raw&&!draft)storage.removeItem(DRAFT_KEY);return draft;}
/** Callers catch storage denial/quota errors and disclose that autosave is unavailable. */
export function saveDraft(storage:StorageLike,draft:Draft,now=Date.now()){storage.setItem(DRAFT_KEY,JSON.stringify({...draft,updatedAt:now}));}
export function clearDraft(storage:StorageLike){storage.removeItem(DRAFT_KEY);}
