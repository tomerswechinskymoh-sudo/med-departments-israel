import { PrismaClient } from '@prisma/client';
import { readFile, writeFile } from 'node:fs/promises';
import { parseCandidates } from '../../src/server/staz-survey/parse';
import { readCatalog } from '../../src/server/staz-survey/importer';
import { suggestMapping } from '../../src/lib/staz-survey/domain';
const db = new PrismaClient({ log: [] });
async function main() {
  const rows = parseCandidates(await readFile(process.argv[2])); const catalog = await readCatalog(db);
  const report = { rows: rows.length, suggestedDepartments: 0, suggestedArrays: 0, needsManualReview: 0, reasons: {} as Record<string, number>, unresolved: {} as Record<string, number>, allRequireManualApproval: true };
  for (const row of rows) {
    const m = suggestMapping(row, catalog);
    if (m.suggestedDepartmentId) report.suggestedDepartments++; else if (m.suggestedMedicalArrayId) report.suggestedArrays++; else { report.needsManualReview++; const key = `${row.rawHospital} / ${row.rawDepartment || 'כלל בית החולים'}`; report.unresolved[key] = (report.unresolved[key] ?? 0) + 1; }
    report.reasons[m.mappingReason] = (report.reasons[m.mappingReason] ?? 0) + 1;
  }
  await writeFile('docs/staz-survey-mapping-20261112/mapping-report.json', JSON.stringify(report, null, 2)+'\n');
  console.log(JSON.stringify({ ...report, unresolved: Object.entries(report.unresolved).filter(([k]) => !k.includes('כלל בית החולים')).sort((a,b) => b[1]-a[1]).slice(0,30) }));
}
main().finally(() => db.$disconnect()).catch(() => { console.error('MAPPING_REPORT_FAILED'); process.exitCode = 1; });
