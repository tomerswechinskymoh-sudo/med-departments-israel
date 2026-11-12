import { publicVisibleDepartmentWhere } from '../../src/lib/queries';
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const db = new PrismaClient({ log: [] });
async function main() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.STAZ_TEST_DATABASE_HOST); assert.ok(!process.env.DATABASE_URL!.includes('ep-odd-pine-'));
  for (const [id, role] of [['staz-test-admin','ADMIN'],['staz-test-student','STUDENT']] as const) await db.user.upsert({ where: { id }, create: { id, email: id+'@example.invalid', fullName: 'משתמש בדיקה סינתטי', roleKey: role, passwordHash: 'not-a-usable-password', emailVerified: true, verificationStatus: 'VERIFIED' }, update: {} });
  const r = await db.surveyReview.findFirstOrThrow({ where: { sourceRowNumber: 49001 }, select: { id: true, targetDepartmentId: true } });
  const dep = await db.department.findFirstOrThrow({ where: { ...publicVisibleDepartmentWhere, specialty: { groupAsArray: false } }, select: { id: true, slug: true } });
  await db.surveyReview.update({ where: { id: r.id }, data: { targetDepartmentId: dep.id, mappingConfirmed: false, status: 'PENDING_REVIEW', mappingExceptionReason: 'Synthetic browser test hospital exception', revision: { increment: 1 } } });
  await writeFile('/private/tmp/hitmachut-staz-private-20261112/browser-fixture.json', JSON.stringify({ reviewId: r.id, departmentId: dep.id, departmentSlug: dep.slug }), { mode: 0o600 });
  console.log('Synthetic browser accounts and private fixture ready');
}
main().finally(() => db.$disconnect()).catch(() => { console.error('BROWSER_SETUP_FAILED'); process.exitCode = 1; });
