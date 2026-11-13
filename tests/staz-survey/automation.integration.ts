import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
import {SOURCE_ID,effectiveCandidate,type Candidate} from '../../src/lib/staz-survey/domain';
import {parseCandidates,verifyWorkbook,fingerprint} from '../../src/server/staz-survey/parse';
import {readCatalog} from '../../src/server/staz-survey/catalog';
import {applyAutomaticReviews} from '../../src/server/staz-survey/automation';
import {planAutomaticReview,AUTO_VERSION} from '../../src/server/staz-survey/auto-policy';
import {unseal} from '../../src/server/external-survey/crypto';
import {changeSource,moderate} from '../../src/server/staz-survey/moderation';
import {importCandidates} from '../../src/server/staz-survey/importer';
import {automationQueueWhere} from '../../src/server/staz-survey/queue';
import {publicSurveyWhere,publicSurveyExperiences} from '../../src/server/staz-survey/public';
async function main(){
 assert.equal(new URL(process.env.DATABASE_URL!).hostname,process.env.STAZ_AUTOMATION_DATABASE_HOST);assert.ok(!process.env.DATABASE_URL!.includes('ep-odd-pine-'));
 const p=process.env.STAZ_REPAIR_PRIVATE_DIR!,db=new PrismaClient({log:[]});
 try{
  const candidates=await verifyWorkbook(parseCandidates(await readFile(p+'/staz_positive_reviews_download.csv')),p+'/staz_survey_processed_download.xlsm');
  const source=await db.surveyReviewSource.findUniqueOrThrow({where:{id:SOURCE_ID}}),actor=source.permissionConfirmedBy!;
  assert.equal(source.isPublicEnabled,false);const catalog=await readCatalog(db);
  const read=()=>db.surveyReview.findMany({where:{sourceId:SOURCE_ID},include:{ratings:true},orderBy:{id:'asc'}});
  const before=await read(),byKey=new Map(before.map(r=>[r.sourceReviewKey,r]));
  const native=async()=>{const out:Record<string,unknown>={};for(const t of ['Review','ReviewSubmission','Department','User','DepartmentMetric'])out[t]=await db.$queryRawUnsafe(`SELECT count(*)::int AS n,md5(string_agg(to_jsonb(r)::text,'' ORDER BY id)) AS digest FROM "${t}" r`);return out;};
  const baseline=await native();
  const run=(execute:boolean)=>db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(72613011)`;return applyAutomaticReviews(tx,{actorUserId:actor,catalog,candidates,execute});},{timeout:120000});
  const planned=await run(false);assert.deepEqual(await read(),before,'DRY_RUN_CHANGED_DATA');
  const applied=await run(true);assert.deepEqual({...applied,execute:false},planned);
  const after=await read();let texts=0,ratings=0,manual=0;
  for(const row of after){
   const old=byKey.get(row.sourceReviewKey)!,raw=unseal<Candidate>(row.rawEncrypted,row.sourceReviewKey),c=candidates.find(c=>c.sourceReviewKey===row.sourceReviewKey)!;
   assert.equal(fingerprint(raw),old.sourceFingerprint);assert.equal(raw.originalText,c.originalText);assert.deepEqual(raw.electiveCorrection,c.electiveCorrection);assert.equal(row.automationVersion,AUTO_VERSION);
   for(const r of row.ratings){const prior=old.ratings.find(v=>v.id===r.id)!;assert.deepEqual({...r,selected:prior.selected},prior,'RATING_EVIDENCE_CHANGED');}
   if(old.reviewedAt){manual++;assert.equal(row.automationCategory,'MANUAL');for(const k of ['status','publishText','publishRatings','approvedPublicText','targetDepartmentId','targetMedicalArrayId','mappingConfirmed','privacyReviewed','adminNotes','reviewedByUserId','reviewedByName'] as const)assert.equal(row[k],old[k]);assert.deepEqual(row.reviewedAt,old.reviewedAt);assert.deepEqual(row.ratings,old.ratings);continue;}
   const plan=planAutomaticReview(c,catalog,old.ratings);assert.equal(row.automationCategory,plan.category);assert.equal(row.publishText,plan.approveText);assert.equal(row.publishRatings,plan.selectedMetricIds.length>0);
   assert.deepEqual(row.ratings.filter(r=>r.selected).map(r=>r.id),plan.selectedMetricIds);
   if(row.publishText){texts++;assert.equal(row.approvedPublicText,c.proposedText);assert.equal(plan.category,'POSITIVE');}
   for(const r of row.ratings.filter(r=>r.selected)){ratings++;assert.ok(r.verified&&r.normalizedValue!>=3);assert.equal(r.sourceColumn,effectiveCandidate(c).ratings[0].sourceColumn);}
   if(['MAPPING','ASSOCIATION','EXCLUDED'].includes(plan.category)){assert.equal(row.publishText,false);assert.equal(row.publishRatings,false);}
  }
  assert.equal(texts,applied.approvedText);assert.equal(ratings,applied.approvedRatings);assert.equal(manual,59);
  assert.equal(await db.surveyReview.count({where:publicSurveyWhere()}),0);
  const repeated=await run(true);assert.equal(repeated.changed,0);assert.deepEqual(await read(),after);
  await db.surveyReviewSource.update({where:{id:SOURCE_ID},data:{autoApprovalEnabled:true}});
  const imported=await importCandidates(db,candidates,'automatic-policy-reimport',actor);assert.equal(imported.inserted,0);assert.equal(imported.changed,0);assert.deepEqual(await read(),after);
  let gate=await db.surveyReviewSource.findUniqueOrThrow({where:{id:SOURCE_ID}});
  gate=await changeSource(db,{revision:gate.revision,action:'ENABLE',confirmed:true},actor);
  const publicCount=await db.surveyReview.count({where:publicSurveyWhere()});assert.ok(publicCount>59);
  const sample=after.find(r=>r.automationCategory==='UNCERTAIN'&&r.publishRatings&&r.targetDepartmentId)!;assert.ok(sample);
  const visible=await publicSurveyExperiences(db,[sample.targetDepartmentId!],{role:'admin'});const displayed=visible.find(r=>r.id===sample.id)!;assert.equal(displayed.text,null);assert.ok(displayed.ratings.length);
  const decisionBefore=await read();
  // Emergency hide works from a stale tab; restoration retains all choices.
  gate=await changeSource(db,{revision:0,action:'HIDE',confirmed:true},actor);assert.equal(await db.surveyReview.count({where:publicSurveyWhere()}),0);
  gate=await changeSource(db,{revision:gate.revision,action:'ENABLE',confirmed:true},actor);assert.equal(await db.surveyReview.count({where:publicSurveyWhere()}),publicCount);assert.deepEqual(await read(),decisionBefore);
  await moderate(db,sample.id,{revision:sample.revision,component:'TEXT',action:'HIDE',targetDepartmentId:sample.targetDepartmentId,targetMedicalArrayId:sample.targetMedicalArrayId,mappingExceptionReason:'',reviewed:true},{userId:actor,name:'בדיקה ידנית בסביבה מבודדת'});
  const resolved=await db.surveyReview.findUniqueOrThrow({where:{id:sample.id},include:{ratings:true}});assert.equal(resolved.automationCategory,'MANUAL');assert.equal(resolved.publishRatings,true);assert.equal(resolved.publishText,false);
  assert.equal(await db.surveyReview.count({where:{id:sample.id,...automationQueueWhere('uncertain')}}),0);
  await run(true);assert.deepEqual(await db.surveyReview.findUniqueOrThrow({where:{id:sample.id},include:{ratings:true}}),resolved,'RERUN_OVERRIDES_MANUAL_DECISION');
  gate=await changeSource(db,{revision:gate.revision,action:'HIDE',confirmed:true},actor);
  // Unverified CSV-only additions cannot acquire approval, even with automation enabled.
  const unverified={...candidates[0],sourceReviewKey:SOURCE_ID+':R49031:CBL',sourceRowNumber:49031,sourceVerified:false,workbookHash:null,sourceEncodingProfile:undefined,ratings:[],electives:undefined,electiveCorrection:undefined};
  await importCandidates(db,[unverified],'automatic-unverified-fixture',actor);
  const blocked=await db.surveyReview.findUniqueOrThrow({where:{sourceReviewKey:unverified.sourceReviewKey}});assert.equal(blocked.status,'PENDING_REVIEW');assert.equal(blocked.publishText,false);assert.equal(blocked.publishRatings,false);
  assert.deepEqual(await native(),baseline);
  const report={passed:true,planned:planned.categories,approvedText:texts,approvedRatings:ratings,newApprovedReviews:applied.newApprovedReviews,manualDecisionsPreserved:manual,recordsChecked:before.length,ratingEvidenceUnchanged:true,textAndRatingsIndependent:true,defaultQueueOnlyUncertainText:true,hideRestoresAllApprovals:true,publicCountWhenEnabled:publicCount,repeatedImportAndAutomationIdempotent:true,manualTextRejectionPreservesRating:true,unverifiedCsvRemainsPending:true,nativeDataUnchanged:true};
  await writeFile('docs/staz-survey-automation-20261113/integration.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await db.$disconnect();}
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:e?.code??'AUTOMATION_INTEGRATION_FAILED');process.exitCode=1;});
