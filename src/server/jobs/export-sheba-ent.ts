import fs from "node:fs/promises";
import path from "node:path";
import { runShebaEntFellowshipCrawler } from "@/lib/server/shebaEntCrawler";
import { createShebaEntFellowshipExport } from "@/lib/server/shebaEntFellowshipStore";

const sourceUrl =
  process.argv.find((arg) => arg.startsWith("--url="))?.slice("--url=".length) ??
  "https://www.sheba.co.il/surgery/departments/otolaryngology-ent-head-neck-surgery";
const outDir = path.join(process.cwd(), "tmp", "sheba-ent");
const outputPath =
  process.argv.find((arg) => arg.startsWith("--out="))?.slice("--out=".length) ??
  path.join(outDir, "sheba-ent-fellowships.json");

function trainingLineCount(physician: { extractedTraining?: unknown }) {
  const extracted = physician.extractedTraining as { fellowships?: unknown } | undefined;
  return Array.isArray(extracted?.fellowships) ? extracted.fellowships.length : 0;
}

function trainingLinesFor(physicians: Array<{ physicianName?: string | null; extractedTraining?: unknown }>, pattern: RegExp) {
  const physician = physicians.find((item) => pattern.test(item.physicianName ?? ""));
  const extracted = physician?.extractedTraining as { fellowships?: Array<{ rawText: string }> } | undefined;

  return Array.isArray(extracted?.fellowships) ? extracted.fellowships.map((line) => line.rawText) : [];
}

async function main() {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const result = await runShebaEntFellowshipCrawler({
    departmentUrl: sourceUrl,
    debug: true
  });
  const exportPayload = createShebaEntFellowshipExport(result, sourceUrl);
  await fs.writeFile(outputPath, `${JSON.stringify(exportPayload, null, 2)}\n`, "utf8");

  const trainingDetected = exportPayload.physicians.filter(
    (physician) => trainingLineCount(physician) > 0 || physician.detectedFellowships.length > 0
  ).length;

  console.log(
    JSON.stringify(
      {
        ok: true,
        outputPath,
        hospital: exportPayload.hospital,
        department: exportPayload.department,
        sourceUrl: exportPayload.sourceUrl,
        physicians: exportPayload.physicians.length,
        trainingDetected,
        eranAlonTrainingLines: trainingLinesFor(exportPayload.physicians, /ערן אלון/),
        galitAviorTrainingLines: trainingLinesFor(exportPayload.physicians, /גלית אביאור/)
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
