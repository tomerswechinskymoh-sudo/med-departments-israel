import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { SOURCE_ID, sourceAllowsPublication, type Candidate, type DepartmentOption } from '@/lib/staz-survey/domain';
import { seal, unseal } from '@/server/external-survey/crypto';
import { sanitizePlainText } from '@/lib/security';
import { fingerprint } from './parse';
import { electiveContextHash } from './association';
import { AUTO_VERSION, planAutomaticReview } from './auto-policy';

// Caller holds the shared survey advisory lock. This never changes visibility;
// an emergency HIDE must remain effective during and after automatic approval.
export async function applyAutomaticReviews(tx: Prisma.TransactionClient, options: {
  actorUserId: string | null; catalog: DepartmentOption[]; sourceKeys?: string[]; candidates?: Candidate[]; execute: boolean;
}) {
  const source=await tx.surveyReviewSource.findUniqueOrThrow({where:{id:SOURCE_ID}});
  assert.ok(sourceAllowsPublication({...source,isPublicEnabled:true}),'SOURCE_PERMISSION_REQUIRED');
  const rows=await tx.surveyReview.findMany({where:{sourceId:SOURCE_ID,...(options.sourceKeys?{sourceReviewKey:{in:options.sourceKeys}}:{})},include:{ratings:true}});
  const candidates=new Map(options.candidates?.map(c=>[c.sourceReviewKey,c]));
  const report={version:AUTO_VERSION,execute:options.execute,reviewed:rows.length,changed:0,alreadyCurrent:0,manualDecisionsPreserved:0,approvedText:0,approvedRatings:0,newApprovedReviews:0,categories:{} as Record<string,number>,sourceEnabled:source.isPublicEnabled};
  const updates: Record<string,unknown>[]=[], selections:{id:string}[]=[], audit:Prisma.AuditLogCreateManyInput[]=[];
  const decisionSnapshot=(r:typeof rows[number])=>[r.status,r.targetDepartmentId,r.targetMedicalArrayId,r.mappingConfirmed,r.mappingExceptionReason,r.approvedPublicText,r.publishText,r.publishRatings,r.privacyReviewed,r.adminNotes,r.reviewedAt?.toISOString(),r.reviewedByUserId,r.reviewedByName,r.ratings.map(v=>[v.id,v.selected])];
  const manualBefore=new Map<string,string>();
  for(const row of rows){
    const manual=row.automationCategory==='MANUAL'||Boolean(row.reviewedAt && !row.automationVersion)||row.status==='REJECTED';
    if(manual){report.manualDecisionsPreserved++;manualBefore.set(row.id,JSON.stringify(decisionSnapshot(row)));}
    if(row.automationVersion===AUTO_VERSION){report.alreadyCurrent++;report.categories[row.automationCategory??'UNCERTAIN']=(report.categories[row.automationCategory??'UNCERTAIN']??0)+1;continue;}
    let candidate=unseal<Candidate>(row.rawEncrypted,row.sourceReviewKey);
    const verified=candidates.get(row.sourceReviewKey);
    if(verified){
      assert.equal(fingerprint(verified),row.sourceFingerprint,'SOURCE_CHANGED');assert.equal(fingerprint(candidate),row.sourceFingerprint,'SEALED_SOURCE_CHANGED');
      assert.equal(row.workbookHash,verified.workbookHash);assert.equal(candidate.originalText,verified.originalText);
      if(candidate.electives)assert.equal(electiveContextHash(candidate),electiveContextHash(verified));
      assert.deepEqual(candidate.electiveCorrection,verified.electiveCorrection,'CORRECTION_CHANGED');
      candidate={...candidate,sourceEncodingProfile:verified.sourceEncodingProfile};
    }
    const plan=planAutomaticReview(candidate,options.catalog,row.ratings);
    const category=manual?'MANUAL':plan.category,reason=manual?'החלטה ידנית קיימת נשמרה; האוטומציה אינה משנה אותה.':plan.reason;
    report.categories[category]=(report.categories[category]??0)+1;
    const approve=!manual&&(plan.approveText||plan.selectedMetricIds.length>0);
    const data:Record<string,unknown>={id:row.id,automationCategory:category,automationReason:reason,automationVersion:AUTO_VERSION,rawEncrypted:seal(candidate,row.sourceReviewKey),
      status:row.status,targetDepartmentId:row.targetDepartmentId,targetMedicalArrayId:row.targetMedicalArrayId,mappedInstitutionId:row.mappedInstitutionId,mappingConfirmed:row.mappingConfirmed,
      approvedPublicText:row.approvedPublicText,publishText:row.publishText,publishRatings:row.publishRatings,privacyReviewed:row.privacyReviewed,reviewedAt:row.reviewedAt?.toISOString()??null,reviewedByUserId:row.reviewedByUserId,reviewedByName:row.reviewedByName};
    if(approve){
      assert.ok(plan.suggestedDepartmentId||plan.suggestedMedicalArrayId);
      Object.assign(data,{status:'APPROVED',targetDepartmentId:plan.suggestedDepartmentId,targetMedicalArrayId:plan.suggestedMedicalArrayId,mappedInstitutionId:plan.mappedInstitutionId,mappingConfirmed:true,
        approvedPublicText:plan.approveText?sanitizePlainText(candidate.proposedText,12000):null,publishText:plan.approveText,publishRatings:plan.selectedMetricIds.length>0,privacyReviewed:true,
        reviewedAt:new Date().toISOString(),reviewedByUserId:options.actorUserId,reviewedByName:'אישור אוטומטי לפי הנחיית מנהל האתר'});
      if(plan.approveText)report.approvedText++;
      report.approvedRatings+=plan.selectedMetricIds.length;report.newApprovedReviews++;
      selections.push(...plan.selectedMetricIds.map(id=>({id})));
    }
    report.changed++;updates.push(data);
    audit.push({actorUserId:options.actorUserId,action:approve?'STAZ_REVIEW_AUTO_APPROVED':'STAZ_REVIEW_AUTO_CLASSIFIED',entityType:'SurveyReview',entityId:row.id,
      metadata:{version:AUTO_VERSION,authorizationChannel:'user-chat',authorizationDate:'2026-11-13',category,reason,privacyMethod:plan.approveText?'CONSERVATIVE_LANGUAGE_AND_IDENTIFIER_SCREEN':'NO_NEW_TEXT_PUBLISHED',manualPreserved:manual,before:{status:row.status,publishText:row.publishText,publishRatings:row.publishRatings,targetDepartmentId:row.targetDepartmentId,targetMedicalArrayId:row.targetMedicalArrayId},after:{status:data.status,publishText:data.publishText,publishRatings:data.publishRatings,targetDepartmentId:data.targetDepartmentId,targetMedicalArrayId:data.targetMedicalArrayId,selectedMetricIds:manual?row.ratings.filter(r=>r.selected).map(r=>r.id):plan.selectedMetricIds},textHash:fingerprint(candidate)} as Prisma.InputJsonValue});
  }
  if(options.execute&&updates.length){
    for(let i=0;i<updates.length;i+=100){
      const payload=JSON.stringify(updates.slice(i,i+100));
      const count=await tx.$executeRaw`UPDATE "SurveyReview" r SET "automationCategory"=e."automationCategory","automationReason"=e."automationReason","automationVersion"=e."automationVersion","rawEncrypted"=e."rawEncrypted",
        status=e.status::"SurveyReviewStatus","targetDepartmentId"=e."targetDepartmentId","targetMedicalArrayId"=e."targetMedicalArrayId","mappedInstitutionId"=e."mappedInstitutionId","mappingConfirmed"=e."mappingConfirmed",
        "approvedPublicText"=e."approvedPublicText","publishText"=e."publishText","publishRatings"=e."publishRatings","privacyReviewed"=e."privacyReviewed","reviewedAt"=e."reviewedAt","reviewedByUserId"=e."reviewedByUserId","reviewedByName"=e."reviewedByName",revision=r.revision+1,"updatedAt"=now()
        FROM jsonb_to_recordset(${payload}::jsonb) AS e(id text,"automationCategory" text,"automationReason" text,"automationVersion" text,"rawEncrypted" text,status text,
          "targetDepartmentId" text,"targetMedicalArrayId" text,"mappedInstitutionId" text,"mappingConfirmed" boolean,"approvedPublicText" text,"publishText" boolean,"publishRatings" boolean,"privacyReviewed" boolean,"reviewedAt" timestamp,"reviewedByUserId" text,"reviewedByName" text)
        WHERE r.id=e.id AND r."sourceId"=${SOURCE_ID}`;
      assert.equal(count,updates.slice(i,i+100).length);
      await tx.auditLog.createMany({data:audit.slice(i,i+100)});
    }
    if(selections.length)await tx.surveyReviewRating.updateMany({where:{id:{in:selections.map(s=>s.id)},review:{sourceId:SOURCE_ID}},data:{selected:true}});
    const afterManual=await tx.surveyReview.findMany({where:{id:{in:[...manualBefore.keys()]}},include:{ratings:true}});
    for(const r of afterManual)assert.equal(JSON.stringify(decisionSnapshot(r)),manualBefore.get(r.id),'MANUAL_DECISION_CHANGED');
    await tx.auditLog.create({data:{actorUserId:options.actorUserId,action:'STAZ_AUTO_APPROVAL_COMPLETED',entityType:'SurveyReviewSource',entityId:SOURCE_ID,metadata:{...report,authorizationChannel:'user-chat'} as Prisma.InputJsonValue}});
  }
  return report;
}
