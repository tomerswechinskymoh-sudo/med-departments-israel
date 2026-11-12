import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { changeSource } from '../../src/server/staz-survey/moderation';
const db=new PrismaClient({log:[]});
async function main(){
 assert.equal(new URL(process.env.DATABASE_URL!).hostname,process.env.STAZ_TEST_DATABASE_HOST);assert.ok(!process.env.DATABASE_URL!.includes('ep-odd-pine-'));
 const actor=await db.user.findUniqueOrThrow({where:{id:'staz-test-admin'},select:{id:true}});
 let release!:()=>void, ready!:()=>void;const blocked=new Promise<void>(r=>release=r),locked=new Promise<void>(r=>ready=r);
 const holder=db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(72613011)`;await tx.surveyReviewSource.findUnique({where:{id:'STAZ_SURVEY_2020_2025'},select:{id:true}});ready();await blocked;},{timeout:30000});
 await locked;
 try {const hidden=await changeSource(db,{revision:0,action:'HIDE',confirmed:true},actor.id);assert.equal(hidden.isPublicEnabled,false);console.log(JSON.stringify({passed:true,emergencyHideCompletesWhileImportLockHeld:true}));}finally{release();await holder;}
}
main().finally(()=>db.$disconnect()).catch(e=>{console.error(e.code??e.message);process.exitCode=1});
