import fs from "node:fs/promises";
import path from "node:path";

export const CRAWLER_REVIEW_DECISIONS = [
  "approve",
  "reject",
  "needs_check",
  "duplicate",
  "wrong_department",
  "out_of_scope",
  "keep_roster_only"
] as const;

export type CrawlerReviewManualDecision = (typeof CRAWLER_REVIEW_DECISIONS)[number];
export type CrawlerReviewEntityType = "canonicalDoctor" | "doctorDepartmentLink" | "reviewIssue";
export type CrawlerReviewSourceSheet = "Canonical Doctors" | "Department Links" | "Review Needed";

export type CrawlerReviewDecision = {
  reviewEntityId: string;
  reviewEntityType: CrawlerReviewEntityType;
  hospitalSlug: string;
  manualDecision: CrawlerReviewManualDecision;
  manualNotes: string;
  reviewer: string;
  reviewedAt: string;
  sourceSheet: CrawlerReviewSourceSheet;
  sourceType: CrawlerReviewEntityType;
  updatedAt: string;
};

export type CrawlerReviewRow = Record<string, string> & {
  reviewEntityId: string;
  reviewEntityType: CrawlerReviewEntityType;
  hospitalSlug: string;
  fullName: string;
  manualDecision?: string;
  manualNotes?: string;
};

export type CrawlerReviewHospitalSummary = {
  hospitalSlug: string;
  hospitalName: string;
  institutionType: string;
  outputUsability: string;
  crawlReadiness: string;
  mappingReadiness: string;
  canonicalDoctorsCount: number;
  departmentLinksCount: number;
  reviewNeededCount: number;
  sourceUrlMatchCount: number;
  reviewNeededLinkCount: number;
  reviewedCount: number;
  totalReviewableCount: number;
  warningBadges: Record<string, number>;
  cautionFlags: string[];
};

export type CrawlerReviewHospitalDetail = {
  summary: CrawlerReviewHospitalSummary;
  doctors: CrawlerReviewRow[];
  departmentLinks: CrawlerReviewRow[];
  reviewNeeded: CrawlerReviewRow[];
  decisions: CrawlerReviewDecision[];
};

export type CrawlerAdminReviewValidation = {
  generatedAt: string;
  decisionCount: number;
  invalidDecisionCount: number;
  duplicateReviewEntityIdCount: number;
  contradictionCount: number;
  warningCount: number;
  errorCount: number;
  warnings: Array<Record<string, string>>;
  errors: Array<Record<string, string>>;
  contradictions: Array<Record<string, string>>;
  decisionsByValue: Record<string, number>;
};

const ROOT = process.cwd();
const EXPORT_DIR = path.join(ROOT, "data/crawler/hospitals/review-exports");
const ADMIN_DECISIONS_JSON = path.join(EXPORT_DIR, "admin-review-decisions.json");
const ADMIN_DECISIONS_CSV = path.join(EXPORT_DIR, "admin-review-decisions.csv");
const ADMIN_SUMMARY_MD = path.join(EXPORT_DIR, "admin-review-summary.md");
const MANUAL_DECISIONS_JSON = path.join(EXPORT_DIR, "manual-review-decisions.json");

const CSV_FILES = {
  siteReady: path.join(EXPORT_DIR, "csv/Site_Ready_Rosters.csv"),
  hospitalQa: path.join(EXPORT_DIR, "csv/Hospital_QA.csv"),
  canonicalDoctors: path.join(EXPORT_DIR, "csv/Canonical_Doctors.csv"),
  departmentLinks: path.join(EXPORT_DIR, "csv/Department_Links.csv"),
  reviewNeeded: path.join(EXPORT_DIR, "csv/Review_Needed.csv")
};

