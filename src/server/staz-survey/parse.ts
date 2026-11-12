import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';
import { SOURCE_ID, CONTEXT, clean, parseRating, privacyFlags, type Candidate, type SourceColumn, type ElectiveEvidence } from '@/lib/staz-survey/domain';
import { applyReviewedElectiveCorrection } from './association';
export const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const MAX_CSV_BYTES = 3 * 1024 * 1024;
// Bounded RFC 4180 parser, including quoted commas, newlines, BOM and escaped quotes.
export function parseCsv(bytes: Buffer): Record<string, string>[] {
  if (bytes.length > MAX_CSV_BYTES) throw new Error('CSV_TOO_LARGE');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  const records: string[][] = []; let record: string[] = [], value = '', quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { value += '"'; i++; } else { quoted = false; closed = true; } }
      else value += ch;
    } else if (ch === '"' && value === '' && !closed) quoted = true;
    else if (ch === ',' || ch === '\n' || ch === '\r') {
      record.push(value); value = ''; closed = false;
      if (ch !== ',') { if (record.some(Boolean)) records.push(record); record = []; if (ch === '\r' && text[i + 1] === '\n') i++; }
    } else { if (closed || ch === '"') throw new Error('INVALID_CSV_QUOTING'); value += ch; }
    if (value.length > 16000 || record.length > 60 || records.length > 5001) throw new Error('CSV_LIMIT_EXCEEDED');
  }
  if (quoted) throw new Error('UNTERMINATED_CSV_QUOTE');
  if (value || record.length) { record.push(value); records.push(record); }
  const headers = records.shift();
  const required = ['source_batch_key','source_review_key','source_row_number','source_column_letter','survey_year','survey_hospital','survey_department_or_scope','raw_hospital_from_source_row','raw_department_from_source_row','source_question','review_text_proposed','auto_sentiment'];
  if (!headers || new Set(headers).size !== headers.length || required.some(h => !headers.includes(h))) throw new Error('CSV_HEADERS_INVALID');
  return records.map(r => { if (r.length !== headers.length) throw new Error('CSV_COLUMN_COUNT'); return Object.fromEntries(headers.map((h, i) => [h, r[i]])); });
}
export function parseCandidates(bytes: Buffer): Candidate[] {
  return parseCsv(bytes).map((r, index) => {
    const col = r.source_column_letter as SourceColumn, row = Number(r.source_row_number), year = Number(r.survey_year);
    if (r.source_batch_key !== SOURCE_ID || !Object.hasOwn(CONTEXT, col) || !Number.isInteger(row) || row < 3 || row > 50000 || !Number.isInteger(year) || year < 2020 || year > 2025 || r.source_review_key !== `${SOURCE_ID}:R${row}:C${col}` || r.auto_sentiment !== 'חיובית' || !r.review_text_proposed.trim()) throw new Error(`INVALID_CANDIDATE_${index + 2}`);
    for (const key of ['survey_hospital','survey_department_or_scope','raw_hospital_from_source_row','raw_department_from_source_row','source_question']) if (r[key].length > 500) throw new Error(`FIELD_TOO_LONG_${index + 2}`);
    if (r.review_text_proposed.length > 12000) throw new Error(`TEXT_TOO_LONG_${index + 2}`);
    return { sourceReviewKey: r.source_review_key, sourceRowNumber: row, sourceColumnLetter: col, sourceYear: year,
      originalHospital: clean(r.survey_hospital), originalDepartmentOrScope: col === 'BG' ? 'כלל בית החולים' : clean(r.survey_department_or_scope), sourceQuestion: clean(r.source_question),
      rawHospital: clean(r.raw_hospital_from_source_row), rawDepartment: clean(r.raw_department_from_source_row), proposedText: clean(r.review_text_proposed), originalText: clean(r.review_text_proposed),
      sourceVerified: false, workbookHash: null, ratings: [], privacyFlags: privacyFlags(r.review_text_proposed) };
  });
}
export async function verifyWorkbook(candidates: Candidate[], path: string): Promise<Candidate[]> {
  if (!/\.xls[mx]$/i.test(path)) throw new Error('WORKBOOK_EXTENSION');
  const bytes = await readFile(path);
  if (bytes.length > 20 * 1024 * 1024 || bytes.readUInt32LE(0) !== 0x04034b50) throw new Error('WORKBOOK_SIZE_OR_SIGNATURE');
  // ExcelJS reads values only; macros and external links are never executed. CLI only.
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes as never);
  const sheet = workbook.getWorksheet('סקר סטאז');
  if (!sheet || sheet.rowCount > 50000 || sheet.columnCount > 150) throw new Error('WORKBOOK_STRUCTURE');
  const cellText = (row: number, col: string) => {
    const c = sheet.getCell(`${col}${row}`);
    if ([ExcelJS.ValueType.Formula, ExcelJS.ValueType.Error, ExcelJS.ValueType.Hyperlink].includes(c.type)) throw new Error(`UNSAFE_CELL_${col}${row}`);
    return clean(c.value instanceof Date ? String(c.value.getUTCFullYear()) : c.text);
  };
  for (const [col, code] of Object.entries({ B: 'compute_0002', BL: 'qus_118', BK: 'qus_70', BP: 'qus_117', BO: 'qus_73', BG: 'qus_66', CT: 'qus_103' })) if (cellText(1, col) !== code) throw new Error('WORKBOOK_QUESTION_MISMATCH');
  const fileHash = hash(bytes);
  return candidates.map(c => {
    const context = CONTEXT[c.sourceColumnLetter], row = c.sourceRowNumber;
    const originalText = cellText(row, c.sourceColumnLetter), hospital = cellText(row, context.hospital), department = context.department ? cellText(row, context.department) : '';
    const year = cellText(row, 'B').match(/(?:202[0-5])/g)?.[0];
    if (clean(originalText).replace(/\s+/g, ' ') !== clean(c.proposedText).replace(/\s+/g, ' ') || hospital !== clean(c.rawHospital) || (context.department && department !== clean(c.rawDepartment)) || Number(year) !== c.sourceYear) throw new Error(`SOURCE_MISMATCH_R${row}_C${c.sourceColumnLetter}`);
    const elective = (col: 'BL' | 'BP'): ElectiveEvidence => {
      const ctx = CONTEXT[col], answer = cellText(row, ctx.rating);
      return { hospital: cellText(row, ctx.hospital), department: cellText(row, ctx.department), text: cellText(row, col),
        rating: { metricCode: 'ELECTIVE_RECOMMENDATION', label: 'המלצה על סבב אלקטיב', questionCode: ctx.questionCode, question: cellText(2, ctx.rating), sourceRowNumber: row, sourceColumn: ctx.rating, rawAnswer: answer, scale: '1–5; גבוה = המלצה רבה יותר', normalizedValue: parseRating(answer), rotationContext: ctx.rotation, confidence: 'EXACT_SAME_ROW_AND_ROTATION', verified: parseRating(answer) !== null } };
    };
    return applyReviewedElectiveCorrection({ ...c, originalText, sourceVerified: true, workbookHash: fileHash,
      ratings: context.rating ? [elective(c.sourceColumnLetter as 'BL' | 'BP').rating] : [],
      ...(c.sourceColumnLetter !== 'BG' ? { electives: { ELECTIVE_1: elective('BL'), ELECTIVE_2: elective('BP') } } : {}) });
  });
}
export function fingerprint(c: Candidate) {
  // Stable content identity: verification enrichment is compared separately.
  return hash(JSON.stringify([c.sourceReviewKey,c.sourceYear,c.originalHospital,c.originalDepartmentOrScope,c.rawHospital,c.rawDepartment,c.sourceQuestion,c.proposedText]));
}
