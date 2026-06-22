import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

type JsonRecord = Record<string, unknown>;

type SiteReadyRoster = {
  hospitalSlug: string;
  hospitalName?: string;
  institutionType?: string;
  outputUsability?: string;
  crawlReadiness?: string;
  mappingReadiness?: string;
  canonicalDoctors?: number;
  doctorDepartmentLinks?: number;
  sourceUrlMatch?: number;
  reviewNeeded?: number;
  productionReadyCanonicalDoctors?: number;
  paths?: {
    canonicalDoctors?: string | null;
    doctorDepartmentLinks?: string | null;
    reviewedDoctors?: string | null;
  };
  cautionFlags?: string[];
};

type SiteReadyIndex = {
  generatedAt?: string;
  total?: number;
  rosters: SiteReadyRoster[];
};

type Baseline = {
  generatedAt?: string;
  totals?: Record<string, unknown>;
  sourceReport?: string;
  highPriorityBlockers?: JsonRecord[];
  deferredHardCases?: JsonRecord[];
};

type AdapterBacklog = {
  generatedAt?: string;
  count?: number;
  entries?: JsonRecord[];
};

type ValidationRow = {
  severity: "info" | "warning" | "error";
  hospitalSlug: string;
  filePath: string;
  issue: string;
  details: string;
};

type SheetColumn = {
  header: string;
  key: string;
  width?: number;
  isUrl?: boolean;
};

const ROOT = process.cwd();
const HOSPITALS_DIR = path.join(ROOT, "data/crawler/hospitals");
const OUTPUT_DIR = path.join(HOSPITALS_DIR, "review-exports");
const CSV_DIR = path.join(OUTPUT_DIR, "csv");
const XLSX_PATH = path.join(OUTPUT_DIR, "crawler-rosters-review.xlsx");

const SITE_READY_PATH = path.join(HOSPITALS_DIR, "site-ready-rosters-index.json");
const BASELINE_PATH = path.join(HOSPITALS_DIR, "national-coverage-baseline.json");
const ADAPTER_BACKLOG_PATH = path.join(HOSPITALS_DIR, "adapter-backlog.json");

function readJsonFile<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${path.relative(ROOT, filePath)}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function tryReadJsonArray(filePath: string | null | undefined): JsonRecord[] | null {
  if (!filePath) return null;
  const absolute = path.resolve(ROOT, filePath);
  if (!fs.existsSync(absolute)) return null;
  const parsed = JSON.parse(fs.readFileSync(absolute, "utf8"));
  return Array.isArray(parsed) ? parsed as JsonRecord[] : null;
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join("\n");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function asStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => asString(item)).filter(Boolean);
  return [asString(value)].filter(Boolean);
}

function stableDoctorId(hospitalSlug: string, doctor: JsonRecord): string {
  const base = [
    hospitalSlug,
    asString(doctor.canonicalDoctorId),
    asString(doctor.profileUrl),
    asString(doctor.normalizedName),
    asString(doctor.fullName),
  ].filter(Boolean).join("|");
  return asString(doctor.canonicalDoctorId) || `doctor-${crypto.createHash("sha1").update(base).digest("hex").slice(0, 16)}`;
}

function relativePath(filePath: string | null | undefined): string {
  if (!filePath) return "";
  return path.relative(ROOT, path.resolve(ROOT, filePath));
}

function csvEscape(value: unknown): string {
  const text = stringifyValue(value).replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

async function writeCsv(name: string, columns: SheetColumn[], rows: JsonRecord[]) {
  const safeName = name.replace(/[^\wא-ת-]+/g, "_");
  const lines = [
    columns.map((column) => csvEscape(column.header)).join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column.key])).join(",")),
  ];
  await fs.promises.writeFile(path.join(CSV_DIR, `${safeName}.csv`), lines.join("\n") + "\n", "utf8");
}

