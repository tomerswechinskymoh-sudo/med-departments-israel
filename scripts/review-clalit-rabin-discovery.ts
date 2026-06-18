import fs from "node:fs/promises";
import path from "node:path";
import { readJson, writeJson } from "@/crawler/clalit/utils";
import type { ClalitDepartmentConfig } from "@/crawler/clalit/types";

const DISCOVERY_PATH = path.join(process.cwd(), "data", "crawler", "discovery", "rabin-department-doctor-pages.json");
const CONFIG_PATH = path.join(process.cwd(), "data", "crawler", "config", "clalit-departments.json");
const REVIEW_JSON_PATH = path.join(process.cwd(), "data", "crawler", "discovery", "rabin-candidates-review.json");
const REVIEW_CSV_PATH = path.join(process.cwd(), "data", "crawler", "discovery", "rabin-candidates-review.csv");

type DiscoveryCandidate = {
  id: string;
  hospital: string;
  hospitalSlug: string;
  department: string;
  departmentHebrew: string;
  doctorListUrl: string;
  sourceDepartmentUrl: string;
  discoveryConfidence: number;
  discoveryEvidence: string[];
  needsReview: boolean;
};

type ReviewCandidate = {
  candidateId: string;
  proposedConfigId: string;
  departmentHebrew: string;
  departmentEnglishGuess: string;
  doctorListUrl: string;
  sourceDepartmentUrl: string;
  discoveryConfidence: number;
  alreadyConfigured: boolean;
  highConfidence: boolean;
  needsReview: boolean;
  possibleSubUnit: boolean;
  reason: string;
  recommendedAction: "import" | "review" | "skip";
  sourceCandidate: DiscoveryCandidate;
};

const subUnitHebrewTerms = ["מרפאת", "שירות", "יחידה", "מכון", "בדיקת", "מעבדה", "סדנה", "הדרכה", "אשפוז יום"];
const subUnitEnglishTerms = ["clinic", "unit", "service", "lab", "workshop", "test", "rehabilitation", "physiotherapy"];

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function normalizeUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
}

function possibleSubUnit(candidate: DiscoveryCandidate) {
  const hebrew = candidate.departmentHebrew ?? "";
  const sourceStem = new URL(candidate.sourceDepartmentUrl).pathname.split("/").pop()?.replace(/\.aspx$/i, "") ?? "";
  const doctorStem = new URL(candidate.doctorListUrl).pathname.split("/").pop()?.replace(/\.aspx$/i, "") ?? "";
  const english = `${candidate.department} ${sourceStem} ${doctorStem}`.toLowerCase();

  return (
    subUnitHebrewTerms.some((term) => hebrew.includes(term)) ||
    subUnitEnglishTerms.some((term) => english.includes(term))
  );
}

function reasonFor(candidate: DiscoveryCandidate, alreadyConfigured: boolean, isPossibleSubUnit: boolean) {
  const reasons: string[] = [];

  if (alreadyConfigured) reasons.push("doctorListUrl already exists in clalit-departments config");
  if (candidate.discoveryConfidence >= 0.95) reasons.push("high-confidence doctor-list discovery");
  if (candidate.discoveryConfidence < 0.95) reasons.push(`confidence=${candidate.discoveryConfidence}`);
  if (isPossibleSubUnit) reasons.push("department label/url looks like clinic/unit/lab/service rather than core department");
  if (candidate.needsReview) reasons.push("discovery candidate marked needsReview");

  return reasons.join("; ");
}

function recommendedAction(candidate: DiscoveryCandidate, alreadyConfigured: boolean, isPossibleSubUnit: boolean) {
  if (alreadyConfigured) return "skip" as const;
  if (candidate.discoveryConfidence >= 0.95 && !isPossibleSubUnit) return "import" as const;
  if (candidate.discoveryConfidence >= 0.85 || isPossibleSubUnit) return "review" as const;

  return "review" as const;
}

function toReviewCandidate(candidate: DiscoveryCandidate, configuredUrls: Set<string>): ReviewCandidate {
  const alreadyConfigured = configuredUrls.has(normalizeUrl(candidate.doctorListUrl));
  const isPossibleSubUnit = possibleSubUnit(candidate);
  const highConfidence = candidate.discoveryConfidence >= 0.95;
  const action = recommendedAction(candidate, alreadyConfigured, isPossibleSubUnit);

  return {
    candidateId: candidate.id,
    proposedConfigId: candidate.id,
    departmentHebrew: candidate.departmentHebrew,
    departmentEnglishGuess: candidate.department,
    doctorListUrl: candidate.doctorListUrl,
    sourceDepartmentUrl: candidate.sourceDepartmentUrl,
    discoveryConfidence: candidate.discoveryConfidence,
    alreadyConfigured,
    highConfidence,
    needsReview: candidate.needsReview || action === "review",
    possibleSubUnit: isPossibleSubUnit,
    reason: reasonFor(candidate, alreadyConfigured, isPossibleSubUnit),
    recommendedAction: action,
    sourceCandidate: candidate
  };
}

function toCsv(rows: ReviewCandidate[]) {
  const headers = [
    "candidateId",
    "proposedConfigId",
    "departmentHebrew",
    "departmentEnglishGuess",
    "doctorListUrl",
    "sourceDepartmentUrl",
    "discoveryConfidence",
    "alreadyConfigured",
    "possibleSubUnit",
    "reason",
    "recommendedAction"
  ];

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header as keyof ReviewCandidate])).join(","))
  ].join("\n");
}

function countByAction(rows: ReviewCandidate[]) {
  return rows.reduce<Record<string, number>>((summary, row) => {
    summary[row.recommendedAction] = (summary[row.recommendedAction] ?? 0) + 1;
    return summary;
  }, {});
}

async function main() {
  const candidates = await readJson<DiscoveryCandidate[]>(DISCOVERY_PATH);
  const configs = await readJson<ClalitDepartmentConfig[]>(CONFIG_PATH);
  const configuredUrls = new Set(configs.map((config) => normalizeUrl(config.doctorListUrl)));
  const reviewRows = candidates.map((candidate) => toReviewCandidate(candidate, configuredUrls));

  await writeJson(REVIEW_JSON_PATH, reviewRows);
  await fs.mkdir(path.dirname(REVIEW_CSV_PATH), { recursive: true });
  await fs.writeFile(REVIEW_CSV_PATH, `${toCsv(reviewRows)}\n`, "utf8");

  const importCandidates = reviewRows.filter((row) => row.recommendedAction === "import");
  const reviewCandidates = reviewRows.filter((row) => row.recommendedAction === "review");
  const skipCandidates = reviewRows.filter((row) => row.recommendedAction === "skip");

  console.log(
    JSON.stringify(
      {
        ok: true,
        inputPath: DISCOVERY_PATH,
        reviewJsonPath: REVIEW_JSON_PATH,
        reviewCsvPath: REVIEW_CSV_PATH,
        totalCandidates: reviewRows.length,
        countsByAction: countByAction(reviewRows),
        alreadyConfiguredCount: reviewRows.filter((row) => row.alreadyConfigured).length,
        importCandidatesCount: importCandidates.length,
        reviewCandidatesCount: reviewCandidates.length,
        skipCount: skipCandidates.length,
        first10ImportCandidates: importCandidates.slice(0, 10),
        first10ReviewCandidates: reviewCandidates.slice(0, 10)
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
