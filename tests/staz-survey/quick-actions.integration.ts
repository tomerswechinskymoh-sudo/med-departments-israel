import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'node:fs/promises';
import { SOURCE_ID, suggestMapping, type Candidate } from '../../src/lib/staz-survey/domain';
import { readCatalog, importCandidates } from '../../src/server/staz-survey/importer';
import { moderate, changeSource, type ComponentAction } from '../../src/server/staz-survey/moderation';
import { publicSurveyExperiences } from '../../src/server/staz-survey/public';
const privateDir = '/private/tmp/hitmachut-staz-ux-private-20261112';
async function main() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.STAZ_TEST_DATABASE_HOST);
  assert.ok(process.env.STAZ_TEST_DATABASE_HOST?.startsWith('ep-old-snow-'));
  const db = new PrismaClient({ log: [] });
  try {
    const catalog = await readCatalog(db);
    const template: Candidate = { sourceReviewKey: '', sourceRowNumber: 0, sourceColumnLetter: 'BL', sourceYear: 2023, originalHospital: '', originalDepartmentOrScope: '', rawHospital: '', rawDepartment: '', sourceQuestion: 'בדיקת תור מהיר סינתטית', proposedText: 'הצוות הסביר בסבלנות והייתה הזדמנות ללמוד ולהשתתף. תגובה סינתטית לבדיקת הממשק בלבד.', originalText: 'תגובה סינתטית בלבד', sourceVerified: true, workbookHash: 'synthetic', privacyFlags: [], ratings: [] };
    const department = catalog.find(d => catalog.some(other => other.institutionId === d.institutionId && other.id !== d.id) && suggestMapping({ ...template, originalHospital: d.institution.name, rawHospital: d.institution.name, rawDepartment: d.name }, catalog).suggestedDepartmentId === d.id)!;
    assert.ok(department);
    const firstRow = Math.max(51000, (await db.surveyReview.aggregate({ _max: { sourceRowNumber: true } }))._max.sourceRowNumber ?? 0) + 1;
    const question = template.sourceQuestion + ' ' + firstRow;
    const candidates = Array.from({ length: 25 }, (_, i): Candidate => ({ ...template, sourceReviewKey: `${SOURCE_ID}:R${firstRow+i}:CBL`, sourceRowNumber: firstRow+i,
      sourceQuestion: question, originalHospital: department.institution.name, rawHospital: department.institution.name, originalDepartmentOrScope: department.name, rawDepartment: department.name,
      ratings: [{ metricCode: 'ELECTIVE_RECOMMENDATION', label: 'המלצה על סבב אלקטיב', questionCode: 'qus_70', question: 'שאלה סינתטית', sourceRowNumber: firstRow+i, sourceColumn: 'BK', rawAnswer: '5', scale: '1–5', normalizedValue: 5, rotationContext: 'ELECTIVE_1', confidence: 'EXACT_SAME_ROW_AND_ROTATION', verified: true }] }));
    const actor = { userId: 'staz-test-admin', name: 'מנהל בדיקה סינתטי' };
    await importCandidates(db, candidates, 'quick-synthetic-'+firstRow, actor.userId);
    let source = await db.surveyReviewSource.findUniqueOrThrow({ where: { id: SOURCE_ID } });
    if (source.permissionConfirmedAt || source.isPublicEnabled) source = await changeSource(db, { revision: source.revision, action: 'REVOKE_PERMISSION', confirmed: true }, actor.userId);
    const get = () => db.surveyReview.findUniqueOrThrow({ where: { sourceReviewKey: candidates[0].sourceReviewKey }, include: { ratings: true } });
    let row = await get();
    const act = async (extra: Partial<ComponentAction>) => {
      const action: ComponentAction = { revision: row.revision, component: 'TEXT', action: 'PUBLISH', targetDepartmentId: department.id, mappingExceptionReason: '', reviewed: true, text: candidates[0].proposedText, ...extra };
      const result = await moderate(db, row.id, action, actor); row = await get(); return result;
    };
    await act({}); assert.equal(row.status, 'APPROVED'); assert.equal(row.publishText, true); assert.equal(row.publishRatings, false);
    await act({ component: 'RATING', metricId: row.ratings[0].id }); assert.equal(row.status, 'APPROVED'); assert.equal(row.publishText, true); assert.equal(row.publishRatings, true);
    assert.deepEqual(await publicSurveyExperiences(db, [department.id], { role: 'admin' }), []);
    await assert.rejects(act({ revision: 0 }), /STALE_REVISION/);
    await assert.rejects(act({ component: 'RATING', metricId: 'foreign' }), /INVALID_RATING_EVIDENCE/);
    await assert.rejects(act({ targetDepartmentId: null }), /MAPPING_CONFIRMATION_REQUIRED/);
    source = await changeSource(db, { revision: source.revision, action: 'CONFIRM_PERMISSION', confirmed: true, evidence: 'Synthetic component test permission', authorizedByController: true, permitsTextAndRatings: true }, actor.userId);
    source = await changeSource(db, { revision: source.revision, action: 'ENABLE', confirmed: true }, actor.userId);
    const output = async () => (await publicSurveyExperiences(db, [department.id], { role: 'admin' })).find(r => r.id === row.id);
    assert.equal((await output())?.ratings.length, 1); assert.equal((await output())?.text, candidates[0].proposedText);
    await act({ action: 'HIDE' }); assert.equal((await output())?.text, null); assert.equal((await output())?.ratings.length, 1);
    await act({ component: 'RATING', action: 'HIDE', metricId: row.ratings[0].id }); assert.equal(row.status, 'PENDING_REVIEW'); assert.equal(await output(), undefined);
    await act({ component: 'RATING', metricId: row.ratings[0].id }); assert.equal(row.publishText, false);
    await act({ text: 'טקסט סינתטי מעודכן' }); assert.equal(row.publishRatings, true); assert.equal((await output())?.text, 'טקסט סינתטי מעודכן');
    const other = catalog.find(d => d.id !== department.id && d.institutionId === department.institutionId)!;
    assert.ok(other);
    const moved = await act({ targetDepartmentId: other.id }); assert.equal(moved.otherComponentReset, true); assert.equal(row.publishRatings, false);
    await changeSource(db, { revision: source.revision, action: 'REVOKE_PERMISSION', confirmed: true }, actor.userId);
    await moderate(db, row.id, { revision: row.revision, action: 'SAVE', targetDepartmentId: null, mappingConfirmed: false, mappingExceptionReason: '', approvedPublicText: '', publishText: false, publishRatings: false, selectedMetricIds: [], privacyReviewed: false, adminNotes: '' }, actor);
    await mkdir(privateDir, { recursive: true });
    await writeFile(privateDir+'/browser-fixture.json', JSON.stringify({ question, reviewId: row.id, departmentId: department.id, departmentSlug: department.slug, rowIds: (await db.surveyReview.findMany({ where: { sourceQuestion: question }, orderBy: { sourceRowNumber: 'asc' }, select: { id: true } })).map(r => r.id) }), { mode: 0o600 });
    console.log(JSON.stringify({ passed: true, oneClickText: true, oneClickRating: true, independentRemoval: true, preservesOtherApproval: true, mappingChangesInvalidateOtherComponent: true, staleAndForeignMetricRejected: true, sourceAndRightsGate: true, syntheticOnly: true }));
  } finally { await db.$disconnect(); }
}
main().catch(e => { console.error(e instanceof assert.AssertionError ? e.stack : e?.code ?? 'QUICK_ACTION_TEST_FAILED'); process.exitCode = 1; });