function addWorksheet(workbook: ExcelJS.Workbook, name: string, columns: SheetColumn[], rows: JsonRecord[]) {
  const worksheet = workbook.addWorksheet(name);
  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width ?? Math.min(Math.max(column.header.length + 4, 14), 42),
  }));
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(rows.length + 1, 1), column: columns.length },
  };

  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
  header.alignment = { vertical: "middle", wrapText: true };

  for (const rawRow of rows) {
    const row = worksheet.addRow(rawRow);
    columns.forEach((column, index) => {
      const cell = row.getCell(index + 1);
      const value = rawRow[column.key];
      if (column.isUrl && typeof value === "string" && /^https?:\/\//.test(value) && !value.includes("\n")) {
        cell.value = { text: value, hyperlink: value };
        cell.font = { color: { argb: "FF0563C1" }, underline: true };
      } else if (Array.isArray(value) || (value && typeof value === "object")) {
        cell.value = stringifyValue(value);
      }
      cell.alignment = { vertical: "top", wrapText: true };
    });
  }

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  return worksheet;
}

function issueTypesForDoctor(roster: SiteReadyRoster, doctor: JsonRecord): string[] {
  const issues: string[] = [];
  const flags = roster.cautionFlags ?? [];
  if (roster.outputUsability === "hospitalRoster") issues.push("hospitalRosterOnly");
  if (flags.includes("profileCoverageLow") || doctor.productionReady === false) issues.push("profileCoverageLow");
  if (flags.includes("listOnlyMostly") || doctor.profileCompleteness === "listOnly") issues.push("listOnlyMostly");
  if (!doctor.profileUrl) issues.push("missingProfileUrl");
  return [...new Set(issues)];
}

function issueTypesForLink(roster: SiteReadyRoster, link: JsonRecord): string[] {
  const issues: string[] = [];
  if (link.matchConfidence === "reviewNeeded") issues.push("matchConfidenceReviewNeeded");
  if (roster.mappingReadiness === "reviewNeeded") issues.push("mappingReadinessReviewNeeded");
  if (link.ambiguityReason) issues.push("ambiguityReason");
  if (roster.outputUsability === "hospitalRoster") issues.push("hospitalRosterOnly");
  return [...new Set(issues)];
}

function fallbackCanonicalDoctors(roster: SiteReadyRoster, reviewed: JsonRecord[]): JsonRecord[] {
  return reviewed.map((doctor) => ({
    canonicalDoctorId: stableDoctorId(roster.hospitalSlug, doctor),
    fullName: doctor.fullName,
    normalizedName: doctor.normalizedName,
    profileUrl: doctor.profileUrl,
    hospitalName: doctor.hospital || roster.hospitalName,
    provider: doctor.provider || doctor.parserFamily,
    titlePrefix: doctor.titlePrefix,
    role: doctor.role || doctor.unit,
    profileCompleteness: doctor.profileCompleteness,
    productionReady: doctor.productionReady,
    sourceUrls: asStringArray(doctor.sourceUrl),
    evidence: [doctor.sourceEvidence, doctor.rawText].filter(Boolean),
  }));
}

function fallbackDepartmentLinks(roster: SiteReadyRoster, reviewed: JsonRecord[]): JsonRecord[] {
  return reviewed.flatMap((doctor) => {
    const rowIds = asStringArray(doctor.matchedMasterDeptRowIds);
    const deptNames = asStringArray(doctor.matchedMasterDepartmentNames);
    const specialties = asStringArray(doctor.matchedMasterSpecialties);
    const ids = rowIds.length ? rowIds : [""];
    return ids.map((rowId, index) => ({
      canonicalDoctorId: stableDoctorId(roster.hospitalSlug, doctor),
      fullName: doctor.fullName,
      masterDeptRowId: rowId,
      matchedMasterDepartmentName: deptNames[index] || deptNames.join("\n"),
      matchedMasterSpecialty: specialties[index] || specialties.join("\n"),
      departmentName: doctor.unit || deptNames[index] || deptNames.join("\n"),
      specialty: specialties[index] || specialties.join("\n"),
      matchConfidence: doctor.matchConfidence || "reviewNeeded",
      matchEvidence: doctor.matchEvidence,
      ambiguityReason: doctor.ambiguityReason,
      sourceUrl: doctor.sourceUrl,
      extractedFromUrl: doctor.sourceUrl,
    }));
  });
}

