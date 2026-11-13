import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {SOURCE_ID,type Candidate} from '../../src/lib/staz-survey/domain';
import {seal,unseal} from '../../src/server/external-survey/crypto';
import {fingerprint} from '../../src/server/staz-survey/parse';
import {electiveContextHash} from '../../src/server/staz-survey/association';
async function main(){
 assert.ok(!process.env.DATABASE_URL!.includes('ep-odd-pine-'));const db=new PrismaClient({log:[]});
 try{
  for(const [id,role] of [['staz-test-admin','ADMIN'],['staz-test-student','STUDENT']] as const)await db.user.upsert({where:{id},create:{id,email:id+'@example.invalid',fullName:'משתמש בדיקה סינתטי',roleKey:role,passwordHash:'not-usable',emailVerified:true,verificationStatus:'VERIFIED'},update:{}});
  const original=await db.surveyReview.findFirstOrThrow({where:{sourceId:SOURCE_ID,automationCategory:'UNCERTAIN',publishRatings:true,targetDepartmentId:{not:null}},include:{ratings:true,department:{select:{slug:true}}}});
  const key=SOURCE_ID+':R49032:C'+original.sourceColumnLetter,text='בדיקהסינתטיתאוטומציה מחלקה טובה אבל נדרשת החלטה ידנית';
  const c={...unseal<Candidate>(original.rawEncrypted,original.sourceReviewKey),sourceReviewKey:key,sourceRowNumber:49032,proposedText:text,originalText:text};
  c.ratings=c.ratings.map(r=>({...r,sourceRowNumber:49032}));
  if(c.electives)for(const e of Object.values(c.electives)){e.text=text;e.rating.sourceRowNumber=49032;}
  if(c.electiveCorrection)c.electiveCorrection={...c.electiveCorrection,contextHash:electiveContextHash(c)};
  const {id:_id,ratings,department:_department,createdAt:_createdAt,updatedAt:_updatedAt,...base}=original;
  const row=await db.surveyReview.create({data:{...base,id:randomUUID(),sourceReviewKey:key,sourceRowNumber:49032,rawEncrypted:seal(c,key),sourceFingerprint:fingerprint(c),approvedPublicText:null,publishText:false,automationCategory:'UNCERTAIN',automationReason:'בדיקה סינתטית של התור.',ratings:{create:ratings.map(({id,reviewId,...r})=>({...r,id:randomUUID(),sourceRowNumber:49032}))}}});
  await writeFile('/private/tmp/hitmachut-staz-audit-private-20261112/auto-browser-fixture.json',JSON.stringify({reviewId:row.id,departmentSlug:original.department!.slug,search:'בדיקהסינתטיתאוטומציה'}),{mode:0o600});
  console.log('Synthetic browser fixture created on isolated branch');
 }finally{await db.$disconnect();}
}
main().catch(e=>{console.error(e?.code??'FIXTURE_FAILED');process.exitCode=1;});