function toText(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

async function readCsv(filePath: string) {
  const text = await fs.readFile(filePath, "utf8");
  const [headers = [], ...rows] = parseCsv(text);
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as Record<string, string>
  );
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  try {
    const text = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function csvEscape(value: unknown) {
  const text = toText(value).replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

async function atomicWrite(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, content, "utf8");
  await fs.rename(tempPath, filePath);
}

function normalizeSourceSheet(value: string): CrawlerReviewSourceSheet {
  if (value === "Department Links") return "Department Links";
  if (value === "Review Needed") return "Review Needed";
  return "Canonical Doctors";
}

function normalizeEntityType(value: string): CrawlerReviewEntityType {
  if (value === "doctorDepartmentLink") return "doctorDepartmentLink";
  if (value === "reviewIssue") return "reviewIssue";
  return "canonicalDoctor";
}

function normalizeDecision(value: string): CrawlerReviewManualDecision | null {
  return (CRAWLER_REVIEW_DECISIONS as readonly string[]).includes(value) ? (value as CrawlerReviewManualDecision) : null;
}

function applyDecision(row: CrawlerReviewRow, decisions: Map<string, CrawlerReviewDecision>): CrawlerReviewRow {
  const decision = decisions.get(row.reviewEntityId);
  return {
    ...row,
    manualDecision: decision?.manualDecision ?? row.manualDecision ?? "",
    manualNotes: decision?.manualNotes ?? row.manualNotes ?? "",
    reviewer: decision?.reviewer ?? row.reviewer ?? "",
    reviewedAt: decision?.reviewedAt ?? row.reviewedAt ?? ""
  };
}

function splitFlags(value: string) {
  return value
    .split(/[;\n,]+/)
    .map((flag) => flag.trim())
    .filter(Boolean);
}

function countRowsByHospital(rows: CrawlerReviewRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.hospitalSlug, (counts.get(row.hospitalSlug) ?? 0) + 1);
  }
  return counts;
}

function decisionMap(decisions: CrawlerReviewDecision[]) {
  return new Map(decisions.map((decision) => [decision.reviewEntityId, decision]));
}

function rowToReviewRow(row: Record<string, string>, entityType: CrawlerReviewEntityType): CrawlerReviewRow {
  return {
    ...row,
    reviewEntityId: row.reviewEntityId,
    reviewEntityType: entityType,
    hospitalSlug: row.hospitalSlug,
    fullName: row.fullName ?? ""
  };
}

async function loadBaseRows() {
  const [siteReady, hospitalQa, canonicalDoctorsCsv, departmentLinksCsv, reviewNeededCsv] = await Promise.all([
    readCsv(CSV_FILES.siteReady),
    readCsv(CSV_FILES.hospitalQa),
    readCsv(CSV_FILES.canonicalDoctors),
    readCsv(CSV_FILES.departmentLinks),
    readCsv(CSV_FILES.reviewNeeded)
  ]);

  return {
    siteReady,
    hospitalQa,
    canonicalDoctors: canonicalDoctorsCsv.map((row) => rowToReviewRow(row, "canonicalDoctor")),
    departmentLinks: departmentLinksCsv.map((row) => rowToReviewRow(row, "doctorDepartmentLink")),
    reviewNeeded: reviewNeededCsv.map((row) => rowToReviewRow(row, "reviewIssue"))
  };
}

export async function loadCrawlerReviewDecisions() {
  const adminDecisions = await readJsonArray<CrawlerReviewDecision>(ADMIN_DECISIONS_JSON);
  const excelDecisions = (await readJsonArray<Record<string, string>>(MANUAL_DECISIONS_JSON))
    .map((row) => {
      const decision = normalizeDecision(row.manualDecision ?? "");
      if (!decision || !row.reviewEntityId) return null;
      return {
        reviewEntityId: row.reviewEntityId,
        reviewEntityType: normalizeEntityType(row.reviewEntityType ?? row.sourceType ?? ""),
        hospitalSlug: row.hospitalSlug ?? "",
        manualDecision: decision,
        manualNotes: row.manualNotes ?? "",
        reviewer: row.reviewer ?? "",
        reviewedAt: row.reviewedAt ?? "",
        sourceSheet: normalizeSourceSheet(row.sheetName ?? row.sourceSheet ?? ""),
        sourceType: normalizeEntityType(row.reviewEntityType ?? row.sourceType ?? ""),
        updatedAt: row.reviewedAt ?? ""
      } satisfies CrawlerReviewDecision;
    })
    .filter((decision): decision is CrawlerReviewDecision => Boolean(decision));

  const combined = decisionMap(excelDecisions);
  for (const decision of adminDecisions) {
    combined.set(decision.reviewEntityId, decision);
  }
  return [...combined.values()];
}