async function main() {
  const generatedAt = new Date().toISOString();
  const siteReady = readJsonFile<SiteReadyIndex>(SITE_READY_PATH);
  const baseline = readJsonFile<Baseline>(BASELINE_PATH);
  const adapterBacklog = readJsonFile<AdapterBacklog>(ADAPTER_BACKLOG_PATH);
  const validationRows: ValidationRow[] = [];

  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.promises.mkdir(CSV_DIR, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "med-departments-israel crawler review export";
  workbook.created = new Date();
  workbook.modified = new Date();

  const readmeRows: JsonRecord[] = [
    { topic: "Purpose", value: "Manual review workbook for crawler-generated hospital doctor rosters before any database import or public website integration." },
    { topic: "Publication status", value: "No crawler doctors have been imported into the DB or published by this export." },
    { topic: "hospitalRoster", value: "Usable hospital-level doctor roster. Department mapping may need review." },
    { topic: "departmentMappedRoster", value: "Stronger Master_Dept/sourceUrl mapping evidence exists." },
    { topic: "Caution flags", value: "profileCoverageLow, mappingReviewNeeded, listOnlyMostly, sourceUrlMapped, hospitalRosterOnly." },
    { topic: "Generated at", value: generatedAt },
  ];

  const sourceFiles = [SITE_READY_PATH, BASELINE_PATH, ADAPTER_BACKLOG_PATH].map((filePath) => relativePath(filePath));
  const totals = baseline.totals ?? {};
  const nationalSummaryRows: JsonRecord[] = [
    { metric: "total usable rosters", value: siteReady.total ?? siteReady.rosters.length, notes: "From site-ready-rosters-index.json" },
    { metric: "hospitalRoster count", value: totals.outputUsabilityHospitalRosterOnly ?? "", notes: "Output usability hospitalRoster only" },
    { metric: "departmentMappedRoster count", value: totals.departmentMappedRoster ?? "", notes: "Output usability departmentMappedRoster / stronger mapping" },
    { metric: "safeForFullBatch", value: totals.safeForFullBatch ?? "", notes: "" },
    { metric: "needsCalibration", value: totals.needsCalibration ?? "", notes: "" },
    { metric: "needsAdapter", value: totals.needsAdapter ?? "", notes: "" },
    { metric: "needsManualSeedUrl", value: totals.needsManualSeedUrl ?? "", notes: "" },
    { metric: "blocked", value: totals.blocked ?? "", notes: "" },
    { metric: "deferred", value: totals.deferred ?? "", notes: "" },
    { metric: "remainingUnattempted", value: totals.remainingUnattempted ?? "", notes: "" },
    { metric: "generatedAt", value: generatedAt, notes: `Baseline generatedAt: ${baseline.generatedAt ?? ""}` },
    { metric: "source files used", value: sourceFiles.join("\n"), notes: "" },
  ];

  const siteReadyRows = siteReady.rosters.map((roster) => ({
    hospitalSlug: roster.hospitalSlug,
    hospitalName: roster.hospitalName ?? "",
    institutionType: roster.institutionType ?? "",
    outputUsability: roster.outputUsability ?? "",
    crawlReadiness: roster.crawlReadiness ?? "",
    mappingReadiness: roster.mappingReadiness ?? "",
    canonicalDoctorsCount: roster.canonicalDoctors ?? "",
    doctorDepartmentLinksCount: roster.doctorDepartmentLinks ?? "",
    sourceUrlMatchCount: roster.sourceUrlMatch ?? "",
    reviewNeededCount: roster.reviewNeeded ?? "",
    profileCoverageLow: roster.cautionFlags?.includes("profileCoverageLow") ?? false,
    mappingReviewNeeded: roster.cautionFlags?.includes("mappingReviewNeeded") ?? false,
    listOnlyMostly: roster.cautionFlags?.includes("listOnlyMostly") ?? false,
    sourceUrlMapped: roster.cautionFlags?.includes("sourceUrlMapped") ?? false,
    canonicalDoctorsPath: roster.paths?.canonicalDoctors ?? "",
    doctorDepartmentLinksPath: roster.paths?.doctorDepartmentLinks ?? "",
    notes: (roster.cautionFlags ?? []).join("; "),
  }));

  const canonicalRows: JsonRecord[] = [];
  const departmentLinkRows: JsonRecord[] = [];
  const reviewNeededRows: JsonRecord[] = [];

  for (const roster of siteReady.rosters) {
    const canonicalPath = roster.paths?.canonicalDoctors ?? null;
    const linksPath = roster.paths?.doctorDepartmentLinks ?? null;
    const reviewedPath = roster.paths?.reviewedDoctors ?? null;
    const canonicalFile = canonicalPath ? path.resolve(ROOT, canonicalPath) : null;
    const linksFile = linksPath ? path.resolve(ROOT, linksPath) : null;
    const reviewedFile = reviewedPath ? path.resolve(ROOT, reviewedPath) : null;

    if (!canonicalPath) {
      validationRows.push({ severity: "warning", hospitalSlug: roster.hospitalSlug, filePath: "", issue: "missingCanonicalDoctorsPath", details: "Using reviewedDoctors fallback when available." });
    } else if (!canonicalFile || !fs.existsSync(canonicalFile)) {
      validationRows.push({ severity: "warning", hospitalSlug: roster.hospitalSlug, filePath: canonicalPath, issue: "missingCanonicalDoctorsFile", details: "Using reviewedDoctors fallback when available." });
    }

    if (!linksPath) {
      validationRows.push({ severity: "warning", hospitalSlug: roster.hospitalSlug, filePath: "", issue: "missingDoctorDepartmentLinksPath", details: "Using reviewedDoctors fallback when available." });
    } else if (!linksFile || !fs.existsSync(linksFile)) {
      validationRows.push({ severity: "warning", hospitalSlug: roster.hospitalSlug, filePath: linksPath, issue: "missingDoctorDepartmentLinksFile", details: "Using reviewedDoctors fallback when available." });
    }

    if (reviewedPath && (!reviewedFile || !fs.existsSync(reviewedFile))) {
      validationRows.push({ severity: "warning", hospitalSlug: roster.hospitalSlug, filePath: reviewedPath, issue: "missingReviewedDoctorsFile", details: "Fallback unavailable." });
    }

    const reviewedDoctors = tryReadJsonArray(reviewedPath) ?? [];
    const canonicalDoctors = tryReadJsonArray(canonicalPath) ?? fallbackCanonicalDoctors(roster, reviewedDoctors);
    const doctorLinks = tryReadJsonArray(linksPath) ?? fallbackDepartmentLinks(roster, reviewedDoctors);
    const doctorById = new Map<string, JsonRecord>();

    if (canonicalPath && canonicalDoctors.length !== (roster.canonicalDoctors ?? canonicalDoctors.length) && (roster.canonicalDoctors ?? 0) > 0) {
      validationRows.push({
        severity: "warning",
        hospitalSlug: roster.hospitalSlug,
        filePath: canonicalPath,
        issue: "canonicalCountMismatch",
        details: `index=${roster.canonicalDoctors}; file=${canonicalDoctors.length}`,
      });
    }
    if (linksPath && doctorLinks.length !== (roster.doctorDepartmentLinks ?? doctorLinks.length) && (roster.doctorDepartmentLinks ?? 0) > 0) {
      validationRows.push({
        severity: "warning",
        hospitalSlug: roster.hospitalSlug,
        filePath: linksPath,
        issue: "linkCountMismatch",
        details: `index=${roster.doctorDepartmentLinks}; file=${doctorLinks.length}`,
      });
    }

    for (const doctor of canonicalDoctors) {
      const canonicalDoctorId = stableDoctorId(roster.hospitalSlug, doctor);
      doctorById.set(canonicalDoctorId, doctor);
      const sourceUrls = asStringArray(doctor.sourceUrls).length ? asStringArray(doctor.sourceUrls) : asStringArray(doctor.sourceUrl);
      const evidence = asStringArray(doctor.evidence).length ? asStringArray(doctor.evidence) : [doctor.sourceEvidence, doctor.rawText].filter(Boolean).map(String);
      const doctorIssues = issueTypesForDoctor(roster, doctor);
      const canonicalRow = {
        hospitalSlug: roster.hospitalSlug,
        hospitalName: roster.hospitalName ?? (asString(doctor.hospitalName) || asString(doctor.hospital)),
        institutionType: roster.institutionType ?? "",
        outputUsability: roster.outputUsability ?? "",
        canonicalDoctorId,
        fullName: doctor.fullName ?? "",
        normalizedName: doctor.normalizedName ?? "",
        profileUrl: doctor.profileUrl ?? "",
        roleOrTitle: [doctor.titlePrefix, doctor.role].filter(Boolean).join(" "),
        profileCompleteness: doctor.profileCompleteness ?? "",
        sourceUrlsCount: sourceUrls.length,
        evidenceCount: evidence.length,
        cautionFlags: doctorIssues.join("; "),
        needsManualReview: doctorIssues.length > 0,
        sourceFile: canonicalPath && fs.existsSync(path.resolve(ROOT, canonicalPath)) ? canonicalPath : reviewedPath ?? "",
      };
      canonicalRows.push(canonicalRow);

      if (doctorIssues.length > 0) {
        reviewNeededRows.push({
          issueType: doctorIssues.join("; "),
          hospitalSlug: roster.hospitalSlug,
          hospitalName: canonicalRow.hospitalName,
          fullName: canonicalRow.fullName,
          profileUrl: canonicalRow.profileUrl,
          departmentName: "",
          specialty: "",
          matchConfidence: "",
          ambiguityReason: "",
          sourceUrl: sourceUrls[0] ?? "",
          extractedFromUrl: "",
          suggestedAction: roster.outputUsability === "hospitalRoster" ? "Review department mapping before import." : "Review profile completeness/evidence.",
        });
      }
    }

    for (const link of doctorLinks) {
      const canonicalDoctorId = asString(link.canonicalDoctorId);
      const doctor = doctorById.get(canonicalDoctorId);
      const fullName = link.fullName ?? doctor?.fullName ?? "";
      const matchConfidence = asString(link.matchConfidence);
      const linkIssues = issueTypesForLink(roster, link);
      const linkRow = {
        hospitalSlug: roster.hospitalSlug,
        hospitalName: roster.hospitalName ?? asString(link.hospitalName),
        canonicalDoctorId,
        fullName,
        masterDeptRowId: link.masterDeptRowId ?? "",
        matchedMasterDepartmentName: link.matchedMasterDepartmentName ?? link.departmentName ?? "",
        matchedMasterSpecialty: link.matchedMasterSpecialty ?? link.specialty ?? "",
        departmentName: link.departmentName ?? "",
        specialty: link.specialty ?? "",
        matchConfidence,
        matchEvidence: link.matchEvidence ?? "",
        ambiguityReason: link.ambiguityReason ?? "",
        sourceUrl: link.sourceUrl ?? "",
        extractedFromUrl: link.extractedFromUrl ?? "",
        sourceUrlMatch: matchConfidence === "sourceUrlMatch",
        reviewNeeded: linkIssues.length > 0,
        needsManualReview: linkIssues.length > 0,
      };
      departmentLinkRows.push(linkRow);
      if (linkIssues.length > 0) {
        reviewNeededRows.push({
          issueType: linkIssues.join("; "),
          hospitalSlug: roster.hospitalSlug,
          hospitalName: linkRow.hospitalName,
          fullName,
          profileUrl: doctor?.profileUrl ?? "",
          departmentName: linkRow.departmentName || linkRow.matchedMasterDepartmentName,
          specialty: linkRow.specialty || linkRow.matchedMasterSpecialty,
          matchConfidence,
          ambiguityReason: linkRow.ambiguityReason,
          sourceUrl: linkRow.sourceUrl,
          extractedFromUrl: linkRow.extractedFromUrl,
          suggestedAction: linkRow.ambiguityReason ? "Resolve ambiguous Master_Dept mapping." : "Confirm doctor-department mapping.",
        });
      }
    }
  }

  const adapterRows = (adapterBacklog.entries ?? []).map((entry) => ({
    hospitalSlug: entry.hospitalSlug ?? "",
    hospitalName: entry.hospitalName ?? "",
    institutionType: entry.institutionType ?? "",
    blockerType: entry.blockerType ?? "",
    priority: entry.priority ?? "",
    rowsAffected: entry.masterDeptRows ?? "",
    urlsAttempted: entry.urlsAttempted ?? "",
    sourceUrlSituation: entry.sourceUrlSituation ?? "",
    likelyParserFamily: entry.likelyParserFamilyNeeded ?? "",
    recommendedNextStep: entry.recommendedNextStep ?? "",
  }));

  const blockedRows = [
    ...(baseline.highPriorityBlockers ?? []).map((entry) => ({
      hospitalSlug: entry.hospitalSlug ?? "",
      hospitalName: entry.hospitalName ?? "",
      institutionType: entry.institutionType ?? "",
      status: "blocked/backlog",
      blockerType: entry.blockerType ?? "",
      reason: entry.recommendedNextStep ?? "",
      rowsAffected: entry.masterDeptRows ?? "",
      nextStep: entry.recommendedNextStep ?? "",
    })),
    ...(baseline.deferredHardCases ?? []).map((entry) => ({
      hospitalSlug: entry.hospitalSlug ?? "",
      hospitalName: entry.hospitalName ?? entry.hospitalSlug ?? "",
      institutionType: "",
      status: "deferred",
      blockerType: "deferred",
      reason: entry.reason ?? "",
      rowsAffected: "",
      nextStep: entry.reason ?? "",
    })),
  ];

  if (validationRows.length === 0) {
    validationRows.push({ severity: "info", hospitalSlug: "", filePath: "", issue: "ok", details: "No validation warnings." });
  }

  const sheets: Array<{ name: string; columns: SheetColumn[]; rows: JsonRecord[] }> = [
    { name: "README", columns: [{ header: "topic", key: "topic", width: 28 }, { header: "value", key: "value", width: 100 }], rows: readmeRows },
    { name: "National Summary", columns: [{ header: "metric", key: "metric", width: 34 }, { header: "value", key: "value", width: 28 }, { header: "notes", key: "notes", width: 80 }], rows: nationalSummaryRows },
    {
      name: "Site Ready Rosters",
      columns: [
        { header: "hospitalSlug", key: "hospitalSlug", width: 30 },
        { header: "hospitalName", key: "hospitalName", width: 36 },
        { header: "institutionType", key: "institutionType", width: 22 },
        { header: "outputUsability", key: "outputUsability", width: 26 },
        { header: "crawlReadiness", key: "crawlReadiness", width: 22 },
        { header: "mappingReadiness", key: "mappingReadiness", width: 24 },
        { header: "canonicalDoctorsCount", key: "canonicalDoctorsCount", width: 22 },
        { header: "doctorDepartmentLinksCount", key: "doctorDepartmentLinksCount", width: 28 },
        { header: "sourceUrlMatchCount", key: "sourceUrlMatchCount", width: 22 },
        { header: "reviewNeededCount", key: "reviewNeededCount", width: 22 },
        { header: "profileCoverageLow", key: "profileCoverageLow", width: 20 },
        { header: "mappingReviewNeeded", key: "mappingReviewNeeded", width: 22 },
        { header: "listOnlyMostly", key: "listOnlyMostly", width: 18 },
        { header: "sourceUrlMapped", key: "sourceUrlMapped", width: 18 },
        { header: "canonicalDoctorsPath", key: "canonicalDoctorsPath", width: 52 },
        { header: "doctorDepartmentLinksPath", key: "doctorDepartmentLinksPath", width: 52 },
        { header: "notes", key: "notes", width: 40 },
      ],
      rows: siteReadyRows,
    },
    {
      name: "Canonical Doctors",
      columns: [
        { header: "hospitalSlug", key: "hospitalSlug", width: 28 },
        { header: "hospitalName", key: "hospitalName", width: 36 },
        { header: "institutionType", key: "institutionType", width: 22 },
        { header: "outputUsability", key: "outputUsability", width: 24 },
        { header: "canonicalDoctorId", key: "canonicalDoctorId", width: 28 },
        { header: "fullName", key: "fullName", width: 28 },
        { header: "normalizedName", key: "normalizedName", width: 28 },
        { header: "profileUrl", key: "profileUrl", width: 62, isUrl: true },
        { header: "roleOrTitle", key: "roleOrTitle", width: 32 },
        { header: "profileCompleteness", key: "profileCompleteness", width: 22 },
        { header: "sourceUrlsCount", key: "sourceUrlsCount", width: 18 },
        { header: "evidenceCount", key: "evidenceCount", width: 16 },
        { header: "cautionFlags", key: "cautionFlags", width: 34 },
        { header: "needsManualReview", key: "needsManualReview", width: 20 },
        { header: "sourceFile", key: "sourceFile", width: 58 },
      ],
      rows: canonicalRows,
    },
    {
      name: "Department Links",
      columns: [
        { header: "hospitalSlug", key: "hospitalSlug", width: 28 },
        { header: "hospitalName", key: "hospitalName", width: 36 },
        { header: "canonicalDoctorId", key: "canonicalDoctorId", width: 28 },
        { header: "fullName", key: "fullName", width: 28 },
        { header: "masterDeptRowId", key: "masterDeptRowId", width: 46 },
        { header: "matchedMasterDepartmentName", key: "matchedMasterDepartmentName", width: 36 },
        { header: "matchedMasterSpecialty", key: "matchedMasterSpecialty", width: 36 },
        { header: "departmentName", key: "departmentName", width: 32 },
        { header: "specialty", key: "specialty", width: 28 },
        { header: "matchConfidence", key: "matchConfidence", width: 22 },
        { header: "matchEvidence", key: "matchEvidence", width: 70 },
        { header: "ambiguityReason", key: "ambiguityReason", width: 34 },
        { header: "sourceUrl", key: "sourceUrl", width: 62, isUrl: true },
        { header: "extractedFromUrl", key: "extractedFromUrl", width: 62, isUrl: true },
        { header: "sourceUrlMatch", key: "sourceUrlMatch", width: 18 },
        { header: "reviewNeeded", key: "reviewNeeded", width: 18 },
        { header: "needsManualReview", key: "needsManualReview", width: 20 },
      ],
      rows: departmentLinkRows,
    },
    {
      name: "Review Needed",
      columns: [
        { header: "issueType", key: "issueType", width: 36 },
        { header: "hospitalSlug", key: "hospitalSlug", width: 28 },
        { header: "hospitalName", key: "hospitalName", width: 36 },
        { header: "fullName", key: "fullName", width: 28 },
        { header: "profileUrl", key: "profileUrl", width: 62, isUrl: true },
        { header: "departmentName", key: "departmentName", width: 34 },
        { header: "specialty", key: "specialty", width: 30 },
        { header: "matchConfidence", key: "matchConfidence", width: 22 },
        { header: "ambiguityReason", key: "ambiguityReason", width: 34 },
        { header: "sourceUrl", key: "sourceUrl", width: 62, isUrl: true },
        { header: "extractedFromUrl", key: "extractedFromUrl", width: 62, isUrl: true },
        { header: "suggestedAction", key: "suggestedAction", width: 58 },
      ],
      rows: reviewNeededRows,
    },
    {
      name: "Adapter Backlog",
      columns: [
        { header: "hospitalSlug", key: "hospitalSlug", width: 30 },
        { header: "hospitalName", key: "hospitalName", width: 36 },
        { header: "institutionType", key: "institutionType", width: 22 },
        { header: "blockerType", key: "blockerType", width: 24 },
        { header: "priority", key: "priority", width: 14 },
        { header: "rowsAffected", key: "rowsAffected", width: 16 },
        { header: "urlsAttempted", key: "urlsAttempted", width: 52 },
        { header: "sourceUrlSituation", key: "sourceUrlSituation", width: 24 },
        { header: "likelyParserFamily", key: "likelyParserFamily", width: 24 },
        { header: "recommendedNextStep", key: "recommendedNextStep", width: 76 },
      ],
      rows: adapterRows,
    },
    {
      name: "Blocked Deferred",
      columns: [
        { header: "hospitalSlug", key: "hospitalSlug", width: 30 },
        { header: "hospitalName", key: "hospitalName", width: 36 },
        { header: "institutionType", key: "institutionType", width: 22 },
        { header: "status", key: "status", width: 20 },
        { header: "blockerType", key: "blockerType", width: 24 },
        { header: "reason", key: "reason", width: 70 },
        { header: "rowsAffected", key: "rowsAffected", width: 16 },
        { header: "nextStep", key: "nextStep", width: 70 },
      ],
      rows: blockedRows,
    },
    {
      name: "Validation",
      columns: [
        { header: "severity", key: "severity", width: 14 },
        { header: "hospitalSlug", key: "hospitalSlug", width: 30 },
        { header: "filePath", key: "filePath", width: 62 },
        { header: "issue", key: "issue", width: 34 },
        { header: "details", key: "details", width: 76 },
      ],
      rows: validationRows,
    },
  ];

  for (const sheet of sheets) {
    addWorksheet(workbook, sheet.name, sheet.columns, sheet.rows);
    await writeCsv(sheet.name, sheet.columns, sheet.rows);
  }

  await workbook.xlsx.writeFile(XLSX_PATH);

  const readBack = new ExcelJS.Workbook();
  await readBack.xlsx.readFile(XLSX_PATH);
  const requiredSheets = sheets.map((sheet) => sheet.name);
  const missingSheets = requiredSheets.filter((sheetName) => !readBack.getWorksheet(sheetName));
  if (missingSheets.length) {
    throw new Error(`Workbook verification failed; missing sheets: ${missingSheets.join(", ")}`);
  }

  const validationErrors = validationRows.filter((row) => row.severity === "error").length;
  const validationWarnings = validationRows.filter((row) => row.severity === "warning").length;
  console.log(JSON.stringify({
    excelPath: relativePath(XLSX_PATH),
    csvDir: relativePath(CSV_DIR),
    hospitalsExported: siteReady.rosters.length,
    canonicalDoctorsExported: canonicalRows.length,
    departmentLinksExported: departmentLinkRows.length,
    reviewNeededRowsExported: reviewNeededRows.length,
    validationWarnings,
    validationErrors,
    sheets: requiredSheets,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
