import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { validateAdminReviewDecisions } from "@/lib/server/crawler-review-store";

type Row = Record<string, string>;

const ROOT = process.cwd();
const EXPORT_DIR = path.join(ROOT, "data/crawler/hospitals/review-exports");
const DEFAULT_WORKBOOK = path.join(EXPORT_DIR, "crawler-rosters-review.xlsx");
const DECISIONS_JSON = path.join(EXPORT_DIR, "manual-review-decisions.json");
const DECISIONS_CSV = path.join(EXPORT_DIR, "manual-review-decisions.csv");
const SUMMARY_MD = path.join(EXPORT_DIR, "manual-review-summary.md");
const VALIDATION_JSON = path.join(EXPORT_DIR, "manual-review-validation.json");

const REVIEW_SHEETS = ["Canonical Doctors", "Department Links", "Review Needed"] as const;
const ALLOWED_DECISIONS = new Set([
  "approve",
  "reject",
  "needs_check",
  "duplicate",
  "wrong_department",
  "out_of_scope",
  "keep_roster_only",
]);

const REQUIRED_COLUMNS: Record<string, string[]> = {
  "Canonical Doctors": ["reviewEntityType", "reviewEntityId", "hospitalSlug", "canonicalDoctorId", "fullName", "manualDecision", "manualNotes", "reviewer", "reviewedAt"],
  "Department Links": ["reviewEntityType", "reviewEntityId", "hospitalSlug", "canonicalDoctorId", "fullName", "manualDecision", "manualNotes", "reviewer", "reviewedAt"],
  "Review Needed": ["reviewEntityType", "reviewEntityId", "hospitalSlug", "issueType", "manualDecision", "manualNotes", "reviewer", "reviewedAt"],
};

function parseArgs(): string {
  const inputFlagIndex = process.argv.indexOf("--input");
  if (inputFlagIndex >= 0 && process.argv[inputFlagIndex + 1]) return path.resolve(ROOT, process.argv[inputFlagIndex + 1]);
  const positional = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  return positional ? path.resolve(ROOT, positional) : DEFAULT_WORKBOOK;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const cell = value as { text?: unknown; richText?: Array<{ text?: unknown }> };
    if (cell.text !== undefined) return toText(cell.text);
    if (Array.isArray(cell.richText)) return cell.richText.map((item) => toText(item.text)).join("");
    return JSON.stringify(value);
  }
  return String(value);
}

function csvEscape(value: unknown): string {
  const text = toText(value).replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function readRows(workbook: ExcelJS.Workbook, sheetName: string): Row[] {
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) throw new Error(`Missing required sheet: ${sheetName}`);
  const headers = worksheet.getRow(1).values as unknown[];
  const keys = headers.slice(1).map((header) => toText(header));
  const missing = REQUIRED_COLUMNS[sheetName].filter((column) => !keys.includes(column));
  if (missing.length) throw new Error(`Sheet ${sheetName} missing required columns: ${missing.join(", ")}`);
  const rows: Row[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const item: Row = { sheetName, rowNumber: String(rowNumber) };
    keys.forEach((key, index) => {
      item[key] = toText(row.getCell(index + 1).value).trim();
    });
    if (Object.values(item).some(Boolean)) rows.push(item);
  });
  return rows;
}

function countBy<T extends string>(values: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

function increment(map: Map<string, number>, key: string) {
  map.set(key || "blank", (map.get(key || "blank") ?? 0) + 1);
}

function topEntries(map: Map<string, number>, limit = 10): Array<{ key: string; count: number }> {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, count]) => ({ key, count }));
}

