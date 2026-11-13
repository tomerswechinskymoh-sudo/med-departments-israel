import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
import {SOURCE_ID} from '../../src/lib/staz-survey/domain';
import {parseCandidates,verifyWorkbook} from '../../src/server/staz-survey/parse';
import {readCatalog} from '../../src/server/staz-survey/catalog';
import {applyAutomaticReviews} from '../../src/server/staz-survey/automation';
async function main(){
  const args=process.argv.slice(2),value=(k:string)=>args[args.indexOf(k)+1],execute=args.includes('--execute');
  for(const k of ['--csv','--workbook','--report'])assert.ok(args.includes(k));
  assert.equal(new URL(process.env.DATABASE_URL!).hostname,process.env.STAZ_AUTOMATION_DATABASE_HOST);
  if(execute)assert.ok(args.includes('--user-authorized-20261113'));
  const candidates=await verifyWorkbook(parseCandidates(await readFile(value('--csv'))),value('--workbook'));
  const db=new PrismaClient({log:[]});
  try{
    const report=await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(72613011)`;
      const source=await tx.surveyReviewSource.findUniqueOrThrow({where:{id:SOURCE_ID}});
      assert.equal(source.isPublicEnabled,false,'INITIAL_BULK_APPROVAL_REQUIRES_HIDDEN_SOURCE');
      const actor=await tx.user.findFirstOrThrow({where:{id:source.permissionConfirmedBy!,roleKey:'ADMIN'},select:{id:true}});
      return applyAutomaticReviews(tx,{actorUserId:actor.id,catalog:await readCatalog(tx),candidates,execute});
    },{timeout:120000,maxWait:15000});
    if(execute)await db.$transaction(async tx=>{
      const enabled=await tx.surveyReviewSource.updateMany({where:{id:SOURCE_ID,autoApprovalEnabled:false},data:{autoApprovalEnabled:true,revision:{increment:1}}});
      if(enabled.count)await tx.auditLog.create({data:{action:'STAZ_AUTO_POLICY_ENABLED',entityType:'SurveyReviewSource',entityId:SOURCE_ID,metadata:{authorizationChannel:'user-chat',authorizationDate:'2026-11-13',policyVersion:report.version,visibilityUnchanged:true}}});
    });
    await writeFile(value('--report'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report));
  }finally{await db.$disconnect();}
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:e?.code??'AUTO_APPROVAL_FAILED');process.exitCode=1;});
