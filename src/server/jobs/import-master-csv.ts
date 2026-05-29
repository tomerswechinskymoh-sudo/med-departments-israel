import { PrismaClient } from "@prisma/client";
import { importMasterCsvFiles } from "@/lib/server/master-csv-importer";

const prisma = new PrismaClient();

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const result = await importMasterCsvFiles(prisma, {
    specialtyCsvPath: argValue("--spec"),
    departmentCsvPath: argValue("--dept"),
    dataExpCsvPath: argValue("--data-exp")
  });

  console.log("Master CSV import completed.");
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