async function writeCsv(rows: Row[]) {
  const columns = [
    "sheetName",
    "rowNumber",
    "reviewEntityType",
    "reviewEntityId",
    "hospitalSlug",
    "hospitalName",
    "canonicalDoctorId",
    "fullName",
    "departmentName",
    "specialty",
    "issueType",
    "manualDecision",
    "manualNotes",
    "reviewer",
    "reviewedAt",
  ];
  const lines = [columns.map(csvEscape).join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
  await fs.promises.writeFile(DECISIONS_CSV, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const workbookPath = parseArgs();
  if (!fs.existsSync(workbookPath)) throw new Error(`Workbook not found: ${path.relative(ROOT, workbookPath)}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  const rowsBySheet: Record<string, Row[]> = {};
  for (const sheetName of REVIEW_SHEETS) rowsBySheet[sheetName] = readRows(workbook, sheetName);

  const generatedAt = new Date().toISOString();
  const allRows = REVIEW_SHEETS.flatMap((sheetName) => rowsBySheet[sheetName]);
  const decisions = allRows.filter((row) => row.manualDecision);
  const warnings: Row[] = [];
  const errors: Row[] = [];
  const contradictions: Row[] = [];

  const sheetCounts = Object.fromEntries(REVIEW_SHEETS.map((sheetName) => [sheetName, rowsBySheet[sheetName].length]));
  const reviewedBySheet = Object.fromEntries(REVIEW_SHEETS.map((sheetName) => [sheetName, rowsBySheet[sheetName].filter((row) => row.manualDecision).length]));
  const unreviewedBySheet = Object.fromEntries(REVIEW_SHEETS.map((sheetName) => [sheetName, rowsBySheet[sheetName].filter((row) => !row.manualDecision).length]));

  for (const sheetName of REVIEW_SHEETS) {
    const seen = new Map<string, Row[]>();
    for (const row of rowsBySheet[sheetName]) {
      if (!row.reviewEntityId) errors.push({ severity: "error", issue: "missingReviewEntityId", ...row });
      if (!row.reviewEntityType) errors.push({ severity: "error", issue: "missingReviewEntityType", ...row });
      if (row.reviewEntityId) seen.set(row.reviewEntityId, [...(seen.get(row.reviewEntityId) ?? []), row]);
      if (row.manualDecision && !ALLOWED_DECISIONS.has(row.manualDecision)) errors.push({ severity: "error", issue: "invalidManualDecision", ...row });
      if (row.manualDecision && sheetName !== "Review Needed" && !row.fullName) warnings.push({ severity: "warning", issue: "decisionMissingFullName", ...row });
    }
    for (const [reviewEntityId, duplicateRows] of seen.entries()) {
      if (duplicateRows.length > 1) {
        for (const row of duplicateRows) errors.push({ severity: "error", issue: "duplicateReviewEntityId", reviewEntityId, ...row });
      }
    }
  }

  const canonicalByKey = new Map<string, Row>();
  const canonicalDecisionByKey = new Map<string, string>();
  for (const row of rowsBySheet["Canonical Doctors"]) {
    const key = `${row.hospitalSlug}|${row.canonicalDoctorId}`;
    canonicalByKey.set(key, row);
    if (row.manualDecision) canonicalDecisionByKey.set(key, row.manualDecision);
  }

  for (const link of rowsBySheet["Department Links"]) {
    const key = `${link.hospitalSlug}|${link.canonicalDoctorId}`;
    if (link.manualDecision && !canonicalByKey.has(key)) warnings.push({ severity: "warning", issue: "linkDecisionMissingCanonicalDoctor", ...link });
    const canonicalDecision = canonicalDecisionByKey.get(key);
    if (link.manualDecision === "approve" && ["reject", "out_of_scope", "keep_roster_only"].includes(canonicalDecision ?? "")) {
      contradictions.push({
        severity: "warning",
        issue: "canonicalDecisionContradictsApprovedLink",
        canonicalDecision: canonicalDecision ?? "",
        ...link,
      });
    }
  }

  const pendingByHospital = new Map<string, number>();
  const negativeByHospital = new Map<string, number>();
  for (const row of allRows) {
    if (!row.manualDecision) increment(pendingByHospital, row.hospitalSlug);
    if (["reject", "out_of_scope", "wrong_department"].includes(row.manualDecision)) increment(negativeByHospital, row.hospitalSlug);
  }

  const decisionsByValue = countBy(decisions.map((row) => row.manualDecision));
  const adminDecisionValidation = await validateAdminReviewDecisions();
  const validation = {
    generatedAt,
    workbookPath: path.relative(ROOT, workbookPath),
    allowedManualDecisionValues: [...ALLOWED_DECISIONS],
    sheetCounts,
    reviewedBySheet,
    unreviewedBySheet,
    decisionsByValue,
    invalidDecisionCount: errors.filter((row) => row.issue === "invalidManualDecision").length,
    duplicateReviewEntityIdCount: errors.filter((row) => row.issue === "duplicateReviewEntityId").length,
    contradictionCount: contradictions.length,
    warningCount: warnings.length + contradictions.length,
    errorCount: errors.length,
    warnings,
    errors,
    contradictions,
    adminDecisionValidation,
    hospitalsWithMostPendingReview: topEntries(pendingByHospital),
    hospitalsWithMostRejectOutOfScopeWrongDepartment: topEntries(negativeByHospital),
  };

  await fs.promises.mkdir(EXPORT_DIR, { recursive: true });
  await fs.promises.writeFile(DECISIONS_JSON, `${JSON.stringify(decisions, null, 2)}\n`, "utf8");
  await writeCsv(decisions);
  await fs.promises.writeFile(VALIDATION_JSON, `${JSON.stringify(validation, null, 2)}\n`, "utf8");

  const nextAction = errors.length
    ? "Fix structural/decision errors in the workbook before using decisions."
    : decisions.length === 0
      ? "Workbook is ready for human review; no manual decisions entered yet."
      : contradictions.length
        ? "Resolve contradictions before import planning."
        : "Manual decisions are machine-readable; still no DB import has been performed.";

  await fs.promises.writeFile(SUMMARY_MD, [
    "# Manual Review Validation Summary",
    "",
    `Generated at: ${generatedAt}`,
    `Workbook: ${path.relative(ROOT, workbookPath)}`,
    "",
    "## Row Counts",
    `- Canonical Doctors: ${sheetCounts["Canonical Doctors"]}`,
    `- Department Links: ${sheetCounts["Department Links"]}`,
    `- Review Needed: ${sheetCounts["Review Needed"]}`,
    "",
    "## Reviewed / Unreviewed",
    ...REVIEW_SHEETS.map((sheetName) => `- ${sheetName}: reviewed ${reviewedBySheet[sheetName]}, unreviewed ${unreviewedBySheet[sheetName]}`),
    "",
    "## Decisions by Value",
    ...Object.entries(decisionsByValue).map(([decision, count]) => `- ${decision}: ${count}`),
    ...(Object.keys(decisionsByValue).length ? [] : ["- none: 0"]),
    "",
    "## Validation",
    `- Invalid decisions: ${validation.invalidDecisionCount}`,
    `- Duplicate reviewEntityIds: ${validation.duplicateReviewEntityIdCount}`,
    `- Contradictions: ${validation.contradictionCount}`,
    `- Warnings: ${validation.warningCount}`,
    `- Errors: ${validation.errorCount}`,
    `- Admin artifact decisions: ${adminDecisionValidation.decisionCount}`,
    `- Admin artifact invalid decisions: ${adminDecisionValidation.invalidDecisionCount}`,
    `- Admin artifact duplicate IDs: ${adminDecisionValidation.duplicateReviewEntityIdCount}`,
    `- Admin artifact contradictions: ${adminDecisionValidation.contradictionCount}`,
    "",
    "## Hospitals With Most Pending Review",
    ...validation.hospitalsWithMostPendingReview.map((entry) => `- ${entry.key}: ${entry.count}`),
    "",
    "## Hospitals With Most Reject/out_of_scope/wrong_department",
    ...validation.hospitalsWithMostRejectOutOfScopeWrongDepartment.map((entry) => `- ${entry.key}: ${entry.count}`),
    "",
    "## Next Recommended Action",
    nextAction,
    "",
  ].join("\n"), "utf8");

  console.log(JSON.stringify({
    workbookPath: path.relative(ROOT, workbookPath),
    decisionsJson: path.relative(ROOT, DECISIONS_JSON),
    decisionsCsv: path.relative(ROOT, DECISIONS_CSV),
    summary: path.relative(ROOT, SUMMARY_MD),
    validation: path.relative(ROOT, VALIDATION_JSON),
    sheetCounts,
    reviewedBySheet,
    unreviewedBySheet,
    decisionsByValue,
    invalidDecisionCount: validation.invalidDecisionCount,
    duplicateReviewEntityIdCount: validation.duplicateReviewEntityIdCount,
    contradictionCount: validation.contradictionCount,
    adminDecisionCount: adminDecisionValidation.decisionCount,
    adminDecisionInvalidDecisionCount: adminDecisionValidation.invalidDecisionCount,
    adminDecisionDuplicateReviewEntityIdCount: adminDecisionValidation.duplicateReviewEntityIdCount,
    adminDecisionContradictionCount: adminDecisionValidation.contradictionCount,
    warningCount: validation.warningCount,
    errorCount: validation.errorCount,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