export async function getCrawlerReviewRows() {
  const [baseRows, decisions] = await Promise.all([loadBaseRows(), loadCrawlerReviewDecisions()]);
  const decisionsById = decisionMap(decisions);

  return {
    siteReady: baseRows.siteReady,
    hospitalQa: baseRows.hospitalQa,
    canonicalDoctors: baseRows.canonicalDoctors.map((row) => applyDecision(row, decisionsById)),
    departmentLinks: baseRows.departmentLinks.map((row) => applyDecision(row, decisionsById)),
    reviewNeeded: baseRows.reviewNeeded.map((row) => applyDecision(row, decisionsById)),
    decisions
  };
}

function summarizeHospital(input: {
  siteRow: Record<string, string>;
  qaRow?: Record<string, string>;
  canonicalCount: number;
  linkCount: number;
  reviewNeededCount: number;
  reviewedCount: number;
  warnings: Record<string, number>;
}) {
  const totalReviewableCount = input.canonicalCount + input.linkCount + input.reviewNeededCount;
  return {
    hospitalSlug: input.siteRow.hospitalSlug,
    hospitalName: input.siteRow.hospitalName,
    institutionType: input.siteRow.institutionType,
    outputUsability: input.siteRow.outputUsability,
    crawlReadiness: input.siteRow.crawlReadiness,
    mappingReadiness: input.siteRow.mappingReadiness,
    canonicalDoctorsCount: input.canonicalCount,
    departmentLinksCount: input.linkCount,
    reviewNeededCount: input.reviewNeededCount,
    sourceUrlMatchCount: Number(input.siteRow.sourceUrlMatchCount || input.qaRow?.sourceUrlMatchCount || 0),
    reviewNeededLinkCount: Number(input.qaRow?.reviewNeededLinkCount || 0),
    reviewedCount: input.reviewedCount,
    totalReviewableCount,
    warningBadges: input.warnings,
    cautionFlags: splitFlags([input.siteRow.notes, input.qaRow?.cautionFlags].filter(Boolean).join("; "))
  } satisfies CrawlerReviewHospitalSummary;
}

export async function getCrawlerReviewHospitals() {
  const rows = await getCrawlerReviewRows();
  const canonicalCounts = countRowsByHospital(rows.canonicalDoctors);
  const linkCounts = countRowsByHospital(rows.departmentLinks);
  const reviewNeededCounts = countRowsByHospital(rows.reviewNeeded);
  const reviewedCounts = countRowsByHospital([
    ...rows.canonicalDoctors,
    ...rows.departmentLinks,
    ...rows.reviewNeeded
  ].filter((row) => Boolean(row.manualDecision)));
  const qaBySlug = new Map(rows.hospitalQa.map((row) => [row.hospitalSlug, row]));

  const warningsByHospital = new Map<string, Record<string, number>>();
  function addWarning(hospitalSlug: string, flag: string) {
    const warnings = warningsByHospital.get(hospitalSlug) ?? {};
    warnings[flag] = (warnings[flag] ?? 0) + 1;
    warningsByHospital.set(hospitalSlug, warnings);
  }

  for (const row of rows.canonicalDoctors) {
    for (const flag of splitFlags(row.cautionFlags ?? "")) {
      if (["suspiciousName", "possibleOutOfScopeRole", "profileCoverageLow"].includes(flag)) addWarning(row.hospitalSlug, flag);
    }
  }
  for (const row of rows.reviewNeeded) {
    for (const flag of splitFlags(row.issueType ?? "")) {
      if (["mappingReviewNeeded", "hospitalRosterOnly", "profileCoverageLow", "possibleOutOfScopeRole", "suspiciousName"].includes(flag)) {
        addWarning(row.hospitalSlug, flag);
      }
      if (flag === "matchConfidenceReviewNeeded" || flag === "mappingReadinessReviewNeeded") addWarning(row.hospitalSlug, "mappingReviewNeeded");
    }
  }
  for (const row of rows.siteReady) {
    if (row.profileCoverageLow === "true") addWarning(row.hospitalSlug, "profileCoverageLow");
    if (row.mappingReviewNeeded === "true") addWarning(row.hospitalSlug, "mappingReviewNeeded");
  }

  return rows.siteReady
    .map((siteRow) => summarizeHospital({
      siteRow,
      qaRow: qaBySlug.get(siteRow.hospitalSlug),
      canonicalCount: canonicalCounts.get(siteRow.hospitalSlug) ?? Number(siteRow.canonicalDoctorsCount || 0),
      linkCount: linkCounts.get(siteRow.hospitalSlug) ?? Number(siteRow.doctorDepartmentLinksCount || 0),
      reviewNeededCount: reviewNeededCounts.get(siteRow.hospitalSlug) ?? Number(siteRow.reviewNeededCount || 0),
      reviewedCount: reviewedCounts.get(siteRow.hospitalSlug) ?? 0,
      warnings: warningsByHospital.get(siteRow.hospitalSlug) ?? {}
    }))
    .sort((a, b) => {
      const usabilityRank = (value: string) => value === "departmentMappedRoster" ? 0 : value === "hospitalRoster" ? 1 : 2;
      const warningCount = (summary: CrawlerReviewHospitalSummary) => Object.values(summary.warningBadges).reduce((sum, count) => sum + count, 0);
      return (
        usabilityRank(a.outputUsability) - usabilityRank(b.outputUsability) ||
        warningCount(a) - warningCount(b) ||
        b.sourceUrlMatchCount - a.sourceUrlMatchCount ||
        a.hospitalName.localeCompare(b.hospitalName, "he")
      );
    });
}

