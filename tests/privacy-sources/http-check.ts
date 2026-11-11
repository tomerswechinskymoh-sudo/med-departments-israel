import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { prisma } from '../../src/lib/prisma';
import { assertLocalTestDatabase } from './fixtures';
import { unsubscribeToken, changeMarketingConsent } from '../../src/lib/server/marketing';
assertLocalTestDatabase();
const base='http://127.0.0.1:3109';
function cookie(userId:string,role='student') {const payload=Buffer.from(JSON.stringify({userId,role,exp:Date.now()+3600000})).toString('base64url');return 'med_departments_session='+payload+'.'+createHmac('sha256',process.env.AUTH_SECRET!).update(payload).digest('base64url');}
async function main() {
 const u=await prisma.user.create({data:{email:`${randomUUID()}@example.invalid`,fullName:'Synthetic test',passwordHash:'not-a-login',roleKey:'STUDENT',emailVerified:true,emailVerificationToken:'synthetic-email-'+randomUUID(),emailVerificationExpiresAt:new Date(Date.now()+3600000),verificationStatus:'PENDING_ADMIN_REVIEW'}});
 const f=await prisma.uploadedFile.create({data:{uploadedByUserId:u.id,category:'USER_VERIFICATION_PROOF',originalName:'synthetic',mimeType:'text/plain',bytes:Buffer.from('synthetic-document'),sizeBytes:18}});
 const admin={Cookie:cookie('test-admin','admin'),'Content-Type':'application/json'};
 assert.equal((await fetch(base+`/api/files/${f.id}`,{headers:{Cookie:cookie(u.id)}})).status,200);
 assert.equal((await fetch(base+`/api/admin/user-verifications/${u.id}`,{method:'POST',headers:admin,body:JSON.stringify({status:'APPROVED'})})).status,200);
 assert.equal((await fetch(base+`/api/files/${f.id}`,{headers:admin})).status,404);
 // Reproduce retained pre-migration bytes: even an admin must not download them.
 const legacy=await prisma.$transaction(async tx=>{await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica');return tx.uploadedFile.create({data:{uploadedByUserId:u.id,category:'USER_VERIFICATION_PROOF',originalName:'synthetic-old',mimeType:'text/plain',bytes:Buffer.from('synthetic'),sizeBytes:9}});});
 assert.equal((await fetch(base+`/api/files/${legacy.id}`,{headers:admin})).status,410);
 await fetch(base+`/api/verification/email?token=${u.emailVerificationToken}`,{redirect:'manual'});
 assert.equal((await prisma.user.findUniqueOrThrow({where:{id:u.id}})).verificationStatus,'VERIFIED');
 await prisma.$queryRaw`SELECT delete_signup_documents(${u.id})`;
 await changeMarketingConsent(u.id,true,'account');const token=unsubscribeToken(u.id);
 const get=await fetch(base+'/unsubscribe?token='+token);assert.equal(get.status,200);assert.equal((await prisma.user.findUniqueOrThrow({where:{id:u.id}})).marketingConsent,true);
 assert.equal((await fetch(base+'/unsubscribe?token='+token,{method:'POST'})).status,200);
 assert.equal((await prisma.user.findUniqueOrThrow({where:{id:u.id}})).marketingConsent,false);
 assert.equal((await fetch(base+'/unsubscribe?token=bad',{method:'POST'})).status,400);
 assert.equal((await fetch(base+'/api/account/marketing-consent',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true})})).status,403);
 assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'test-member@example.invalid',password:'bad-password'})})).status,401);
 assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'test-member@example.invalid',password:'synthetic-only-strong-password'})})).status,200);
 assert.equal((await fetch(base+'/api/debug/department-metrics')).status,403);
 console.log('HTTP checks passed: approval, private file access, legacy denial, late email, token unsubscribe, account authorization, login success/error, debug authorization.');
}
main().finally(()=>prisma.$disconnect());
