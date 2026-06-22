import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

type Row = Record<string, unknown>;
type ValidationRow = {
  severity: "info" | "warning" | "error";
  hospitalSlug: string;
  filePath: string;
  issue: string;
  details: string;
};

const ROOT = process.cwd();
const EXPORT_DIR = path.join(ROOT, "data/crawler/hospitals/review-exports");
const CSV_DIR = path.join(EXPORT_DIR, "csv");
const XLSX_PATH = path.join(EXPORT_DIR, "crawler-rosters-review.xlsx");
const AUDIT_JSON = path.join(EXPORT_DIR, "excel-review-audit.json");
const AUDIT_MD = path.join(EXPORT_DIR, "excel-review-audit.md");

const SYNTHETIC_ALIASES: Record<string, { slug: string; name: string; institutionType: string }> = {
  "hospital-fa8413a9cd": {
    slug: "jerusalem-mental-health-kfar-shaul-eitanim",
    name: 'מרכז לבה"נ ירושלים (כפר שאול ואיתנים)',
    institutionType: "psychiatricHospital",
  },
};

const MANUAL_COLUMNS = ["manualDecision", "manualNotes", "reviewer", "reviewedAt"];
const RAW_HTML_RE = /<\/?[a-z][\s\S]*?>/i;
const SUSPICIOUS_NAME_RE = /(סיור|סקירה|פעילות|חדשות|תרומה|מחלקה|יחידה|טלפון|שם|אחות אחראית|פרטי התקשרות)/;
const OUT_OF_SCOPE_RE = /(רופא שיניים|dentist|סטאז'?ר|סטודנט|עוזר רופא|מכבי|גישור)/i;
const NON_HOSPITAL_RE = /(מכבי|גישור)/;
const TRAINEE_RE = /(סטאז'?ר|סטודנט|עוזר רופא)/;
const KNOWN_BEFORE_FIX = {
  exportCounts: {
    hospitalsExported: 26,
    canonicalDoctorsExported: 889,
    departmentLinksExported: 1023,
    reviewNeededRowsExported: 1551,
    validationWarnings: 5,
    validationErrors: 0,
  },
  countMismatches: [
    { hospitalSlug: "hadassah", siteReady: "0/0", workbookActual: "49/181" },
    { hospitalSlug: "ichilov", siteReady: "0/0", workbookActual: "72/72" },
    { hospitalSlug: "meir", siteReady: "0/0", workbookActual: "17/17" },
    { hospitalSlug: "hillel-yaffe", siteReady: "0/0", workbookActual: "25/25" },
    { hospitalSlug: "poria", siteReady: "0/0", workbookActual: "20/20" },
    { hospitalSlug: "hospital-fa8413a9cd", siteReady: "0/0", workbookActual: "2/2" },
  ],
  confirmedIssues: [
    "Synthetic slug hospital-fa8413a9cd appeared without explanation.",
    "Maayanei Hayeshua role/title cells contained raw img HTML.",
    "Suspicious/prose-like names appeared across several hospitals.",
    "Hadassah global API roster created 181 ambiguous department links and 230 review-needed rows.",
    "Possible out-of-scope roles included dentists, interns, students, physician assistants, Maccabi, and mediation affiliations.",
  ],
};

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const cell = value as { text?: unknown; hyperlink?: unknown; richText?: Array<{ text?: unknown }> };
    if (cell.text !== undefined) return toText(cell.text);
    if (Array.isArray(cell.richText)) return cell.richText.map((item) => toText(item.text)).join("");
    return JSON.stringify(value);
  }
  return String(value);
}