export async function getCrawlerReviewHospital(hospitalSlug: string): Promise<CrawlerReviewHospitalDetail | null> {
  const [hospitals, rows] = await Promise.all([getCrawlerReviewHospitals(), getCrawlerReviewRows()]);
  const summary = hospitals.find((hospital) => hospital.hospitalSlug === hospitalSlug);
  if (!summary) return null;

  return {
    summary,
    doctors: rows.canonicalDoctors.filter((row) => row.hospitalSlug === hospitalSlug),
    departmentLinks: rows.departmentLinks.filter((row) => row.hospitalSlug === hospitalSlug),
    reviewNeeded: rows.reviewNeeded.filter((row) => row.hospitalSlug === hospitalSlug),
    decisions: rows.decisions.filter((decision) => decision.hospitalSlug === hospitalSlug)
  };
}

async function writeDecisionArtifacts(decisions: CrawlerReviewDecision[]) {
  const sorted = decisions.sort((a, b) =>
    a.hospitalSlug.localeCompare(b.hospitalSlug, "he") ||
    a.sourceSheet.localeCompare(b.sourceSheet) ||
    a.reviewEntityId.localeCompare(b.reviewEntityId)
  );

  await atomicWrite(ADMIN_DECISIONS_JSON, `${JSON.stringify(sorted, null, 2)}\n`);
  const columns = ["reviewEntityId", "reviewEntityType", "hospitalSlug", "manualDecision", "manualNotes", "reviewer", "reviewedAt", "sourceSheet", "sourceType", "updatedAt"];
  const csvLines = [columns.map(csvEscape).join(","), ...sorted.map((row) => columns.map((column) => csvEscape(row[column as keyof CrawlerReviewDecision])).join(","))];
  await atomicWrite(ADMIN_DECISIONS_CSV, `${csvLines.join("\n")}\n`);

  const decisionsByValue = sorted.reduce<Record<string, number>>((accumulator, decision) => {
    accumulator[decision.manualDecision] = (accumulator[decision.manualDecision] ?? 0) + 1;
    return accumulator;
  }, {});
  await atomicWrite(ADMIN_SUMMARY_MD, [
    "# Admin Crawler Review Decisions",
    "",
    `Generated at: ${new Date().toISOString()}`,
    `Decision count: ${sorted.length}`,
    "",
    "## Decisions by value",
    ...Object.entries(decisionsByValue).map(([decision, count]) => `- ${decision}: ${count}`),
    ...(sorted.length ? [] : ["- none: 0"]),
    "",
    "Persistence note: this is a local file artifact only. It is not a production DB import and does not publish doctors.",
    ""
  ].join("\n"));
}

