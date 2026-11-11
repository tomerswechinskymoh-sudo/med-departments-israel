import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { assertLocalTestDatabase } from './fixtures';
import { prisma } from '../../src/lib/prisma';
assertLocalTestDatabase();
const base = 'http://127.0.0.1:3109';
const payload = Buffer.from(JSON.stringify({userId:'test-admin',role:'admin',exp:Date.now()+3600000})).toString('base64url');
const memberPayload = Buffer.from(JSON.stringify({userId:'test-member',role:'student',exp:Date.now()+3600000})).toString('base64url');
const readHeaders = { Cookie:'med_departments_session='+memberPayload+'.'+createHmac('sha256',process.env.AUTH_SECRET!).update(memberPayload).digest('base64url') };
const headers = { 'Content-Type':'application/json', Cookie:'med_departments_session='+payload+'.'+createHmac('sha256',process.env.AUTH_SECRET!).update(payload).digest('base64url') };
async function save(enabled:boolean) {
  for(const source of ['ima','duns100']) assert.equal((await fetch(base+'/api/admin/source-visibility',{method:'PATCH',headers,body:JSON.stringify({source,enabled})})).status,200);
}
async function main() {
  if(process.argv.includes('--prepare')) {await save(false);console.log('Persisted both sources off; restart local server before verification.');return;}
  const flags = await prisma.sourceVisibility.findUniqueOrThrow({where:{id:'global'}});
  assert.equal(flags.ima,false);assert.equal(flags.duns100,false);
  const html = await (await fetch(base+'/departments/test-department?id=test-department',{headers:readHeaders})).text();
  for(const value of ['IMA_PRIVATE_SENTINEL','87.654321','45678.1234','9876.54321']) assert(!html.includes(value));
  assert(!html.includes('מעבר שלב א׳'));
  await save(true);
  const restored = await (await fetch(base+'/departments/test-department?id=test-department',{headers:readHeaders})).text();
  assert(restored.includes('מעבר שלב א׳'));assert(restored.includes('9876.54321'));
  console.log('Persistence after process restart and restoration without import: passed.');
}
main().finally(()=>prisma.$disconnect());
