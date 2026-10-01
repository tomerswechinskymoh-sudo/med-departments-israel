import {PrismaClient} from '@prisma/client';
import {request} from 'playwright';
import assert from 'node:assert/strict';
const url=new URL(process.env.DATABASE_URL??'');if(url.hostname!=='127.0.0.1'||url.port!=='55439'||url.pathname!=='/phase3c_guarded_test_only')throw Error('Unsafe test destination');
const db=new PrismaClient(),root='http://localhost:3105';
const suffix=Date.now().toString(36),id='test-cancel-'+suffix;
const userId='phase3c-student';
try{
await db.role.upsert({where:{key:'REPRESENTATIVE'},update:{},create:{key:'REPRESENTATIVE',label:'TEST_ONLY',description:'TEST_ONLY'}});
const existing=await db.user.findUniqueOrThrow({where:{id:'phase3c-admin'}});
for(const role of ['reader','operator'])await db.user.create({data:{id:id+role,email:`${id+role}@example.test`,fullName:'TEST_ONLY '+role,passwordHash:existing.passwordHash,roleKey:'REPRESENTATIVE',emailVerified:true,verificationStatus:'VERIFIED'}});
await db.institution.create({data:{id,name:'TEST_ONLY cancellation hospital',slug:id,type:'HOSPITAL',summary:'Synthetic only'}});
await db.specialty.create({data:{id,name:'TEST_ONLY',slug:id,description:'Synthetic only'}});
await db.clinicalRotationOffering.create({data:{id,hospitalId:id,specialtyId:id,slug:id,displayName:'TEST_ONLY cancellation preservation',startsAt:new Date('2029-01-01'),endsAt:new Date('2029-01-14'),priceAmount:0,paymentMethod:'CASH_AT_ROTATION',maximumCapacity:1}});
await db.clinicalRotationApplication.create({data:{id,offeringId:id,hospitalId:id,specialtyId:id,studentUserId:userId,requestedStartAt:new Date('2029-01-01'),requestedEndAt:new Date('2029-01-14'),status:'APPROVED'}});
for(const role of ['reader','operator'])await db.clinicalRotationHospitalAccess.create({data:{userId:id+role,hospitalId:id,role:role==='reader'?'VIEW_ONLY':'REPRESENTATIVE',isActive:true}});
async function login(email){const c=await request.newContext({baseURL:root,extraHTTPHeaders:{origin:root}});const r=await c.post('/api/auth/login',{data:{email,password:'Synthetic-Phase3C-Only!'}});assert.equal(r.status(),200);return c;}
const student=await login('phase3c-student@example.test');const requests=await Promise.all([1,2].map(()=>student.post('/api/clinical-rotations/cancellations',{data:{applicationId:id,reasonCategory:'PERSONAL'}})));assert(requests.every(r=>r.status()===200));assert.equal(await db.clinicalRotationCancellation.count({where:{applicationId:id}}),1);assert.equal((await db.clinicalRotationApplication.findUniqueOrThrow({where:{id}})).status,'CANCELLATION_REQUESTED');
const reader=await login(`${id}reader@example.test`);assert.equal((await reader.post('/api/clinical-rotations/hospital/applications',{data:{applicationId:id,action:'approveCancellation'}})).status(),403);
const operator=await login(`${id}operator@example.test`);const decisions=await Promise.all([1,2].map(()=>operator.post('/api/clinical-rotations/hospital/applications',{data:{applicationId:id,action:'approveCancellation'}})));const statuses=decisions.map(r=>r.status());assert.equal(statuses.filter(s=>s===200).length,1);assert(statuses.every(s=>[200,409,404].includes(s)));assert.equal((await db.clinicalRotationApplication.findUniqueOrThrow({where:{id}})).status,'CANCELLED');assert.equal(await db.clinicalRotationAuditLog.count({where:{applicationId:id,action:'clinical_rotation.cancellation_approved'}}),1);
await db.clinicalRotationHospitalAccess.updateMany({where:{userId:id+'operator'},data:{isActive:false}});assert.equal((await operator.post('/api/clinical-rotations/hospital/applications',{data:{applicationId:id,action:'approveCancellation'}})).status(),403);
console.log('PASS real PostgreSQL concurrent cancellation requests deduplicate; request retains reserved status; VIEW_ONLY denied; concurrent decisions apply once; subsequent revocation denied');for(const c of [student,reader,operator])await c.dispose();
}finally{await db.$disconnect();}