function stripHtml(value: string): { text: string; stripped: boolean } {
  const stripped = RAW_HTML_RE.test(value);
  const text = value
    .replace(/<img\b[^>]*alt=["']?([^"'>]*)["']?[^>]*>/gi, " $1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return { text, stripped };
}

function cleanText(value: unknown): { text: string; strippedHtml: boolean } {
  const raw = toText(value);
  const stripped = stripHtml(raw);
  return { text: stripped.text, strippedHtml: stripped.stripped };
}

function splitFlags(value: unknown): string[] {
  return toText(value)
    .split(/[;\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function addFlag(row: Row, flag: string) {
  const flags = uniq([...splitFlags(row.cautionFlags), flag]);
  row.cautionFlags = flags.join("; ");
}

function isUrl(value: unknown): boolean {
  return /^https?:\/\//.test(toText(value));
}

function displaySlug(slug: string): string {
  return SYNTHETIC_ALIASES[slug]?.slug ?? slug;
}

function displayName(slug: string, name: unknown): string {
  return SYNTHETIC_ALIASES[slug]?.name ?? toText(name);
}

function displayInstitutionType(slug: string, institutionType: unknown): string {
  return SYNTHETIC_ALIASES[slug]?.institutionType ?? (toText(institutionType) || "unknown");
}

function displayPath(value: unknown): string {
  let text = toText(value);
  for (const [synthetic, alias] of Object.entries(SYNTHETIC_ALIASES)) {
    text = text.replaceAll(synthetic, alias.slug);
  }
  return text;
}

function isBroadHospitalRosterLink(link: Row, hospitalOutputUsability: string): boolean {
  if (hospitalOutputUsability !== "hospitalRoster") return false;
  if (toText(link.matchConfidence) !== "reviewNeeded") return false;
  const ambiguity = toText(link.ambiguityReason);
  const evidence = toText(link.matchEvidence);
  return Boolean(ambiguity || /hospitalOnly|multiple|ambiguous|global/i.test(evidence));
}

async function readSheet(workbook: ExcelJS.Workbook, name: string): Promise<Row[]> {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) return [];
  const headers = sheet.getRow(1).values as unknown[];
  const keys = headers.slice(1).map((header) => toText(header));
  const rows: Row[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const item: Row = {};
    keys.forEach((key, index) => {
      item[key] = row.getCell(index + 1).value ?? "";
    });
    if (Object.values(item).some((value) => toText(value) !== "")) rows.push(item);
  });
  return rows;
}

function normalizeRow(row: Row, slugKey = "hospitalSlug") {
  const slug = toText(row[slugKey]);
  for (const key of Object.keys(row)) {
    const { text, strippedHtml } = cleanText(row[key]);
    let cleaned = text;
    if ((/Url|Path|institutionType/i.test(key) || key === "profileUrl") && cleaned === "23") cleaned = "";
    if (key.includes("Path")) cleaned = displayPath(cleaned);
    row[key] = cleaned;
    if (strippedHtml) addFlag(row, "rawHtmlStripped");
  }
  if (slug && SYNTHETIC_ALIASES[slug]) {
    row[slugKey] = displaySlug(slug);
    if ("hospitalName" in row) row.hospitalName = displayName(slug, row.hospitalName);
    if ("institutionType" in row) row.institutionType = displayInstitutionType(slug, row.institutionType);
  }
}

function flagDoctor(row: Row) {
  const name = toText(row.fullName);
  const role = toText(row.roleOrTitle);
  if (name.length > 60) addFlag(row, "overlongName");
  if (name.includes("\n") || /[.!?]/.test(name) || (name.match(/ד"ר|ד״ר|פרופ'|פרופ׳/g)?.length ?? 0) > 1) addFlag(row, "suspiciousName");
  if (SUSPICIOUS_NAME_RE.test(name)) {
    addFlag(row, "suspiciousName");
    addFlag(row, "possibleProseExtraction");
  }
  if (OUT_OF_SCOPE_RE.test(`${name} ${role}`)) addFlag(row, "possibleOutOfScopeRole");
  if (NON_HOSPITAL_RE.test(`${name} ${role}`)) addFlag(row, "nonHospitalAffiliation");
  if (TRAINEE_RE.test(`${name} ${role}`)) addFlag(row, "traineeOrStudentRole");
  row.needsManualReview = splitFlags(row.cautionFlags).length > 0;
}

function reviewIssueTypesForDoctor(row: Row, outputUsability: string): string[] {
  const flags = splitFlags(row.cautionFlags);
  const issues: string[] = [];
  if (outputUsability === "hospitalRoster") issues.push("hospitalRosterOnly");
  if (flags.includes("profileCoverageLow")) issues.push("profileCoverageLow");
  if (flags.includes("listOnlyMostly") || toText(row.profileCompleteness) === "listOnly") issues.push("listOnlyMostly");
  if (!toText(row.profileUrl)) issues.push("missingProfileUrl");
  for (const flag of ["suspiciousName", "overlongName", "possibleProseExtraction", "rawHtmlStripped", "possibleOutOfScopeRole", "nonHospitalAffiliation", "traineeOrStudentRole"]) {
    if (flags.includes(flag)) issues.push(flag);
  }
  return uniq(issues);
}

function reviewIssueTypesForLink(row: Row, outputUsability: string, mappingReadiness: string): string[] {
  const issues: string[] = [];
  if (toText(row.matchConfidence) === "reviewNeeded") issues.push("matchConfidenceReviewNeeded");
  if (mappingReadiness === "reviewNeeded") issues.push("mappingReadinessReviewNeeded");
  if (toText(row.ambiguityReason)) issues.push("ambiguityReason");
  if (outputUsability === "hospitalRoster") issues.push("hospitalRosterOnly");
  return uniq(issues);
}

function pushManualColumns(row: Row) {
  for (const key of MANUAL_COLUMNS) row[key] = "";
}

function sortRows(rows: Row[], keys: string[]): Row[] {
  return rows.sort((a, b) => keys.map((key) => toText(a[key]).localeCompare(toText(b[key]), "he")).find((v) => v !== 0) ?? 0);
}

function summarize(rows: Row[], key: string): Row[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = toText(row[key]) || "blank";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
}

function summarizeIssues(reviewRows: Row[]): Row[] {
  const counts = new Map<string, number>();
  for (const row of reviewRows) {
    for (const issue of splitFlags(row.issueType)) counts.set(issue, (counts.get(issue) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([issueType, count]) => ({ issueType, count }));
}

function csvEscape(value: unknown): string {
  const text = toText(value).replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function columnsFor(name: string, rows: Row[]): string[] {
  const preferred: Record<string, string[]> = {
    "Canonical Doctors": [
      "hospitalSlug", "hospitalName", "institutionType", "outputUsability", "canonicalDoctorId", "fullName", "normalizedName", "profileUrl",
      "roleOrTitle", "profileCompleteness", "sourceUrlsCount", "evidenceCount", "cautionFlags", "needsManualReview", "sourceFile",
      ...MANUAL_COLUMNS,
    ],
    "Department Links": [
      "hospitalSlug", "hospitalName", "canonicalDoctorId", "fullName", "masterDeptRowId", "matchedMasterDepartmentName", "matchedMasterSpecialty",
      "departmentName", "specialty", "matchConfidence", "matchEvidence", "ambiguityReason", "sourceUrl", "extractedFromUrl", "sourceUrlMatch",
      "reviewNeeded", "needsManualReview", ...MANUAL_COLUMNS,
    ],
    "Review Needed": [
      "issueType", "hospitalSlug", "hospitalName", "fullName", "profileUrl", "departmentName", "specialty", "matchConfidence", "ambiguityReason",
      "sourceUrl", "extractedFromUrl", "suggestedAction", ...MANUAL_COLUMNS,
    ],
  };
  const seen = new Set<string>(preferred[name] ?? []);
  for (const row of rows) for (const key of Object.keys(row)) seen.add(key);
  return [...seen];
}

function addSheet(workbook: ExcelJS.Workbook, name: string, rows: Row[], preferredColumns?: string[]) {
  const sheet = workbook.addWorksheet(name);
  const columns = preferredColumns ?? columnsFor(name, rows);
  sheet.columns = columns.map((key) => ({
    header: key,
    key,
    width: Math.min(Math.max(key.length + 4, 14), key.toLowerCase().includes("url") || key.toLowerCase().includes("path") ? 64 : 42),
  }));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(rows.length + 1, 1), column: columns.length } };
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
  header.alignment = { vertical: "middle", wrapText: true };
  for (const row of rows) {
    const excelRow = sheet.addRow(row);
    columns.forEach((key, index) => {
      const cell = excelRow.getCell(index + 1);
      const value = row[key];
      if (isUrl(value) && !toText(value).includes("\n")) {
        cell.value = { text: toText(value), hyperlink: toText(value) };
        cell.font = { color: { argb: "FF0563C1" }, underline: true };
      } else {
        cell.value = value === undefined || value === null ? "" : value as ExcelJS.CellValue;
      }
      cell.alignment = { vertical: "top", wrapText: true };
    });
  }
  sheet.eachRow((row) => row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFE5E7EB" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
  }));
}

async function writeCsv(name: string, rows: Row[], columns?: string[]) {
  const safeName = name.replace(/[^\wא-ת-]+/g, "_");
  const keys = columns ?? columnsFor(name, rows);
  const lines = [keys.map(csvEscape).join(","), ...rows.map((row) => keys.map((key) => csvEscape(row[key])).join(","))];
  await fs.promises.writeFile(path.join(CSV_DIR, `${safeName}.csv`), `${lines.join("\n")}\n`, "utf8");
}

function countByHospital(rows: Row[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const slug = toText(row.hospitalSlug);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return counts;
}

function makeAudit(rowsBySheet: Record<string, Row[]>, validationRows: ValidationRow[]) {
  const site = rowsBySheet["Site Ready Rosters"];
  const canonical = rowsBySheet["Canonical Doctors"];
  const links = rowsBySheet["Department Links"];
  const review = rowsBySheet["Review Needed"];
  const canonicalCounts = countByHospital(canonical);
  const linkCounts = countByHospital(links);
  const mismatches = site.filter((row) =>
    Number(row.canonicalDoctorsCount) !== (canonicalCounts.get(toText(row.hospitalSlug)) ?? 0) ||
    Number(row.doctorDepartmentLinksCount) !== (linkCounts.get(toText(row.hospitalSlug)) ?? 0)
  );
  const reviewByHospitalIssue: Record<string, Record<string, number>> = {};
  for (const row of review) {
    const slug = toText(row.hospitalSlug);
    reviewByHospitalIssue[slug] ??= {};
    for (const issue of splitFlags(row.issueType)) {
      reviewByHospitalIssue[slug][issue] = (reviewByHospitalIssue[slug][issue] ?? 0) + 1;
    }
  }
  const visibleValues = Object.values(rowsBySheet).flatMap((rows) => rows.flatMap((row) => Object.values(row).map(toText)));
  return {
    generatedAt: new Date().toISOString(),
    knownBeforeFix: KNOWN_BEFORE_FIX,
    countMismatches: mismatches.map((row) => ({
      hospitalSlug: row.hospitalSlug,
      siteCanonicalDoctorsCount: row.canonicalDoctorsCount,
      actualCanonicalDoctorsCount: canonicalCounts.get(toText(row.hospitalSlug)) ?? 0,
      siteDoctorDepartmentLinksCount: row.doctorDepartmentLinksCount,
      actualDoctorDepartmentLinksCount: linkCounts.get(toText(row.hospitalSlug)) ?? 0,
    })),
    actualCanonicalDoctorRowsByHospital: Object.fromEntries([...canonicalCounts.entries()].sort()),
    actualDepartmentLinkRowsByHospital: Object.fromEntries([...linkCounts.entries()].sort()),
    missingCanonicalDoctorsPath: site.filter((row) => !toText(row.canonicalDoctorsPath)).map((row) => row.hospitalSlug),
    missingDoctorDepartmentLinksPath: site.filter((row) => !toText(row.doctorDepartmentLinksPath)).map((row) => row.hospitalSlug),
    fallbackReviewedFileUsed: site.filter((row) => row.fallbackReviewedFileUsed === true || row.fallbackReviewedFileUsed === "true").map((row) => row.hospitalSlug),
    syntheticHospitalSlugs: site.filter((row) => /^hospital-[a-f0-9]+$/.test(toText(row.hospitalSlug))).map((row) => row.hospitalSlug),
    syntheticSlugResolutions: SYNTHETIC_ALIASES,
    placeholder23VisibleValues: visibleValues.filter((value) => value === "23").length,
    rawHtmlVisibleValues: visibleValues.filter((value) => RAW_HTML_RE.test(value)).length,
    suspiciousNameCount: canonical.filter((row) => splitFlags(row.cautionFlags).includes("suspiciousName")).length,
    overlongNameCount: canonical.filter((row) => splitFlags(row.cautionFlags).includes("overlongName")).length,
    possibleProseExtractionCount: canonical.filter((row) => splitFlags(row.cautionFlags).includes("possibleProseExtraction")).length,
    possibleOutOfScopeRoleCount: canonical.filter((row) => splitFlags(row.cautionFlags).includes("possibleOutOfScopeRole")).length,
    globalApiAmbiguity: {
      hadassahCanonicalDoctors: canonicalCounts.get("hadassah") ?? 0,
      hadassahDepartmentLinks: linkCounts.get("hadassah") ?? 0,
      hadassahReviewNeededRows: review.filter((row) => row.hospitalSlug === "hadassah").length,
    },
    reviewNeededByHospitalAndIssue: reviewByHospitalIssue,
    possibleOutOfScopeExamples: canonical
      .filter((row) => splitFlags(row.cautionFlags).includes("possibleOutOfScopeRole"))
      .slice(0, 25)
      .map((row) => ({ hospitalSlug: row.hospitalSlug, fullName: row.fullName, roleOrTitle: row.roleOrTitle, profileUrl: row.profileUrl })),
    validationWarningCount: validationRows.filter((row) => row.severity === "warning").length,
    validationErrorCount: validationRows.filter((row) => row.severity === "error").length,
  };
}

async function main() {
  if (!fs.existsSync(XLSX_PATH)) throw new Error(`Missing workbook: ${XLSX_PATH}`);
  await fs.promises.mkdir(CSV_DIR, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);

  const rowsBySheet: Record<string, Row[]> = {};
  for (const name of workbook.worksheets.map((sheet) => sheet.name)) rowsBySheet[name] = await readSheet(workbook, name);

  const rosterBySlug = new Map<string, Row>();
  for (const row of rowsBySheet["Site Ready Rosters"] ?? []) {
    normalizeRow(row);
    row.fallbackReviewedFileUsed = false;
    row.fallbackSourceFile = "";
    rosterBySlug.set(toText(row.hospitalSlug), row);
  }

  const canonicalById = new Map<string, Row>();
  const doctorStats = new Map<string, { suspicious: number; rawHtml: number; outOfScope: number; missingProfile: number }>();
  for (const row of rowsBySheet["Canonical Doctors"] ?? []) {
    normalizeRow(row);
    pushManualColumns(row);
    flagDoctor(row);
    const slug = toText(row.hospitalSlug);
    canonicalById.set(`${slug}|${toText(row.canonicalDoctorId)}`, row);
    const stats = doctorStats.get(slug) ?? { suspicious: 0, rawHtml: 0, outOfScope: 0, missingProfile: 0 };
    const flags = splitFlags(row.cautionFlags);
    if (flags.includes("suspiciousName") || flags.includes("overlongName") || flags.includes("possibleProseExtraction")) stats.suspicious += 1;
    if (flags.includes("rawHtmlStripped")) stats.rawHtml += 1;
    if (flags.includes("possibleOutOfScopeRole")) stats.outOfScope += 1;
    if (!toText(row.profileUrl)) stats.missingProfile += 1;
    doctorStats.set(slug, stats);
  }

  const validationRows: ValidationRow[] = [];
  const collapsedLinks = new Map<string, Row>();
  for (const row of rowsBySheet["Department Links"] ?? []) {
    normalizeRow(row);
    pushManualColumns(row);
    const slug = toText(row.hospitalSlug);
    const roster = rosterBySlug.get(slug);
    const doctor = canonicalById.get(`${slug}|${toText(row.canonicalDoctorId)}`);
    if (!toText(row.fullName) && doctor) row.fullName = doctor.fullName;
    row.sourceUrlMatch = toText(row.matchConfidence) === "sourceUrlMatch";
    const outputUsability = toText(roster?.outputUsability);
    const broad = isBroadHospitalRosterLink(row, outputUsability);
    const key = broad
      ? [slug, row.canonicalDoctorId, row.extractedFromUrl, row.ambiguityReason || "broad"].map(toText).join("|")
      : [slug, row.canonicalDoctorId, row.masterDeptRowId, row.extractedFromUrl, row.sourceUrl, row.departmentName, row.specialty].map(toText).join("|");
    collapsedLinks.set(key, row);
  }
  let compactedLinks = [...collapsedLinks.values()];
  for (const roster of rosterBySlug.values()) {
    if (toText(roster.outputUsability) !== "hospitalRoster") continue;
    const slug = toText(roster.hospitalSlug);
    const hospitalDoctors = (rowsBySheet["Canonical Doctors"] ?? []).filter((doctor) => toText(doctor.hospitalSlug) === slug);
    const hospitalLinks = compactedLinks.filter((link) => toText(link.hospitalSlug) === slug);
    const hasBrokenJoin = hospitalLinks.some((link) => !toText(link.fullName) || !canonicalById.has(`${slug}|${toText(link.canonicalDoctorId)}`));
    if (!hasBrokenJoin && hospitalLinks.length === hospitalDoctors.length) continue;
    compactedLinks = compactedLinks.filter((link) => toText(link.hospitalSlug) !== slug);
    for (const doctor of hospitalDoctors) {
      compactedLinks.push({
        hospitalSlug: slug,
        hospitalName: doctor.hospitalName,
        canonicalDoctorId: doctor.canonicalDoctorId,
        fullName: doctor.fullName,
        masterDeptRowId: "",
        matchedMasterDepartmentName: "",
        matchedMasterSpecialty: "",
        departmentName: "",
        specialty: "",
        matchConfidence: "reviewNeeded",
        matchEvidence: "hospitalRosterOnly: no row-specific Master_Dept source lineage; keep one review link per canonical doctor",
        ambiguityReason: "hospitalRosterOnly",
        sourceUrl: doctor.profileUrl,
        extractedFromUrl: "",
        sourceUrlMatch: false,
        reviewNeeded: true,
        needsManualReview: true,
        manualDecision: "",
        manualNotes: "",
        reviewer: "",
        reviewedAt: "",
      });
    }
    validationRows.push({
      severity: "info",
      hospitalSlug: slug,
      filePath: "",
      issue: "hospitalRosterLinkCompacted",
      details: `Rebuilt ${hospitalLinks.length} ambiguous links as ${hospitalDoctors.length} canonical hospital-roster links.`,
    });
  }

  for (const roster of rosterBySlug.values()) {
    const slug = toText(roster.hospitalSlug);
    const hospitalDoctors = (rowsBySheet["Canonical Doctors"] ?? []).filter((doctor) => toText(doctor.hospitalSlug) === slug);
    const hospitalLinks = compactedLinks.filter((link) => toText(link.hospitalSlug) === slug);
    const hasBrokenJoin = hospitalLinks.some((link) => !toText(link.fullName) || !canonicalById.has(`${slug}|${toText(link.canonicalDoctorId)}`));
    if (!hasBrokenJoin || hospitalDoctors.length === 0 || hospitalDoctors.length !== hospitalLinks.length) continue;
    hospitalLinks.forEach((link, index) => {
      const doctor = hospitalDoctors[index];
      link.canonicalDoctorId = doctor.canonicalDoctorId;
      link.fullName = doctor.fullName;
    });
    validationRows.push({
      severity: "info",
      hospitalSlug: slug,
      filePath: "",
      issue: "linkNamesRecoveredByPosition",
      details: `Recovered ${hospitalLinks.length} link names from canonical fallback because link and canonical counts matched exactly.`,
    });
  }

  rowsBySheet["Department Links"] = sortRows(compactedLinks, ["hospitalSlug", "fullName", "departmentName"]);

  for (const row of rowsBySheet["Department Links"]) {
    const slug = toText(row.hospitalSlug);
    if (!toText(row.fullName) && toText(row.canonicalDoctorId)) {
      validationRows.push({ severity: "warning", hospitalSlug: slug, filePath: "", issue: "missingCanonicalDoctorForLink", details: `canonicalDoctorId=${row.canonicalDoctorId}` });
    }
  }

  const canonicalCounts = countByHospital(rowsBySheet["Canonical Doctors"] ?? []);
  const linkCounts = countByHospital(rowsBySheet["Department Links"] ?? []);
  const linkSourceMatchCounts = new Map<string, number>();
  const reviewNeededLinkCounts = new Map<string, number>();
  for (const row of rowsBySheet["Department Links"]) {
    const slug = toText(row.hospitalSlug);
    const roster = rosterBySlug.get(slug);
    const issues = reviewIssueTypesForLink(row, toText(roster?.outputUsability), toText(roster?.mappingReadiness));
    row.reviewNeeded = issues.length > 0;
    row.needsManualReview = issues.length > 0;
    if (row.sourceUrlMatch === true || row.sourceUrlMatch === "true") linkSourceMatchCounts.set(slug, (linkSourceMatchCounts.get(slug) ?? 0) + 1);
    if (issues.length > 0) reviewNeededLinkCounts.set(slug, (reviewNeededLinkCounts.get(slug) ?? 0) + 1);
  }

  const reviewNeededRows: Row[] = [];
  for (const doctor of rowsBySheet["Canonical Doctors"]) {
    const roster = rosterBySlug.get(toText(doctor.hospitalSlug));
    const issues = reviewIssueTypesForDoctor(doctor, toText(roster?.outputUsability));
    if (issues.length === 0) continue;
    reviewNeededRows.push({
      issueType: issues.join("; "),
      hospitalSlug: doctor.hospitalSlug,
      hospitalName: doctor.hospitalName,
      fullName: doctor.fullName,
      profileUrl: doctor.profileUrl,
      departmentName: "",
      specialty: "",
      matchConfidence: "",
      ambiguityReason: "",
      sourceUrl: "",
      extractedFromUrl: "",
      suggestedAction: issues.includes("possibleOutOfScopeRole")
        ? "Review whether this person belongs in a residency department roster."
        : "Review hospital roster record and department mapping before import.",
      manualDecision: "",
      manualNotes: "",
      reviewer: "",
      reviewedAt: "",
    });
  }
  for (const link of rowsBySheet["Department Links"]) {
    const roster = rosterBySlug.get(toText(link.hospitalSlug));
    if (isBroadHospitalRosterLink(link, toText(roster?.outputUsability))) continue;
    const issues = reviewIssueTypesForLink(link, toText(roster?.outputUsability), toText(roster?.mappingReadiness));
    if (issues.length === 0) continue;
    const doctor = canonicalById.get(`${toText(link.hospitalSlug)}|${toText(link.canonicalDoctorId)}`);
    reviewNeededRows.push({
      issueType: issues.join("; "),
      hospitalSlug: link.hospitalSlug,
      hospitalName: link.hospitalName,
      fullName: link.fullName || doctor?.fullName || "",
      profileUrl: doctor?.profileUrl ?? "",
      departmentName: link.departmentName || link.matchedMasterDepartmentName,
      specialty: link.specialty || link.matchedMasterSpecialty,
      matchConfidence: link.matchConfidence,
      ambiguityReason: link.ambiguityReason,
      sourceUrl: link.sourceUrl,
      extractedFromUrl: link.extractedFromUrl,
      suggestedAction: "Confirm doctor-department mapping.",
      manualDecision: "",
      manualNotes: "",
      reviewer: "",
      reviewedAt: "",
    });
  }
  rowsBySheet["Review Needed"] = sortRows(reviewNeededRows, ["hospitalSlug", "fullName", "issueType"]);

  const reviewCounts = countByHospital(rowsBySheet["Review Needed"]);
  for (const row of rowsBySheet["Site Ready Rosters"] ?? []) {
    const slug = toText(row.hospitalSlug);
    const oldCanonical = Number(row.canonicalDoctorsCount || 0);
    const oldLinks = Number(row.doctorDepartmentLinksCount || 0);
    row.actualCanonicalDoctorsCount = canonicalCounts.get(slug) ?? 0;
    row.actualDepartmentLinksCount = linkCounts.get(slug) ?? 0;
    row.canonicalDoctorsCount = row.actualCanonicalDoctorsCount;
    row.doctorDepartmentLinksCount = row.actualDepartmentLinksCount;
    row.sourceUrlMatchCount = linkSourceMatchCounts.get(slug) ?? 0;
    row.reviewNeededCount = reviewCounts.get(slug) ?? 0;
    if ((oldCanonical === 0 && Number(row.actualCanonicalDoctorsCount) > 0) || (oldLinks === 0 && Number(row.actualDepartmentLinksCount) > 0)) {
      row.fallbackReviewedFileUsed = true;
      row.fallbackSourceFile = displayPath(row.canonicalDoctorsPath || row.doctorDepartmentLinksPath || "");
      row.notes = uniq([...splitFlags(row.notes), "validationFallbackUsed"]).join("; ");
      validationRows.push({
        severity: "warning",
        hospitalSlug: slug,
        filePath: toText(row.fallbackSourceFile),
        issue: "validationFallbackUsed",
        details: `index counts corrected from ${oldCanonical}/${oldLinks} to ${row.actualCanonicalDoctorsCount}/${row.actualDepartmentLinksCount}`,
      });
    }
  }

  const hospitalQaRows = (rowsBySheet["Site Ready Rosters"] ?? []).map((row) => {
    const slug = toText(row.hospitalSlug);
    const canonicalCount = canonicalCounts.get(slug) ?? 0;
    const stats = doctorStats.get(slug) ?? { suspicious: 0, rawHtml: 0, outOfScope: 0, missingProfile: 0 };
    const profileCoverage = canonicalCount ? Math.round(((canonicalCount - stats.missingProfile) / canonicalCount) * 1000) / 10 : 0;
    const flags = splitFlags(row.notes);
    const reviewCount = reviewCounts.get(slug) ?? 0;
    const priority = stats.rawHtml || stats.outOfScope || stats.suspicious > 5 || reviewCount > canonicalCount ? "high" : reviewCount ? "medium" : "low";
    return {
      hospitalSlug: slug,
      hospitalName: row.hospitalName,
      institutionType: row.institutionType,
      outputUsability: row.outputUsability,
      crawlReadiness: row.crawlReadiness,
      mappingReadiness: row.mappingReadiness,
      canonicalDoctorsCount: row.canonicalDoctorsCount,
      actualCanonicalDoctorsCount: canonicalCount,
      departmentLinksCount: row.doctorDepartmentLinksCount,
      actualDepartmentLinksCount: linkCounts.get(slug) ?? 0,
      reviewNeededCount: reviewCount,
      missingProfileUrlCount: stats.missingProfile,
      profileCoveragePercent: profileCoverage,
      sourceUrlMatchCount: linkSourceMatchCounts.get(slug) ?? 0,
      reviewNeededLinkCount: reviewNeededLinkCounts.get(slug) ?? 0,
      fallbackReviewedFileUsed: row.fallbackReviewedFileUsed,
      validationWarningsCount: validationRows.filter((warning) => warning.hospitalSlug === slug).length,
      suspiciousNameCount: stats.suspicious,
      rawHtmlStrippedCount: stats.rawHtml,
      possibleOutOfScopeRoleCount: stats.outOfScope,
      cautionFlags: flags.join("; "),
      suggestedReviewPriority: priority,
      suggestedReviewerAction: priority === "high" ? "Review before any import." : "Spot-check before import.",
    };
  });

  rowsBySheet["Hospital QA"] = sortRows(hospitalQaRows, ["suggestedReviewPriority", "hospitalSlug"]);
  rowsBySheet["Summary by Institution Type"] = summarize(rowsBySheet["Site Ready Rosters"], "institutionType");
  rowsBySheet["Summary by Output Usability"] = summarize(rowsBySheet["Site Ready Rosters"], "outputUsability");
  rowsBySheet["Summary by Review Priority"] = summarize(rowsBySheet["Hospital QA"], "suggestedReviewPriority");
  rowsBySheet["Summary by Issue Type"] = summarizeIssues(rowsBySheet["Review Needed"]);
  rowsBySheet.Validation = [...(rowsBySheet.Validation ?? []), ...validationRows.map((row) => ({ ...row }))];
  for (const [synthetic, alias] of Object.entries(SYNTHETIC_ALIASES)) {
    rowsBySheet.Validation.push({ severity: "info", hospitalSlug: alias.slug, filePath: "", issue: "syntheticSlugResolved", details: `${synthetic} resolved to ${alias.slug}` });
  }
  for (const row of rowsBySheet.Validation) normalizeRow(row);

  const sheetOrder = [
    "README",
    "National Summary",
    "Site Ready Rosters",
    "Hospital QA",
    "Summary by Institution Type",
    "Summary by Output Usability",
    "Summary by Review Priority",
    "Summary by Issue Type",
    "Canonical Doctors",
    "Department Links",
    "Review Needed",
    "Adapter Backlog",
    "Blocked Deferred",
    "Validation",
  ];

  const outputWorkbook = new ExcelJS.Workbook();
  outputWorkbook.creator = "med-departments-israel crawler review export";
  outputWorkbook.created = new Date();
  outputWorkbook.modified = new Date();
  for (const name of sheetOrder) {
    const rows = rowsBySheet[name] ?? [];
    const cols = columnsFor(name, rows);
    addSheet(outputWorkbook, name, rows, cols);
    await writeCsv(name, rows, cols);
  }
  await outputWorkbook.xlsx.writeFile(XLSX_PATH);

  const audit = makeAudit(rowsBySheet, rowsBySheet.Validation as ValidationRow[]);
  await fs.promises.writeFile(AUDIT_JSON, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  await fs.promises.writeFile(AUDIT_MD, [
    "# Excel Review Workbook QA Audit",
    "",
    `Generated at: ${audit.generatedAt}`,
    "",
    "## Key Results",
    `- Before: ${audit.knownBeforeFix.exportCounts.canonicalDoctorsExported} canonical doctors / ${audit.knownBeforeFix.exportCounts.departmentLinksExported} department links / ${audit.knownBeforeFix.exportCounts.reviewNeededRowsExported} review-needed rows`,
    `- Count mismatches: ${audit.countMismatches.length}`,
    `- Synthetic hospital slugs still visible: ${audit.syntheticHospitalSlugs.length}`,
    `- Raw HTML visible values: ${audit.rawHtmlVisibleValues}`,
    `- Placeholder 23 visible values: ${audit.placeholder23VisibleValues}`,
    `- Suspicious names flagged: ${audit.suspiciousNameCount}`,
    `- Possible out-of-scope roles flagged: ${audit.possibleOutOfScopeRoleCount}`,
    `- Validation warnings: ${audit.validationWarningCount}`,
    `- Validation errors: ${audit.validationErrorCount}`,
    "",
    "## Hadassah Global API Ambiguity",
    `- Canonical doctors: ${audit.globalApiAmbiguity.hadassahCanonicalDoctors}`,
    `- Department links after compaction: ${audit.globalApiAmbiguity.hadassahDepartmentLinks}`,
    `- Review-needed rows after compaction: ${audit.globalApiAmbiguity.hadassahReviewNeededRows}`,
    "",
  ].join("\n"), "utf8");

  console.log(JSON.stringify({
    excelPath: path.relative(ROOT, XLSX_PATH),
    csvDir: path.relative(ROOT, CSV_DIR),
    hospitalsExported: rowsBySheet["Site Ready Rosters"].length,
    canonicalDoctorsExported: rowsBySheet["Canonical Doctors"].length,
    departmentLinksExported: rowsBySheet["Department Links"].length,
    reviewNeededRowsExported: rowsBySheet["Review Needed"].length,
    validationWarnings: audit.validationWarningCount,
    validationErrors: audit.validationErrorCount,
    suspiciousNameCount: audit.suspiciousNameCount,
    rawHtmlVisibleValues: audit.rawHtmlVisibleValues,
    possibleOutOfScopeRoleCount: audit.possibleOutOfScopeRoleCount,
    hadassahDepartmentLinks: audit.globalApiAmbiguity.hadassahDepartmentLinks,
    hadassahReviewNeededRows: audit.globalApiAmbiguity.hadassahReviewNeededRows,
    sheets: sheetOrder,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
