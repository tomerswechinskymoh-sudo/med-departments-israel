import { prisma } from '../../src/lib/prisma';
import { hashPassword } from '../../src/lib/password';
export function assertLocalTestDatabase() {
 const u = new URL(process.env.DATABASE_URL ?? '');
 if (u.hostname !== '127.0.0.1' || u.port !== '55439' || u.pathname !== '/hitmachut_test') throw new Error('Tests require isolated local database on 127.0.0.1:55439/hitmachut_test');
}
export async function seedFixtures() {
 assertLocalTestDatabase();
 for (const key of ['ADMIN','STUDENT','RESIDENT','REPRESENTATIVE'] as const) await prisma.role.upsert({where:{key},update:{},create:{key,label:key,description:"Synthetic test role"}});
 for (const [id,roleKey] of [['test-admin','ADMIN'],['test-member','STUDENT']] as const) await prisma.user.upsert({where:{id},update:{},create:{id,email:`${id}@example.invalid`,fullName:'חשבון בדיקה סינתטי',passwordHash:await hashPassword('synthetic-only-strong-password'),roleKey,emailVerified:true,verificationStatus:'VERIFIED'}});
 await prisma.institution.upsert({where:{id:'test-hospital'},update:{},create:{id:'test-hospital',name:'מוסד בדיקה',slug:'test-hospital',type:'HOSPITAL',summary:'נתוני בדיקה בלבד',region:'מרכז'}});
 await prisma.specialty.upsert({where:{id:'test-specialty'},update:{},create:{id:'test-specialty',name:'רפואה פנימית',slug:'test-specialty',description:'IMA_PRIVATE_SENTINEL'}});
 for (const id of ['test-department','test-department-two']) await prisma.department.upsert({where:{id},update:{},create:{id,slug:id,name:id==='test-department'?'מחלקת בדיקה':'מחלקת בדיקה נוספת',specialtyId:'test-specialty',institutionId:'test-hospital',shortSummary:'מחלקה לצורך בדיקה',about:'נתוני בדיקה',practicalInfo:'נתוני בדיקה',importStableKey:id,residentsCount:12,shlavAlephPassRate:87.654321,shlavBetPassRate:86.54321}});
 for (const [metricKey,value,sourceNotes] of [['duns100PhysiciansCount',9876.54321,'DUNS100'],['boardStageAPassRate',87.654321,'הר״י'],['centerSalary',45678.1234,'הר״י'],['residentsCount',12,'משרד הבריאות'],['actualAverageDuration',4.5,'משרד הבריאות']] as const) await prisma.departmentMetric.upsert({where:{departmentId_metricKey:{departmentId:'test-department',metricKey}},update:{value,sourceNotes},create:{departmentId:'test-department',metricKey,label:metricKey,value,rawValue:String(value),sourceNotes}});
 await prisma.departmentExternalMetric.upsert({where:{departmentId_metricKey_sourceName:{departmentId:'test-department',metricKey:'duns100PhysiciansCount',sourceName:'DUNS100'}},update:{},create:{departmentId:'test-department',metricKey:'duns100PhysiciansCount',value:9876.54321,sourceName:'DUNS100',approved:true}});
 await prisma.specialtyMetric.upsert({where:{specialtyId_metricKey:{specialtyId:'test-specialty',metricKey:'imaSyllabusText'}},update:{},create:{specialtyId:'test-specialty',metricKey:'imaSyllabusText',label:'תיאור',rawValue:'IMA_PRIVATE_SENTINEL',sourceNotes:'הר״י'}});
 await prisma.favoriteDepartment.upsert({where:{userId_departmentId:{userId:'test-member',departmentId:'test-department'}},update:{},create:{userId:'test-member',departmentId:'test-department'}});
 await prisma.reviewSubmission.upsert({where:{id:'test-review'},update:{},create:{id:'test-review',departmentId:'test-department',reviewerType:'STUDENT',phone:'',email:'synthetic@example.invalid',isAnonymous:true,teachingQuality:4,workAtmosphere:4,seniorsApproachability:4,researchExposure:4,lifestyleBalance:4,overallRecommendation:4,pros:'תוכן סינתטי בסביבת בדיקה בלבד',cons:'',tips:'',consentToContact:true,consentToTerms:true,consentNoPatientInfo:true}});
 await prisma.review.upsert({where:{id:'test-published-review'},update:{},create:{id:'test-published-review',submissionId:'test-review',departmentId:'test-department',reviewerType:'STUDENT',isAnonymous:true,teachingQuality:4,workAtmosphere:4,seniorsApproachability:4,researchExposure:4,lifestyleBalance:4,overallRecommendation:4,pros:'תוכן סינתטי לבדיקה מקומית',cons:'',tips:''}});
}
