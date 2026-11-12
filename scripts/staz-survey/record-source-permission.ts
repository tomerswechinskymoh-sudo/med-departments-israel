// Operator entry point: run only for the explicit authorization recorded below.
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { changeSource } from '../../src/server/staz-survey/moderation';
import { SOURCE_ID } from '../../src/lib/staz-survey/domain';
async function main() {
  assert.ok(process.argv.includes('--user-authorized-20261112'));
  assert.ok(new URL(process.env.DATABASE_URL!).hostname.startsWith('ep-odd-pine-'));
  const db = new PrismaClient({ log: [] });
  try {
    let source = await db.surveyReviewSource.findUniqueOrThrow({ where: { id: SOURCE_ID } });
    assert.equal(source.isPublicEnabled, false); assert.equal(source.permissionConfirmedAt, null);
    const approvals = await db.surveyReview.findMany({ where: { originalHospital: 'כרמל', status: 'APPROVED' }, select: { reviewedByUserId: true } });
    const actors = [...new Set(approvals.map(r => r.reviewedByUserId).filter(Boolean))]; assert.equal(actors.length, 1);
    const actor = await db.user.findUniqueOrThrow({ where: { id: actors[0]! }, select: { id: true, roleKey: true } }); assert.equal(actor.roleKey, 'ADMIN');
    const fingerprint = async () => db.$queryRaw`SELECT md5(string_agg(to_jsonb(r)::text,'' ORDER BY id)) AS digest FROM "SurveyReview" r`;
    const before = await fingerprint();
    const evidence = 'הצהרת בעל האתר בשיחת העבודה מיום 12.11.2026, בתשובה לבקשת אישור שימוש בטקסטים ובדירוגים והפעלת המקור: ״יש אישור ממשרד הבריאות שמחזיק את הסקר והאתר שלו״.';
    source = await changeSource(db, { revision: source.revision, action: 'CONFIRM_PERMISSION', confirmed: true, evidence, authorizedByController: true, permitsTextAndRatings: true }, actor.id);
    source = await changeSource(db, { revision: source.revision, action: 'ENABLE', confirmed: true }, actor.id);
    await db.auditLog.create({ data: { actorUserId: actor.id, action: 'STAZ_SOURCE_OPERATOR_EXECUTED_USER_AUTHORIZATION', entityType: 'SurveyReviewSource', entityId: SOURCE_ID, metadata: { authorizationChannel: 'user-chat', executedBy: 'Codex', authorizationDate: '2026-11-12', evidence, noReviewDecisionsChanged: true } } });
    assert.deepEqual(await fingerprint(), before);
    const report = { passed: true, sourceEnabled: source.isPublicEnabled, rightsConfirmed: Boolean(source.permissionConfirmedAt), evidenceBasis: 'User statement in chat: Ministry of Health permission, 2026-11-12', approvalDecisionsUnchanged: true, approved: await db.surveyReview.count({ where: { status: 'APPROVED', sourceId: SOURCE_ID } }), pending: await db.surveyReview.count({ where: { status: 'PENDING_REVIEW', sourceId: SOURCE_ID } }) };
    await writeFile('docs/staz-survey-mapping-20261112/source-activation.json', JSON.stringify(report, null, 2)+'\n'); console.log(JSON.stringify(report));
  } finally { await db.$disconnect(); }
}
main().catch(e => { console.error(e instanceof assert.AssertionError ? e.message : e?.code ?? 'SOURCE_PERMISSION_FAILED'); process.exitCode = 1; });
