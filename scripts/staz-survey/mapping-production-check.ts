import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SOURCE_ID} from '../../src/lib/staz-survey/domain';
import {publicSurveyExperiences} from '../../src/server/staz-survey/public';
const out='docs/staz-survey-mapping-20261112/',migration='202611120002_staz_survey_array_mapping';
async function main(){
 assert.ok(new URL(process.env.DIRECT_URL!).hostname.startsWith('ep-odd-pine-'));
 const phase=process.argv[2];assert.ok(['baseline','migration','final'].includes(phase));
 const db=new PrismaClient({log:[]});
 try{
  const applied=await db.$queryRaw<{migration_name:string;checksum:string;finished_at:Date|null;rolled_back_at:Date|null}[]>`SELECT migration_name,checksum,finished_at,rolled_back_at FROM "_prisma_migrations"`;
  assert.ok(!applied.some(r=>!r.finished_at&&!r.rolled_back_at));
  const checksums=new Map<string,string>();for(const d of (await readdir('prisma/migrations',{withFileTypes:true})).filter(d=>d.isDirectory()))checksums.set(d.name,createHash('sha256').update(await readFile(`prisma/migrations/${d.name}/migration.sql`)).digest('hex'));
  for(const r of applied.filter(r=>r.finished_at&&!r.rolled_back_at)){
   const legacy=r.migration_name==='202604290001_residency_navigator_profile_fields'&&r.checksum==='18c8fda9605821ebc8ba284b5d3cdc3fc691ab87ba525b5573eda4b11ecf2d03'&&checksums.get(r.migration_name)==='cbecd9b59ecbf814de11cf7ab1225c9330e7eace4422dea95efe76e19e19ae27';
   if(!legacy)assert.equal(checksums.get(r.migration_name),r.checksum,'MIGRATION_CHECKSUM_MISMATCH');
  }
  const pending=[...checksums.keys()].filter(k=>!applied.some(r=>r.migration_name===k&&r.finished_at&&!r.rolled_back_at));assert.deepEqual(pending,phase==='baseline'?[migration]:[]);
  const fingerprint:Record<string,unknown>={};
  for(const table of ['Review','ReviewSubmission','Department','DepartmentMetric','DepartmentYearlyMetric','SpecialtyMetric','SpecialtyYearlyMetric','SurveyReview','SurveyReviewRating','SurveyReviewSource']) fingerprint[table]=await db.$queryRawUnsafe(`SELECT count(*)::int AS n,md5(string_agg((to_jsonb(r)-'targetMedicalArrayId'-'suggestedMedicalArrayId')::text,'' ORDER BY id)) AS digest FROM "${table}" r`);
  const source=await db.surveyReviewSource.findUniqueOrThrow({where:{id:SOURCE_ID},select:{isPublicEnabled:true,permissionConfirmedAt:true,permissionEvidence:true}});
  assert.ok(source.isPublicEnabled&&source.permissionConfirmedAt&&source.permissionEvidence);
  const counts=await db.surveyReview.groupBy({by:['status'],where:{sourceId:SOURCE_ID},_count:true});
  let publicCheck:unknown=null;
  if(phase!=='baseline'){
   const baseline=JSON.parse(await readFile(out+'production-baseline.json','utf8'));assert.deepEqual(fingerprint,baseline.fingerprint,'Production data changed since baseline; investigate concurrent user decisions before continuing.');
   const approved=await db.surveyReview.findMany({where:{sourceId:SOURCE_ID,status:'APPROVED'},select:{id:true,targetDepartmentId:true,targetMedicalArrayId:true,publishText:true,publishRatings:true,department:{select:{slug:true,medicalArrayId:true}}}});
   assert.equal(approved.length,1);const row=approved[0];assert.ok(row.targetDepartmentId&&row.department?.medicalArrayId);assert.equal(row.targetMedicalArrayId,null);
   const units=await db.department.findMany({where:{medicalArrayId:row.department.medicalArrayId},select:{id:true}});
   const experiences=await publicSurveyExperiences(db,units.map(d=>d.id),{role:'admin'},[row.department.medicalArrayId]);
   const actual=experiences.find(e=>e.id===row.id);assert.ok(actual?.text);assert.equal(actual.ratings.length,1);assert.equal(actual.ratings[0].value,5);
   publicCheck={approvedCount:approved.length,visibleCount:experiences.length,textVisible:true,ratingsVisible:true,ratingValue:5,manualUnitPreserved:true,departmentPath:'/departments/'+row.department.slug};
  }
  const report={passed:true,phase,appliedMigrations:applied.filter(r=>r.finished_at&&!r.rolled_back_at).length,pending,fingerprint,sourceEnabled:true,rightsConfirmed:true,counts,publicCheck};
  await writeFile(out+`production-${phase}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,phase,counts,sourceEnabled:true,publicCheck}));
 }finally{await db.$disconnect();}
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:e?.code??'PRODUCTION_CHECK_FAILED');process.exitCode=1;});
