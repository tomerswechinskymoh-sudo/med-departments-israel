import { PrismaClient } from "@prisma/client";
import { repairStaleDepartmentRows } from "@/lib/server/department-stale-repair";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const result = await repairStaleDepartmentRows(prisma, { dryRun });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
