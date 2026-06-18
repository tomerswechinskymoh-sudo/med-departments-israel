import path from "node:path";
import { parseArgs, readJson, writeJson } from "@/crawler/clalit/utils";
import type { ClalitDepartmentConfig } from "@/crawler/clalit/types";

const REVIEW_JSON_PATH = path.join(process.cwd(), "data", "crawler", "discovery", "rabin-candidates-review.json");
const CONFIG_PATH = path.join(process.cwd(), "data", "crawler", "config", "clalit-departments.json");

type ReviewCandidate = {
  candidateId: string;
  proposedConfigId: string;
  departmentHebrew: string;
  departmentEnglishGuess: string;
  doctorListUrl: string;
  sourceDepartmentUrl: string;
  discoveryConfidence: number;
  alreadyConfigured: boolean;
  possibleSubUnit: boolean;
  reason: string;
  recommendedAction: "import" | "review" | "skip";
};

function normalizeUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
}

function wordsFromEnglish(value: string) {
  return Array.from(
    new Set(
      value
        .replace(/[_-]+/g, " ")
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 4)
    )
  ).slice(0, 8);
}

function hebrewKeywords(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,()״"'-]+/)
        .map((word) => word.trim())
        .filter((word) => /[א-ת]/.test(word) && word.length >= 3)
    )
  ).slice(0, 8);
}

function configFromReview(row: ReviewCandidate): ClalitDepartmentConfig {
  return {
    id: row.proposedConfigId,
    hospital: "Rabin Medical Center / Beilinson",
    hospitalSlug: "rabin",
    department: row.departmentEnglishGuess,
    departmentHebrew: row.departmentHebrew,
    doctorListUrl: row.doctorListUrl,
    departmentKeywordsHebrew: hebrewKeywords(row.departmentHebrew),
    departmentKeywordsEnglish: wordsFromEnglish(`${row.departmentEnglishGuess} ${row.doctorListUrl}`),
    allowedCrossUnits: []
  };
}

async function main() {
  const args = parseArgs();
  const dryRun = args.has("dry-run");
  const includeReview = args.has("include-review");
  const rows = await readJson<ReviewCandidate[]>(REVIEW_JSON_PATH);
  const configs = await readJson<ClalitDepartmentConfig[]>(CONFIG_PATH);
  const configuredUrls = new Set(configs.map((config) => normalizeUrl(config.doctorListUrl)));
  const configuredIds = new Set(configs.map((config) => config.id));
  const imported: ClalitDepartmentConfig[] = [];
  const skipped: Array<{ candidateId: string; doctorListUrl: string; reason: string }> = [];

  for (const row of rows) {
    const eligible = row.recommendedAction === "import" || (includeReview && row.recommendedAction === "review");
    if (!eligible) {
      skipped.push({ candidateId: row.candidateId, doctorListUrl: row.doctorListUrl, reason: `action=${row.recommendedAction}` });
      continue;
    }

    if (configuredUrls.has(normalizeUrl(row.doctorListUrl))) {
      skipped.push({ candidateId: row.candidateId, doctorListUrl: row.doctorListUrl, reason: "duplicate doctorListUrl" });
      continue;
    }

    const config = configFromReview(row);
    if (configuredIds.has(config.id) || imported.some((item) => item.id === config.id)) {
      let suffix = 2;
      const baseId = config.id;
      while (configuredIds.has(`${baseId}-${suffix}`) || imported.some((item) => item.id === `${baseId}-${suffix}`)) {
        suffix += 1;
      }
      config.id = `${baseId}-${suffix}`;
    }

    configuredUrls.add(normalizeUrl(config.doctorListUrl));
    imported.push(config);
  }

  if (!dryRun && imported.length > 0) {
    await writeJson(CONFIG_PATH, [...configs, ...imported]);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        includeReview,
        inputPath: REVIEW_JSON_PATH,
        configPath: CONFIG_PATH,
        existingConfigCount: configs.length,
        importedCount: imported.length,
        skippedCount: skipped.length,
        wouldWriteConfigCount: dryRun ? configs.length : configs.length + imported.length,
        imported: imported.slice(0, 20),
        skipped: skipped.slice(0, 20)
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
