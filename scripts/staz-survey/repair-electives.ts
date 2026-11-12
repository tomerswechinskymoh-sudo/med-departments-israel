import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { parseCandidates, verifyWorkbook } from '../../src/server/staz-survey/parse';
import { repairElectiveAssociations } from '../../src/server/staz-survey/repair';
async function main() {
  const args = process.argv.slice(2), value = (key: string) => args[args.indexOf(key) + 1];
  assert.ok(args.includes('--csv') && args.includes('--workbook') && args.includes('--report'));
  const execute = args.includes('--execute');
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.STAZ_REPAIR_DATABASE_HOST, 'EXPLICIT_DATABASE_REQUIRED');
  if (execute) assert.ok(args.includes('--user-authorized-20261112'));
  const candidates = await verifyWorkbook(parseCandidates(await readFile(value('--csv'))), value('--workbook'));
  const db = new PrismaClient({ log: [] });
  try {
    const report = await repairElectiveAssociations(db, candidates, execute);
    await writeFile(value('--report'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    const { details, ...summary } = report; console.log(JSON.stringify(summary));
  } finally { await db.$disconnect(); }
}
main().catch(e => { console.error(e instanceof assert.AssertionError ? e.message : e?.code ?? 'ELECTIVE_REPAIR_FAILED'); process.exitCode = 1; });
