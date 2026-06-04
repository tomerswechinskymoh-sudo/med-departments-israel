import fs from "node:fs/promises";
import path from "node:path";
import { runShebaEntFellowshipCrawler } from "@/lib/server/shebaEntCrawler";

const sourceUrl =
  process.argv.find((arg) => arg.startsWith("--url="))?.slice("--url=".length) ??
  "https://www.sheba.co.il/surgery/departments/otolaryngology-ent-head-neck-surgery";
const outDir = path.join(process.cwd(), "tmp", "sheba-ent");

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const result = await runShebaEntFellowshipCrawler({
    departmentUrl: sourceUrl,
    debug: true
  });
  const outputPath = path.join(outDir, "latest-crawl.json");
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  const trainingDetected = result.results.filter(
    (physician) => physician.extractedTraining.fellowships.length > 0 || physician.detectedFellowships.length > 0
  ).length;

  console.log(
    JSON.stringify(
      {
        ok: true,
        outputPath,
        physicians: result.results.length,
        seniorPhysicians: result.physiciansProcessed,
        trainingDetected,
        warnings: result.warnings.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
