import { discoverClalitHospitalDepartments } from "@/crawler/clalit/hospital-discovery";
import { loadClalitHospitalConfig } from "@/crawler/clalit/hospital-config";

async function main() {
  const config = await loadClalitHospitalConfig("rabin");
  const result = await discoverClalitHospitalDepartments(config, { writeLegacyRabinOutputs: true });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
