import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { readJson, writeJson } from "@/crawler/clalit/utils";

const DISCOVERY_DIR = path.join(process.cwd(), "data", "crawler", "discovery", "soroka");
const CANDIDATES_PATH = path.join(DISCOVERY_DIR, "department-doctor-pages.json");
const AUDIT_PATH = path.join(DISCOVERY_DIR, "discovery-audit.json");
const REVIEW_JSON_PATH = path.join(DISCOVERY_DIR, "soroka-candidates-review.json");
const REVIEW_CSV_PATH = path.join(DISCOVERY_DIR, "soroka-candidates-review.csv");

type PatternType = "doctorsPage" | "teamPage" | "staffPage" | "inlineStaffPage" | "unknownStaffPage";
type PageType = "coreDepartment" | "division" | "clinic" | "unit" | "service" | "institute" | "lab" | "unknown";
type RecommendedAction = "import" | "review" | "skip";
type ParserRisk = "low" | "medium" | "high";

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
  patternType: PatternType;
  recommendedParserType: string;
};

type DiscoveryAudit = {
  hospitalSlug: string;
  generatedAt: string;
  departmentPagesScanned: number;
  candidatesFound: number;
  patternBreakdown?: Record<string, number>;
  missedSuspiciousPages?: Array<{
    departmentUrl: string;
    departmentHebrew: string;
    suspiciousEvidence?: string[];
    error?: string | null;
  }>;
  pages?: Array<{
    departmentUrl: string;
    departmentHebrew: string;
    fetched: boolean;
    candidateCount: number;
    patternTypes: string[];
    error: string | null;
  }>;
};

type ReviewCandidate = {
  candidateId: string;
  titleHebrew: string;
  url: string;
  sourceDepartmentPage: string;
  patternType: PatternType;
  confidence: number;
  pageType: PageType;
  recommendedAction: RecommendedAction;
  reason: string;
  parserRisk: ParserRisk;
  duplicateGroup: string | null;
  parentDivision: string | null;
  extractedDoctorCount: number | null;
  indexMatchedDoctorCount: number | null;
  suspectedFalsePositiveCount: number | null;
  sourceCandidate: DiscoveryCandidate;
};

