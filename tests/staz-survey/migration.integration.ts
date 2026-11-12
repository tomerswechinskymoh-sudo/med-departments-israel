import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const db = new PrismaClient({ log: [] });
async function main() {
 assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.STAZ_TEST_DATABASE_HOST); assert.ok(!process.env.DATABASE_URL!.includes('ep-odd-pine-'));
 const sql = await readFile('prisma/migrations/202611120001_staz_survey_reviews/migration.sql','utf8');
 const rollback = new Error('EXPECTED_ROLLBACK');
 try {
  await db.$transaction(async tx => {
   await tx.$executeRawUnsafe('CREATE SCHEMA staz_migration_validation');
   await tx.$executeRawUnsafe('SET LOCAL search_path = staz_migration_validation, public');
   for(const statement of sql.split(';').map(s=>s.trim()).filter(s=>s && !['BEGIN','COMMIT'].includes(s))) await tx.$executeRawUnsafe(statement);
   const counts = await tx.$queryRawUnsafe<{ n: bigint }[]>('SELECT count(*) AS n FROM staz_migration_validation."SurveyReview"'); assert.equal(Number(counts[0].n),0);
   throw rollback;
  }, {timeout:60000});
 } catch(e) { if(e!==rollback) throw e; }
 const schema=await db.$queryRaw`SELECT schema_name FROM information_schema.schemata WHERE schema_name='staz_migration_validation'`;assert.deepEqual(schema,[]);
 console.log(JSON.stringify({passed:true,fullFinalMigration:true,transactionalRollbackVerified:true,existingDataUntouched:true}));
}
main().finally(()=>db.$disconnect()).catch(e=>{console.error(e.code??e.message);process.exitCode=1});
