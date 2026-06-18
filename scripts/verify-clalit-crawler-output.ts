import { verifyClalitCrawlerOutput } from "@/crawler/clalit/verify";
import { parseArgs } from "@/crawler/clalit/utils";

async function main() {
  const args = parseArgs();
  const id = args.get("id");
  if (!id) throw new Error("Missing --id <department-config-id>.");

  const summary = await verifyClalitCrawlerOutput(id);

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