type CandidateOutputStats = {
  extractedDoctorCount: number;
  indexMatchedDoctorCount: number;
  suspectedFalsePositiveCount: number;
};

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function normalizedTitle(value: string) {
  return value
    .replace(/[\u0591-\u05c7]/g, "")
    .replace(/[״׳"'`.,:;()[\]{}]/g, " ")
    .replace(/[-–—_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizedUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  return url.toString().replace(/\/$/, "").toLowerCase();
}

function urlFilename(value: string) {
  return decodeURIComponent(new URL(value).pathname.split("/").pop() ?? "").toLowerCase();
}

function urlStem(value: string) {
  return urlFilename(value).replace(/\.[a-z0-9]+$/i, "");
}

function shortHash(value: string) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function parentDivision(candidate: DiscoveryCandidate) {
  const source = new URL(candidate.sourceDepartmentUrl).pathname.split("/").filter(Boolean);
  const medUnitsIndex = source.findIndex((part) => part.toLowerCase() === "med-units");
  const segment = medUnitsIndex >= 0 ? source[medUnitsIndex + 1] : null;
  if (!segment || segment.toLowerCase() === "pages" || segment.toLowerCase() === "documents") return null;
  return decodeURIComponent(segment)
    .replace(/-(division|inst|institute)$/i, "")
    .replace(/[-_]+/g, "-")
    .toLowerCase();
}

function isNonHtmlDocument(candidate: DiscoveryCandidate) {
  const pathname = new URL(candidate.doctorListUrl).pathname.toLowerCase();
  return /\/documents\//i.test(pathname) || /\.(pdf|docx?|xlsx?|pptx?)$/i.test(pathname);
}

function estimatePageType(candidate: DiscoveryCandidate): PageType {
  const hebrew = candidate.departmentHebrew ?? "";
  const text = `${urlStem(candidate.doctorListUrl)}`
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  if (isNonHtmlDocument(candidate)) return "unknown";
  if (hebrew.includes("מעבדה") || /\b(lab|laboratory)\b/.test(text)) return "lab";
  if (hebrew.includes("שירות") || /\bservice\b/.test(text)) return "service";
  if (hebrew.includes("מרפא") || /\bclinic(s)?\b/.test(text)) return "clinic";
  if (hebrew.includes("חטיבה") || hebrew.includes("אגף") || /\bdivision\b/.test(text)) return "division";
  if (hebrew.includes("מכון") || hebrew.includes("מרכז") || /\b(institute|center|centre)\b/.test(text)) return "institute";
  if (hebrew.includes("יחידה") || /\bunit\b/.test(text)) return "unit";
  if (hebrew.includes("מחלק") || hebrew.includes("מערך") || /\b(department|dept)\b/.test(text)) return "coreDepartment";

  return "unknown";
}

function buildDuplicateGroups(candidates: DiscoveryCandidate[]) {
  const groups = new Map<string, string[]>();

  function add(kind: string, key: string, candidate: DiscoveryCandidate) {
    if (!key) return;
    const groupKey = `${kind}:${key}`;
    const value = normalizedUrl(candidate.doctorListUrl);
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), value]);
  }

  for (const candidate of candidates) {
    add("title", normalizedTitle(candidate.departmentHebrew), candidate);
    add("stem", urlStem(candidate.doctorListUrl), candidate);
  }

  const duplicateByUrl = new Map<string, string>();
  for (const [groupKey, urls] of groups.entries()) {
    const uniqueUrls = Array.from(new Set(urls));
    if (uniqueUrls.length <= 1) continue;
    const groupId = `${groupKey.split(":")[0]}-${shortHash(groupKey)}`;
    for (const url of uniqueUrls) {
      if (!duplicateByUrl.has(url)) duplicateByUrl.set(url, groupId);
    }
  }

  return duplicateByUrl;
}

function riskFor(candidate: DiscoveryCandidate, pageType: PageType, duplicateGroup: string | null): ParserRisk {
  if (isNonHtmlDocument(candidate)) return "high";
  if (candidate.patternType === "unknownStaffPage") return "high";
  if (duplicateGroup) return "high";
  if (candidate.discoveryConfidence < 0.85) return "high";
  if (candidate.discoveryConfidence < 0.9) return "medium";
  if (["service", "lab", "unknown"].includes(pageType)) return "medium";

  return "low";
}

function actionFor(candidate: DiscoveryCandidate, pageType: PageType, parserRisk: ParserRisk, duplicateGroup: string | null) {
  if (isNonHtmlDocument(candidate)) return "skip" as const;
  if (duplicateGroup) return "review" as const;
  if (candidate.patternType === "unknownStaffPage") return "review" as const;
  if (["service", "lab", "unknown"].includes(pageType)) return "review" as const;
  if (candidate.discoveryConfidence >= 0.9 && parserRisk !== "high") return "import" as const;

  return "review" as const;
}

function outputStatsFor(candidate: DiscoveryCandidate): CandidateOutputStats | null {
  const outputPath = path.join(process.cwd(), "data", "crawler", "output", candidate.id, "doctors.json");
  if (!existsSync(outputPath)) return null;

  try {
    const doctors = JSON.parse(readFileSync(outputPath, "utf8")) as Array<{
      indexMatched?: boolean;
      qaFlags?: string[];
    }>;
    return {
      extractedDoctorCount: doctors.length,
      indexMatchedDoctorCount: doctors.filter((doctor) => doctor.indexMatched).length,
      suspectedFalsePositiveCount: doctors.filter((doctor) => doctor.qaFlags?.includes("suspectedFalsePositive")).length
    };
  } catch {
    return null;
  }
}

function actionWithOutputSignals(
  candidate: DiscoveryCandidate,
  pageType: PageType,
  parserRisk: ParserRisk,
  duplicateGroup: string | null,
  stats: CandidateOutputStats | null
) {
  const baseAction = actionFor(candidate, pageType, parserRisk, duplicateGroup);
  if (!stats || stats.extractedDoctorCount === 0) return baseAction;
  if (isNonHtmlDocument(candidate)) return "skip" as const;
  const matchRatio = stats.indexMatchedDoctorCount / stats.extractedDoctorCount;
  if (stats.indexMatchedDoctorCount >= 3 && matchRatio >= 0.6 && stats.suspectedFalsePositiveCount === 0 && !duplicateGroup) {
    return "import" as const;
  }
  if (stats.indexMatchedDoctorCount > 0 || stats.suspectedFalsePositiveCount > 0) return "review" as const;
  return baseAction;
}

function reasonFor(candidate: DiscoveryCandidate, pageType: PageType, parserRisk: ParserRisk, duplicateGroup: string | null) {
  const reasons: string[] = [];
  if (isNonHtmlDocument(candidate)) reasons.push("non-html document URL; not a crawlable staff page");
  if (candidate.patternType === "unknownStaffPage") reasons.push("unknownStaffPage requires parser review");
  if (duplicateGroup) reasons.push(`duplicate/near-duplicate group ${duplicateGroup}`);
  if (candidate.discoveryConfidence < 0.9) reasons.push(`confidence=${candidate.discoveryConfidence}`);
  if (["service", "lab"].includes(pageType)) reasons.push(`${pageType} pages may be small or non-core`);
  if (pageType === "unknown") reasons.push("page type could not be classified");
  if (candidate.needsReview) reasons.push("discovery marked needsReview");
  if (parserRisk === "low") reasons.push("known HTML staff/inline page with usable confidence");

  return reasons.join("; ");
}

function reasonWithOutputSignals(
  candidate: DiscoveryCandidate,
  pageType: PageType,
  parserRisk: ParserRisk,
  duplicateGroup: string | null,
  stats: CandidateOutputStats | null
) {
  const reasons = [reasonFor(candidate, pageType, parserRisk, duplicateGroup)].filter(Boolean);
  if (stats) {
    reasons.push(
      `existing crawler output: ${stats.indexMatchedDoctorCount}/${stats.extractedDoctorCount} doctors matched Soroka index`
    );
    if (stats.suspectedFalsePositiveCount > 0) {
      reasons.push(`${stats.suspectedFalsePositiveCount} suspected false positives in existing output`);
    }
  }
  return reasons.join("; ");
}

function toReviewCandidate(candidate: DiscoveryCandidate, duplicateByUrl: Map<string, string>): ReviewCandidate {
  const duplicateGroup = duplicateByUrl.get(normalizedUrl(candidate.doctorListUrl)) ?? null;
  const pageType = estimatePageType(candidate);
  const parserRisk = riskFor(candidate, pageType, duplicateGroup);
  const stats = outputStatsFor(candidate);
  const recommendedAction = actionWithOutputSignals(candidate, pageType, parserRisk, duplicateGroup, stats);

  return {
    candidateId: candidate.id,
    titleHebrew: candidate.departmentHebrew,
    url: candidate.doctorListUrl,
    sourceDepartmentPage: candidate.sourceDepartmentUrl,
    patternType: candidate.patternType,
    confidence: candidate.discoveryConfidence,
    pageType,
    recommendedAction,
    reason: reasonWithOutputSignals(candidate, pageType, parserRisk, duplicateGroup, stats),
    parserRisk,
    duplicateGroup,
    parentDivision: parentDivision(candidate),
    extractedDoctorCount: stats?.extractedDoctorCount ?? null,
    indexMatchedDoctorCount: stats?.indexMatchedDoctorCount ?? null,
    suspectedFalsePositiveCount: stats?.suspectedFalsePositiveCount ?? null,
    sourceCandidate: candidate
  };
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((summary, row) => {
    const value = String(row[key] ?? "unknown");
    summary[value] = (summary[value] ?? 0) + 1;
    return summary;
  }, {});
}

function topParentDivisions(rows: ReviewCandidate[]) {
  return Object.entries(countBy(rows.filter((row) => row.parentDivision), "parentDivision"))
    .sort((left, right) => right[1] - left[1])
    .slice(0, 15)
    .map(([parentDivision, count]) => ({ parentDivision, count }));
}

function duplicateRisks(rows: ReviewCandidate[]) {
  const groups = rows.reduce<Record<string, ReviewCandidate[]>>((summary, row) => {
    if (!row.duplicateGroup) return summary;
    summary[row.duplicateGroup] = [...(summary[row.duplicateGroup] ?? []), row];
    return summary;
  }, {});

  return Object.entries(groups)
    .map(([duplicateGroup, groupRows]) => ({
      duplicateGroup,
      count: groupRows.length,
      titles: Array.from(new Set(groupRows.map((row) => row.titleHebrew))).slice(0, 10),
      urls: groupRows.map((row) => row.url).slice(0, 10)
    }))
    .sort((left, right) => right.count - left.count);
}

function buildSummary(rows: ReviewCandidate[], audit: DiscoveryAudit) {
  return {
    generatedAt: new Date().toISOString(),
    inputCandidatesPath: path.relative(process.cwd(), CANDIDATES_PATH),
    inputAuditPath: path.relative(process.cwd(), AUDIT_PATH),
    departmentPagesScanned: audit.departmentPagesScanned,
    pagesFetched: audit.pages?.filter((page) => page.fetched).length ?? null,
    pagesFailed: audit.pages?.filter((page) => !page.fetched || page.error).length ?? null,
    staleOrFailedPages: audit.pages
      ?.filter((page) => !page.fetched || page.error)
      .map((page) => ({ url: page.departmentUrl, titleHebrew: page.departmentHebrew, error: page.error })) ?? [],
    totalCandidates: rows.length,
    recommendedImportCount: rows.filter((row) => row.recommendedAction === "import").length,
    recommendedReviewCount: rows.filter((row) => row.recommendedAction === "review").length,
    recommendedSkipCount: rows.filter((row) => row.recommendedAction === "skip").length,
    countsByPageType: countBy(rows, "pageType"),
    countsByPatternType: countBy(rows, "patternType"),
    countsByParserRisk: countBy(rows, "parserRisk"),
    topParentDivisions: topParentDivisions(rows),
    unknownStaffPageCandidates: rows
      .filter((row) => row.patternType === "unknownStaffPage")
      .map((row) => ({ candidateId: row.candidateId, titleHebrew: row.titleHebrew, url: row.url, confidence: row.confidence })),
    duplicateOrNearDuplicateRisks: duplicateRisks(rows),
    missedSuspiciousPages: audit.missedSuspiciousPages ?? []
  };
}

function toCsv(rows: ReviewCandidate[]) {
  const headers: Array<keyof ReviewCandidate> = [
    "candidateId",
    "titleHebrew",
    "url",
    "sourceDepartmentPage",
    "patternType",
    "confidence",
    "pageType",
    "recommendedAction",
    "reason",
    "parserRisk",
    "duplicateGroup",
    "parentDivision",
    "extractedDoctorCount",
    "indexMatchedDoctorCount",
    "suspectedFalsePositiveCount"
  ];

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");
}

async function main() {
  const candidates = await readJson<DiscoveryCandidate[]>(CANDIDATES_PATH);
  const audit = await readJson<DiscoveryAudit>(AUDIT_PATH);
  const duplicateByUrl = buildDuplicateGroups(candidates);
  const reviewRows = candidates.map((candidate) => toReviewCandidate(candidate, duplicateByUrl));
  const summary = buildSummary(reviewRows, audit);

  await writeJson(REVIEW_JSON_PATH, { summary, candidates: reviewRows });
  await fs.mkdir(path.dirname(REVIEW_CSV_PATH), { recursive: true });
  await fs.writeFile(REVIEW_CSV_PATH, `${toCsv(reviewRows)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        reviewJsonPath: path.relative(process.cwd(), REVIEW_JSON_PATH),
        reviewCsvPath: path.relative(process.cwd(), REVIEW_CSV_PATH),
        summary
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
