import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { SOURCE_ID, effectiveCandidate, ratingMatchesCandidate, type Candidate } from '../../src/lib/staz-survey/domain';
import { parseCandidates, verifyWorkbook, fingerprint } from '../../src/server/staz-survey/parse';
import { repairElectiveAssociations } from '../../src/server/staz-survey/repair';
import { importCandidates } from '../../src/server/staz-survey/importer';
import { publicSurveyWhere } from '../../src/server/staz-survey/public';
import { unseal } from '../../src/server/external-survey/crypto';
async function main() {
  const p = process.env.STAZ_REPAIR_PRIVATE_DIR!; assert.ok(p);
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.STAZ_REPAIR_DATABASE_HOST);
  assert.ok(!process.env.STAZ_REPAIR_DATABASE_HOST?.startsWith('ep-odd-pine-'));
  const candidates = await verifyWorkbook(parseCandidates(await readFile(p+'/staz_positive_reviews_download.csv')), p+'/staz_survey_processed_download.xlsm');
  const db = new PrismaClient({ log: [] });
  try {
    const native = async () => {
      const out: Record<string, unknown> = {};
      for (const table of ['Review','ReviewSubmission','Department','User','DepartmentMetric']) out[table] = await db.$queryRawUnsafe(`SELECT count(*)::int AS n, md5(string_agg(to_jsonb(r)::text, '' ORDER BY id)) AS digest FROM "${table}" r`);
      return out;
    };
    const baseline = await native();
    const readRows = () => db.surveyReview.findMany({ where: { sourceId: SOURCE_ID }, include: { ratings: true }, orderBy: { id: 'asc' } });
    const before = await readRows(), beforeByKey = new Map(before.map(r => [r.sourceReviewKey, r]));
    const decisions = (rows: typeof before) => rows.map(r => [r.id, r.status, r.publishText, r.publishRatings, r.approvedPublicText, r.privacyReviewed, r.reviewedAt, r.reviewedByUserId, r.reviewedByName, r.adminNotes, r.ratings.map(v => [v.id,v.selected])]);
    const auditBefore = await db.auditLog.count({ where: { action: 'STAZ_ELECTIVE_ASSOCIATION_CORRECTED' } });
    const planned = await repairElectiveAssociations(db, candidates);
    assert.equal(planned.corrections,861); assert.equal(planned.numericRatingsChanged,41); assert.equal(planned.approvedCorrections,3);
    assert.deepEqual(await readRows(),before,'DRY_RUN_MUTATED_DATA');
    const tampered = structuredClone(candidates);
    tampered.find(c => c.sourceReviewKey===SOURCE_ID+':R76:CBL')!.electives!.ELECTIVE_2.rating.rawAnswer='4-במידה רבה';
    await assert.rejects(repairElectiveAssociations(db,tampered,true));
    assert.deepEqual(await readRows(),before,'FAILED_REPAIR_MUTATED_DATA');
    const applied = await repairElectiveAssociations(db,candidates,true);
    assert.equal(applied.corrections,861); assert.equal(applied.contextEnriched,0);
    const after=await readRows(), byKey=new Map(after.map(r=>[r.sourceReviewKey,r]));
    assert.deepEqual(decisions(after),decisions(before),'APPROVAL_CHOICES_CHANGED');
    let corrected=0;
    for (const c of candidates) {
      const r=byKey.get(c.sourceReviewKey)!, old=beforeByKey.get(c.sourceReviewKey)!;
      const raw=unseal<Candidate>(r.rawEncrypted,r.sourceReviewKey), effective=effectiveCandidate(c);
      assert.equal(fingerprint(raw),fingerprint(c)); assert.equal(raw.originalText,c.originalText);
      assert.deepEqual(raw.electiveCorrection,c.electiveCorrection);
      assert.equal(r.originalHospital,effective.originalHospital); assert.equal(r.originalDepartmentOrScope,effective.originalDepartmentOrScope);
      if (c.sourceColumnLetter!=='BG') {
        const rating=effective.ratings[0];
        for(const k of Object.keys(rating) as (keyof typeof rating)[]) assert.equal(r.ratings[0][k],rating[k]);
        assert.equal(ratingMatchesCandidate(raw,r.ratings[0]),rating.verified);
      }
      if(c.electiveCorrection?.version==='2026-11-12-encoding-v2') {
        corrected++; assert.equal(r.revision,old.revision+1);
      } else assert.deepEqual(r,old,'PREVIOUSLY_CORRECTED_OR_UNCLASSIFIED_ROW_CHANGED');
    }
    assert.equal(corrected,861);
    assert.equal(await db.auditLog.count({where:{action:'STAZ_ELECTIVE_ASSOCIATION_CORRECTED'}})-auditBefore,861);
    const one=byKey.get(SOURCE_ID+':R76:CBL')!,two=byKey.get(SOURCE_ID+':R76:CBP')!,three=byKey.get(SOURCE_ID+':R92:CBP')!;
    assert.equal(one.originalHospital,'רבין בילינסון'); assert.equal(one.ratings[0].normalizedValue,3); assert.equal(one.publishRatings,true);
    assert.equal(two.originalHospital,'מאיר'); assert.equal(two.ratings[0].normalizedValue,5); assert.equal(two.publishRatings,false);
    assert.equal(three.originalHospital,'אסף הרופא'); assert.equal(three.ratings[0].normalizedValue,5);
    for(const r of [one,two,three]) { assert.equal(r.status,'APPROVED'); assert.ok(r.targetDepartmentId||r.targetMedicalArrayId); }
    const repeated=await repairElectiveAssociations(db,candidates,true); assert.equal(repeated.corrections,0);
    const admin=await db.user.findFirstOrThrow({where:{roleKey:'ADMIN'},select:{id:true}});
    const reimport=await importCandidates(db,candidates,'isolated-encoding-reimport',admin.id); assert.equal(reimport.inserted,0); assert.equal(reimport.changed,0);
    assert.deepEqual(await readRows(),after,'REIMPORT_OR_REPEAT_CHANGED_DATA');
    assert.equal((await db.surveyReviewSource.findUniqueOrThrow({where:{id:SOURCE_ID}})).isPublicEnabled,false);
    assert.equal(await db.surveyReview.count({where:publicSurveyWhere()}),0);
    assert.deepEqual(await native(),baseline,'NATIVE_DATA_CHANGED');
    const report={passed:true,additionalCorrections:861,totalCorrected:895,numericRatingChanges:41,approvedCorrections:3,approvalsPreserved:before.filter(r=>r.status==='APPROVED').length,recordsVerified:after.length,originalEvidencePreserved:true,prior34CorrectionsUnchanged:true,unknownAndLegacyUnchanged:true,dryRunReadOnly:true,tamperedEvidenceRolledBack:true,oneAuditPerCorrection:true,repeatedRepairAndImportUnchanged:true,nativeDataUnchanged:true,sourceEnabled:false,publiclyEligible:0};
    await writeFile('docs/staz-survey-encoding-20261112/integration.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }finally{await db.$disconnect();}
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:e?.code??'ENCODING_INTEGRATION_FAILED');process.exitCode=1;});
