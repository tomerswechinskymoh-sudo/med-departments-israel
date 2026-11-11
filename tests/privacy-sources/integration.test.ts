import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { prisma } from '../../src/lib/prisma';
import { decideRegistration } from '../../src/lib/server/registration-decision';
import { changeMarketingConsent, sendMarketingEmail, unsubscribeToken, readUnsubscribeToken } from '../../src/lib/server/marketing';
import { sendTransactionalEmail } from '../../src/lib/services/email';
import { getDirectoryData, getDepartmentPageData, getSpecialtyDashboardMetrics, getDepartmentComparisonData } from '../../src/lib/queries';
import { seedFixtures } from './fixtures';
import { replaySignupDeletion } from '../../src/lib/server/signup-deletion-restore';
const user = () => prisma.user.create({data:{email:`${randomUUID()}@example.invalid`,fullName:'Synthetic',passwordHash:'not-a-login',roleKey:'STUDENT',verificationStatus:'PENDING_ADMIN_REVIEW'}});
const proof = (id:string, category:'USER_VERIFICATION_PROOF'|'REVIEW_VERIFICATION_PROOF'='USER_VERIFICATION_PROOF') => prisma.uploadedFile.create({data:{uploadedByUserId:id,category,originalName:'synthetic.txt',mimeType:'text/plain',sizeBytes:9,bytes:Buffer.from('synthetic'),...(category==='REVIEW_VERIFICATION_PROOF'?{reviewSubmissionId:'test-review'}:{})}});
const gate = () => { let resolve!:()=>void; const promise = new Promise<void>(r=>resolve=r);return {promise,resolve}; };
before(async()=>{await seedFixtures();});
after(async()=>{await prisma.sourceVisibility.update({where:{id:'global'},data:{ima:true,duns100:true,revision:{increment:1}}});await prisma.$disconnect();});
for (const approved of [true,false]) test(`decision ${approved ? 'approval':'block'} deletes all signup versions and preserves review proof`,async()=>{
 const u=await user(), a=await proof(u.id); await proof(u.id);const reviewProof=await proof(u.id,'REVIEW_VERIFICATION_PROOF');
 await prisma.user.update({where:{id:u.id},data:{verificationProofUrl:`/api/files/${a.id}`}});
 await decideRegistration({userId:u.id,actorId:'test-admin',approved});
 assert.equal(await prisma.uploadedFile.count({where:{uploadedByUserId:u.id,category:'USER_VERIFICATION_PROOF'}}),0);
 assert(await prisma.uploadedFile.findUnique({where:{id:reviewProof.id}})); assert(await prisma.reviewSubmission.findUnique({where:{id:'test-review'}})); assert(await prisma.review.findUnique({where:{id:'test-published-review'}}));
 assert.equal((await prisma.user.findUniqueOrThrow({where:{id:u.id}})).verificationProofUrl,null);
 await decideRegistration({userId:u.id,actorId:'test-admin',approved});
 assert.equal((await prisma.signupDocumentDeletion.findUniqueOrThrow({where:{userId:u.id}})).deletedCount,2);
});
test('pending cleanup is a no-op and ambiguous additional pointer blocks deletion',async()=>{
 const u=await user(), f=await proof(u.id), other=await user();
 await prisma.$queryRaw`SELECT delete_signup_documents(${u.id})`;
 assert(await prisma.uploadedFile.findUnique({where:{id:f.id}}));
 await prisma.user.update({where:{id:other.id},data:{verificationProofUrl:`/api/files/${f.id}`}});
 await assert.rejects(decideRegistration({userId:u.id,actorId:'test-admin',approved:true}));
 assert.equal((await prisma.user.findUniqueOrThrow({where:{id:u.id}})).verificationStatus,'PENDING_ADMIN_REVIEW');
 assert(await prisma.uploadedFile.findUnique({where:{id:f.id}}));
});
test('delete failure rolls back decision; retry succeeds',async()=>{
 const u=await user(); await proof(u.id);
 await prisma.$executeRawUnsafe(`CREATE FUNCTION test_fail_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$`);
 await prisma.$executeRawUnsafe(`CREATE TRIGGER test_fail_delete BEFORE DELETE ON "UploadedFile" FOR EACH ROW EXECUTE FUNCTION test_fail_delete()`);
 try { await assert.rejects(decideRegistration({userId:u.id,actorId:'test-admin',approved:true}));assert.equal((await prisma.user.findUniqueOrThrow({where:{id:u.id}})).verificationStatus,'PENDING_ADMIN_REVIEW'); }
 finally {await prisma.$executeRawUnsafe('DROP TRIGGER test_fail_delete ON "UploadedFile"');await prisma.$executeRawUnsafe('DROP FUNCTION test_fail_delete()');}
 await decideRegistration({userId:u.id,actorId:'test-admin',approved:true});assert.equal(await prisma.uploadedFile.count({where:{uploadedByUserId:u.id}}),0);
});
test('race: upload finishes first; decision waits and deletes it',async()=>{
 const u=await user(), inserted=gate(), release=gate();
 const upload=prisma.$transaction(async tx=>{await tx.uploadedFile.create({data:{uploadedByUserId:u.id,category:'USER_VERIFICATION_PROOF',originalName:'synthetic',mimeType:'text/plain',sizeBytes:1,bytes:Buffer.from('x')}});inserted.resolve();await release.promise;});
 await inserted.promise;const decision=decideRegistration({userId:u.id,actorId:'test-admin',approved:true});release.resolve();await Promise.all([upload,decision]);assert.equal(await prisma.uploadedFile.count({where:{uploadedByUserId:u.id}}),0);
});
test('race: decision finishes first; late upload is rejected',async()=>{
 const u=await user(), decided=gate(), release=gate();
 const decision=prisma.$transaction(async tx=>{await tx.user.update({where:{id:u.id},data:{verificationStatus:'REJECTED'}});decided.resolve();await release.promise;});
 await decided.promise;const upload=assert.rejects(proof(u.id));release.resolve();await Promise.all([decision,upload]);assert.equal(await prisma.uploadedFile.count({where:{uploadedByUserId:u.id}}),0);
});
test('all four source states filter raw server and derived public projections; restoration retains records',async()=>{
 for (const ima of [true,false]) for(const duns100 of [true,false]) {
  await prisma.sourceVisibility.update({where:{id:'global'},data:{ima,duns100,revision:{increment:1}}});
  const data=await getDepartmentPageData('test-department',undefined,'test-department');
  assert(data);const raw=JSON.stringify(data);assert.equal(raw.includes('IMA_PRIVATE_SENTINEL'),ima);assert.equal(raw.includes('9876.54321'),duns100);assert.equal(raw.includes('87.654321'),ima);assert(raw.includes('residentsCount'));
  const directory=await getDirectoryData({specialties:['test-specialty']});assert(directory.length>0);assert.equal(directory[0]?.averageOverall,4);assert.equal(directory[0]?.duns100PhysiciansCount,duns100?9876.54321:null);
  const dashboard=await getSpecialtyDashboardMetrics('test-specialty');assert(!dashboard.metrics.some(m=>!duns100&&m.key==='duns100PhysiciansCount'));assert(!dashboard.metrics.some(m=>!ima&&['boardPassA','boardPassB','salaryGap'].includes(m.key)));
  assert.equal((await getDepartmentComparisonData({departmentIds:['test-department','test-department-two']})).status,'ok');
 }
 assert.equal(await prisma.departmentExternalMetric.count({where:{sourceName:'DUNS100'}}),1);
});
test('marketing cancellation blocks already prepared message while service email continues; legacy opt-in not invented',async()=>{
 const u=await user();process.env.AUTH_SECRET='synthetic-auth-secret-at-least-32-characters';process.env.RESEND_API_KEY='synthetic-test-only';process.env.EMAIL_FROM='test@example.invalid';process.env.MARKETING_ADVERTISER_ADDRESS='Synthetic test address';process.env.MARKETING_REPLY_TO='refusal@example.invalid';
 const sent:Record<string,unknown>[]=[];const original=global.fetch;global.fetch=async(_url,init)=>{sent.push(JSON.parse(String(init?.body)));return new Response('{}',{status:200});};
 try {
  const queued={userId:u.id,subject:'synthetic campaign',html:'<p>test</p>',text:'test'};
  await prisma.user.update({where:{id:u.id},data:{marketingConsent:true,marketingConsentAt:new Date()}});
  assert.equal((await sendMarketingEmail(queued)).skipped,true);
  await changeMarketingConsent(u.id,true,'account');assert.equal((await sendMarketingEmail(queued)).delivered,true);assert.match(String(sent[0].subject),/^פרסומת/);assert.match(String(sent[0].text),/Synthetic test address/);
  const token=unsubscribeToken(u.id);assert(!token.includes(u.id));assert.equal(readUnsubscribeToken(token),u.id);assert.equal(readUnsubscribeToken(token.slice(0,-5)+'XXXXX'),null);
  await changeMarketingConsent(u.id,false,'email-unsubscribe');assert.equal((await sendMarketingEmail(queued)).skipped,true);
  await sendTransactionalEmail({to:u.email,subject:'service',text:'service',html:'<p>service</p>'});assert.equal(sent.length,2);
  assert.equal(await prisma.marketingConsentEvent.count({where:{userId:u.id}}),2);
 } finally {global.fetch=original;}
});

