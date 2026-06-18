import { enrichClalitDepartmentProfiles } from "@/crawler/clalit/parse-profile";
import { ensureOutputDirs, loadClalitDepartmentConfig, outputPathsForDepartment } from "@/crawler/clalit/utils";

async function main() {
  const config = await loadClalitDepartmentConfig("rabin-beilinson-ent");
  const paths = outputPathsForDepartment(config.id);
  await ensureOutputDirs(paths);

  console.log(JSON.stringify(await enrichClalitDepartmentProfiles(config, paths), null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
