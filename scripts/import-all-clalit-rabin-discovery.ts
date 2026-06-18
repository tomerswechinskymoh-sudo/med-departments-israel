import { importClalitHospitalDiscovery } from "@/crawler/clalit/hospital-discovery-import";
import { loadClalitHospitalConfig } from "@/crawler/clalit/hospital-config";
import { parseArgs } from "@/crawler/clalit/utils";
import path from "node:path";

async function main() {
  const args = parseArgs();
  const config = await loadClalitHospitalConfig("rabin");
  const result = await importClalitHospitalDiscovery(config, {
    dryRun: args.has("dry-run"),
    force: args.has("force"),
    discoveryPath: path.join(process.cwd(), "data", "crawler", "discovery", "rabin-department-doctor-pages.json")
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
