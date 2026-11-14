import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {prisma as db} from '../../src/lib/prisma';
import {POST} from '../../src/app/api/auth/signup/route';
import {createSignupExperienceReceipt} from '../../src/lib/server/signup-experience';
import {signupWorkplaceLabel} from '../../src/lib/signup-workplace';
import {decideRegistration} from '../../src/lib/server/registration-decision';
const prefix='signup-options-'+randomUUID(),created:string[]=[];
let submissionId:string|undefined;
async function main(){
 assert.ok(process.env.RESIDENT_TEST_HOST?.startsWith('ep-icy-meadow-'));
 const originalFetch=global.fetch;const env={NODE_ENV:process.env.NODE_ENV,RESEND_API_KEY:process.env.RESEND_API_KEY,EMAIL_FROM:process.env.EMAIL_FROM};
 Object.assign(process.env,{NODE_ENV:'production',RESEND_API_KEY:'synthetic-no-delivery',EMAIL_FROM:'test@example.invalid'});
 let mailIntercepted=0;global.fetch=async(input)=>{assert.equal(String(input),'https://api.resend.com/emails');mailIntercepted++;return new Response('{}',{status:200});};
 try{
  const department=await db.department.findFirstOrThrow({select:{id:true,institutionId:true}});
  for(const [index,role,workplace] of [[0,'specialist','community'],[1,'specialist','both'],[2,'post_intern','']] as const){
   const email=`${prefix}-${index}@example.invalid`;const form=new FormData();
   for(const [k,v]of Object.entries({fullName:'Synthetic signup option test',phone:'',studentTrack:'',studentYear:'',medicalFaculty:'',experienceContributionStatus:'not_eligible',experienceContributionCategory:'',email,password:'Synthetic-test-123',confirmPassword:'Synthetic-test-123',roleStatus:role,specialistWorkplace:workplace,communityWorkplace:'Synthetic community clinic',proofConfirmed:'true',privacyVerificationConsent:'true',marketingConsent:'false',onboardingInstitutionId:department.institutionId,onboardingDepartmentId:department.id}))form.set(k,v);
   form.set('verificationProof',new File(['%PDF-1.4\nSynthetic test only'], 'synthetic.pdf',{type:'application/pdf'}));
   if(role==='post_intern'){
    const missing=await POST(new Request('http://localhost:3097/api/auth/signup',{method:'POST',headers:{origin:'http://localhost:3097',host:'localhost:3097','x-forwarded-for':'127.0.0.22'},body:form}));assert.equal(missing.status,400);assert.equal((await missing.json()).code,'EXPERIENCE_REQUIRED');
    const review=await db.reviewSubmission.create({data:{departmentId:department.id,reviewerType:'INTERN',phone:'',email,isAnonymous:true,teachingQuality:4,workAtmosphere:4,seniorsApproachability:4,researchExposure:4,lifestyleBalance:4,overallRecommendation:4,pros:'Synthetic original experience for registration test',cons:'',tips:'',consentToContact:true,consentToTerms:true,consentNoPatientInfo:true}});submissionId=review.id;
    await db.uploadedFile.create({data:{reviewSubmissionId:review.id,category:'REVIEW_VERIFICATION_PROOF',isPublic:false,originalName:'synthetic.pdf',mimeType:'application/pdf',sizeBytes:1,bytes:Buffer.from('x')}});
    form.set('experienceContributionReceipt',createSignupExperienceReceipt(review.id));
   }
   const response=await POST(new Request('http://localhost:3097/api/auth/signup',{method:'POST',headers:{origin:'http://localhost:3097',host:'localhost:3097','x-forwarded-for':`127.0.0.${30+index}`},body:form}));
   const user=await db.user.findUnique({where:{email}});if(user)created.push(user.id);
   assert.equal(response.status,200,JSON.stringify(await response.json()));assert.ok(user);
   assert.equal(user.roleStatus,role);assert.equal(user.roleKey,'RESIDENT');assert.equal(user.verificationStatus,'PENDING_EMAIL_VERIFICATION');assert.equal(user.emailVerified,false);
   const log=await db.auditLog.findFirstOrThrow({where:{actorUserId:user.id,action:'auth.registration'},orderBy:{createdAt:'desc'}});const data=log.metadata as any;
   if(workplace==='community'){assert.equal(data.onboarding.institutionId,null);assert.equal(data.onboarding.departmentId,null);assert.equal(signupWorkplaceLabel(log.metadata),'קהילה · Synthetic community clinic');}
   if(workplace==='both'){assert.equal(data.onboarding.institutionId,department.institutionId);assert.equal(data.onboarding.departmentId,department.id);assert.equal(data.onboarding.workplace,'both');}
   if(role==='post_intern'){assert.equal(data.onboarding.departmentId,null);assert.equal(data.onboarding.experienceContributionCategory,'intern');}
   await decideRegistration({userId:user.id,actorId:'staz-test-admin',approved:false,note:'Synthetic test cleanup'});
   assert.equal(await db.uploadedFile.count({where:{uploadedByUserId:user.id,category:'USER_VERIFICATION_PROOF'}}),0);
  }
  assert.equal(mailIntercepted,3);
  const report={passed:true,syntheticRegistrations:3,communityOnlyNoHospitalRequired:true,combinedWorkplacePersisted:true,postInternStatusAndReceiptVerified:true,verificationAndProofDeletionPreserved:true,externalMessagesSent:0};
  await writeFile('docs/resident-survey-local-20261114/signup-integration.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{
  global.fetch=originalFetch;for(const[k,v]of Object.entries(env)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
  for(const id of created){await db.auditLog.deleteMany({where:{OR:[{actorUserId:id},{entityId:id,entityType:'User'}]}});await db.marketingConsentEvent.deleteMany({where:{userId:id}});await db.user.delete({where:{id}});}
  if(submissionId){await db.uploadedFile.deleteMany({where:{reviewSubmissionId:submissionId}});await db.reviewSubmission.delete({where:{id:submissionId}});}
 }
}
main().catch(e=>{console.error(e.code==='ERR_ASSERTION'?e.message:e.code||e.name);process.exitCode=1}).finally(()=>db.$disconnect());
