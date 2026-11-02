import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { clean, parseHours, parseShifts, parseSalary, parseLikert, LIKERT_SCALE, tipRiskFlags, type Normalized } from "@/lib/external-survey/parse";
import { mapValue, type Catalog, type Mapping } from "@/lib/external-survey/mapping";
export const SOURCE_ID = "resident-conditions-survey-2024";
export const IMPORT_VERSION = "1.0.0";
export const SOURCE_TITLE = "מתמחים מדברים על תנאים — סקר חיצוני";
export const HEADERS = ["חותמת זמן", "מין", "התמחות", 'באיזה בי"ח / קופה', "ממתי עד מתי עובדים (ביום בלי תורנות)", "מספר תורנויות בחודש", "שכר ברוטו", "ומבחינת הנפש [כמה התורנות רגועה (1=נטחנים, 5=ישנים)]", "ומבחינת הנפש [יחס בין המתמחים (1=מרפקים, 5=משפחה)]", "ומבחינת הנפש [יחס של הבכירים (1=רודנים, 5=טיצ'ינג חלומי)]", "ומבחינת הנפש [שילוב חיי משפחה (1=מה זה בית, 5=באלאנס מושלם)]", "טיפ שכדאי לנו לדעת לפני שנבחר במקצוע הזה? (לא חובה כמובן)"];
export type RawRow = { row: number; values: string[]; reportedAt: Date | null; fingerprint: string };
export type SurveyRow = RawRow & { specialty: Mapping; institution: Mapping; normalized: Normalized; tip: string; tipRiskFlags: string[] };
export const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export async function readWorkbook(path: string) {
  const bytes = await readFile(path);
  if (bytes.length > 20 * 1024 * 1024) throw new Error("Workbook exceeds 20 MiB");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as never);
  if (workbook.worksheets.length !== 1) throw new Error("Expected exactly one worksheet");
  const sheet = workbook.worksheets[0];
  if (sheet.columnCount !== 12 || sheet.rowCount > 10001) throw new Error("Unexpected worksheet dimensions");
  HEADERS.forEach((expected, i) => { if (clean(sheet.getRow(1).getCell(i + 1).text) !== clean(expected)) throw new Error(`Unexpected header in column ${i + 1}`); });
  const rows: RawRow[] = [];
  for (let row = 2; row <= sheet.rowCount; row++) {
    const source = sheet.getRow(row);
    const values = Array.from({ length: 12 }, (_, i) => {
      const cell = source.getCell(i + 1);
      if (cell.type === ExcelJS.ValueType.Formula || cell.type === ExcelJS.ValueType.Error || cell.type === ExcelJS.ValueType.Hyperlink) throw new Error(`Unsupported cell type at row ${row}, column ${i + 1}`);
      const text = cell.value instanceof Date ? cell.value.toISOString() : cell.text;
      if (text.length > 20000) throw new Error(`Cell exceeds length limit at row ${row}`);
      return text;
    });
    if (values.every(v => !v.trim())) continue;
    const dateValue = source.getCell(1).value;
    const reportedAt = dateValue instanceof Date && Number.isFinite(dateValue.getTime()) && dateValue.getUTCFullYear() >= 2000 && dateValue.getTime() <= Date.now() ? dateValue : null;
    rows.push({ row, values, reportedAt, fingerprint: hash(JSON.stringify(values)) });
  }
  if (!rows.length) throw new Error("Workbook has no responses");
  return { fileHash: hash(bytes), rows };
}
export function normalizeRows(rows: RawRow[], catalog: Catalog, overrides: Mapping[] = []): SurveyRow[] {
  function mapping(kind: Mapping["kind"], value: string) {
    return overrides.find(m => m.kind === kind && m.rawValue === value) ?? mapValue(kind, value, catalog);
  }
  return rows.map(row => {
    const v = row.values, year = row.reportedAt?.getUTCFullYear() ?? null;
    return { ...row, specialty: mapping("SPECIALTY", v[2]), institution: mapping("INSTITUTION", v[3]), tip: v[11], tipRiskFlags: tipRiskFlags(v[11]),
      normalized: { shifts: parseShifts(v[5]), hours: parseHours(v[4]), salary: parseSalary(v[6], year), calm: parseLikert(v[7]), peers: parseLikert(v[8]), seniors: parseLikert(v[9]), family: parseLikert(v[10]), scale: LIKERT_SCALE },
    };
  });
}
export function safeReport(rows: SurveyRow[]) {
  const counts = (values: string[]) => values.reduce<Record<string, number>>((a, v) => { a[v] = (a[v] ?? 0) + 1; return a; }, {});
  const mappings = [...new Map(rows.flatMap(r => [r.specialty, r.institution]).map(m => [`${m.kind}:${m.rawValue}`, m])).values()];
  const specialtyMappings = mappings.filter(m => m.kind === "SPECIALTY"), institutionMappings = mappings.filter(m => m.kind === "INSTITUTION");
  return {
    rowCount: rows.length, uniqueResponses: new Set(rows.map(r => r.fingerprint)).size,
    exactDuplicateRows: rows.length - new Set(rows.map(r => r.fingerprint)).size,
    duplicateTimestamps: rows.length - new Set(rows.map(r => r.values[0])).size,
    missingByColumn: HEADERS.map((_, col) => ({ column: col + 1, missing: rows.filter(r => !r.values[col].trim()).length })),
    distinctSpecialties: specialtyMappings.length, matchedSpecialties: specialtyMappings.filter(m => m.targetId).length,
    distinctInstitutionValues: institutionMappings.length, matchedInstitutionValues: institutionMappings.filter(m => m.targetId).length,
    uniqueMatchedInstitutions: new Set(institutionMappings.map(m => m.targetId).filter(Boolean)).size,
    institutionValuesRequiringReview: institutionMappings.filter(m => !m.targetId).length,
    matchedSpecialtyRows: rows.filter(r => r.specialty.targetId).length, matchedInstitutionRows: rows.filter(r => r.institution.targetId).length,
    comments: rows.filter(r => r.tip.trim()).length, commentsApproved: 0, commentsRejected: 0,
    commentRiskFlags: counts(rows.flatMap(r => r.tipRiskFlags)),
    reportMonths: counts(rows.map(r => r.reportedAt?.toISOString().slice(0, 7) ?? "INVALID")),
    parseStatuses: Object.fromEntries(["shifts", "hours", "salary", "calm", "peers", "seniors", "family"].map(metric => [metric, counts(rows.map(r => r.normalized[metric as keyof Omit<Normalized, "scale">].parseStatus))])),
    salaryBases: counts(rows.map(r => r.normalized.salary.basis)),
    // No free text, sex, exact timestamp, per-row values or fingerprints here.
    publicationStatus: "PENDING_PUBLICATION_RIGHTS",
  };
}
