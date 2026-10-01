import {PrismaClient} from '@prisma/client';
import {hashPassword} from '../../src/lib/password';
const url=new URL(process.env.DATABASE_URL??'');
if(url.hostname!=='127.0.0.1'||url.port!=='55439'||url.pathname!=='/phase4a_career_fit_test_only')throw Error('Unsafe test destination');
const db=new PrismaClient();
async function main(){
 await db.role.upsert({where:{key:'STUDENT'},update:{},create:{key:'STUDENT',label:'TEST_ONLY',description:'Synthetic'}});
 await db.user.upsert({where:{id:'career-fit-student'},update:{},create:{id:'career-fit-student',email:'career-fit@example.test',fullName:'TEST_ONLY',passwordHash:await hashPassword('Synthetic-Career-Fit-Only!'),roleKey:'STUDENT',emailVerified:true,verificationStatus:'VERIFIED'}});
 for(const [id,name] of [['surgery','כירורגיה כללית'],['anesthesia','הרדמה'],['internal','רפואה פנימית']]){
 await db.specialty.upsert({where:{id},update:{},create:{id,name,slug:id,description:'TEST_ONLY'}});
 for(let i=0;i<4;i++){
 const hid=`career-fit-h${i}`,did=`career-fit-${id}-${i}`;
 await db.institution.upsert({where:{id:hid},update:{},create:{id:hid,name:`מוסד בדיקה ${i}`,slug:hid,type:i===3?'HMO':'HOSPITAL',region:i===2?null:i===3?'דרום':'צפון',summary:'TEST_ONLY'}});
 await db.department.upsert({where:{id:did},update:{},create:{id:did,slug:did,institutionId:hid,specialtyId:id,name:`${name} בדיקה ${i}`,shortSummary:'TEST_ONLY',about:'TEST_ONLY',practicalInfo:'TEST_ONLY',residentsCount:10,importStableKey:`master:${did}`}});
 }
 }
 console.log('PASS isolated synthetic catalog: 3 specialties, 12 departments; synthetic learner');
}
main().finally(()=>db.$disconnect());
