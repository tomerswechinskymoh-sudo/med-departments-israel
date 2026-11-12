import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CONTEXT, SOURCE_ID, parseRating, suggestMapping, sourceAllowsPublication, type Candidate, type DepartmentOption } from '../../src/lib/staz-survey/domain';
import { parseCandidates, parseCsv, verifyWorkbook } from '../../src/server/staz-survey/parse';
import { dryRun } from '../../src/server/staz-survey/importer';
import { renderToStaticMarkup } from 'react-dom/server';
import React, { createElement } from 'react';
(globalThis as typeof globalThis & { React: typeof React }).React = React;
import { ReviewCard } from '../../src/components/departments/review-card';
export function candidate(col: 'BL' | 'BP' | 'BG' = 'BL', row = 3): Candidate {
  return { sourceReviewKey: `${SOURCE_ID}:R${row}:C${col}`, sourceRowNumber: row, sourceColumnLetter: col, sourceYear: 2022, originalHospital: 'מוסד בדיקה', originalDepartmentOrScope: col === 'BG' ? 'כלל בית החולים' : 'רפואה פנימית', sourceQuestion: 'שאלה סינתטית', rawHospital: 'מוסד בדיקה', rawDepartment: col === 'BG' ? '' : 'רפואה פנימית', proposedText: 'טקסט סינתטי בלבד', originalText: 'טקסט סינתטי בלבד', sourceVerified: false, workbookHash: null, ratings: [], privacyFlags: [] };
}
const catalog: DepartmentOption[] = [{ id: 'd1', name: 'פנימית', slug: 'synthetic', institutionId: 'h1', institution: { name: 'מוסד בדיקה' }, specialty: { name: 'רפואה פנימית' } }];
test('ratings require exact valid 1–5; missing or compound responses never become 0', () => {
  for (const [value, expected] of [['5-במידה רבה מאוד',5],['1-כלל לא',1],['3',3],['4.0',4],['',null],['0',null],['6',null],['4-5',null],['במידה רבה',null],['ממוצע: 4.3',null]] as const) assert.equal(parseRating(value), expected);
});
test('hospital-wide and ambiguous units never auto-map', () => {
  assert.equal(suggestMapping(candidate(), catalog).suggestedDepartmentId, 'd1');
  assert.equal(suggestMapping(candidate('BG'), catalog).suggestedDepartmentId, null);
  assert.equal(suggestMapping(candidate(), [...catalog, { ...catalog[0], id: 'd2' }]).suggestedDepartmentId, null);
  assert.equal(suggestMapping({ ...candidate(), rawHospital: 'בית חולים אחר' }, catalog).suggestedDepartmentId, null);
  assert.equal(suggestMapping({ ...candidate(), rawDepartment: 'פנימית א' }, catalog).suggestedDepartmentId, null);
});
test('publication requires both source switch and documented rights', () => {
  assert.equal(sourceAllowsPublication({ isPublicEnabled: true, permissionConfirmedAt: null }), false);
  assert.equal(sourceAllowsPublication({ isPublicEnabled: false, permissionConfirmedAt: new Date(), permissionEvidence: 'test' }), false);
  assert.equal(sourceAllowsPublication({ isPublicEnabled: true, permissionConfirmedAt: new Date(), permissionEvidence: 'test' }), true);
});
test('CSV handles multiline text safely and never trusts imported approval flags', () => {
  const c = candidate(); const record = { source_batch_key: SOURCE_ID, source_review_key: c.sourceReviewKey, source_row_number: '3', source_column_letter: 'BL', survey_year: '2022', survey_hospital: c.originalHospital, survey_department_or_scope: c.originalDepartmentOrScope, raw_hospital_from_source_row: c.rawHospital, raw_department_from_source_row: c.rawDepartment, source_question: c.sourceQuestion, review_text_proposed: 'שורה, אחת\n"שנייה"', auto_sentiment: 'חיובית', text_approved_for_publication: 'TRUE', rating_1_to_5_proposed: '5' };
  const quote = (v: string) => '"' + v.replaceAll('"','""') + '"';
  const bytes = Buffer.from('\uFEFF' + Object.keys(record).join(',') + '\r\n' + Object.values(record).map(quote).join(','));
  assert.equal(parseCsv(bytes)[0].review_text_proposed, record.review_text_proposed);
  const parsed = parseCandidates(bytes)[0]; assert.deepEqual(parsed.ratings, []); assert.equal(parsed.sourceVerified, false); assert.ok(!('publishText' in parsed));
  assert.throws(() => parseCsv(Buffer.from('x,x\n1,2')), /HEADERS/);
  assert.throws(() => parseCsv(Buffer.from('"open')), /UNTERMINATED/);
});
test('idempotent report preserves changes for review rather than overwriting', () => {
  const r = dryRun([candidate(), candidate()], catalog, [{ sourceReviewKey: candidate().sourceReviewKey, sourceFingerprint: 'changed' }]);
  assert.equal(r.inserted, 0); assert.equal(r.duplicates, 1); assert.equal(r.changed, 1); assert.equal(r.decisionsPreserved, true);
});
test('BL/BK and BP/BO come from the identical row, BG has no department rating; formulas rejected', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'staz-synthetic-'));
  try {
    const wb = new ExcelJS.Workbook(), s = wb.addWorksheet('סקר סטאז');
    for (const [col, code] of Object.entries({ B: 'compute_0002', BL: 'qus_118', BK: 'qus_70', BP: 'qus_117', BO: 'qus_73', BG: 'qus_66', CT: 'qus_103' })) s.getCell(col+'1').value = code;
    for (const col of ['BL','BP','BG'] as const) { const c = candidate(col), ctx = CONTEXT[col]; s.getCell('B3').value = '01/01/2022'; s.getCell(col+'3').value = c.proposedText; s.getCell(ctx.hospital+'3').value = c.rawHospital; if (ctx.department) s.getCell(ctx.department+'3').value = c.rawDepartment; if (ctx.rating) { s.getCell(ctx.rating+'2').value = 'שאלת המלצה'; s.getCell(ctx.rating+'3').value = col === 'BL' ? '5-מאוד' : '2-מעט'; } }
    s.getCell('BK4').value = '1-כלל לא'; const unrelated = wb.addWorksheet('ב ביניים'); unrelated.getCell('A1').value = 4.8;
    const path = join(dir, 'source.xlsx'); await wb.xlsx.writeFile(path);
    const rows = await verifyWorkbook([candidate(), candidate('BP'), candidate('BG')], path);
    assert.equal(rows[0].ratings[0].normalizedValue, 5); assert.equal(rows[1].ratings[0].normalizedValue, 2); assert.deepEqual(rows[2].ratings, []);
    assert.ok(rows.every(r => r.sourceVerified));
    s.getCell('BK3').value = { formula: '1+4', result: 5 }; await wb.xlsx.writeFile(path);
    await assert.rejects(verifyWorkbook([candidate()], path), /UNSAFE_CELL/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('existing card supports survey provenance, escaped text and no artificial scores or empty rating-only cards', () => {
  const survey = { id: 'synthetic', year: 2022, hospitalScope: false, text: '<script>synthetic</script>', ratings: [] };
  const html = renderToStaticMarkup(createElement(ReviewCard, { survey }));
  assert.ok(html.includes('מתוך סקר')); assert.ok(!html.includes('<script>')); assert.ok(!html.includes('הוראה')); assert.ok(!html.includes('אומת'));
  assert.equal(renderToStaticMarkup(createElement(ReviewCard, { survey: { ...survey, text: null, ratings: [{ code: 'ELECTIVE_RECOMMENDATION', label: 'אלקטיב', value: 5 }] } })), '');
});
