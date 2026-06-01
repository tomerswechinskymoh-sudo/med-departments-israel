import { PrismaClient } from "@prisma/client";
import { repairStaleDepartmentRows } from "@/lib/server/department-stale-repair";

const prisma = new PrismaClient();

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];

  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function numberArg(name: string) {
  const value = argValue(name);
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const skipRelations = process.argv.includes("--skip-relations");
  const verbose = process.argv.includes("--verbose");
  const startedAt = Date.now();
  console.log(`[repair:stale-departments] ${dryRun ? "dry-run" : "repair"}: start`);
  const result = await repairStaleDepartmentRows(prisma, {
    dryRun,
    skipRelations,
    limit: numberArg("--limit"),
    fromPair: numberArg("--from-pair"),
    onProgress: (message) => console.log(`[repair:stale-departments] ${message}`)
  });
  console.log(`[repair:stale-departments] done in ${Date.now() - startedAt}ms`);
  console.log(JSON.stringify(
    verbose
      ? result
      : {
        scannedPairs: result.scannedPairs,
        selectedPairs: result.selectedPairs,
        repairedPairs: result.repairedPairs,
        failedPairs: result.failedPairs,
        skippedAlreadyRepairedAliases: result.skippedAlreadyRepairedAliases,
        activeDepartmentCount: result.activeDepartmentCount,
        dryRun: result.dryRun,
        skipRelations: result.skipRelations,
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
