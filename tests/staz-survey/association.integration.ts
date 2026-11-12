import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { SOURCE_ID, effectiveCandidate, ratingMatchesCandidate, type Candidate } from '../../src/lib/staz-survey/domain';
import { parseCandidates, verifyWorkbook } from '../../src/server/staz-survey/parse';
import { repairElectiveAssociations } from '../../src/server/staz-survey/repair';
import { importCandidates } from '../../src/server/staz-survey/importer';
import { moderate } from '../../src/server/staz-survey/moderation';
import { publicSurveyWhere } from '../../src/server/staz-survey/public';
import { unseal } from '../../src/server/external-survey/crypto';
async function main() {
  const p = process.env.STAZ_REPAIR_PRIVATE_DIR!; assert.ok(p);
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.STAZ_REPAIR_DATABASE_HOST);
  assert.ok(!process.env.STAZ_REPAIR_DATABASE_HOST?.startsWith('ep-odd-pine-'));
  const candidates = await verifyWorkbook(parseCandidates(await readFile(p+'/staz_positive_reviews_download.csv')), p+'/staz_survey_processed_download.xlsm');
  const db = new PrismaClient({ log: [] });
  try {
    const native = async () => { const out: Record<string, unknown> = {}; for (const table of ['Review','ReviewSubmission','Department','User','DepartmentMetric']) out[table] = await db.$queryRawUnsafe(`SELECT count(*)::int AS n, md5(string_agg(to_jsonb(r)::text, '' ORDER BY id)) AS digest FROM "${table}" r`); return out; };
    const baseline = await native();
    const approvals = async () => db.surveyReview.findMany({ where: { sourceId: SOURCE_ID, status: 'APPROVED' }, select: { id: true, status: true, publishText: true, publishRatings: true, approvedPublicText: true, targetDepartmentId: true, targetMedicalArrayId: true, mappingConfirmed: true, reviewedByUserId: true, reviewedAt: true, ratings: { select: { id: true, selected: true, normalizedValue: true, sourceColumn: true } } }, orderBy: { id: 'asc' } });
    const approvedBefore = await approvals();
    const planned = await repairElectiveAssociations(db, candidates); assert.equal(planned.corrections,34); assert.equal(planned.numericRatingsChanged,1);
    const applied = await repairElectiveAssociations(db, candidates,true); assert.equal(applied.corrections,34); assert.equal(applied.contextEnriched,2856);
    assert.deepEqual(await approvals(),approvedBefore,'ALL_EXISTING_APPROVALS_PRESERVED');
    for (const c of candidates.filter(c=>c.electiveCorrection)) {
      const r = await db.surveyReview.findUniqueOrThrow({ where: { sourceReviewKey: c.sourceReviewKey }, include: { ratings: true } });
      const raw=unseal<Candidate>(r.rawEncrypted,r.sourceReviewKey), effective=effectiveCandidate(raw);
      assert.equal(raw.originalHospital,c.originalHospital); assert.equal(raw.originalText,c.originalText);
      assert.equal(r.originalHospital,effective.originalHospital); assert.equal(r.originalDepartmentOrScope,effective.originalDepartmentOrScope);
      assert.equal(r.ratings[0].sourceColumn,effective.ratings[0].sourceColumn); assert.equal(r.ratings[0].normalizedValue,effective.ratings[0].normalizedValue);
      assert.equal(r.ratings[0].selected,false); assert.equal(r.status,'PENDING_REVIEW');
    }
    const lower=await db.surveyReview.findUniqueOrThrow({where:{sourceReviewKey:SOURCE_ID+':R6224:CBL'},include:{ratings:true}}); assert.equal(lower.ratings[0].normalizedValue,3); assert.equal(lower.ratings[0].sourceColumn,'BO'); assert.equal(lower.suggestedDepartmentId,null); assert.equal(lower.suggestedMedicalArrayId,null);
    assert.equal(await db.surveyReview.count({where:publicSurveyWhere()}),0);
    const admin=await db.user.findFirstOrThrow({where:{roleKey:'ADMIN'},select:{id:true}});
    let r=await db.surveyReview.findUniqueOrThrow({where:{sourceReviewKey:SOURCE_ID+':R84:CBP'},include:{ratings:true}});
    assert.equal(r.originalHospital,'איכילוב - סוראסקי'); assert.equal(r.ratings[0].sourceColumn,'BK');
    assert.ok(ratingMatchesCandidate(unseal<Candidate>(r.rawEncrypted,r.sourceReviewKey),r.ratings[0]));
    const target={targetDepartmentId:r.suggestedDepartmentId,targetMedicalArrayId:r.suggestedMedicalArrayId};assert.ok(target.targetDepartmentId||target.targetMedicalArrayId);
    const result=await moderate(db,r.id,{revision:r.revision,component:'RATING',action:'PUBLISH',...target,mappingExceptionReason:'',reviewed:true,metricId:r.ratings[0].id},{userId:admin.id,name:'בדיקת תיקון בסביבה מבודדת'});
    assert.equal(result.status,'APPROVED');r=await db.surveyReview.findUniqueOrThrow({where:{id:r.id},include:{ratings:true}});assert.equal(r.publishText,false);assert.equal(r.publishRatings,true);assert.equal(r.ratings[0].selected,true);
    const repeated=await repairElectiveAssociations(db,candidates,true);assert.equal(repeated.corrections,0);assert.equal(repeated.contextEnriched,0);
    const reimport=await importCandidates(db,candidates,'isolated-association-reimport',admin.id);assert.equal(reimport.inserted,0);assert.equal(reimport.changed,0);
    assert.deepEqual(await db.surveyReview.findUniqueOrThrow({where:{id:r.id},include:{ratings:true}}),r,'REIMPORT_PRESERVES_CORRECTION_AND_SELECTION');
    assert.equal(await db.surveyReview.count({where:publicSurveyWhere()}),0);
    assert.deepEqual(await native(),baseline,'NATIVE_DATA_UNCHANGED');
    const report={passed:true,planned:34,corrected:34,enriched:2856,numericRatingChanges:1,existingApprovalsPreserved:approvedBefore.length,originalEvidencePreserved:true,sourceHidden:true,correctedRatingCanBeManuallyApproved:true,selectedMetricPreservedOnRepeat:true,repeatedRepairNoChanges:true,repeatedImportNoChanges:true,nativeDataUnchanged:true};
    await writeFile('docs/staz-survey-repair-20261112/integration.json',JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify(report));
  } finally { await db.$disconnect(); }
}
main().catch(e=>{console.error(e?.code??'ASSOCIATION_INTEGRATION_FAILED',e instanceof assert.AssertionError?e.message:'');process.exitCode=1;});
