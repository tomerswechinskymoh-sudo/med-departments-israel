import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { SOURCE_ID, effectiveCandidate, ratingMatchesCandidate, type Candidate } from '../../src/lib/staz-survey/domain';
import { parseCandidates, verifyWorkbook, fingerprint } from '../../src/server/staz-survey/parse';
import { unseal } from '../../src/server/external-survey/crypto';
import { publicSurveyWhere } from '../../src/server/staz-survey/public';
async function main() {
  const args=process.argv.slice(2), value=(key:string)=>args[args.indexOf(key)+1];
  assert.ok(args.includes('--csv')&&args.includes('--workbook')&&args.includes('--report'));
  const candidates=await verifyWorkbook(parseCandidates(await readFile(value('--csv'))),value('--workbook'));
  const db=new PrismaClient({log:[]});
  try {
    const rows=await db.surveyReview.findMany({where:{sourceId:SOURCE_ID},include:{ratings:true}}), byKey=new Map(rows.map(r=>[r.sourceReviewKey,r]));
    assert.equal(rows.length,candidates.length);let corrected=0,ratings=0,contexts=0;
    for(const c of candidates){
      const row=byKey.get(c.sourceReviewKey)!;assert.ok(row);
      assert.equal(row.sourceFingerprint,fingerprint(c));assert.equal(row.workbookHash,c.workbookHash);
      const raw=unseal<Candidate>(row.rawEncrypted,row.sourceReviewKey),effective=effectiveCandidate(c);
      assert.equal(fingerprint(raw),fingerprint(c));assert.equal(raw.originalText,c.originalText);assert.deepEqual(raw.electives,c.electives);assert.deepEqual(raw.electiveCorrection,c.electiveCorrection);
      assert.equal(row.originalHospital,effective.originalHospital);assert.equal(row.originalDepartmentOrScope,effective.originalDepartmentOrScope);
      assert.equal(row.ratings.length,effective.ratings.length);
      for(const e of effective.ratings){const r=row.ratings.find(r=>r.metricCode===e.metricCode)!;assert.ok(r);for(const k of Object.keys(e) as (keyof typeof e)[])assert.equal(r[k],e[k]);assert.equal(ratingMatchesCandidate(raw,r),e.verified);ratings++;}
      if(c.electives)contexts++;if(c.electiveCorrection)corrected++;
    }
    const source=await db.surveyReviewSource.findUniqueOrThrow({where:{id:SOURCE_ID}}),publiclyEligible=await db.surveyReview.count({where:publicSurveyWhere()});
    assert.equal(source.isPublicEnabled,false);assert.equal(publiclyEligible,0);
    const report={passed:true,recordsChecked:rows.length,ratingsChecked:ratings,correctedAssociations:corrected,electiveContextPairs:contexts,sourceEnabled:false,publiclyEligible,approved:rows.filter(r=>r.status==='APPROVED').length,approvedText:rows.filter(r=>r.status==='APPROVED'&&r.publishText).length,approvedRatings:rows.filter(r=>r.status==='APPROVED'&&r.publishRatings).length,originalSourceEvidencePreserved:true,allEffectiveRatingsMatchSameRowElective:true};
    await writeFile(value('--report'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }finally{await db.$disconnect();}
}
main().catch(e=>{console.error(e?.code??'ASSOCIATION_VERIFICATION_FAILED');process.exitCode=1;});