export async function saveCrawlerReviewDecisions(input: {
  decisions: Array<{
    reviewEntityId: string;
    reviewEntityType: CrawlerReviewEntityType;
    hospitalSlug: string;
    manualDecision: CrawlerReviewManualDecision | "";
    manualNotes?: string;
    sourceSheet: CrawlerReviewSourceSheet;
    sourceType: CrawlerReviewEntityType;
  }>;
  reviewer: string;
}) {
  const existing = await readJsonArray<CrawlerReviewDecision>(ADMIN_DECISIONS_JSON);
  const byId = decisionMap(existing);
  const now = new Date().toISOString();

  for (const decision of input.decisions) {
    if (!decision.reviewEntityId) continue;
    if (!decision.manualDecision) {
      byId.delete(decision.reviewEntityId);
      continue;
    }
    byId.set(decision.reviewEntityId, {
      reviewEntityId: decision.reviewEntityId,
      reviewEntityType: decision.reviewEntityType,
      hospitalSlug: decision.hospitalSlug,
      manualDecision: decision.manualDecision,
      manualNotes: decision.manualNotes?.trim() ?? "",
      reviewer: input.reviewer,
      reviewedAt: now,
      sourceSheet: decision.sourceSheet,
      sourceType: decision.sourceType,
      updatedAt: now
    });
  }

  const decisions = [...byId.values()];
  await writeDecisionArtifacts(decisions);
  return {
    decisions,
    validation: await validateAdminReviewDecisions(decisions)
  };
}

export async function validateAdminReviewDecisions(decisionsInput?: CrawlerReviewDecision[]): Promise<CrawlerAdminReviewValidation> {
  const [rows, decisions] = await Promise.all([
    getCrawlerReviewRows(),
    decisionsInput ? Promise.resolve(decisionsInput) : loadCrawlerReviewDecisions()
  ]);
  const generatedAt = new Date().toISOString();
  const warnings: Array<Record<string, string>> = [];
  const errors: Array<Record<string, string>> = [];
  const contradictions: Array<Record<string, string>> = [];
  const seen = new Map<string, CrawlerReviewDecision[]>();

  for (const decision of decisions) {
    if (!CRAWLER_REVIEW_DECISIONS.includes(decision.manualDecision)) {
      errors.push({ issue: "invalidManualDecision", reviewEntityId: decision.reviewEntityId, manualDecision: decision.manualDecision });
    }
    seen.set(decision.reviewEntityId, [...(seen.get(decision.reviewEntityId) ?? []), decision]);
  }
  for (const [reviewEntityId, duplicateRows] of seen.entries()) {
    if (duplicateRows.length > 1) errors.push({ issue: "duplicateReviewEntityId", reviewEntityId, count: String(duplicateRows.length) });
  }

  const canonicalByKey = new Map(rows.canonicalDoctors.map((row) => [`${row.hospitalSlug}|${row.canonicalDoctorId}`, row]));
  const decisionById = decisionMap(decisions);
  const canonicalDecisionByKey = new Map<string, CrawlerReviewDecision>();
  for (const row of rows.canonicalDoctors) {
    const decision = decisionById.get(row.reviewEntityId);
    if (decision) canonicalDecisionByKey.set(`${row.hospitalSlug}|${row.canonicalDoctorId}`, decision);
  }
  for (const link of rows.departmentLinks) {
    const decision = decisionById.get(link.reviewEntityId);
    if (!decision) continue;
    const key = `${link.hospitalSlug}|${link.canonicalDoctorId}`;
    if (!canonicalByKey.has(key)) warnings.push({ issue: "linkDecisionMissingCanonicalDoctor", reviewEntityId: link.reviewEntityId, hospitalSlug: link.hospitalSlug });
    const canonicalDecision = canonicalDecisionByKey.get(key);
    if (decision.manualDecision === "approve" && ["reject", "out_of_scope", "keep_roster_only"].includes(canonicalDecision?.manualDecision ?? "")) {
      contradictions.push({
        issue: "canonicalDecisionContradictsApprovedLink",
        canonicalReviewEntityId: canonicalDecision?.reviewEntityId ?? "",
        canonicalDecision: canonicalDecision?.manualDecision ?? "",
        linkReviewEntityId: link.reviewEntityId,
        hospitalSlug: link.hospitalSlug
      });
    }
  }

  const decisionsByValue = decisions.reduce<Record<string, number>>((accumulator, decision) => {
    accumulator[decision.manualDecision] = (accumulator[decision.manualDecision] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    generatedAt,
    decisionCount: decisions.length,
    invalidDecisionCount: errors.filter((row) => row.issue === "invalidManualDecision").length,
    duplicateReviewEntityIdCount: errors.filter((row) => row.issue === "duplicateReviewEntityId").length,
    contradictionCount: contradictions.length,
    warningCount: warnings.length + contradictions.length,
    errorCount: errors.length,
    warnings,
    errors,
    contradictions,
    decisionsByValue
  };
}
