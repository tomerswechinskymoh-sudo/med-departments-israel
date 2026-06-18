import { normalizeClalitDepartmentWithAi } from "@/crawler/clalit/normalize-ai";
import { ensureOutputDirs, loadClalitDepartmentConfig, outputPathsForDepartment, parseArgs } from "@/crawler/clalit/utils";

async function main() {
  const args = parseArgs();
  const id = args.get("id");
  if (!id) throw new Error("Missing --id <department-config-id>.");

  const config = await loadClalitDepartmentConfig(id);
  const paths = outputPathsForDepartment(config.id);
  await ensureOutputDirs(paths);

  const summary = await normalizeClalitDepartmentWithAi({
    config,
    paths,
    dryRun: args.has("dry-run"),
    force: args.has("force")
  });
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
