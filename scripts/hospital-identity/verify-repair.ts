import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {PrismaClient} from '@prisma/client';
const db=new PrismaClient({log:[]});
const expectedHost=process.env.HOSPITAL_AUDIT_DATABASE_HOST;
assert(expectedHost);assert.equal(new URL(process.env.DATABASE_URL!).hostname,expectedHost);
const output=process.env.HOSPITAL_AUDIT_OUTPUT;assert(output);
const apply=process.argv.includes('--apply');
async function main(){
 const evidence=await db.$transaction(async tx=>{
  if(!apply) await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  const read=async()=>{
   const research=await tx.departmentResearchMetric.findMany({where:{department:{institution:{slug:'מרכז-לבהנ-לב-השרון'}}},orderBy:{id:'asc'}});
   const external=await tx.departmentExternalMetric.findMany({where:{department:{institution:{slug:'מרכז-לבהנ-לב-השרון'}}},orderBy:{id:'asc'}});
   const institutions=await tx.institution.findMany({where:{name:{contains:'השרון'}},select:{id:true,name:true,slug:true,websiteUrl:true,departments:{orderBy:{id:'asc'},select:{id:true,slug:true,institutionId:true,websiteUrl:true,importStableKey:true,metrics:{orderBy:{id:'asc'}},yearlyMetrics:{orderBy:{id:'asc'}},_count:true}},_count:true},orderBy:{id:'asc'}});
   const surveys=await tx.externalSurveyAggregate.findMany({where:{institution:{name:{contains:'השרון'}}},orderBy:{id:'asc'}});
   return {research,external,institutions,surveys};
  };
  const before=await read();
  assert.equal(before.research.length,10);assert.equal(before.external.length,2);
  assert(before.research.every(r=>r.source==='OpenAlex'&&r.queryUsed?.includes('Rabin Medical Center')));
  assert(before.external.every(r=>r.sourceName==='DUNS100'&&r.queryUsed?.includes('מרכז רפואי רבין')));
  let changed:number[]=[];
  if(apply){
   const sql=readFileSync('scripts/hospital-identity/repair-lev-hasharon.sql','utf8').replace(/^--.*$/gm,'');
   for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean)) changed.push(await tx.$executeRawUnsafe(statement));
  }
  const after=await read();
  if(apply){
   assert.deepEqual(changed,[before.research.filter(r=>!r.needsMapping).length,before.external.filter(r=>r.approved).length]);
   assert(after.research.every(r=>r.needsMapping));assert(after.external.every(r=>!r.approved));
   assert.deepEqual(after.institutions,before.institutions);assert.deepEqual(after.surveys,before.surveys);
   after.research.forEach((r,index)=>{const b=before.research[index];assert.deepEqual({...r,needsMapping:b.needsMapping,warningsJson:b.warningsJson},b);});
   after.external.forEach((r,index)=>{const b=before.external[index];assert.deepEqual({...r,approved:b.approved},b);});
   const sql=readFileSync('scripts/hospital-identity/repair-lev-hasharon.sql','utf8').replace(/^--.*$/gm,'');
   const second=[];for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))second.push(await tx.$executeRawUnsafe(statement));
   assert.deepEqual(second,[0,0]);assert.deepEqual(await read(),after);
  }
  return {passed:true,apply,changed,preservedValuesQueriesResponsesAndIds:true,idempotent:apply,before,after};
 },{timeout:60000});
 writeFileSync(output!,JSON.stringify(evidence,null,2));console.log(JSON.stringify({passed:true,apply,changed:evidence.changed,preservedValuesQueriesResponsesAndIds:true,idempotent:apply}));
}
main().finally(()=>db.$disconnect()).catch(e=>{console.error(e.code==='ERR_ASSERTION'?e.message:e.name);process.exitCode=1;});
