import { readFile, writeFile } from 'node:fs/promises';
import { prisma } from '../src/lib/prisma';
import { deletionLedgerSchema, replaySignupDeletion } from '../src/lib/server/signup-deletion-restore';

async function main() {
  const exportPath = process.argv.find(a => a.startsWith('--export='))?.slice('--export='.length);
  const replayPath = process.argv.find(a => a.startsWith('--replay='))?.slice('--replay='.length);
  const execute = process.argv.includes('--execute');
  if (Boolean(exportPath) === Boolean(replayPath)) throw new Error('Choose export or replay');
  if (exportPath) {
    if (execute) throw new Error('Export is read-only');
    const ledger = await prisma.signupDocumentDeletion.findMany({ select: { userId: true, status: true, deletedAt: true } });
    // Explicit destination, no overwrite, owner-only permissions. Never stdout.
    await writeFile(exportPath, JSON.stringify(ledger), { mode: 0o600, flag: 'wx' });
    console.log(JSON.stringify({ exported: ledger.length }));
    return;
  }
  if (execute && !process.argv.includes('--confirm-offline-reviewed-dry-run')) throw new Error('Offline restore and reviewed dry-run required');
  const ledger = deletionLedgerSchema.parse(JSON.parse(await readFile(replayPath!, 'utf8')));
  if (new Set(ledger.map(e => e.userId)).size !== ledger.length) throw new Error('Duplicate ledger entries');
  const counts: Record<string, number> = {};
  for (const entry of ledger) {
    try {
      const result = await replaySignupDeletion(entry, execute);
      counts[result] = (counts[result] ?? 0) + 1;
    } catch {
      counts.failed = (counts.failed ?? 0) + 1;
      if (execute) await prisma.auditLog.create({data:{action:'signup.restore_reconciliation_failed',entityType:'User',entityId:entry.userId,metadata:{retryRequired:true}}}).catch(() => undefined);
    }
  }
  console.log(JSON.stringify({ mode: execute ? 'execute' : 'dry-run', counts }));
  if (counts.failed || counts.reviewRequired) process.exitCode = 2;
}
main().catch(() => { console.error('Ledger operation failed. Keep the restored service offline and review configuration/input.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
