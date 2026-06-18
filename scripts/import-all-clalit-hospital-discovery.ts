import { importClalitHospitalDiscovery } from "@/crawler/clalit/hospital-discovery-import";
import { loadClalitHospitalConfig } from "@/crawler/clalit/hospital-config";
import { parseArgs } from "@/crawler/clalit/utils";

export async function runClalitHospitalDiscoveryImport(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const hospitalSlug = args.get("hospital");
  if (!hospitalSlug) throw new Error("Missing --hospital <hospitalSlug>.");
  const config = await loadClalitHospitalConfig(hospitalSlug);
  const applyAdditions = args.has("apply-additions");
  const reportOnly = !applyAdditions && !args.has("force") && !args.has("dry-run");
  return importClalitHospitalDiscovery(config, {
    dryRun: args.has("dry-run") || reportOnly,
    force: args.has("force")
  });
}

runClalitHospitalDiscoveryImport()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  });