test('historical cleanup rechecks final status and is idempotent',async()=>{
 const u=await user();
 await decideRegistration({userId:u.id,actorId:'test-admin',approved:true});
 // Only in this guarded synthetic database: reproduce a pre-migration leftover.
 await prisma.$transaction(async tx=>{
  await tx.$executeRawUnsafe("SET LOCAL session_replication_role = replica");
  await tx.uploadedFile.create({data:{uploadedByUserId:u.id,category:'USER_VERIFICATION_PROOF',originalName:'synthetic-old',mimeType:'text/plain',sizeBytes:1,bytes:Buffer.from('x')}});
 });
 assert.equal(await prisma.uploadedFile.count({where:{uploadedByUserId:u.id}}),1);
 const first=await prisma.$queryRaw<Array<{n:number}>>`SELECT delete_signup_documents(${u.id}) AS n`;
 const second=await prisma.$queryRaw<Array<{n:number}>>`SELECT delete_signup_documents(${u.id}) AS n`;
 assert.equal(first[0].n,1);assert.equal(second[0].n,0);
});
test('restore reconciliation deletes restored old proof, retains review proof and newer pending registration',async()=>{
 const old=await user(), oldProof=await proof(old.id), reviewProof=await proof(old.id,'REVIEW_VERIFICATION_PROOF');
 const cutoff=new Date(Date.now()+1000);
 const entry={userId:old.id,status:'VERIFIED' as const,deletedAt:cutoff.toISOString()};
 assert.equal(await replaySignupDeletion(entry),'eligible');assert(await prisma.uploadedFile.findUnique({where:{id:oldProof.id}}));
 assert.equal(await replaySignupDeletion(entry,true),'reconciled');assert.equal(await prisma.uploadedFile.findUnique({where:{id:oldProof.id}}),null);assert(await prisma.uploadedFile.findUnique({where:{id:reviewProof.id}}));
 assert.equal(await replaySignupDeletion(entry,true),'reconciled');
 const newer=await user(), newProof=await proof(newer.id);await prisma.user.update({where:{id:newer.id},data:{verificationSubmittedAt:new Date(cutoff.getTime()+1000)}});
 assert.equal(await replaySignupDeletion({...entry,userId:newer.id},true),'newer');assert(await prisma.uploadedFile.findUnique({where:{id:newProof.id}}));
 const shared=await user(), f=await proof(shared.id), other=await user();await prisma.user.update({where:{id:other.id},data:{verificationProofUrl:`/api/files/${f.id}`}});
 assert.equal(await replaySignupDeletion({...entry,userId:shared.id},true),'reviewRequired');assert(await prisma.uploadedFile.findUnique({where:{id:f.id}}));
});
test('cleanup CLI defaults to count-only dry-run then deletes one safe historical batch without touching pending or review files',async()=>{
 const old=await user();await decideRegistration({userId:old.id,actorId:'test-admin',approved:true});
 const historic=await prisma.$transaction(async tx=>{await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica');return tx.uploadedFile.create({data:{uploadedByUserId:old.id,category:'USER_VERIFICATION_PROOF',originalName:'synthetic',mimeType:'text/plain',bytes:Buffer.from('synthetic'),sizeBytes:9}});});
 const pending=await user(), pendingProof=await proof(pending.id), reviewProof=await proof(old.id,'REVIEW_VERIFICATION_PROOF');
 const run=(args:string[])=>spawnSync(process.execPath,['--import','tsx','scripts/cleanup-signup-documents.ts',...args],{encoding:'utf8',env:process.env});
 const dry=run([]);assert.equal(dry.status,0);assert.equal(JSON.parse(dry.stdout.trim()).mode,'dry-run');assert(!dry.stdout.includes(old.id));assert(await prisma.uploadedFile.findUnique({where:{id:historic.id}}));
 const execute=run(['--execute','--confirm-reviewed-dry-run','--batch-size=1']);assert.equal(execute.status,0,execute.stderr);assert.equal(JSON.parse(execute.stdout.trim().split('\n').at(-1)!).deleted,1);assert.equal(await prisma.uploadedFile.findUnique({where:{id:historic.id}}),null);
 assert(await prisma.uploadedFile.findUnique({where:{id:pendingProof.id}}));assert(await prisma.uploadedFile.findUnique({where:{id:reviewProof.id}}));
});
test('signup service delivery does not require marketing and mandatory experience cannot be skipped',async()=>{
 const {POST}=await import('../../src/app/api/auth/signup/route');
 const original=global.fetch, info=console.info;let serviceSent=0;
 global.fetch=async()=>{serviceSent++;return new Response('{}',{status:200});}; console.info=()=>{};
 try {
  const data=new FormData(); for(const key of ['phone','studentTrack','studentYear','medicalFaculty','onboardingInstitutionId','onboardingDepartmentId','experienceContributionStatus','experienceContributionCategory']) data.set(key,'');const email=`${randomUUID()}@example.invalid`;
  for(const [k,v] of Object.entries({fullName:'Synthetic test',email,password:'Synthetic12345!',confirmPassword:'Synthetic12345!',roleStatus:'other',proofConfirmed:'true',privacyVerificationConsent:'true',marketingConsent:'false'})) data.set(k,v);
  data.set('verificationProof',new File(['%PDF synthetic'],'synthetic.pdf',{type:'application/pdf'}));
  const response=await POST(new Request('http://localhost/api/auth/signup',{method:'POST',body:data}));assert.equal(response.status,200, await response.text());assert.equal(serviceSent,1);
  const created=await prisma.user.findUniqueOrThrow({where:{email}});assert.equal(created.marketingConsent,false);assert.equal(created.marketingConsentSource,'signup');assert.equal(await prisma.uploadedFile.count({where:{uploadedByUserId:created.id,category:'USER_VERIFICATION_PROOF'}}),1);
  data.set('email',`${randomUUID()}@example.invalid`);data.set('roleStatus','intern');data.set('onboardingInstitutionId','test-hospital');
  const missing=await POST(new Request('http://localhost/api/auth/signup',{method:'POST',body:data}));assert.equal(missing.status,400);assert.equal((await missing.json()).code,'EXPERIENCE_REQUIRED');
 } finally {global.fetch=original;console.info=info;}
});
