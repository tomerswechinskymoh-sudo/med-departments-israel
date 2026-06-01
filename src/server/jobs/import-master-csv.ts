import { PrismaClient } from "@prisma/client";
import { importMasterCsvFiles } from "@/lib/server/master-csv-importer";

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

function onlyArg() {
  const value = argValue("--only");
  return value === "data-exp" || value === "spec" || value === "dept" || value === "all" ? value : "all";
}

async function main() {
  const result = await importMasterCsvFiles(prisma, {
    specialtyCsvPath: argValue("--spec"),
    departmentCsvPath: argValue("--dept"),
    dataExpCsvPath: argValue("--data-exp"),
    only: onlyArg(),
    departmentLimit: numberArg("--limit"),
    departmentFromRow: numberArg("--from-row")
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
