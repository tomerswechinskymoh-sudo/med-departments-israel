// Local-only, reproducible audit. Outputs coordinates/hashes/aggregates, no text
// or respondent demographics. Does not contact a database or publish anything.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { clean, parseRating } from '../../src/lib/staz-survey/domain';
import { parseCandidates, verifyWorkbook, hash } from '../../src/server/staz-survey/parse';
import { classifySourceEncoding } from '../../src/server/staz-survey/source-encoding';
import { electiveContextHash } from '../../src/server/staz-survey/association';
import reviewed from '../../src/server/staz-survey/reviewed-elective-corrections.json';

async function main() {
  const args = process.argv.slice(2), value = (key: string) => args[args.indexOf(key) + 1];
  for (const key of ['--csv', '--workbook', '--manifest', '--report']) assert.ok(args.includes(key));
  const bytes = await readFile(value('--workbook')), workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as never);
  const sheet = workbook.getWorksheet('סקר סטאז')!; assert.ok(sheet);
  for (const [column, code] of Object.entries({ BQ: 'qus_74', BR: 'qus_75', BB: 'qus_56', BC: 'qus_57', BD: 'qus_58', BE: 'qus_59', BF: 'qus_60' })) assert.equal(sheet.getCell(column+'1').text, code);
  const candidates = await verifyWorkbook(parseCandidates(await readFile(value('--csv'))), value('--workbook'));
  const profiles = new Map<number, ReturnType<typeof classifySourceEncoding>>();
  const all: Record<string, number> = {}, imported: Record<string, number> = {};
  const scoreStructure: Record<string, number> = {};
  const structuralProbes: { row: number; profile: string; direction: string }[] = [];
  const meaningful = (t: string) => t.length >= 8 && /[א-ת]/.test(t) && !/^(?:לא רלוונטי|לא עשיתי.*|לא ביצעתי.*|אין.*|לא הייתי.*|לא היה.*|אין לי.*|לא היו.*|לא רלבנטי)[.! ]*$/.test(t);
  const rowCount = sheet.rowCount, columnCount = sheet.columnCount;
  for (let row = 3; row <= rowCount; row++) {
    const cells: Record<string, string> = {};
    for (let col = 1; col <= columnCount; col++) {
      const cell = sheet.getCell(row, col);
      assert.ok(![ExcelJS.ValueType.Formula, ExcelJS.ValueType.Error, ExcelJS.ValueType.Hyperlink].includes(cell.type));
      cells[cell.address.replace(/\d+$/, '')] = clean(cell.text);
    }
    const format = classifySourceEncoding(cells); profiles.set(row, format);
    all[format.profile] = (all[format.profile] ?? 0) + 1;
    const populatedContexts = [Boolean(cells.BI || cells.BJ), Boolean(cells.BM || cells.BN)];
    const populatedTexts = [meaningful(cells.BL), meaningful(cells.BP)];
    if (populatedContexts.filter(Boolean).length === 1 && populatedTexts.filter(Boolean).length === 1) {
      structuralProbes.push({ row, profile: format.profile, direction: populatedContexts[0] === populatedTexts[0] ? 'DIRECT' : 'CROSS' });
    }
    if (format.profile === 'MODERN') {
      const contexts = [Boolean(cells.BI || cells.BJ), Boolean(cells.BM || cells.BN)];
      const scores = [parseRating(cells.BK) !== null, parseRating(cells.BO) !== null];
      if (contexts.filter(Boolean).length === 1 && scores.filter(Boolean).length === 1) {
        const key = contexts[0] === scores[0] ? 'sameBlock' : 'oppositeBlock';
        scoreStructure[key] = (scoreStructure[key] ?? 0) + 1;
      }
    }
  }
  const prior = new Set(reviewed.corrections.map(r => r.sourceReviewKey));
  const corrections = [], unknown = [], impact: Record<string, number> = {};
  let modernImported = 0, previouslyCorrected = 0;
  for (const c of candidates) {
    if (c.sourceColumnLetter === 'BG') continue;
    const format = profiles.get(c.sourceRowNumber)!;
    imported[format.profile] = (imported[format.profile] ?? 0) + 1;
    if (['UNKNOWN', 'CONFLICT'].includes(format.profile)) unknown.push(c.sourceReviewKey);
    if (format.profile !== 'MODERN') continue;
    modernImported++;
    const rotation = c.sourceColumnLetter === 'BL' ? 'ELECTIVE_2' : 'ELECTIVE_1';
    if (prior.has(c.sourceReviewKey)) { assert.equal(c.electiveCorrection?.rotation, rotation); previouslyCorrected++; continue; }
    const old = c.ratings[0].normalizedValue, next = c.electives![rotation].rating.normalizedValue;
    const change = old === next ? old === null ? 'stillNoNumericScore' : 'sameNumericScore' : old === null ? 'numericScoreRecovered' : next === null ? 'numericScoreRemoved' : 'numericScoreChanged';
    impact[change] = (impact[change] ?? 0) + 1;
    corrections.push({ sourceReviewKey: c.sourceReviewKey, contextHash: electiveContextHash(c), rotation });
  }
  assert.equal(all.CONFLICT ?? 0, 0, 'MIXED_ENCODING_REQUIRES_REVIEW');
  const manifest = { version: '2026-11-12-encoding-v2', workbookHash: hash(bytes),
    reason: 'תיקון לפי תבנית קידוד שנבדקה בקובץ המקור: עמודות פירוט שני האלקטיבים הוחלפו. בית החולים, המחלקה והציון נלקחו יחד מהאלקטיב המתאים באותה שורה. זהו כלל שנמצא בנתונים, ללא תיעוד רשמי של גרסת השאלון.', corrections };
  const probeCounts: Record<string, number> = {};
  for (const p of structuralProbes) { const key = p.profile+'_'+p.direction; probeCounts[key]=(probeCounts[key]??0)+1; }
  const report = { sourceRows: profiles.size, all, imported, modernImported, previouslyCorrected, additionalCorrections: corrections.length, additionalRatingImpact: impact, singleElectiveNumericScores: scoreStructure, structuralProbeCounts: probeCounts, structuralProbes, unresolvedSourceKeys: unknown, workbookHash: hash(bytes), sourceMustRemainHidden: true };
  await writeFile(value('--manifest'), JSON.stringify(manifest, null, 2)+'\n');
  await writeFile(value('--report'), JSON.stringify(report, null, 2)+'\n');
  console.log(JSON.stringify({ ...report, structuralProbes: structuralProbes.length, unresolvedSourceKeys: unknown.length }));
}
main().catch(e => { console.error(e instanceof assert.AssertionError ? e.message : 'ENCODING_AUDIT_FAILED'); process.exitCode = 1; });
