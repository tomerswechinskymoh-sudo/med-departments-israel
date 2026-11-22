const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const { legacy } = require('../production-release-migration.cjs');
const migration='20261122060000_split_ima_visibility';
const host=new URL(process.env.DATABASE_URL).hostname;
assert.equal(host,process.env.ACADEMIC_DATABASE_HOST,'Explicit database host is required');
assert(!host.includes('-pooler.'),'Migrations require the direct endpoint');
if(host==='ep-odd-pine-amqmgo7p.c-5.us-east-1.aws.neon.tech') assert(process.argv.includes('--production'),'Explicit production target is required');
const prisma=new PrismaClient();
async function fingerprint() {
  const result={};
  for(const table of ['Institution','Department','DepartmentMetric','SpecialtyMetric','DepartmentYearlyMetric','SpecialtyYearlyMetric','Review','ExternalSurveyAggregate']) {
    const rows=await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count, md5(COALESCE(string_agg(row_to_json(t)::text, '|' ORDER BY id),'')) AS hash FROM "${table}" t`);
    result[table]=rows[0];
  }
  return result;
}
async function main(){
 const history=await prisma.$queryRawUnsafe('SELECT migration_name,checksum,finished_at,rolled_back_at FROM "_prisma_migrations"');
 const applied=new Map(history.filter(r=>r.finished_at&&!r.rolled_back_at).map(r=>[r.migration_name,r.checksum]));
 assert(!history.some(r=>!r.finished_at&&!r.rolled_back_at),'Unresolved migration');
 const files=fs.readdirSync('prisma/migrations').filter(name=>fs.existsSync(`prisma/migrations/${name}/migration.sql`));
 for(const [name,checksum] of applied){assert(files.includes(name),`Missing applied migration ${name}`);const current=crypto.createHash('sha256').update(fs.readFileSync(`prisma/migrations/${name}/migration.sql`)).digest('hex');assert(current===checksum||(name===legacy.name&&current===legacy.current&&checksum===legacy.applied),`Unexpected migration drift: ${name}`);}
 const pending=files.filter(name=>!applied.has(name));assert(pending.length===0||(pending.length===1&&pending[0]===migration),'Only the reviewed visibility migration may run');
 let before={flags:(await prisma.$queryRawUnsafe('SELECT * FROM "SourceVisibility"'))[0],records:await fingerprint()};
 const output=process.env.ACADEMIC_MIGRATION_REPORT;assert(output);
 if(!pending.length&&fs.existsSync(output+'.before.json')) before=JSON.parse(fs.readFileSync(output+'.before.json','utf8'));
 else fs.writeFileSync(output+'.before.json',JSON.stringify(before,null,2)+'\n');
 if(pending.length){const r=spawnSync('npx',['prisma','migrate','deploy'],{env:process.env,encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr||'Migration failed');assert(r.stdout.includes(migration));}
 await prisma.$disconnect(); // ALTER TABLE changes the result shape of the earlier prepared SELECT.
 const after={flags:(await prisma.$queryRawUnsafe('SELECT * FROM "SourceVisibility"'))[0],records:await fingerprint()};
 assert.deepEqual(after.records,before.records,'Source records must remain identical');
 assert.equal(after.flags.ima,before.flags.ima);assert.equal(after.flags.duns100,before.flags.duns100);
 if(before.flags.ima_finance===undefined){assert.equal(after.flags.ima_finance,before.flags.ima);assert.equal(after.flags.ima_exams,true);assert.equal(after.flags.revision,before.flags.revision+1);}
 const report={passed:true,host,migration,applied:pending.length===1,recordsUnchanged:true,before,after};fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,applied:report.applied,recordsUnchanged:true,flags:after.flags}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect());
