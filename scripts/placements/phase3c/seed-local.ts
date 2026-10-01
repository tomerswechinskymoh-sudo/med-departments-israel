import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../../src/lib/password';
const url=new URL(process.env.DATABASE_URL??'');
if(url.hostname!=='127.0.0.1'||url.port!=='55439'||url.pathname!=='/phase3c_guarded_test_only')throw Error('Unsafe test destination');
const db=new PrismaClient();
async function main(){for(const roleKey of ['ADMIN','STUDENT'] as const){await db.role.upsert({where:{key:roleKey},update:{},create:{key:roleKey,label:roleKey,description:"TEST_ONLY"}});const id=`phase3c-${roleKey.toLowerCase()}`;await db.user.upsert({where:{id},update:{},create:{id,email:`${id}@example.test`,fullName:`TEST_ONLY ${roleKey}`,passwordHash:await hashPassword('Synthetic-Phase3C-Only!'),roleKey,emailVerified:true,verificationStatus:'VERIFIED'}});}console.log('PASS isolated synthetic admin/applicant accounts');}
main().finally(()=>db.$disconnect());
