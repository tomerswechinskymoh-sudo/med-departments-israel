import { discoverClalitHospitalDepartments } from "@/crawler/clalit/hospital-discovery";
import { loadClalitHospitalConfig } from "@/crawler/clalit/hospital-config";
import { parseArgs } from "@/crawler/clalit/utils";

export async function runClalitHospitalDiscovery(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const hospitalSlug = args.get("hospital");
  if (!hospitalSlug) throw new Error("Missing --hospital <hospitalSlug>.");
  const config = await loadClalitHospitalConfig(hospitalSlug);
  return discoverClalitHospitalDepartments(config, { writeLegacyRabinOutputs: args.has("legacy-rabin-output") });
}

runClalitHospitalDiscovery()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  });
