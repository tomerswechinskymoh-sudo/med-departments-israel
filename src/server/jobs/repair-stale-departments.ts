import { PrismaClient } from "@prisma/client";
import { repairStaleDepartmentRows } from "@/lib/server/department-stale-repair";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const verbose = process.argv.includes("--verbose");
  const startedAt = Date.now();
  console.log(`[repair:stale-departments] ${dryRun ? "dry-run" : "repair"}: start`);
  const result = await repairStaleDepartmentRows(prisma, {
    dryRun,
    onProgress: (message) => console.log(`[repair:stale-departments] ${message}`)
  });
  console.log(`[repair:stale-departments] done in ${Date.now() - startedAt}ms`);
  console.log(JSON.stringify(
    verbose
      ? result
      : {
        scannedPairs: result.scannedPairs,
        repairedPairs: result.repairedPairs,
        skippedAlreadyRepairedAliases: result.skippedAlreadyRepairedAliases,
        activeDepartmentCount: result.activeDepartmentCount,
        dryRun: result.dryRun,
        samplePairs: result.pairs.slice(0, 5)
      },
    null,
    2
  ));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
