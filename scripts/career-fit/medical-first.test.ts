import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeDraft,respond,jump,next,completion,parseDraft,saveDraft,readDraft,clearDraft,DRAFT_KEY,MAX_AGE} from '../../src/lib/career-fit/evidence/draft';
import {medical,itemsFor,sectionsFor,RIASEC} from '../../src/lib/career-fit/evidence/model';
import {rankSpecialties} from '../../src/lib/career-fit/evidence/scoring';
test('nonlinear question/section jumps do not require preceding answers',()=>{
 for(const mode of ['quick','deep'] as const){let d=makeDraft(mode);for(const section of sectionsFor(mode)){d=jump(d,section.start);assert.equal(d.index,section.start);assert.equal(completion(d).answered,0);}d=jump(d,itemsFor(mode).length-1);d=next(d);assert.equal(d.stage,'review');assert.equal(completion(d).canSubmit,false);assert.equal(jump(d,-1),d);}
});
test('skip remains null, neutral is real answer, editing clears skipped state',()=>{
 let d=makeDraft('quick');d=respond(d,null);assert.equal(d.answers[medical[0].id],null);assert.deepEqual(d.skipped,[medical[0].id]);d=next(d);assert.equal(d.index,1);assert.equal(completion(d).answered,0);d=respond(jump(d,0),2);assert.equal(d.answers[medical[0].id],2);assert.equal(completion(d).answered,1);assert.deepEqual(d.skipped,[]);assert.equal(respond(d,5),d);
});
test('review requires all core, permits disclosed optional gaps, deterministic edits change score',()=>{
 let d=makeDraft('deep');for(let i=0;i<30;i++)d=respond(jump(d,i),[3,4,0,3,1,2][RIASEC.indexOf(medical[i].dimension!)]);
 assert.equal(completion(d).canSubmit,true);assert.equal(completion(d).missing.length,52);
 const before=rankSpecialties('deep',d.answers);assert.deepEqual(before,rankSpecialties('quick',d.answers));d=respond(jump(d,0),0);assert.notDeepEqual(before,rankSpecialties('deep',d.answers));assert.deepEqual(rankSpecialties('deep',d.answers),rankSpecialties('deep',d.answers));d=respond(d,null);assert.equal(completion(d).canSubmit,false);assert.equal(rankSpecialties('deep',d.answers).status,'INCOMPLETE');
});
test('versioned persistence roundtrip, TTL, corrupt/hostile values, results safety, own-key deletion',()=>{
 const map=new Map<string,string>(),storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};
 let d=respond(makeDraft('quick',100),4);saveDraft(storage,d,100);assert.deepEqual(readDraft(storage,101),d);assert.equal(parseDraft('{'),null);assert.equal(parseDraft(JSON.stringify({...d,version:'old'}),100),null);assert.equal(parseDraft(JSON.stringify(d),100+MAX_AGE+1),null);
 assert.equal(parseDraft(JSON.stringify({...d,index:999}),100),null);
 const dirty={...d,stage:'results',answers:{...d.answers,[medical[1].id]:5,unknown:4}};const clean=parseDraft(JSON.stringify(dirty),100)!;assert.equal(clean.stage,'review');assert.equal(clean.answers[medical[1].id],null);assert.equal(clean.answers.unknown,undefined);
 map.set('other','keep');clearDraft(storage);assert.equal(map.get('other'),'keep');assert.equal(map.has(DRAFT_KEY),false);
 const denied={...storage,setItem:()=>{throw new Error('denied');}};assert.throws(()=>saveDraft(denied,d));
});

test('obsolete deep drafts cannot restore a second public questionnaire',()=>{assert.equal(parseDraft(JSON.stringify(makeDraft('deep',100)),100),null);});
