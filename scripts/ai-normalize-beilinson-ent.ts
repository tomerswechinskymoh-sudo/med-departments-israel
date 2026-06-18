import { normalizeClalitDepartmentWithAi } from "@/crawler/clalit/normalize-ai";
import { ensureOutputDirs, loadClalitDepartmentConfig, outputPathsForDepartment, parseArgs } from "@/crawler/clalit/utils";

async function main() {
  const args = parseArgs();
  const config = await loadClalitDepartmentConfig("rabin-beilinson-ent");
  const paths = outputPathsForDepartment(config.id);
  await ensureOutputDirs(paths);

  console.log(
    JSON.stringify(
      await normalizeClalitDepartmentWithAi({
        config,
        paths,
        dryRun: args.has("dry-run"),
        force: args.has("force")
      }),
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
