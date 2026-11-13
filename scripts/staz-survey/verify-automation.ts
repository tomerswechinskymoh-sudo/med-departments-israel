import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
import {SOURCE_ID,effectiveCandidate,ratingMatchesCandidate,type Candidate} from '../../src/lib/staz-survey/domain';
import {parseCandidates,verifyWorkbook,fingerprint} from '../../src/server/staz-survey/parse';
import {unseal} from '../../src/server/external-survey/crypto';
import {AUTO_VERSION,classifyText} from '../../src/server/staz-survey/auto-policy';
import {automationQueueWhere} from '../../src/server/staz-survey/queue';
import {publicSurveyWhere} from '../../src/server/staz-survey/public';
import {changeSource} from '../../src/server/staz-survey/moderation';
async function main(){
 const args=process.argv.slice(2),value=(k:string)=>args[args.indexOf(k)+1];for(const k of ['--csv','--workbook','--report'])assert.ok(args.includes(k));
 assert.equal(new URL(process.env.DATABASE_URL!).hostname,process.env.STAZ_AUTOMATION_DATABASE_HOST);
 const candidates=await verifyWorkbook(parseCandidates(await readFile(value('--csv'))),value('--workbook')),db=new PrismaClient({log:[]});
 try{
  const rows=await db.surveyReview.findMany({where:{sourceId:SOURCE_ID},include:{ratings:true}}),byKey=new Map(rows.map(r=>[r.sourceReviewKey,r]));assert.equal(rows.length,candidates.length);
  let checkedRatings=0,automaticText=0,automaticRatings=0,manual=0;
  for(const c of candidates){
   const row=byKey.get(c.sourceReviewKey)!;assert.ok(row);assert.equal(row.automationVersion,AUTO_VERSION);
   const raw=unseal<Candidate>(row.rawEncrypted,row.sourceReviewKey),effective=effectiveCandidate(c);
   assert.equal(fingerprint(raw),fingerprint(c));assert.equal(row.sourceFingerprint,fingerprint(c));assert.equal(raw.originalText,c.originalText);assert.deepEqual(raw.electiveCorrection,c.electiveCorrection);
   assert.equal(row.originalHospital,effective.originalHospital);assert.equal(row.originalDepartmentOrScope,effective.originalDepartmentOrScope);
   for(const r of row.ratings){const e=effective.ratings.find(e=>e.metricCode===r.metricCode)!;assert.ok(e);for(const k of Object.keys(e) as (keyof typeof e)[])assert.equal(r[k],e[k]);assert.equal(ratingMatchesCandidate(raw,r),e.verified);checkedRatings++;}
   if(row.automationCategory==='MANUAL'){manual++;continue;}
   if(row.publishText){automaticText++;assert.equal(classifyText(row.approvedPublicText!).category,'POSITIVE');assert.equal(row.status,'APPROVED');assert.equal(row.automationCategory,'POSITIVE');}
   for(const r of row.ratings.filter(r=>r.selected)){automaticRatings++;assert.ok(row.publishRatings&&r.verified&&r.normalizedValue!>=3);}
   if(['EXCLUDED','MAPPING','ASSOCIATION'].includes(row.automationCategory!)){assert.equal(row.publishText,false);assert.equal(row.publishRatings,false);}
   if(['UNCERTAIN','PRIVACY','NON_POSITIVE'].includes(row.automationCategory!))assert.equal(row.publishText,false);
  }
  let source=await db.surveyReviewSource.findUniqueOrThrow({where:{id:SOURCE_ID}});assert.equal(source.autoApprovalEnabled,true);
  if(args.includes('--enable')){
   assert.ok(args.includes('--user-authorized-20261113'));
   const actor=await db.user.findFirstOrThrow({where:{id:source.permissionConfirmedBy!,roleKey:'ADMIN'},select:{id:true}});
   if(!source.isPublicEnabled)source=await changeSource(db,{revision:source.revision,action:'ENABLE',confirmed:true},actor.id);
  }
  const categories=rows.reduce((o,r)=>{const k=r.automationCategory!;o[k]=(o[k]??0)+1;return o;},{} as Record<string,number>);
  const report={passed:true,recordsChecked:rows.length,ratingsChecked:checkedRatings,automaticText,automaticRatings,manualDecisionsPreserved:manual,categories,approved:rows.filter(r=>r.status==='APPROVED').length,approvedText:rows.filter(r=>r.status==='APPROVED'&&r.publishText).length,approvedRatings:rows.filter(r=>r.status==='APPROVED'&&r.publishRatings).length,sourceEnabled:source.isPublicEnabled,publiclyEligible:await db.surveyReview.count({where:publicSurveyWhere()}),uncertainQueue:await db.surveyReview.count({where:{sourceId:SOURCE_ID,...automationQueueWhere('uncertain')}}),sourceEvidencePreserved:true,ratingsMatchSameRowElective:true,ratingsAtLeastThreeForAutomation:true};
  await writeFile(value('--report'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await db.$disconnect();}
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:e?.code??'AUTOMATION_VERIFICATION_FAILED');process.exitCode=1;});
