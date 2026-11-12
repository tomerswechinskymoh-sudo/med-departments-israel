import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { parseCandidates, verifyWorkbook, hash } from '../../src/server/staz-survey/parse';
import { dryRun, readCatalog, importCandidates } from '../../src/server/staz-survey/importer';
import { SOURCE_ID } from '../../src/lib/staz-survey/domain';
async function main() {
  const args = process.argv.slice(2), value = (key: string) => args[args.indexOf(key) + 1];
  if (!args.includes('--csv') || !args.includes('--workbook') || !['dry-run','import'].includes(args[0])) throw new Error('USAGE: dry-run|import --csv /private/candidates.csv --workbook /private/source.xlsm [--report /private/report.json]');
  const bytes = await readFile(value('--csv'));
  const rows = await verifyWorkbook(parseCandidates(bytes), value('--workbook'));
  const db = new PrismaClient({ log: [] });
  try {
    const catalog = await readCatalog(db), existing = await db.surveyReview.findMany({ where: { sourceId: SOURCE_ID }, select: { sourceReviewKey: true, sourceFingerprint: true } });
    const report = args[0] === 'import' ? await importCandidates(db, rows, hash(bytes), null) : dryRun(rows, catalog, existing);
    console.log(JSON.stringify(report));
    if (args.includes('--report')) await writeFile(value('--report'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  } finally { await db.$disconnect(); }
}
main().catch(e => { console.error(e instanceof Error && /^(SOURCE_|WORKBOOK_|CSV_|INVALID_|UNSAFE_|USAGE)/.test(e.message) ? e.message : 'STAZ_IMPORT_FAILED'); process.exitCode = 1; });
