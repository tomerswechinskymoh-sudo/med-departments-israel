import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { discoverCandidatePages, fetchPublicHtml, inspectHtml } from "./adapters/generic-public-site";
import { getHospitalBaseline, hospitalBaselines } from "./baseline-registry";
import { hospitalAliasRegistry, normalizeHospitalAliasInput, resolveHospitalAlias, slugForHospitalAlias } from "./hospital-alias-registry";
import { hospitalSeedUrlRegistry, safeSeedUrlsForHospital, seedUrlsForHospital } from "./seed-url-registry";
import type {
  CandidatePage,
  CanonicalDoctor,
  CrawlPriority,
  CrawlReadinessStatus,
  DoctorDepartmentLink,
  HospitalBaseline,
  InstitutionType,
  HospitalPilotEvaluation,
  MappingReadinessStatus,
  MasterDeptMatchConfidence,
  MasterDeptMatchEvidence,
  MasterDeptSourceUrlPageType,
  MasterDeptSourceUrlStatus,
  MasterDeptTarget,
  OutputUsability,
  ReadinessStatus,
  WebsiteFamily
} from "./types";
import { absoluteUrl, normalizeWhitespace, sleep, writeJson } from "@/crawler/clalit/utils";

const MASTER_DEPT_PATH = path.join(process.cwd(), "Master_Dept.csv");
const NATIONAL_OUTPUT_DIR = path.join(process.cwd(), "data", "crawler", "hospitals");
const SOURCE_URL_COLUMN = "אתר_מחלקה";
const HOSPITAL_COLUMN = "שם_מרכז_רפואי";
const SPECIALTY_COLUMN = "תחום התמחות";
const DEPARTMENT_COLUMN = "תת מחלקה";
const TYPE_COLUMN = "סוג_מוסד";

type CsvRow = Record<string, string>;

export type NationalHospitalPlan = {
  hospitalName: string;
  normalizedHospitalName: string;
  masterDeptRows: number;
  specialties: number;
  departments: number;
  providerGuess: MasterDeptTarget["providerGuess"];
  knownAdapter: string | null;
  knownStartingUrls: string[];
  currentReadiness: ReadinessStatus | "pending" | "needsAdapter" | "deferred" | "safeForPilot";
  crawlReadiness: CrawlReadinessStatus;
  mappingReadiness: MappingReadinessStatus;
  outputUsability: OutputUsability;
  institutionType: InstitutionType;
  isResidencyHospitalCandidate: boolean;
  crawlPriority: CrawlPriority;
  recommendedNextAction: "useExistingAdapter" | "runPlan" | "runPilot" | "runFullIfSafe" | "needsAdapter" | "deferToEnd";
  deferReason: string | null;
  wave: 1 | 2 | 3 | 4;
  directStaffUrlCount: number;
  departmentUrlCount: number;
  pendingUrlCount: number;
};

export type NationalCoverageReport = {
  generatedAt: string;
  totalHospitals: number;
  totalMasterDeptRows: number;
  rowsWithUrls: number;
  sourceUrlStatusCounts: Record<string, number>;
  sourceUrlPageTypeCounts: Record<string, number>;
  nearbyDoctorOrTeamUrlRows: number;
  hospitalsByProviderGuess: Record<string, number>;
  hospitalsByInstitutionType: Record<string, number>;
  hospitalRosterByInstitutionType: Record<string, number>;
  blockedByInstitutionType: Record<string, number>;
  remainingUnattemptedByInstitutionType: Record<string, number>;
  hospitalsByReadiness: Record<string, number>;
  hospitalsByCrawlReadiness: Record<string, number>;
  hospitalsByMappingReadiness: Record<string, number>;
  hospitalsSafeForFullBatch: string[];
  hospitalsPilotReady: string[];
  hospitalsNeedingAdapter: string[];
  hospitalsDeferred: Array<{ hospitalName: string; reason: string | null }>;
  hospitalReadinessBySlug: Record<string, HospitalSplitReadiness>;
  hospitalsWithWorkingDoctorRoster: string[];
  hospitalsWithDepartmentMappedRoster: string[];
  hospitalsBlocked: string[];
  shebaStatus: string;
  wave1Counts: {
    masterDeptHospitalGroups: number;
    attemptedHospitals: number;
    successfulHospitals: number;
    deferredHospitals: number;
    blockedHospitals: number;
  };
  wave1MappingBefore: Record<string, MappingStats>;
  wave1MappingAfter: Record<string, MappingStats>;
  canonicalStatsByHospital: Record<string, CanonicalStats>;
  wave1Results: Array<{
    hospital: string;
    readiness: string;
    reviewedRecords: number | null;
    productionReadyCount: number | null;
    mappedRecords: number | null;
  }>;
  wave2SelectedHospitals: Wave2PlanItem[];
  wave2Results: Array<Wave2Result>;
  wave3SelectedHospitals: Wave3PlanItem[];
  wave3Results: Array<Wave3Result>;
  nationalRemainingQueue: NationalRemainingQueueItem[];
  nationalSweepResults: NationalSweepResult[];
  calibrationResults: NationalSweepResult[];
  adapterPriorityResults: NationalSweepResult[];
  hospitalNormalizationAudit: HospitalNormalizationAudit;
  seedUrlRegistryStatus: Array<{
    hospitalSlug: string;
    seedUrlCount: number;
    safeSeedUrlCount: number;
    needsManualSeedUrl: boolean;
  }>;
  departmentMappedRosterCountPrevious: number | null;
  departmentMappedRosterCountChangeReason: string;
  attemptedHospitalCount: number;
  usableHospitalRosterCount: number;
  usableDepartmentMappedRosterCount: number;
  safeForFullBatchCount: number;
  needsCalibrationCount: number;
  needsAdapterCount: number;
  needsManualSeedUrlCount: number;
  blockedCount: number;
  deferredCount: number;
  notAttemptedCount: number;
  attemptedButNoDoctorsCount: number;
  attemptedWithDepartmentMappedRosterCount: number;
  attemptedWithHospitalRosterOnlyCount: number;
  remainingUnattemptedCount: number;
  blockersByType: Record<string, number>;
  topNextAdapterPriorities: NationalRemainingQueueItem[];
  nextRecommendedWave: string;
  sorokaStatus: string;
};

export type HospitalSplitReadiness = {
  hospitalSlug: string;
  hospitalName: string;
  crawlReadiness: CrawlReadinessStatus;
  mappingReadiness: MappingReadinessStatus;
  outputUsability: OutputUsability;
  canonicalDoctors: number;
  doctorDepartmentLinks: number;
  sourceUrlMatchLinks: number;
  reviewNeededLinks: number;
};

export type MappingStats = {
  totalReviewed: number;
  sourceUrlMatch: number;
  hospitalOnly: number;
  reviewNeeded: number;
  ambiguousMapping: number;
  unmapped: number;
};

export type Wave2PlanItem = {
  hospitalSlug: string;
  hospitalNames: string[];
  providerGuess: string;
  masterDeptRows: number;
  rowsWithUrls: number;
  liveUrlRows: number;
  nearbyDoctorOrTeamUrlRows: number;
  adapterParserFamily: string;
  whySelected: string;
  plannedMode: "pilot only" | "controlled full if already safe";
};

export type Wave3PlanItem = {
  hospitalSlug: string;
  hospitalNames: string[];
  providerGuess: string;
  masterDeptRows: number;
  rowsWithUrls: number;
  liveUrlRows: number;
  nearbyDoctorOrTeamUrlRows: number;
  adapterParserFamily: string;
  whySelected: string;
  expectedCrawlReadiness: CrawlReadinessStatus;
  expectedMappingReadiness: MappingReadinessStatus;
  plannedMode: "pilot only";
};

export type Wave2Result = {
  hospital: string;
  readiness: string;
  crawlReadiness: CrawlReadinessStatus;
  mappingReadiness: MappingReadinessStatus;
  outputUsability: OutputUsability;
  reviewedRecords: number;
  productionReadyCount: number;
  mappedRecords: number;
  mappingStats: MappingStats;
  canonicalStats: CanonicalStats;
  mainBlocker: string | null;
};

export type Wave3Result = Wave2Result;

export type NationalRemainingQueueItem = {
  hospitalName: string;
  hospitalSlug: string;
  providerGuess: string;
  masterDeptRows: number;
  rowsWithUrls: number;
  liveUrlRows: number;
  nearbyDoctorOrTeamUrlRows: number;
  existingAdapterParserFamily: string | null;
  institutionType: InstitutionType;
  isResidencyHospitalCandidate: boolean;
  crawlPriority: CrawlPriority;
  seedUrlCount: number;
  safeSeedUrlCount: number;
  needsManualSeedUrl: boolean;
  expectedCrawlReadiness: CrawlReadinessStatus;
  expectedMappingReadiness: MappingReadinessStatus;
  priority: "high" | "medium" | "low";
  reasonForPriority: string;
  plannedAction: "pilot" | "adapterInspect" | "defer" | "skipAlreadyUsable";
};

export type NationalSweepResult = Wave2Result & {
  plannedAction: NationalRemainingQueueItem["plannedAction"];
  blockerType:
    | "none"
    | "noMasterDeptSourceUrl"
    | "needsManualSeedUrl"
    | "noDoctorPagesFound"
    | "onlyJsShell"
    | "apiNeedsAdapter"
    | "siteBlocked"
    | "staleMasterDeptUrls"
    | "parserMissing"
    | "noPublicRosterFound"
    | "other";
};

export type HospitalNormalizationAuditEntry = {
  hospitalNameRaw: string;
  normalizedHospitalName: string;
  rowCount: number;
  rowsWithUrls: number;
  resolvedSlug: string;
  aliasMatched: boolean;
  aliasLabels: string[];
  isOpaqueSlug: boolean;
  reason: string;
  sampleMasterDeptRowIds: string[];
};

export type HospitalNormalizationAudit = {
  generatedAt: string;
  totalHospitalGroups: number;
  opaqueSlugCount: number;
  entries: HospitalNormalizationAuditEntry[];
};

export type CanonicalStats = {
  rawReviewedRows: number;
  canonicalDoctors: number;
  doctorDepartmentLinks: number;
  productionReadyCanonicalDoctors: number;
  sourceUrlMatchLinks: number;
  reviewNeededLinks: number;
  expectedDistinctDoctorDepartmentLinks: number;
  rawRowsDroppedAsExactDuplicates: number;
  canonicalDoctorsWithMoreThanOneSourceUrl: number;
  canonicalDoctorsWithMoreThanOneMasterDeptCandidate: number;
  canonicalDoctorsWithMoreThanOneExtractedFromUrl: number;
  canonicalDoctorsWhereMultipleRawRowsCollapsedIntoOneLink: number;
  duplicateProfileUrlGroupsBefore: number;
  duplicateProfileUrlGroupsAfter: number;
};

type LinkPreservationDiagnostics = CanonicalStats & {
  examples: Array<{
    canonicalDoctorId: string;
    fullName: string;
    rawRows: number;
    doctorDepartmentLinks: number;
    distinctSourceUrls: number;
    distinctMasterDeptRowIds: number;
    distinctExtractedFromUrls: number;
    sourceUrls: string[];
    masterDeptRowIds: string[];
    extractedFromUrls: string[];
  }>;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"") {
      if (quoted && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function writeCsv(filePath: string, rows: Array<Record<string, unknown>>) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  if (rows.length === 0) {
    await fs.writeFile(filePath, "", "utf8");
    return;
  }
  const headers = Object.keys(rows[0]);
  const body = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
  await fs.writeFile(filePath, `${body}\n`, "utf8");
}

function normalizeName(value: string) {
  return normalizeHospitalAliasInput(value);
}

function extractFirstUrl(value: string | null | undefined) {
  const match = String(value ?? "").match(/https?:\/\/[^\s,"')<>]+/i);
  return match?.[0] ?? null;
}

export function normalizeSourceUrl(rawUrl: string | null) {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.hash = "";
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (/^(utm_|fbclid|gclid)/i.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function classifySourceUrl(rawUrl: string | null | undefined, rowText = ""): MasterDeptSourceUrlPageType {
  const url = String(rawUrl ?? "");
  const joined = `${url} ${rowText}`;
  if (/(doctors|doctor|physicians|רופאים|רופא)/i.test(joined)) return "doctorsPage";
  if (/(team|staff|צוות|סגל|אנשי[-\s]?צוות|רופאי[-\s]?המחלקה)/i.test(joined)) return "teamPage";
  if (/(מערך|array|division)/i.test(joined)) return "arrayPage";
  if (/(unit|יחידה|service|שירות)/i.test(joined)) return "unitPage";
  try {
    const parsed = new URL(url);
    const pathValue = decodeURIComponent(parsed.pathname).toLowerCase();
    const shallow = pathValue === "/" || /\/pages\/default\.aspx$/i.test(pathValue) || pathValue.split("/").filter(Boolean).length <= 2;
    if (shallow) return "hospitalPage";
  } catch {
    // keep unknown fallback
  }
  if (/(department|departments|clinic|clinics|med|מחלקה|מרפאה|התמחות|specialization)/i.test(joined)) return "departmentPage";
  return "unknown";
}

function providerGuess(hospitalName: string, rawUrl: string | null, institutionType: string): MasterDeptTarget["providerGuess"] {
  const host = rawUrl ? safeHost(rawUrl) : "";
  const joined = `${hospitalName} ${host} ${institutionType}`.toLowerCase();
  if (joined.includes("sheba") || /שיבא|תל השומר/.test(hospitalName)) return "sheba";
  if (joined.includes("tasmc") || joined.includes("sourasky") || /איכילוב|סוראסקי/.test(hospitalName)) return "ichilov";
  if (joined.includes("hadassah") || /הדסה/.test(hospitalName)) return "hadassah";
  if (joined.includes("clalit") || /\b(meir|rabin|soroka|carmel)\b/.test(joined) || /כללית|בילינסון|רבין|מאיר|סורוקה|כרמל|העמק|יוספטל|קפלן|שניידר|השרון/.test(hospitalName)) return "clalit";
  if (joined.includes("gov.il") || /ממשלתי|משרד הבריאות|הלל יפה|וולפסון|זיו|פוריה|ברזילי|שמיר|רמבם|בני ציון|לגליל/.test(hospitalName)) return "government";
  if (/אסותא|לניאדו|מעיני|נצרת|משפחה קדושה|סן ונסן|מכבי|מאוחדת|לאומית/.test(hospitalName)) return "private";
  return "unknown";
}

function classifyInstitutionType(hospitalName: string, rawInstitutionType: string, provider: MasterDeptTarget["providerGuess"]): InstitutionType {
  const joined = `${hospitalName} ${rawInstitutionType}`.replace(/[׳'״"]/g, "");
  if (/קופ.?ח|מכבי שירותי בריאות|מאוחדת|לאומית|כללית שירותי בריאות/i.test(joined)) return "healthFund";
  if (/קהילת|שירותי בריאות קהילתיים|אסיא/i.test(joined)) return "communityProvider";
  if (/ברה.?נ|בריאות הנפש|לב.?ה.?נ|נפש|גהה|שלוותה|אברבנאל|מזור|שער מנשה|כפר שאול|איתנים|מרחבים|מעלה הכרמל|רמת חן|באר שבע/i.test(joined)) return "psychiatricHospital";
  if (/גריאטר|שמואל הרופא|בית רבקה|פלימן|הרצפלד|נאות המושבה|שהם/i.test(joined)) return "geriatricHospital";
  if (/שיקומ|לוינשטיין|רעות|עדי נגב/i.test(joined)) return "rehabilitationHospital";
  if (/אסותא|לניאדו|מעיני|נצרת|משפחה קדושה|סן ונסן/i.test(joined)) return "privateNetwork";
  if (provider === "clalit" || provider === "government" || provider === "ichilov" || provider === "hadassah" || provider === "sheba") return "acuteHospital";
  if (/מ.?ר|מרכז רפואי|ביה.?ח|בית חולים/i.test(joined)) return "acuteHospital";
  return "unknown";
}

function isResidencyHospitalCandidate(institutionType: InstitutionType) {
  return institutionType === "acuteHospital" ||
    institutionType === "psychiatricHospital" ||
    institutionType === "geriatricHospital" ||
    institutionType === "rehabilitationHospital" ||
    institutionType === "privateNetwork";
}

function crawlPriorityForInstitution(institutionType: InstitutionType, provider: MasterDeptTarget["providerGuess"], hasSourceUrl: boolean): CrawlPriority {
  if (institutionType === "healthFund" || institutionType === "communityProvider") return "defer";
  if (institutionType === "acuteHospital" || institutionType === "privateNetwork") return hasSourceUrl ? "high" : "medium";
  if (institutionType === "psychiatricHospital" || institutionType === "rehabilitationHospital") return hasSourceUrl ? "medium" : "low";
  if (institutionType === "geriatricHospital") return "low";
  if (provider === "unknown" && !hasSourceUrl) return "defer";
  return "low";
}

function safeHost(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return "";
  }
}

function rowId(index: number, row: CsvRow) {
  const seed = [row[HOSPITAL_COLUMN], row[SPECIALTY_COLUMN], row[DEPARTMENT_COLUMN]].map((item) => normalizeName(item ?? "")).filter(Boolean).join("-");
  const suffix = seed.replace(/[^a-zA-Z0-9\u0590-\u05ff]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "row";
  return `master-dept-${String(index + 1).padStart(4, "0")}-${suffix}`;
}

function statusForTarget(provider: MasterDeptTarget["providerGuess"], hospitalName: string, pageType: MasterDeptSourceUrlPageType) {
  if (provider === "sheba" || /שיבא|תל השומר/i.test(hospitalName)) {
    return { crawlerStatus: "deferred" as const, deferReason: "hard JS/API/502 case; deferred after national coverage" };
  }
  if (provider === "ichilov" || provider === "hadassah") return { crawlerStatus: "safeForFullBatch" as const, deferReason: null };
  if (provider === "clalit") return { crawlerStatus: pageType === "teamPage" || pageType === "doctorsPage" ? "safeForPilot" as const : "supported" as const, deferReason: null };
  if (provider === "government" || provider === "private") return { crawlerStatus: "needsAdapter" as const, deferReason: null };
  return { crawlerStatus: "pending" as const, deferReason: null };
}

export async function loadMasterDeptTargets(): Promise<MasterDeptTarget[]> {
  const text = await fs.readFile(MASTER_DEPT_PATH, "utf8");
  const [headers, ...records] = parseCsv(text);

  return records
    .flatMap((values, index): MasterDeptTarget[] => {
      const row = Object.fromEntries(headers.map((header, headerIndex) => [header, normalizeWhitespace(values[headerIndex] ?? "")])) as CsvRow;
      const sourceUrlRaw = extractFirstUrl(row[SOURCE_URL_COLUMN]);
      const sourceUrlNormalized = normalizeSourceUrl(sourceUrlRaw);
      if (![row[HOSPITAL_COLUMN], row[SPECIALTY_COLUMN], row[DEPARTMENT_COLUMN], sourceUrlNormalized].some(Boolean)) return [];
      const pageType = classifySourceUrl(sourceUrlNormalized, [row[DEPARTMENT_COLUMN], row[SPECIALTY_COLUMN], row[SOURCE_URL_COLUMN]].join(" "));
      const hospitalNameRaw = row[HOSPITAL_COLUMN] ?? "";
      const provider = providerGuess(hospitalNameRaw, sourceUrlNormalized, row[TYPE_COLUMN] ?? "");
      const institutionType = classifyInstitutionType(hospitalNameRaw, row[TYPE_COLUMN] ?? "", provider);
      const status = statusForTarget(provider, hospitalNameRaw, pageType);
      return [{
        masterDeptRowId: rowId(index, row),
        hospitalNameRaw,
        hospitalNameNormalized: normalizeName(hospitalNameRaw),
        departmentNameRaw: row[DEPARTMENT_COLUMN] ?? "",
        departmentNameNormalized: normalizeName(row[DEPARTMENT_COLUMN] ?? ""),
        specialtyRaw: row[SPECIALTY_COLUMN] ?? "",
        specialtyNormalized: normalizeName(row[SPECIALTY_COLUMN] ?? ""),
        city: null,
        district: null,
        sourceUrlRaw,
        sourceUrlNormalized,
        sourceUrlStatus: sourceUrlNormalized ? "pending" : "notProvided",
        sourceUrlPageType: pageType,
        discoveredFromMasterDeptUrl: Boolean(sourceUrlNormalized),
        nearbyDoctorOrTeamUrls: [],
        urlInspectionEvidence: null,
        providerGuess: provider,
        institutionType,
        isResidencyHospitalCandidate: isResidencyHospitalCandidate(institutionType),
        crawlPriority: crawlPriorityForInstitution(institutionType, provider, Boolean(sourceUrlNormalized)),
        crawlerStatus: status.crawlerStatus,
        deferReason: status.deferReason
      }];
    });
}

function baselineForTarget(target: MasterDeptTarget) {
  if (target.providerGuess === "ichilov" || target.providerGuess === "hadassah" || target.providerGuess === "sheba") {
    return hospitalBaselines.find((baseline) => baseline.provider === target.providerGuess) ?? null;
  }
  const byProvider = hospitalBaselines.find((baseline) => baseline.provider === target.providerGuess && matchesBaseline(target, baseline));
  if (byProvider) return byProvider;
  return hospitalBaselines.find((baseline) => matchesBaseline(target, baseline)) ?? null;
}

function matchesBaseline(target: MasterDeptTarget, baseline: HospitalBaseline) {
  const haystack = `${target.hospitalNameRaw} ${target.hospitalNameNormalized}`;
  return Boolean(
    (baseline.hospitalHebrew && haystack.includes(baseline.hospitalHebrew)) ||
      haystack.includes(baseline.hospitalName) ||
      normalizeName(haystack).includes(normalizeName(baseline.hospitalHebrew ?? baseline.hospitalName))
  );
}

export async function inspectMasterDeptTargets(targets: MasterDeptTarget[], options: { hospitalNames?: string[]; limit?: number } = {}) {
  const hospitalFilters = new Set((options.hospitalNames ?? []).map(normalizeName));
  const candidates = targets.filter((target) => {
    if (!target.sourceUrlNormalized) return false;
    if (hospitalFilters.size === 0) return true;
    return Array.from(hospitalFilters).some((filter) => target.hospitalNameNormalized.includes(filter) || filter.includes(target.hospitalNameNormalized));
  });

  for (const target of candidates.slice(0, options.limit ?? candidates.length)) {
    const baseline = baselineForTarget(target) ?? fallbackBaselineForTarget(target);
    try {
      const response = await fetchPublicHtml(target.sourceUrlNormalized!, 15_000);
      const status = sourceStatusFromResponse(target.sourceUrlNormalized!, response.ok, response.statusCode, response.finalUrl, response.error);
      target.sourceUrlStatus = status;
      const snapshot = inspectHtml(response.finalUrl || target.sourceUrlNormalized!, response.html, response.ok, response.statusCode, response.error);
      target.urlInspectionEvidence = `${snapshot.ok ? "OK" : "FAIL"} ${snapshot.statusCode ?? "n/a"} title=${snapshot.title ?? "n/a"} text=${snapshot.visibleTextLength}`;
      if (response.html) {
        const discovered = discoverCandidatePages(response.html, response.finalUrl || target.sourceUrlNormalized!, baseline)
          .filter((candidate) => candidate.patternType === "doctorPage" || candidate.patternType === "teamPage" || candidate.patternType === "staffPage" || candidate.patternType === "doctorIndex")
          .slice(0, 8);
        target.nearbyDoctorOrTeamUrls = discovered.map((candidate) => candidate.url);
        if (discovered.length > 0 && target.sourceUrlPageType !== "doctorsPage" && target.sourceUrlPageType !== "teamPage") {
          target.sourceUrlPageType = "departmentPage";
        }
      }
    } catch (error) {
      target.sourceUrlStatus = "failed";
      target.urlInspectionEvidence = error instanceof Error ? error.message : String(error);
    }
    await sleep(200);
  }
}

function sourceStatusFromResponse(sourceUrl: string, ok: boolean, statusCode: number | null, finalUrl: string, error: string | null): MasterDeptSourceUrlStatus {
  if (statusCode === 403) return "forbidden";
  if (statusCode === 404 || statusCode === 410) return "stale";
  if (!ok) return error ? "failed" : "stale";
  if (finalUrl && finalUrl !== sourceUrl) return "redirected";
  return "live";
}

function fallbackBaselineForTarget(target: MasterDeptTarget): HospitalBaseline {
  return {
    hospitalSlug: target.hospitalNameNormalized || "master-dept",
    hospitalName: target.hospitalNameRaw || "Master Dept Hospital",
    hospitalHebrew: target.hospitalNameRaw,
    provider: target.providerGuess === "government" || target.providerGuess === "private" ? "unknown" : target.providerGuess,
    websiteFamily: target.providerGuess === "government" || target.providerGuess === "private" ? "unknown" : target.providerGuess,
    homepageUrl: target.sourceUrlNormalized ?? "https://example.invalid/",
    departmentsIndexUrlCandidates: [],
    doctorIndexUrlCandidates: [],
    pilotUrlCandidates: [],
    parserFamilies: ["unknown"],
    notes: ["Synthetic baseline for Master_Dept URL inspection."]
  };
}

export function buildNationalHospitalPlan(targets: MasterDeptTarget[]): NationalHospitalPlan[] {
  const grouped = new Map<string, MasterDeptTarget[]>();
  for (const target of targets) {
    const key = target.hospitalNameNormalized || target.hospitalNameRaw || "unknown";
    grouped.set(key, [...(grouped.get(key) ?? []), target]);
  }

  return Array.from(grouped.values())
    .map((items) => {
      const first = items[0];
      const baseline = baselineForTarget(first);
      const provider = majority(items.map((item) => item.providerGuess));
      const institutionType = majority(items.map((item) => item.institutionType));
      const isResidencyCandidate = items.some((item) => item.isResidencyHospitalCandidate);
      const crawlPriority = highestCrawlPriority(items.map((item) => item.crawlPriority));
      const directStaffUrlCount = items.filter((item) => item.sourceUrlPageType === "teamPage" || item.sourceUrlPageType === "doctorsPage").length;
      const departmentUrlCount = items.filter((item) => item.sourceUrlNormalized && item.sourceUrlPageType !== "teamPage" && item.sourceUrlPageType !== "doctorsPage").length;
      const pendingUrlCount = items.filter((item) => item.sourceUrlStatus === "pending").length;
      const readiness = readinessForHospital(first, baseline);
      const crawlReadiness = crawlReadinessFromLegacy(readiness);
      const mappingReadiness: MappingReadinessStatus = "blocked";
      const action = actionForHospital(first, readiness, baseline);
      return {
        hospitalName: first.hospitalNameRaw || "Unknown",
        normalizedHospitalName: first.hospitalNameNormalized,
        masterDeptRows: items.length,
        specialties: new Set(items.map((item) => item.specialtyNormalized).filter(Boolean)).size,
        departments: new Set(items.map((item) => `${item.specialtyNormalized}::${item.departmentNameNormalized}`).filter(Boolean)).size,
        providerGuess: provider,
        knownAdapter: baseline?.hospitalSlug ?? null,
        knownStartingUrls: Array.from(new Set([...(baseline?.departmentsIndexUrlCandidates ?? []), ...(baseline?.doctorIndexUrlCandidates ?? []), ...items.map((item) => item.sourceUrlNormalized).filter(Boolean) as string[]])).slice(0, 12),
        currentReadiness: readiness,
        crawlReadiness,
        mappingReadiness,
        outputUsability: outputUsabilityFor(crawlReadiness, mappingReadiness, null),
        institutionType,
        isResidencyHospitalCandidate: isResidencyCandidate,
        crawlPriority,
        recommendedNextAction: action,
        deferReason: first.deferReason,
        wave: waveForHospital(first, readiness, baseline),
        directStaffUrlCount,
        departmentUrlCount,
        pendingUrlCount
      } satisfies NationalHospitalPlan;
    })
    .sort((left, right) => left.wave - right.wave || right.directStaffUrlCount - left.directStaffUrlCount || right.masterDeptRows - left.masterDeptRows);
}

function majority<T extends string>(items: T[]) {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? items[0];
}

function highestCrawlPriority(items: CrawlPriority[]): CrawlPriority {
  const rank: Record<CrawlPriority, number> = { high: 4, medium: 3, low: 2, defer: 1 };
  return items.sort((left, right) => rank[right] - rank[left])[0] ?? "low";
}

export function crawlReadinessFromLegacy(readiness: ReadinessStatus | "pending" | "needsAdapter" | "deferred" | "safeForPilot" | string): CrawlReadinessStatus {
  if (readiness === "safeForFullBatch") return "safeForFullBatch";
  if (readiness === "safeForPilot" || readiness === "pilotReady" || readiness === "inspectNeeded" || readiness === "discoveryOnly") return "pilotReady";
  if (readiness === "needsCalibration" || readiness === "needsHumanReview") return "needsCalibration";
  if (readiness === "needsAdapter" || readiness === "pending" || readiness === "deferred") return readiness === "deferred" ? "blocked" : "needsAdapter";
  return "blocked";
}

export function mappingReadinessFor(hospitalSlug: string, stats: CanonicalStats | null | undefined): MappingReadinessStatus {
  if (!stats || stats.doctorDepartmentLinks === 0) return "blocked";
  if (stats.sourceUrlMatchLinks === stats.doctorDepartmentLinks) return "sourceUrlMapped";
  if (stats.sourceUrlMatchLinks > 0) return "partiallyMapped";
  if (hospitalSlug === "ichilov" || hospitalSlug === "hadassah" || hospitalSlug === "rabin") return "hospitalRosterOnly";
  return "reviewNeeded";
}

export function outputUsabilityFor(crawlReadiness: CrawlReadinessStatus, mappingReadiness: MappingReadinessStatus, stats: CanonicalStats | null | undefined): OutputUsability {
  if (crawlReadiness === "blocked" || crawlReadiness === "needsAdapter" || !stats || stats.canonicalDoctors === 0) return "notUsableYet";
  if (mappingReadiness === "sourceUrlMapped" || mappingReadiness === "partiallyMapped") return "departmentMappedRoster";
  if (mappingReadiness === "hospitalRosterOnly" || mappingReadiness === "reviewNeeded") return "hospitalRoster";
  return "notUsableYet";
}

function splitReadinessFor(hospitalSlug: string, hospitalName: string, legacyReadiness: string, stats: CanonicalStats | null | undefined): HospitalSplitReadiness {
  const crawlReadiness = crawlReadinessFromLegacy(legacyReadiness);
  const mappingReadiness = mappingReadinessFor(hospitalSlug, stats);
  return {
    hospitalSlug,
    hospitalName,
    crawlReadiness,
    mappingReadiness,
    outputUsability: outputUsabilityFor(crawlReadiness, mappingReadiness, stats),
    canonicalDoctors: stats?.canonicalDoctors ?? 0,
    doctorDepartmentLinks: stats?.doctorDepartmentLinks ?? 0,
    sourceUrlMatchLinks: stats?.sourceUrlMatchLinks ?? 0,
    reviewNeededLinks: stats?.reviewNeededLinks ?? 0
  };
}

function readinessForHospital(target: MasterDeptTarget, baseline: HospitalBaseline | null): NationalHospitalPlan["currentReadiness"] {
  if (target.crawlerStatus === "deferred") return "deferred";
  if (target.providerGuess === "ichilov" || target.providerGuess === "hadassah" || baseline?.hospitalSlug === "ichilov" || baseline?.hospitalSlug === "hadassah" || baseline?.hospitalSlug === "meir") return "safeForFullBatch";
  if (baseline) return "safeForPilot";
  if (target.providerGuess === "clalit") return "safeForPilot";
  if (target.providerGuess === "government" || target.providerGuess === "private") return "needsAdapter";
  return "pending";
}

function actionForHospital(target: MasterDeptTarget, readiness: NationalHospitalPlan["currentReadiness"], baseline: HospitalBaseline | null): NationalHospitalPlan["recommendedNextAction"] {
  if (readiness === "deferred") return "deferToEnd";
  if (readiness === "safeForFullBatch") return "runFullIfSafe";
  if (baseline || target.providerGuess === "clalit") return "runPilot";
  if (readiness === "needsAdapter") return "needsAdapter";
  return "runPlan";
}

function waveForHospital(target: MasterDeptTarget, readiness: NationalHospitalPlan["currentReadiness"], baseline: HospitalBaseline | null): NationalHospitalPlan["wave"] {
  if (target.providerGuess === "ichilov" || target.providerGuess === "hadassah" || baseline?.hospitalSlug === "ichilov" || baseline?.hospitalSlug === "hadassah" || baseline?.hospitalSlug === "meir") return 1;
  if (readiness === "deferred" || target.providerGuess === "sheba") return 4;
  if (target.providerGuess === "clalit") return 2;
  return 3;
}

export function buildNationalWaves(plan: NationalHospitalPlan[]) {
  return buildNationalWavesWithCanonicalStats(plan, {});
}

function buildNationalWavesWithCanonicalStats(plan: NationalHospitalPlan[], canonicalStatsByHospital: Record<string, CanonicalStats>) {
  const attachCanonicalStats = (item: NationalHospitalPlan) => {
    const slug = item.knownAdapter ?? "";
    const stats = slug ? canonicalStatsByHospital[slug] : null;
    if (!stats) return item;
    const split = splitReadinessFor(slug, item.hospitalName, item.currentReadiness, stats);
    return {
      ...item,
      crawlReadiness: split.crawlReadiness,
      mappingReadiness: split.mappingReadiness,
      outputUsability: split.outputUsability,
      canonicalStatsSourceHospitalSlug: slug,
      canonicalStats: stats
    };
  };
  return {
    generatedAt: new Date().toISOString(),
    waves: [
      { wave: 1, label: "Proven safe adapters", hospitals: plan.filter((item) => item.wave === 1).map(attachCanonicalStats) },
      { wave: 2, label: "Other Clalit hospitals", hospitals: plan.filter((item) => item.wave === 2).map(attachCanonicalStats) },
      { wave: 3, label: "Government/private generic parser candidates", hospitals: plan.filter((item) => item.wave === 3).map(attachCanonicalStats) },
      { wave: 4, label: "Deferred hard cases", hospitals: plan.filter((item) => item.wave === 4).map(attachCanonicalStats) }
    ]
  };
}

export function matchDoctorToMasterDept(doctor: { hospital: string; sourceUrl: string; unit: string | null; rawText: string }, targets: MasterDeptTarget[]) {
  const hospital = normalizeName(doctor.hospital);
  const source = normalizeSourceUrl(doctor.sourceUrl);
  const doctorProvider = providerGuess(doctor.hospital, doctor.sourceUrl, "");
  const hospitalTargets = targets.filter((target) => targetMatchesDoctorHospital(target, hospital, doctor.hospital, doctorProvider));
  const directSourceMatches = hospitalTargets.filter((target) => target.sourceUrlNormalized && source && target.sourceUrlNormalized === source);
  if (directSourceMatches.length === 1) return matchResult(directSourceMatches, "sourceUrlMatch", evidenceFor("exactSourceUrl", directSourceMatches, source, "doctor source equals Master_Dept source URL"));
  if (directSourceMatches.length > 1) return matchResult(directSourceMatches, "reviewNeeded", evidenceFor("exactSourceUrl", directSourceMatches, source, "exact source URL matches multiple Master_Dept rows"), "multipleMasterDeptSourceRows");

  const childSourceMatches = hospitalTargets.filter((target) =>
    source &&
    target.sourceUrlNormalized &&
    target.nearbyDoctorOrTeamUrls.includes(source) &&
    sameDepartmentPath(target.sourceUrlNormalized, source) &&
    isRowSpecificNearbyRelationship(target, source)
  );
  if (childSourceMatches.length === 1) {
    return matchResult(childSourceMatches, "sourceUrlMatch", evidenceFor(relationshipForSource(source), childSourceMatches, source, "doctor source URL was discovered from this Master_Dept source URL"));
  }
  if (childSourceMatches.length > 1) {
    return matchResult(childSourceMatches, "reviewNeeded", evidenceFor(relationshipForSource(source), childSourceMatches, source, `child URL matches ${childSourceMatches.length} Master_Dept rows`), "multipleMasterDeptSourceRows");
  }

  const scopedStaffMatches = hospitalTargets.filter((target) => source && target.sourceUrlNormalized && isStaffOrDoctorUrl(source) && sameDepartmentPath(target.sourceUrlNormalized, source) && isRowSpecificNearbyRelationship(target, source));
  if (scopedStaffMatches.length === 1) {
    return matchResult(scopedStaffMatches, "sourceUrlMatch", evidenceFor(relationshipForSource(source), scopedStaffMatches, source, "doctor source URL is a same-scope staff/team/doctor page under one Master_Dept source URL"));
  }
  if (scopedStaffMatches.length > 1) {
    return matchResult(scopedStaffMatches, "reviewNeeded", evidenceFor(relationshipForSource(source), scopedStaffMatches, source, `same-scope staff/team URL matches ${scopedStaffMatches.length} Master_Dept rows`), "multipleMasterDeptSourceRows");
  }

  const unit = normalizeName(doctor.unit ?? "");
  if (unit) {
    const exact = hospitalTargets.filter((target) => target.departmentNameNormalized && target.departmentNameNormalized === unit);
    if (exact.length > 0) return matchResult(exact, "normalizedExact", evidenceFor("normalizedUnit", exact, source, `unit=${doctor.unit}`));
    const specialty = hospitalTargets.filter((target) => target.specialtyNormalized && unit.includes(target.specialtyNormalized));
    if (specialty.length === 1) return matchResult(specialty, "exact", evidenceFor("normalizedSpecialty", specialty, source, `unit specialty match=${doctor.unit}`));
    if (specialty.length > 1) return matchResult(specialty, "reviewNeeded", evidenceFor("normalizedSpecialty", specialty, source, `ambiguous unit specialty match=${doctor.unit}`), "multipleUnitSpecialtyMatches");
  }

  if (hospitalTargets.length === 1) return matchResult(hospitalTargets, "hospitalOnly", evidenceFor("hospitalOnly", hospitalTargets, source, `hospital=${doctor.hospital}`));
  if (hospitalTargets.length > 1) return matchResult(hospitalTargets, "reviewNeeded", evidenceFor("hospitalOnly", hospitalTargets, source, `hospital=${doctor.hospital}; candidates=${hospitalTargets.length}`), "multipleMasterDeptHospitalRows");
  return matchResult([], "reviewNeeded", evidenceFor("none", [], source, `no Master_Dept match for hospital=${doctor.hospital}`), "noMasterDeptHospitalMatch");
}

function isStaffOrDoctorUrl(sourceUrl: string | null) {
  return Boolean(sourceUrl && /(doctors?|physicians?|team|staff|specialists?|רופאים|רופא|צוות|סגל|מומחים)/i.test(decodeURIComponent(sourceUrl)));
}

function isGenericDoctorIndexUrl(sourceUrl: string | null) {
  if (!sourceUrl) return false;
  const decoded = decodeURIComponent(sourceUrl);
  return /(doctorssearch|doctor-search|doctors-lobby|our-specialists|Our-doctors-and-experts\/Pages\/default\.aspx|\/team\.aspx$|רופאים-מומחים)/i.test(decoded);
}

function isRowSpecificNearbyRelationship(target: MasterDeptTarget, sourceUrl: string) {
  // A department page -> same-scope team/doctors page is row-specific enough.
  // A single doctor-profile URL -> global doctor index is not row-specific and must stay reviewNeeded.
  if (target.sourceUrlPageType === "doctorsPage" && isGenericDoctorIndexUrl(sourceUrl)) return false;
  return true;
}

function relationshipForSource(sourceUrl: string | null): MasterDeptMatchEvidence["relationship"] {
  if (!sourceUrl) return "none";
  const decoded = decodeURIComponent(sourceUrl);
  if (/(doctors?|physicians?|specialists?|רופאים|רופא|מומחים)/i.test(decoded)) return "discoveredNearbyDoctorUrl";
  return "discoveredNearbyTeamUrl";
}

function evidenceFor(relationship: MasterDeptMatchEvidence["relationship"], targets: MasterDeptTarget[], sourceUrl: string | null, reason: string): MasterDeptMatchEvidence {
  return {
    masterDeptSourceUrls: Array.from(new Set(targets.map((target) => target.sourceUrlNormalized).filter(Boolean) as string[])),
    extractedFromUrl: sourceUrl,
    relationship,
    reason
  };
}

function sameDepartmentPath(parentUrl: string, childUrl: string) {
  try {
    const parent = new URL(parentUrl);
    const child = new URL(childUrl);
    if (parent.hostname !== child.hostname) return false;
    const parentParts = parent.pathname.split("/").filter(Boolean).map((part) => part.toLowerCase());
    const childParts = child.pathname.split("/").filter(Boolean).map((part) => part.toLowerCase());
    const parentPagesIndex = parentParts.findIndex((part) => part === "pages");
    const childPagesIndex = childParts.findIndex((part) => part === "pages");
    const parentScope = parentParts.slice(0, parentPagesIndex >= 0 ? parentPagesIndex : Math.min(parentParts.length, 5)).join("/");
    const childScope = childParts.slice(0, childPagesIndex >= 0 ? childPagesIndex : Math.min(childParts.length, 5)).join("/");
    return Boolean(parentScope && childScope && (childScope.startsWith(parentScope) || parentScope.startsWith(childScope)));
  } catch {
    return false;
  }
}

function targetMatchesDoctorHospital(target: MasterDeptTarget, normalizedDoctorHospital: string, rawDoctorHospital: string, doctorProvider: MasterDeptTarget["providerGuess"]) {
  if (target.hospitalNameNormalized && (normalizedDoctorHospital.includes(target.hospitalNameNormalized) || target.hospitalNameNormalized.includes(normalizedDoctorHospital))) return true;
  if (doctorProvider === "ichilov" && target.providerGuess === "ichilov") return true;
  if (doctorProvider === "hadassah" && target.providerGuess === "hadassah") return true;
  if (/\bmeir\b/i.test(rawDoctorHospital) && /מאיר/.test(target.hospitalNameRaw)) return true;
  if (/\brabin\b/i.test(rawDoctorHospital) && /רבין|בילינסון|השרון/.test(target.hospitalNameRaw)) return true;
  if (/\bsoroka\b/i.test(rawDoctorHospital) && /סורוקה/.test(target.hospitalNameRaw)) return true;
  if (/\bcarmel\b/i.test(rawDoctorHospital) && /כרמל/.test(target.hospitalNameRaw)) return true;
  if (/\bemek\b/i.test(rawDoctorHospital) && /העמק/.test(target.hospitalNameRaw)) return true;
  if (/\bkaplan\b/i.test(rawDoctorHospital) && /קפלן/.test(target.hospitalNameRaw)) return true;
  if (/\bwolfson\b/i.test(rawDoctorHospital) && /וולפסון/.test(target.hospitalNameRaw)) return true;
  if (/\bmaayanei|hayeshua|mayanei|mymc\b/i.test(rawDoctorHospital) && /מעיני/.test(target.hospitalNameRaw)) return true;
  if (/\bgalilee\b|\bgmc\b/i.test(rawDoctorHospital) && /לגליל/.test(target.hospitalNameRaw)) return true;
  if (/\bshamir\b/i.test(rawDoctorHospital) && /שמיר/.test(target.hospitalNameRaw)) return true;
  if (/\blaniado\b/i.test(rawDoctorHospital) && /לניאדו/.test(target.hospitalNameRaw)) return true;
  return false;
}

function matchResult(targets: MasterDeptTarget[], confidence: MasterDeptMatchConfidence, evidence: MasterDeptMatchEvidence, ambiguityReason: string | null = null) {
  return {
    matchedMasterHospitalName: targets[0]?.hospitalNameRaw ?? null,
    matchedMasterDeptRowIds: targets.map((target) => target.masterDeptRowId),
    matchedMasterDepartmentNames: Array.from(new Set(targets.map((target) => target.departmentNameRaw).filter(Boolean))),
    matchedMasterSpecialties: Array.from(new Set(targets.map((target) => target.specialtyRaw).filter(Boolean))),
    matchConfidence: confidence,
    matchEvidence: evidence,
    ambiguityReason
  };
}

export async function applyMasterDeptMappingToReviewed(hospitalSlug: string, targets: MasterDeptTarget[]) {
  const filePath = path.join(NATIONAL_OUTPUT_DIR, hospitalSlug, "reviewed", "doctors-reviewed.json");
  const raw = await fs.readFile(filePath, "utf8");
  const doctors = JSON.parse(raw) as Array<Record<string, unknown> & { hospital: string; sourceUrl: string; unit: string | null; rawText: string }>;
  const mapped = doctors.map((doctor) => ({ ...doctor, ...matchDoctorToMasterDept(doctor, targets) }));
  await writeJson(filePath, mapped);
  const canonical = await writeCanonicalOutputs(hospitalSlug, mapped, targets);
  return {
    hospitalSlug,
    reviewedRecords: mapped.length,
    mappedRecords: mapped.filter((doctor) => Array.isArray(doctor.matchedMasterDeptRowIds) && doctor.matchedMasterDeptRowIds.length > 0).length,
    mappingStats: mappingStatsFromRecords(mapped),
    canonicalStats: canonical.stats
  };
}

export async function readMappingStats(hospitalSlug: string): Promise<MappingStats> {
  try {
    const filePath = path.join(NATIONAL_OUTPUT_DIR, hospitalSlug, "reviewed", "doctors-reviewed.json");
    const doctors = JSON.parse(await fs.readFile(filePath, "utf8")) as Array<Record<string, unknown>>;
    return mappingStatsFromRecords(doctors);
  } catch {
    return mappingStatsFromRecords([]);
  }
}

function mappingStatsFromRecords(records: Array<Record<string, unknown>>): MappingStats {
  return {
    totalReviewed: records.length,
    sourceUrlMatch: records.filter((record) => record.matchConfidence === "sourceUrlMatch").length,
    hospitalOnly: records.filter((record) => record.matchConfidence === "hospitalOnly").length,
    reviewNeeded: records.filter((record) => record.matchConfidence === "reviewNeeded").length,
    ambiguousMapping: records.filter((record) => Boolean(record.ambiguityReason)).length,
    unmapped: records.filter((record) => !Array.isArray(record.matchedMasterDeptRowIds) || record.matchedMasterDeptRowIds.length === 0).length
  };
}

export async function readCanonicalStats(hospitalSlug: string): Promise<CanonicalStats> {
  try {
    const canonicalPath = path.join(NATIONAL_OUTPUT_DIR, hospitalSlug, "canonical", "canonical-doctors.json");
    const linksPath = path.join(NATIONAL_OUTPUT_DIR, hospitalSlug, "canonical", "doctor-department-links.json");
    const reportPath = path.join(NATIONAL_OUTPUT_DIR, hospitalSlug, "canonical", "summary.json");
    const summary = JSON.parse(await fs.readFile(reportPath, "utf8")) as CanonicalStats;
    await fs.access(canonicalPath);
    await fs.access(linksPath);
    return summary;
  } catch {
    return {
      rawReviewedRows: 0,
      canonicalDoctors: 0,
      doctorDepartmentLinks: 0,
      productionReadyCanonicalDoctors: 0,
      sourceUrlMatchLinks: 0,
      reviewNeededLinks: 0,
      expectedDistinctDoctorDepartmentLinks: 0,
      rawRowsDroppedAsExactDuplicates: 0,
      canonicalDoctorsWithMoreThanOneSourceUrl: 0,
      canonicalDoctorsWithMoreThanOneMasterDeptCandidate: 0,
      canonicalDoctorsWithMoreThanOneExtractedFromUrl: 0,
      canonicalDoctorsWhereMultipleRawRowsCollapsedIntoOneLink: 0,
      duplicateProfileUrlGroupsBefore: 0,
      duplicateProfileUrlGroupsAfter: 0
    };
  }
}

async function writeCanonicalOutputs(hospitalSlug: string, records: Array<Record<string, unknown>>, targets: MasterDeptTarget[]) {
  const canonical = canonicalizeDoctors(hospitalSlug, records, targets);
  const outputDir = path.join(NATIONAL_OUTPUT_DIR, hospitalSlug, "canonical");
  await writeJson(path.join(outputDir, "canonical-doctors.json"), canonical.canonicalDoctors);
  await writeJson(path.join(outputDir, "doctors.json"), canonical.canonicalDoctors);
  await writeJson(path.join(outputDir, "doctor-department-links.json"), canonical.doctorDepartmentLinks);
  await writeJson(path.join(outputDir, "summary.json"), canonical.stats);
  await writeJson(path.join(outputDir, "link-preservation-diagnostics.json"), canonical.diagnostics);
  return canonical;
}

function canonicalizeDoctors(hospitalSlug: string, records: Array<Record<string, unknown>>, targets: MasterDeptTarget[]) {
  const targetsById = new Map(targets.map((target) => [target.masterDeptRowId, target]));
  const byCanonicalKey = new Map<string, CanonicalDoctor>();
  const links: DoctorDepartmentLink[] = [];
  const rawBuckets = new Map<string, {
    fullName: string;
    rawRows: number;
    sourceUrls: Set<string>;
    masterDeptRowIds: Set<string>;
    extractedFromUrls: Set<string>;
    expectedLinkKeys: Set<string>;
  }>();
  const beforeDuplicateProfileUrlGroups = duplicateProfileUrlGroups(records);

  for (const record of records) {
    const canonicalKey = canonicalKeyForRecord(hospitalSlug, record);
    const canonicalDoctorId = `doctor-${hash(canonicalKey)}`;
    const existing = byCanonicalKey.get(canonicalKey);
    const sourceUrls = new Set([...(existing?.sourceUrls ?? []), stringValue(record.sourceUrl), stringValue(record.profileUrl)].filter(Boolean));
    const evidence = new Set([...(existing?.evidence ?? []), stringValue(record.sourceEvidence), stringValue(record.rawText)].filter(Boolean).map((item) => item.slice(0, 500)));
    const profileCompleteness = bestProfileCompleteness(existing?.profileCompleteness, completenessValue(record.profileCompleteness));
    const productionReady = Boolean(existing?.productionReady || (record.productionReady === true && !isFileAssetUrl(stringValue(record.profileUrl))));
    byCanonicalKey.set(canonicalKey, {
      canonicalDoctorId,
      fullName: chooseFullName(existing?.fullName, stringValue(record.fullName)),
      normalizedName: stringValue(record.normalizedName),
      profileUrl: stringValue(record.profileUrl) || existing?.profileUrl || null,
      hospitalName: stringValue(record.hospital) || existing?.hospitalName || hospitalSlug,
      provider: providerGuess(stringValue(record.hospital), stringValue(record.sourceUrl), "") || "unknown",
      titlePrefix: stringValue(record.titlePrefix) || existing?.titlePrefix || null,
      role: stringValue(record.role) || existing?.role || null,
      profileCompleteness,
      productionReady,
      sourceUrls: Array.from(sourceUrls),
      evidence: Array.from(evidence)
    });

    const rawBucket = rawBuckets.get(canonicalDoctorId) ?? {
      fullName: stringValue(record.fullName),
      rawRows: 0,
      sourceUrls: new Set<string>(),
      masterDeptRowIds: new Set<string>(),
      extractedFromUrls: new Set<string>(),
      expectedLinkKeys: new Set<string>()
    };
    rawBucket.rawRows += 1;
    if (stringValue(record.sourceUrl)) rawBucket.sourceUrls.add(stringValue(record.sourceUrl));
    if (stringValue(record.sourceUrl)) rawBucket.extractedFromUrls.add(stringValue(record.sourceUrl));
    rawBuckets.set(canonicalDoctorId, rawBucket);

    const rowIds = shouldExpandCandidateRows(record) && Array.isArray(record.matchedMasterDeptRowIds) && record.matchedMasterDeptRowIds.length > 0
      ? record.matchedMasterDeptRowIds.map(String)
      : [null];
    for (const rowId of rowIds) {
      const target = rowId ? targetsById.get(rowId) : null;
      const link: DoctorDepartmentLink = {
        canonicalDoctorId,
        masterDeptRowId: rowId,
        hospitalName: target?.hospitalNameRaw ?? stringValue(record.hospital),
        departmentName: target?.departmentNameRaw ?? null,
        specialty: target?.specialtyRaw ?? null,
        sourceUrl: target?.sourceUrlNormalized ?? null,
        extractedFromUrl: stringValue(record.sourceUrl) || null,
        matchConfidence: matchConfidenceValue(record.matchConfidence),
        matchEvidence: (record.matchEvidence as DoctorDepartmentLink["matchEvidence"]) ?? null,
        ambiguityReason: stringValue(record.ambiguityReason) || null
      };
      links.push(link);
      if (rowId) rawBucket.masterDeptRowIds.add(rowId);
      rawBucket.expectedLinkKeys.add(linkKey(link));
    }
  }

  const canonicalDoctors = Array.from(byCanonicalKey.values()).sort((left, right) => left.normalizedName.localeCompare(right.normalizedName, "he"));
  const doctorDepartmentLinks = dedupeLinks(links).sort((left, right) => left.canonicalDoctorId.localeCompare(right.canonicalDoctorId) || String(left.masterDeptRowId).localeCompare(String(right.masterDeptRowId)));
  const afterDuplicateProfileUrlGroups = duplicateCanonicalProfileUrlGroups(canonicalDoctors);
  const diagnostics = buildLinkPreservationDiagnostics(records.length, canonicalDoctors, doctorDepartmentLinks, rawBuckets, beforeDuplicateProfileUrlGroups, afterDuplicateProfileUrlGroups);
  const stats: CanonicalStats = {
    rawReviewedRows: records.length,
    canonicalDoctors: canonicalDoctors.length,
    doctorDepartmentLinks: doctorDepartmentLinks.length,
    productionReadyCanonicalDoctors: canonicalDoctors.filter((doctor) => doctor.productionReady).length,
    sourceUrlMatchLinks: doctorDepartmentLinks.filter((link) => link.matchConfidence === "sourceUrlMatch").length,
    reviewNeededLinks: doctorDepartmentLinks.filter((link) => link.matchConfidence === "reviewNeeded").length,
    expectedDistinctDoctorDepartmentLinks: diagnostics.expectedDistinctDoctorDepartmentLinks,
    rawRowsDroppedAsExactDuplicates: diagnostics.rawRowsDroppedAsExactDuplicates,
    canonicalDoctorsWithMoreThanOneSourceUrl: diagnostics.canonicalDoctorsWithMoreThanOneSourceUrl,
    canonicalDoctorsWithMoreThanOneMasterDeptCandidate: diagnostics.canonicalDoctorsWithMoreThanOneMasterDeptCandidate,
    canonicalDoctorsWithMoreThanOneExtractedFromUrl: diagnostics.canonicalDoctorsWithMoreThanOneExtractedFromUrl,
    canonicalDoctorsWhereMultipleRawRowsCollapsedIntoOneLink: diagnostics.canonicalDoctorsWhereMultipleRawRowsCollapsedIntoOneLink,
    duplicateProfileUrlGroupsBefore: beforeDuplicateProfileUrlGroups,
    duplicateProfileUrlGroupsAfter: afterDuplicateProfileUrlGroups
  };
  return { canonicalDoctors, doctorDepartmentLinks, stats, diagnostics: { ...diagnostics, ...stats } };
}

function dedupeLinks(links: DoctorDepartmentLink[]) {
  const byKey = new Map<string, DoctorDepartmentLink>();
  for (const link of links) {
    const key = linkKey(link);
    if (!byKey.has(key)) byKey.set(key, link);
  }
  return Array.from(byKey.values());
}

function linkKey(link: DoctorDepartmentLink) {
  return [
    link.canonicalDoctorId,
    link.masterDeptRowId ?? "none",
    link.extractedFromUrl ?? "none",
    link.sourceUrl ?? "none",
    link.departmentName ?? "none",
    link.specialty ?? "none",
    link.matchConfidence
  ].join("::");
}

function buildLinkPreservationDiagnostics(
  rawReviewedRows: number,
  canonicalDoctors: CanonicalDoctor[],
  doctorDepartmentLinks: DoctorDepartmentLink[],
  rawBuckets: Map<string, {
    fullName: string;
    rawRows: number;
    sourceUrls: Set<string>;
    masterDeptRowIds: Set<string>;
    extractedFromUrls: Set<string>;
    expectedLinkKeys: Set<string>;
  }>,
  duplicateProfileUrlGroupsBefore: number,
  duplicateProfileUrlGroupsAfter: number
): LinkPreservationDiagnostics {
  const linksByDoctor = new Map<string, DoctorDepartmentLink[]>();
  for (const link of doctorDepartmentLinks) {
    const links = linksByDoctor.get(link.canonicalDoctorId) ?? [];
    links.push(link);
    linksByDoctor.set(link.canonicalDoctorId, links);
  }
  let expectedDistinctDoctorDepartmentLinks = 0;
  let canonicalDoctorsWithMoreThanOneSourceUrl = 0;
  let canonicalDoctorsWithMoreThanOneMasterDeptCandidate = 0;
  let canonicalDoctorsWithMoreThanOneExtractedFromUrl = 0;
  let canonicalDoctorsWhereMultipleRawRowsCollapsedIntoOneLink = 0;
  const examples: LinkPreservationDiagnostics["examples"] = [];

  for (const doctor of canonicalDoctors) {
    const bucket = rawBuckets.get(doctor.canonicalDoctorId);
    if (!bucket) continue;
    const links = linksByDoctor.get(doctor.canonicalDoctorId) ?? [];
    expectedDistinctDoctorDepartmentLinks += bucket.expectedLinkKeys.size;
    if (bucket.sourceUrls.size > 1) canonicalDoctorsWithMoreThanOneSourceUrl += 1;
    if (bucket.masterDeptRowIds.size > 1) canonicalDoctorsWithMoreThanOneMasterDeptCandidate += 1;
    if (bucket.extractedFromUrls.size > 1) canonicalDoctorsWithMoreThanOneExtractedFromUrl += 1;
    if (bucket.rawRows > 1 && links.length === 1) {
      canonicalDoctorsWhereMultipleRawRowsCollapsedIntoOneLink += 1;
      if (examples.length < 20) {
        examples.push({
          canonicalDoctorId: doctor.canonicalDoctorId,
          fullName: doctor.fullName || bucket.fullName,
          rawRows: bucket.rawRows,
          doctorDepartmentLinks: links.length,
          distinctSourceUrls: bucket.sourceUrls.size,
          distinctMasterDeptRowIds: bucket.masterDeptRowIds.size,
          distinctExtractedFromUrls: bucket.extractedFromUrls.size,
          sourceUrls: Array.from(bucket.sourceUrls).slice(0, 5),
          masterDeptRowIds: Array.from(bucket.masterDeptRowIds).slice(0, 5),
          extractedFromUrls: Array.from(bucket.extractedFromUrls).slice(0, 5)
        });
      }
    }
  }

  return {
    rawReviewedRows,
    canonicalDoctors: canonicalDoctors.length,
    doctorDepartmentLinks: doctorDepartmentLinks.length,
    productionReadyCanonicalDoctors: canonicalDoctors.filter((doctor) => doctor.productionReady).length,
    sourceUrlMatchLinks: doctorDepartmentLinks.filter((link) => link.matchConfidence === "sourceUrlMatch").length,
    reviewNeededLinks: doctorDepartmentLinks.filter((link) => link.matchConfidence === "reviewNeeded").length,
    expectedDistinctDoctorDepartmentLinks,
    rawRowsDroppedAsExactDuplicates: Math.max(0, rawReviewedRows - expectedDistinctDoctorDepartmentLinks),
    canonicalDoctorsWithMoreThanOneSourceUrl,
    canonicalDoctorsWithMoreThanOneMasterDeptCandidate,
    canonicalDoctorsWithMoreThanOneExtractedFromUrl,
    canonicalDoctorsWhereMultipleRawRowsCollapsedIntoOneLink,
    duplicateProfileUrlGroupsBefore,
    duplicateProfileUrlGroupsAfter,
    examples
  };
}

function canonicalKeyForRecord(hospitalSlug: string, record: Record<string, unknown>) {
  const profileUrl = normalizeSourceUrl(stringValue(record.profileUrl));
  if (profileUrl) return `${hospitalSlug}::profile::${profileUrl.toLowerCase()}`;
  return `${hospitalSlug}::name::${normalizeName(stringValue(record.normalizedName) || stringValue(record.fullName))}`;
}

function shouldExpandCandidateRows(record: Record<string, unknown>) {
  if (record.matchConfidence === "sourceUrlMatch" || record.matchConfidence === "normalizedExact" || record.matchConfidence === "exact") return true;
  return record.ambiguityReason === "multipleMasterDeptSourceRows" || record.ambiguityReason === "multipleUnitSpecialtyMatches";
}

function hash(value: string) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 16);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function matchConfidenceValue(value: unknown): MasterDeptMatchConfidence {
  return value === "sourceUrlMatch" || value === "normalizedExact" || value === "exact" || value === "hospitalOnly" || value === "reviewNeeded" ? value : "reviewNeeded";
}

function completenessValue(value: unknown): CanonicalDoctor["profileCompleteness"] {
  return value === "full" || value === "partial" || value === "listOnly" ? value : "listOnly";
}

function bestProfileCompleteness(left: CanonicalDoctor["profileCompleteness"] | undefined, right: CanonicalDoctor["profileCompleteness"]) {
  const rank = { full: 3, partial: 2, listOnly: 1 };
  if (!left) return right;
  return rank[right] > rank[left] ? right : left;
}

function chooseFullName(existing: string | undefined, candidate: string) {
  if (!existing) return candidate;
  if (!candidate) return existing;
  return candidate.length < existing.length ? candidate : existing;
}

function isFileAssetUrl(value: string) {
  return /\.(png|jpe?g|gif|webp|pdf|docx?|xlsx?|pptx?)(?:[?#].*)?$/i.test(value);
}

function duplicateProfileUrlGroups(records: Array<Record<string, unknown>>) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const profileUrl = normalizeSourceUrl(stringValue(record.profileUrl));
    if (profileUrl) counts.set(profileUrl, (counts.get(profileUrl) ?? 0) + 1);
  }
  return Array.from(counts.values()).filter((count) => count > 1).length;
}

function duplicateCanonicalProfileUrlGroups(records: CanonicalDoctor[]) {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (record.profileUrl) counts.set(record.profileUrl, (counts.get(record.profileUrl) ?? 0) + 1);
  }
  return Array.from(counts.values()).filter((count) => count > 1).length;
}

export async function writeNationalPlanOutputs(
  targets: MasterDeptTarget[],
  plan: NationalHospitalPlan[],
  options: {
    wave1Results?: NationalCoverageReport["wave1Results"];
    wave1MappingBefore?: Record<string, MappingStats>;
    wave1MappingAfter?: Record<string, MappingStats>;
    canonicalStatsByHospital?: Record<string, CanonicalStats>;
    wave2SelectedHospitals?: Wave2PlanItem[];
    wave2Results?: Wave2Result[];
    wave3SelectedHospitals?: Wave3PlanItem[];
    wave3Results?: Wave3Result[];
    nationalRemainingQueue?: NationalRemainingQueueItem[];
    nationalSweepResults?: NationalSweepResult[];
    calibrationResults?: NationalSweepResult[];
    adapterPriorityResults?: NationalSweepResult[];
  } = {}
) {
  await writeJson(path.join(NATIONAL_OUTPUT_DIR, "master-dept-targets.json"), targets);
  await writeCsv(path.join(NATIONAL_OUTPUT_DIR, "master-dept-targets.csv"), targets.map((target) => ({
    masterDeptRowId: target.masterDeptRowId,
    hospitalNameRaw: target.hospitalNameRaw,
    hospitalNameNormalized: target.hospitalNameNormalized,
    departmentNameRaw: target.departmentNameRaw,
    departmentNameNormalized: target.departmentNameNormalized,
    specialtyRaw: target.specialtyRaw,
    specialtyNormalized: target.specialtyNormalized,
    city: target.city,
    district: target.district,
    sourceUrlRaw: target.sourceUrlRaw,
    sourceUrlNormalized: target.sourceUrlNormalized,
    sourceUrlStatus: target.sourceUrlStatus,
    sourceUrlPageType: target.sourceUrlPageType,
    discoveredFromMasterDeptUrl: target.discoveredFromMasterDeptUrl,
    nearbyDoctorOrTeamUrls: target.nearbyDoctorOrTeamUrls.join(" | "),
    urlInspectionEvidence: target.urlInspectionEvidence,
    providerGuess: target.providerGuess,
    institutionType: target.institutionType,
    isResidencyHospitalCandidate: target.isResidencyHospitalCandidate,
    crawlPriority: target.crawlPriority,
    crawlerStatus: target.crawlerStatus,
    deferReason: target.deferReason
  })));
  await writeJson(path.join(NATIONAL_OUTPUT_DIR, "national-crawl-plan.json"), plan);
  await writeCsv(path.join(NATIONAL_OUTPUT_DIR, "national-crawl-plan.csv"), plan.map((item) => ({ ...item, knownStartingUrls: item.knownStartingUrls.join(" | ") })));
  await writeJson(path.join(NATIONAL_OUTPUT_DIR, "national-waves.json"), buildNationalWavesWithCanonicalStats(plan, options.canonicalStatsByHospital ?? {}));
  const wave2SelectedHospitals = options.wave2SelectedHospitals ?? [];
  await writeJson(path.join(NATIONAL_OUTPUT_DIR, "wave2-plan.json"), wave2SelectedHospitals);
  await writeCsv(path.join(NATIONAL_OUTPUT_DIR, "wave2-plan.csv"), wave2SelectedHospitals.map((item) => ({ ...item, hospitalNames: item.hospitalNames.join(" | ") })));
  const wave3SelectedHospitals = options.wave3SelectedHospitals ?? [];
  await writeJson(path.join(NATIONAL_OUTPUT_DIR, "wave3-plan.json"), wave3SelectedHospitals);
  await writeCsv(path.join(NATIONAL_OUTPUT_DIR, "wave3-plan.csv"), wave3SelectedHospitals.map((item) => ({ ...item, hospitalNames: item.hospitalNames.join(" | ") })));
  const nationalRemainingQueue = options.nationalRemainingQueue ?? [];
  await writeJson(path.join(NATIONAL_OUTPUT_DIR, "national-remaining-queue.json"), nationalRemainingQueue);
  await writeCsv(path.join(NATIONAL_OUTPUT_DIR, "national-remaining-queue.csv"), nationalRemainingQueue);
  const hospitalNormalizationAudit = buildHospitalNormalizationAudit(targets);
  await writeJson(path.join(NATIONAL_OUTPUT_DIR, "hospital-normalization-audit.json"), hospitalNormalizationAudit);
  await fs.writeFile(path.join(NATIONAL_OUTPUT_DIR, "hospital-normalization-audit.md"), renderHospitalNormalizationAudit(hospitalNormalizationAudit), "utf8");
  const seedStatus = seedUrlRegistryStatus();
  const report = buildCoverageReport(targets, plan, {
    wave1Results: options.wave1Results ?? [],
    wave1MappingBefore: options.wave1MappingBefore ?? {},
    wave1MappingAfter: options.wave1MappingAfter ?? {},
    canonicalStatsByHospital: options.canonicalStatsByHospital ?? {},
    wave2SelectedHospitals,
    wave2Results: options.wave2Results ?? [],
    wave3SelectedHospitals,
    wave3Results: options.wave3Results ?? [],
    nationalRemainingQueue,
    nationalSweepResults: options.nationalSweepResults ?? [],
    calibrationResults: options.calibrationResults ?? [],
    adapterPriorityResults: options.adapterPriorityResults ?? [],
    hospitalNormalizationAudit,
    seedUrlRegistryStatus: seedStatus
  });
  await writeJson(path.join(NATIONAL_OUTPUT_DIR, "national-coverage-report.json"), report);
  await fs.writeFile(path.join(NATIONAL_OUTPUT_DIR, "national-coverage-report.md"), renderCoverageReport(report), "utf8");
  return report;
}

function countBy<T extends string>(items: T[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}

function buildHospitalNormalizationAudit(targets: MasterDeptTarget[]): HospitalNormalizationAudit {
  const byName = new Map<string, MasterDeptTarget[]>();
  for (const target of targets) {
    const key = target.hospitalNameNormalized || target.hospitalNameRaw;
    byName.set(key, [...(byName.get(key) ?? []), target]);
  }
  const entries = Array.from(byName.entries()).map(([normalizedHospitalName, rows]) => {
    const rawNames = Array.from(new Set(rows.map((row) => row.hospitalNameRaw).filter(Boolean)));
    const rawName = rawNames[0] ?? normalizedHospitalName;
    const alias = resolveHospitalAlias(rawName);
    const resolvedSlug = slugForHospitalName(rawName);
    const isOpaqueSlug = /^hospital-/.test(resolvedSlug);
    return {
      hospitalNameRaw: rawName,
      normalizedHospitalName,
      rowCount: rows.length,
      rowsWithUrls: rows.filter((row) => row.sourceUrlNormalized).length,
      resolvedSlug,
      aliasMatched: Boolean(alias),
      aliasLabels: alias?.labels ?? [],
      isOpaqueSlug,
      reason: alias
        ? `matched alias registry: ${alias.labels.join(" / ")}`
        : isOpaqueSlug
          ? "no conservative alias matched; Hebrew-only name fell back to hash slug"
          : "ASCII-safe name used as slug",
      sampleMasterDeptRowIds: rows.slice(0, 5).map((row) => row.masterDeptRowId)
    } satisfies HospitalNormalizationAuditEntry;
  }).sort((left, right) => Number(right.isOpaqueSlug) - Number(left.isOpaqueSlug) || left.resolvedSlug.localeCompare(right.resolvedSlug));
  return {
    generatedAt: new Date().toISOString(),
    totalHospitalGroups: entries.length,
    opaqueSlugCount: entries.filter((entry) => entry.isOpaqueSlug).length,
    entries
  };
}

function renderHospitalNormalizationAudit(audit: HospitalNormalizationAudit) {
  return [
    "# Hospital Normalization Audit",
    "",
    `- generatedAt: ${audit.generatedAt}`,
    `- total hospital groups: ${audit.totalHospitalGroups}`,
    `- opaque slug count: ${audit.opaqueSlugCount}`,
    "",
    "## Entries",
    ...audit.entries.map((entry) => `- ${entry.resolvedSlug}: ${entry.hospitalNameRaw}; rows=${entry.rowCount}; URLs=${entry.rowsWithUrls}; alias=${entry.aliasMatched ? entry.aliasLabels.join(" / ") : "none"}; opaque=${entry.isOpaqueSlug}; reason=${entry.reason}`)
  ].join("\n");
}

function seedUrlRegistryStatus() {
  const slugs = Array.from(new Set(hospitalSeedUrlRegistry.map((seed) => seed.hospitalSlug))).sort();
  return slugs.map((hospitalSlug) => {
    const seeds = seedUrlsForHospital(hospitalSlug);
    const safeSeeds = seeds.filter((seed) => seed.safeToUse);
    return {
      hospitalSlug,
      seedUrlCount: seeds.length,
      safeSeedUrlCount: safeSeeds.length,
      needsManualSeedUrl: seeds.length > 0 && safeSeeds.length === 0
    };
  });
}

function buildHospitalSplitReadiness(
  plan: NationalHospitalPlan[],
  options: {
    canonicalStatsByHospital: Record<string, CanonicalStats>;
    wave1Results: NationalCoverageReport["wave1Results"];
    wave2Results: Wave2Result[];
    wave3Results: Wave3Result[];
  }
) {
  const bySlug = new Map<string, HospitalSplitReadiness>();
  const planByAdapter = new Map(plan.filter((item) => item.knownAdapter).map((item) => [item.knownAdapter as string, item]));
  const add = (slug: string, hospitalName: string, legacyReadiness: string, stats: CanonicalStats | null | undefined) => {
    bySlug.set(slug, splitReadinessFor(slug, hospitalName, legacyReadiness, stats));
  };

  for (const [slug, stats] of Object.entries(options.canonicalStatsByHospital)) {
    add(slug, planByAdapter.get(slug)?.hospitalName ?? slug, planByAdapter.get(slug)?.currentReadiness ?? "needsCalibration", stats);
  }
  for (const result of options.wave1Results) {
    if (!result.hospital) continue;
    add(result.hospital, planByAdapter.get(result.hospital)?.hospitalName ?? result.hospital, result.readiness, options.canonicalStatsByHospital[result.hospital]);
  }
  for (const result of [...options.wave2Results, ...options.wave3Results]) {
    bySlug.set(result.hospital, {
      hospitalSlug: result.hospital,
      hospitalName: planByAdapter.get(result.hospital)?.hospitalName ?? result.hospital,
      crawlReadiness: result.crawlReadiness,
      mappingReadiness: result.mappingReadiness,
      outputUsability: result.outputUsability,
      canonicalDoctors: result.canonicalStats.canonicalDoctors,
      doctorDepartmentLinks: result.canonicalStats.doctorDepartmentLinks,
      sourceUrlMatchLinks: result.canonicalStats.sourceUrlMatchLinks,
      reviewNeededLinks: result.canonicalStats.reviewNeededLinks
    });
  }

  if (!bySlug.has("soroka")) {
    bySlug.set("soroka", {
      hospitalSlug: "soroka",
      hospitalName: "Soroka Medical Center",
      crawlReadiness: "needsCalibration",
      mappingReadiness: "reviewNeeded",
      outputUsability: "hospitalRoster",
      canonicalDoctors: 0,
      doctorDepartmentLinks: 0,
      sourceUrlMatchLinks: 0,
      reviewNeededLinks: 0
    });
  }
  if (!bySlug.has("sheba")) {
    bySlug.set("sheba", {
      hospitalSlug: "sheba",
      hospitalName: "Sheba Medical Center",
      crawlReadiness: "blocked",
      mappingReadiness: "blocked",
      outputUsability: "notUsableYet",
      canonicalDoctors: 0,
      doctorDepartmentLinks: 0,
      sourceUrlMatchLinks: 0,
      reviewNeededLinks: 0
    });
  }
  return Object.fromEntries(Array.from(bySlug.entries()).sort((left, right) => left[0].localeCompare(right[0])));
}

function buildCoverageReport(
  targets: MasterDeptTarget[],
  plan: NationalHospitalPlan[],
  options: {
    wave1Results: NationalCoverageReport["wave1Results"];
    wave1MappingBefore: Record<string, MappingStats>;
    wave1MappingAfter: Record<string, MappingStats>;
    canonicalStatsByHospital: Record<string, CanonicalStats>;
    wave2SelectedHospitals: Wave2PlanItem[];
    wave2Results: Wave2Result[];
    wave3SelectedHospitals: Wave3PlanItem[];
    wave3Results: Wave3Result[];
    nationalRemainingQueue: NationalRemainingQueueItem[];
    nationalSweepResults: NationalSweepResult[];
    calibrationResults: NationalSweepResult[];
    adapterPriorityResults: NationalSweepResult[];
    hospitalNormalizationAudit: HospitalNormalizationAudit;
    seedUrlRegistryStatus: NationalCoverageReport["seedUrlRegistryStatus"];
  }
): NationalCoverageReport {
  const wave1Plans = plan.filter((item) => item.wave === 1);
  const wave1Attempted = new Set(options.wave1Results.map((item) => item.hospital));
  const hospitalReadinessBySlug = buildHospitalSplitReadiness(plan, options);
  const splitEntries = Object.values(hospitalReadinessBySlug);
  const attemptedResultSlugs = new Set([
    ...options.wave1Results.map((item) => item.hospital),
    ...options.wave2Results.map((item) => item.hospital),
    ...options.wave3Results.map((item) => item.hospital),
    ...options.calibrationResults.map((item) => item.hospital),
    ...options.adapterPriorityResults.map((item) => item.hospital),
    ...options.nationalSweepResults.map((item) => item.hospital)
  ].filter(Boolean));
  const attemptedButNoDoctors = [
    ...options.wave2Results,
    ...options.wave3Results,
    ...options.calibrationResults,
    ...options.adapterPriorityResults,
    ...options.nationalSweepResults
  ].filter((item) => item.reviewedRecords === 0 || item.canonicalStats.canonicalDoctors === 0);
  const currentBlockedSlugs = new Set(splitEntries.filter((item) => item.crawlReadiness === "blocked" || item.outputUsability === "notUsableYet").map((item) => item.hospitalSlug));
  const institutionTypeBySlug = institutionTypeMapForPlan(plan);
  const typeForSlug = (slug: string) => institutionTypeBySlug.get(slug) ?? "unknown";
  const rosterEntries = splitEntries.filter((item) => item.outputUsability === "hospitalRoster" || item.outputUsability === "departmentMappedRoster");
  const blockedEntries = splitEntries.filter((item) => item.outputUsability === "notUsableYet");
  return {
    generatedAt: new Date().toISOString(),
    totalHospitals: plan.length,
    totalMasterDeptRows: targets.length,
    rowsWithUrls: targets.filter((target) => target.sourceUrlNormalized).length,
    sourceUrlStatusCounts: countBy(targets.map((target) => target.sourceUrlStatus)),
    sourceUrlPageTypeCounts: countBy(targets.map((target) => target.sourceUrlPageType)),
    nearbyDoctorOrTeamUrlRows: targets.filter((target) => target.nearbyDoctorOrTeamUrls.length > 0).length,
    hospitalsByProviderGuess: countBy(plan.map((item) => item.providerGuess)),
    hospitalsByInstitutionType: countBy(plan.map((item) => item.institutionType)),
    hospitalRosterByInstitutionType: countBy(rosterEntries.map((item) => typeForSlug(item.hospitalSlug))),
    blockedByInstitutionType: countBy(blockedEntries.map((item) => typeForSlug(item.hospitalSlug))),
    remainingUnattemptedByInstitutionType: countBy(options.nationalRemainingQueue.filter((item) => item.plannedAction !== "skipAlreadyUsable").map((item) => item.institutionType)),
    hospitalsByReadiness: countBy(plan.map((item) => item.currentReadiness)),
    hospitalsByCrawlReadiness: countBy(splitEntries.map((item) => item.crawlReadiness)),
    hospitalsByMappingReadiness: countBy(splitEntries.map((item) => item.mappingReadiness)),
    hospitalsSafeForFullBatch: plan.filter((item) => item.currentReadiness === "safeForFullBatch").map((item) => item.hospitalName),
    hospitalsPilotReady: plan.filter((item) => item.currentReadiness === "safeForPilot").map((item) => item.hospitalName),
    hospitalsNeedingAdapter: plan.filter((item) => item.currentReadiness === "needsAdapter").map((item) => item.hospitalName),
    hospitalsDeferred: plan.filter((item) => item.currentReadiness === "deferred").map((item) => ({ hospitalName: item.hospitalName, reason: item.deferReason })),
    hospitalReadinessBySlug,
    hospitalsWithWorkingDoctorRoster: splitEntries.filter((item) => item.outputUsability === "hospitalRoster" || item.outputUsability === "departmentMappedRoster").map((item) => item.hospitalSlug),
    hospitalsWithDepartmentMappedRoster: splitEntries.filter((item) => item.outputUsability === "departmentMappedRoster").map((item) => item.hospitalSlug),
    hospitalsBlocked: splitEntries.filter((item) => item.outputUsability === "notUsableYet").map((item) => item.hospitalSlug),
    shebaStatus: plan.find((item) => /שיבא|תל השומר|sheba/i.test(item.hospitalName))?.deferReason ?? "not present",
    wave1Counts: {
      masterDeptHospitalGroups: wave1Plans.length,
      attemptedHospitals: wave1Attempted.size,
      successfulHospitals: options.wave1Results.filter((item) => item.reviewedRecords && item.reviewedRecords > 0 && item.readiness !== "blocked").length,
      deferredHospitals: wave1Plans.filter((item) => item.currentReadiness === "deferred").length,
      blockedHospitals: options.wave1Results.filter((item) => item.readiness === "blocked").length
    },
    wave1MappingBefore: options.wave1MappingBefore,
    wave1MappingAfter: options.wave1MappingAfter,
    canonicalStatsByHospital: options.canonicalStatsByHospital,
    wave1Results: options.wave1Results,
    wave2SelectedHospitals: options.wave2SelectedHospitals,
    wave2Results: options.wave2Results,
    wave3SelectedHospitals: options.wave3SelectedHospitals,
    wave3Results: options.wave3Results,
    nationalRemainingQueue: options.nationalRemainingQueue,
    nationalSweepResults: options.nationalSweepResults,
    calibrationResults: options.calibrationResults,
    adapterPriorityResults: options.adapterPriorityResults,
    hospitalNormalizationAudit: options.hospitalNormalizationAudit,
    seedUrlRegistryStatus: options.seedUrlRegistryStatus,
    departmentMappedRosterCountPrevious: 14,
    departmentMappedRosterCountChangeReason:
      "Current count uses stricter outputUsability classification: only sourceUrlMapped/partiallyMapped link evidence counts as departmentMappedRoster; hospital-level/global rosters stay hospitalRoster.",
    attemptedHospitalCount: attemptedResultSlugs.size,
    usableHospitalRosterCount: splitEntries.filter((item) => item.outputUsability === "hospitalRoster" || item.outputUsability === "departmentMappedRoster").length,
    usableDepartmentMappedRosterCount: splitEntries.filter((item) => item.outputUsability === "departmentMappedRoster").length,
    safeForFullBatchCount: splitEntries.filter((item) => item.crawlReadiness === "safeForFullBatch").length,
    needsCalibrationCount: splitEntries.filter((item) => item.crawlReadiness === "needsCalibration").length,
    needsAdapterCount: plan.filter((item) => item.currentReadiness === "needsAdapter").length,
    needsManualSeedUrlCount: options.nationalRemainingQueue.filter((item) => item.needsManualSeedUrl).length,
    blockedCount: currentBlockedSlugs.size,
    deferredCount: plan.filter((item) => item.currentReadiness === "deferred").length,
    notAttemptedCount: plan.length - attemptedResultSlugs.size,
    attemptedButNoDoctorsCount: attemptedButNoDoctors.length,
    attemptedWithDepartmentMappedRosterCount: splitEntries.filter((item) => attemptedResultSlugs.has(item.hospitalSlug) && item.outputUsability === "departmentMappedRoster").length,
    attemptedWithHospitalRosterOnlyCount: splitEntries.filter((item) => attemptedResultSlugs.has(item.hospitalSlug) && item.outputUsability === "hospitalRoster").length,
    remainingUnattemptedCount: options.nationalRemainingQueue.filter((item) => item.plannedAction !== "skipAlreadyUsable").length,
    blockersByType: countBy([...options.adapterPriorityResults, ...options.nationalSweepResults].map((item) => item.blockerType)),
    topNextAdapterPriorities: options.nationalRemainingQueue
      .filter((item) => item.plannedAction === "adapterInspect" || item.expectedCrawlReadiness === "needsAdapter")
      .slice(0, 8),
    nextRecommendedWave: options.nationalSweepResults.length > 0
      ? "Continue national-sweep in batches of 10; prioritize adapterInspect hospitals with many live Master_Dept URLs."
      : options.wave3Results.length > 0
        ? "Review Wave3 output quality, then run controlled national-sweep batches; keep Sheba deferred and Soroka full batch blocked."
        : "Run Wave3 pilot for up to 5 non-Sheba, non-Soroka hospitals.",
    sorokaStatus: "Improved pilot available; full Soroka batch is not marked safe."
  };
}

function institutionTypeMapForPlan(plan: NationalHospitalPlan[]) {
  const bySlug = new Map<string, InstitutionType>();
  for (const item of plan) {
    const slug = item.knownAdapter ?? slugForHospitalName(item.hospitalName);
    bySlug.set(slug, item.institutionType);
  }
  return bySlug;
}

function renderCoverageReport(report: NationalCoverageReport) {
  return [
    "# National Hospital Crawler Coverage",
    "",
    `- generatedAt: ${report.generatedAt}`,
    `- total hospitals: ${report.totalHospitals}`,
    `- total Master_Dept rows: ${report.totalMasterDeptRows}`,
    `- rows with URLs: ${report.rowsWithUrls}`,
    `- nearby doctor/team URL rows: ${report.nearbyDoctorOrTeamUrlRows}`,
    `- attempted hospitals: ${report.attemptedHospitalCount}`,
    `- usable hospital rosters: ${report.usableHospitalRosterCount}`,
    `- usable department-mapped rosters: ${report.usableDepartmentMappedRosterCount}`,
    `- previous department-mapped rosters: ${report.departmentMappedRosterCountPrevious ?? "n/a"}`,
    `- department-mapped roster count note: ${report.departmentMappedRosterCountChangeReason}`,
    `- attempted department-mapped rosters: ${report.attemptedWithDepartmentMappedRosterCount}`,
    `- attempted hospital-roster-only: ${report.attemptedWithHospitalRosterOnlyCount}`,
    `- attempted but no doctors: ${report.attemptedButNoDoctorsCount}`,
    `- blocked hospitals: ${report.blockedCount}`,
    `- deferred hospitals: ${report.deferredCount}`,
    `- not attempted hospitals: ${report.notAttemptedCount}`,
    `- remaining unattempted queue: ${report.remainingUnattemptedCount}`,
    `- Sheba: ${report.shebaStatus}`,
    "",
    "## URL Status",
    ...Object.entries(report.sourceUrlStatusCounts).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Provider Guess",
    ...Object.entries(report.hospitalsByProviderGuess).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Institution Taxonomy",
    "- total hospital groups by type",
    ...Object.entries(report.hospitalsByInstitutionType).map(([key, value]) => `  - ${key}: ${value}`),
    "- usable roster by type",
    ...Object.entries(report.hospitalRosterByInstitutionType).map(([key, value]) => `  - ${key}: ${value}`),
    "- blocked by type",
    ...Object.entries(report.blockedByInstitutionType).map(([key, value]) => `  - ${key}: ${value}`),
    "- remaining unattempted by type",
    ...Object.entries(report.remainingUnattemptedByInstitutionType).map(([key, value]) => `  - ${key}: ${value}`),
    "",
    "## Readiness",
    ...Object.entries(report.hospitalsByReadiness).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Split Readiness",
    "- crawlReadiness",
    ...Object.entries(report.hospitalsByCrawlReadiness).map(([key, value]) => `  - ${key}: ${value}`),
    "- mappingReadiness",
    ...Object.entries(report.hospitalsByMappingReadiness).map(([key, value]) => `  - ${key}: ${value}`),
    "- usable hospital rosters: " + report.hospitalsWithWorkingDoctorRoster.join(", "),
    "- usable department-mapped rosters: " + report.hospitalsWithDepartmentMappedRoster.join(", "),
    "- not usable yet: " + report.hospitalsBlocked.join(", "),
    "",
    "## Hospital Split Readiness",
    ...Object.values(report.hospitalReadinessBySlug).map((item) => `- ${item.hospitalSlug}: crawlReadiness=${item.crawlReadiness}; mappingReadiness=${item.mappingReadiness}; output=${item.outputUsability}; canonicalDoctors=${item.canonicalDoctors}; links=${item.doctorDepartmentLinks}; sourceUrlMatch=${item.sourceUrlMatchLinks}; reviewNeeded=${item.reviewNeededLinks}`),
    "",
    "## Wave 1 Counts",
    `- Master_Dept hospital groups: ${report.wave1Counts.masterDeptHospitalGroups}`,
    `- attempted hospitals: ${report.wave1Counts.attemptedHospitals}`,
    `- successful hospitals: ${report.wave1Counts.successfulHospitals}`,
    `- deferred hospitals: ${report.wave1Counts.deferredHospitals}`,
    `- blocked hospitals: ${report.wave1Counts.blockedHospitals}`,
    "",
    "## Wave 1 Results",
    ...report.wave1Results.map((item) => `- ${item.hospital}: readiness=${item.readiness}; reviewed=${item.reviewedRecords ?? "n/a"}; productionReady=${item.productionReadyCount ?? "n/a"}; mapped=${item.mappedRecords ?? "n/a"}`),
    "",
    "## Wave 1 Mapping",
    ...Object.keys(report.wave1MappingAfter).map((hospital) => {
      const before = report.wave1MappingBefore[hospital];
      const after = report.wave1MappingAfter[hospital];
      return `- ${hospital}: sourceUrlMatch ${before?.sourceUrlMatch ?? 0} -> ${after?.sourceUrlMatch ?? 0}; reviewNeeded ${before?.reviewNeeded ?? 0} -> ${after?.reviewNeeded ?? 0}; ambiguous ${before?.ambiguousMapping ?? 0} -> ${after?.ambiguousMapping ?? 0}; unmapped ${before?.unmapped ?? 0} -> ${after?.unmapped ?? 0}`;
    }),
    "",
    "## Canonical Doctor / Link Counts",
    ...Object.entries(report.canonicalStatsByHospital).map(([hospital, stats]) => `- ${hospital}: rawReviewedRows=${stats.rawReviewedRows}; canonicalDoctors=${stats.canonicalDoctors}; doctorDepartmentLinks=${stats.doctorDepartmentLinks}; expectedDistinctLinks=${stats.expectedDistinctDoctorDepartmentLinks}; productionReadyCanonicalDoctors=${stats.productionReadyCanonicalDoctors}; sourceUrlMatchLinks=${stats.sourceUrlMatchLinks}; reviewNeededLinks=${stats.reviewNeededLinks}; rawRowsDroppedAsExactDuplicates=${stats.rawRowsDroppedAsExactDuplicates}; duplicateProfileGroups ${stats.duplicateProfileUrlGroupsBefore} -> ${stats.duplicateProfileUrlGroupsAfter}`),
    "",
    "## Wave 2 Selected",
    ...report.wave2SelectedHospitals.map((item) => `- ${item.hospitalSlug}: ${item.hospitalNames.join(" / ")}; rows=${item.masterDeptRows}; URLs=${item.rowsWithUrls}; nearby=${item.nearbyDoctorOrTeamUrlRows}; mode=${item.plannedMode}; reason=${item.whySelected}`),
    "",
    "## Wave 2 Results",
    ...report.wave2Results.map((item) => `- ${item.hospital}: readiness=${item.readiness}; crawlReadiness=${item.crawlReadiness}; mappingReadiness=${item.mappingReadiness}; output=${item.outputUsability}; reviewed=${item.reviewedRecords}; productionReady=${item.productionReadyCount}; sourceUrlMatch=${item.mappingStats.sourceUrlMatch}; reviewNeeded=${item.mappingStats.reviewNeeded}; blocker=${item.mainBlocker ?? "none"}`),
    "",
    "## Wave 3 Selected",
    ...report.wave3SelectedHospitals.map((item) => `- ${item.hospitalSlug}: ${item.hospitalNames.join(" / ")}; rows=${item.masterDeptRows}; URLs=${item.rowsWithUrls}; live=${item.liveUrlRows}; nearby=${item.nearbyDoctorOrTeamUrlRows}; expectedCrawl=${item.expectedCrawlReadiness}; expectedMapping=${item.expectedMappingReadiness}; mode=${item.plannedMode}; reason=${item.whySelected}`),
    "",
    "## Wave 3 Results",
    ...report.wave3Results.map((item) => `- ${item.hospital}: readiness=${item.readiness}; crawlReadiness=${item.crawlReadiness}; mappingReadiness=${item.mappingReadiness}; output=${item.outputUsability}; reviewed=${item.reviewedRecords}; productionReady=${item.productionReadyCount}; sourceUrlMatch=${item.mappingStats.sourceUrlMatch}; reviewNeeded=${item.mappingStats.reviewNeeded}; blocker=${item.mainBlocker ?? "none"}`),
    "",
    "## Calibration Results",
    ...report.calibrationResults.map((item) => `- ${item.hospital}: readiness=${item.readiness}; crawlReadiness=${item.crawlReadiness}; mappingReadiness=${item.mappingReadiness}; output=${item.outputUsability}; reviewed=${item.reviewedRecords}; productionReady=${item.productionReadyCount}; sourceUrlMatch=${item.mappingStats.sourceUrlMatch}; reviewNeeded=${item.mappingStats.reviewNeeded}; blocker=${item.mainBlocker ?? "none"}`),
    "",
    "## Adapter Priority Results",
    ...report.adapterPriorityResults.map((item) => `- ${item.hospital}: action=${item.plannedAction}; readiness=${item.readiness}; crawlReadiness=${item.crawlReadiness}; mappingReadiness=${item.mappingReadiness}; output=${item.outputUsability}; reviewed=${item.reviewedRecords}; productionReady=${item.productionReadyCount}; blockerType=${item.blockerType}; blocker=${item.mainBlocker ?? "none"}`),
    "",
    "## National Sweep Queue",
    ...report.nationalRemainingQueue.slice(0, 25).map((item) => `- ${item.hospitalSlug}: ${item.hospitalName}; type=${item.institutionType}; residencyCandidate=${item.isResidencyHospitalCandidate}; crawlPriority=${item.crawlPriority}; priority=${item.priority}; action=${item.plannedAction}; rows=${item.masterDeptRows}; URLs=${item.rowsWithUrls}; live=${item.liveUrlRows}; nearby=${item.nearbyDoctorOrTeamUrlRows}; expectedCrawl=${item.expectedCrawlReadiness}; expectedMapping=${item.expectedMappingReadiness}; reason=${item.reasonForPriority}`),
    "",
    "## National Sweep Results",
    ...report.nationalSweepResults.map((item) => `- ${item.hospital}: action=${item.plannedAction}; readiness=${item.readiness}; crawlReadiness=${item.crawlReadiness}; mappingReadiness=${item.mappingReadiness}; output=${item.outputUsability}; reviewed=${item.reviewedRecords}; productionReady=${item.productionReadyCount}; sourceUrlMatch=${item.mappingStats.sourceUrlMatch}; reviewNeeded=${item.mappingStats.reviewNeeded}; blockerType=${item.blockerType}; blocker=${item.mainBlocker ?? "none"}`),
    "",
    "## Hospital Normalization",
    `- opaque slug count: ${report.hospitalNormalizationAudit.opaqueSlugCount}`,
    ...report.hospitalNormalizationAudit.entries.filter((entry) => entry.isOpaqueSlug).slice(0, 20).map((entry) => `- ${entry.resolvedSlug}: ${entry.hospitalNameRaw}; rows=${entry.rowCount}; reason=${entry.reason}`),
    "",
    "## Seed URL Registry",
    ...report.seedUrlRegistryStatus.map((item) => `- ${item.hospitalSlug}: seeds=${item.seedUrlCount}; safe=${item.safeSeedUrlCount}; needsManualSeedUrl=${item.needsManualSeedUrl}`),
    "",
    "## Blockers",
    ...Object.entries(report.blockersByType).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Top Next Adapter Priorities",
    ...report.topNextAdapterPriorities.map((item) => `- ${item.hospitalSlug}: ${item.hospitalName}; rows=${item.masterDeptRows}; URLs=${item.rowsWithUrls}; live=${item.liveUrlRows}; nearby=${item.nearbyDoctorOrTeamUrlRows}; reason=${item.reasonForPriority}`),
    "",
    "## Next",
    `- ${report.nextRecommendedWave}`,
    "",
    "## Soroka",
    `- ${report.sorokaStatus}`
  ].join("\n");
}

export function buildWave2Plan(plan: NationalHospitalPlan[], targets: MasterDeptTarget[], limit = 5): Wave2PlanItem[] {
  const rowsByHospital = new Map<string, MasterDeptTarget[]>();
  for (const target of targets) {
    const key = target.hospitalNameNormalized || target.hospitalNameRaw;
    rowsByHospital.set(key, [...(rowsByHospital.get(key) ?? []), target]);
  }

  const bySlug = new Map<string, { plans: NationalHospitalPlan[]; rows: MasterDeptTarget[]; baseline: HospitalBaseline | null }>();
  for (const item of plan) {
    if (item.wave !== 2) continue;
    if (/שיבא|תל השומר|sheba/i.test(item.hospitalName)) continue;
    if (/סורוקה|soroka/i.test(item.hospitalName)) continue;
    const baseline = getHospitalBaselineSafe(item.knownAdapter) ?? baselineForTarget(rowsByHospital.get(item.normalizedHospitalName)?.[0] ?? ({} as MasterDeptTarget));
    const slug = baseline?.hospitalSlug ?? item.normalizedHospitalName.replace(/\s+/g, "-");
    const rows = rowsByHospital.get(item.normalizedHospitalName) ?? [];
    const existing = bySlug.get(slug);
    bySlug.set(slug, {
      plans: [...(existing?.plans ?? []), item],
      rows: [...(existing?.rows ?? []), ...rows],
      baseline: existing?.baseline ?? baseline
    });
  }

  return Array.from(bySlug.entries())
    .map(([hospitalSlug, value]) => {
      const rowsWithUrls = value.rows.filter((row) => row.sourceUrlNormalized).length;
      const liveUrlRows = value.rows.filter((row) => row.sourceUrlStatus === "live" || row.sourceUrlStatus === "redirected").length;
      const nearbyDoctorOrTeamUrlRows = value.rows.filter((row) => row.nearbyDoctorOrTeamUrls.length > 0).length;
      const directStaffRows = value.rows.filter((row) => row.sourceUrlPageType === "teamPage" || row.sourceUrlPageType === "doctorsPage").length;
      const why = [
        value.baseline ? `known adapter ${value.baseline.hospitalSlug}` : "no baseline adapter yet",
        rowsWithUrls ? `${rowsWithUrls} Master_Dept URLs` : "no Master_Dept URLs",
        liveUrlRows ? `${liveUrlRows} live inspected URLs` : "URLs pending inspection",
        nearbyDoctorOrTeamUrlRows ? `${nearbyDoctorOrTeamUrlRows} nearby doctor/team URLs` : null,
        directStaffRows ? `${directStaffRows} direct staff/doctors URLs` : null
      ].filter(Boolean).join("; ");
      return {
        hospitalSlug,
        hospitalNames: Array.from(new Set(value.plans.map((item) => item.hospitalName))),
        providerGuess: majority(value.plans.map((item) => item.providerGuess)),
        masterDeptRows: value.rows.length,
        rowsWithUrls,
        liveUrlRows,
        nearbyDoctorOrTeamUrlRows,
        adapterParserFamily: value.baseline?.parserFamilies.join("+") ?? "adapter-needed",
        whySelected: why,
        plannedMode: "pilot only" as const
      };
    })
    .filter((item) => item.adapterParserFamily !== "adapter-needed")
    .filter((item) => item.rowsWithUrls > 0 || item.hospitalSlug === "rabin" || item.hospitalSlug === "carmel")
    .sort((left, right) => {
      const leftKnown = left.adapterParserFamily === "adapter-needed" ? 0 : 1;
      const rightKnown = right.adapterParserFamily === "adapter-needed" ? 0 : 1;
      return rightKnown - leftKnown || right.nearbyDoctorOrTeamUrlRows - left.nearbyDoctorOrTeamUrlRows || right.liveUrlRows - left.liveUrlRows || right.rowsWithUrls - left.rowsWithUrls;
    })
    .slice(0, limit);
}

export function buildWave3Plan(plan: NationalHospitalPlan[], targets: MasterDeptTarget[], limit = 5): Wave3PlanItem[] {
  const handledSlugs = new Set(["ichilov", "hadassah", "meir", "rabin", "carmel", "emek", "kaplan", "soroka", "sheba"]);
  const rowsByHospital = new Map<string, MasterDeptTarget[]>();
  for (const target of targets) {
    const key = target.hospitalNameNormalized || target.hospitalNameRaw;
    rowsByHospital.set(key, [...(rowsByHospital.get(key) ?? []), target]);
  }

  const bySlug = new Map<string, { plans: NationalHospitalPlan[]; rows: MasterDeptTarget[]; baseline: HospitalBaseline | null }>();
  for (const item of plan) {
    const rows = rowsByHospital.get(item.normalizedHospitalName) ?? [];
    const baseline = getHospitalBaselineSafe(item.knownAdapter) ?? baselineForTarget(rows[0] ?? ({} as MasterDeptTarget));
    if (!baseline || handledSlugs.has(baseline.hospitalSlug)) continue;
    if (/שיבא|תל השומר|sheba|סורוקה|soroka/i.test(item.hospitalName)) continue;
    if (item.wave !== 3) continue;
    const existing = bySlug.get(baseline.hospitalSlug);
    bySlug.set(baseline.hospitalSlug, {
      plans: [...(existing?.plans ?? []), item],
      rows: [...(existing?.rows ?? []), ...rows],
      baseline: existing?.baseline ?? baseline
    });
  }

  return Array.from(bySlug.entries())
    .map(([hospitalSlug, value]) => {
      const rowsWithUrls = value.rows.filter((row) => row.sourceUrlNormalized).length;
      const liveUrlRows = value.rows.filter((row) => row.sourceUrlStatus === "live" || row.sourceUrlStatus === "redirected").length;
      const nearbyDoctorOrTeamUrlRows = value.rows.filter((row) => row.nearbyDoctorOrTeamUrls.length > 0).length;
      const directStaffRows = value.rows.filter((row) => row.sourceUrlPageType === "teamPage" || row.sourceUrlPageType === "doctorsPage").length;
      const expectedMappingReadiness: MappingReadinessStatus = directStaffRows || nearbyDoctorOrTeamUrlRows ? "partiallyMapped" : "reviewNeeded";
      const why = [
        `Wave3 baseline ${hospitalSlug}`,
        `${rowsWithUrls} Master_Dept URLs`,
        liveUrlRows ? `${liveUrlRows} live inspected URLs` : "URLs pending inspection",
        nearbyDoctorOrTeamUrlRows ? `${nearbyDoctorOrTeamUrlRows} nearby doctor/team URLs` : null,
        directStaffRows ? `${directStaffRows} direct staff/doctors URLs` : null
      ].filter(Boolean).join("; ");
      return {
        hospitalSlug,
        hospitalNames: Array.from(new Set(value.plans.map((item) => item.hospitalName))),
        providerGuess: majority(value.plans.map((item) => item.providerGuess)),
        masterDeptRows: value.rows.length,
        rowsWithUrls,
        liveUrlRows,
        nearbyDoctorOrTeamUrlRows,
        adapterParserFamily: value.baseline?.parserFamilies.join("+") ?? "adapter-needed",
        whySelected: why,
        expectedCrawlReadiness: "pilotReady" as const,
        expectedMappingReadiness,
        plannedMode: "pilot only" as const
      };
    })
    .filter((item) => item.rowsWithUrls > 0)
    .sort((left, right) =>
      right.nearbyDoctorOrTeamUrlRows - left.nearbyDoctorOrTeamUrlRows ||
      right.liveUrlRows - left.liveUrlRows ||
      right.rowsWithUrls - left.rowsWithUrls ||
      right.masterDeptRows - left.masterDeptRows
    )
    .slice(0, limit);
}

const defaultHandledSlugs = new Set([
  "ichilov",
  "hadassah",
  "meir",
  "rabin",
  "carmel",
  "emek",
  "kaplan",
  "shamir",
  "maayanei-hayeshua",
  "galilee",
  "laniado",
  "hillel-yaffe",
  "barzilai",
  "holy-family",
  "saint-vincent",
  "poria",
  "nazareth-scottish",
  "bnei-zion",
  "schneider",
  "assuta-ashdod",
  "ziv"
]);

const defaultDeferredSlugs = new Set(["sheba", "soroka", "wolfson"]);

function slugForHospitalName(hospitalName: string) {
  const aliasSlug = slugForHospitalAlias(hospitalName);
  if (aliasSlug) return aliasSlug;
  const ascii = hospitalName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return ascii || `hospital-${hash(normalizeName(hospitalName)).slice(0, 10)}`;
}

function rowsForPlanItem(item: NationalHospitalPlan, targets: MasterDeptTarget[]) {
  return targets.filter((target) => target.hospitalNameNormalized === item.normalizedHospitalName);
}

export function buildNationalRemainingQueue(
  plan: NationalHospitalPlan[],
  targets: MasterDeptTarget[],
  options: { handledSlugs?: Set<string>; deferredSlugs?: Set<string> } = {}
): NationalRemainingQueueItem[] {
  const handledSlugs = new Set([...defaultHandledSlugs, ...(options.handledSlugs ?? [])]);
  const deferredSlugs = new Set([...defaultDeferredSlugs, ...(options.deferredSlugs ?? [])]);

  return plan
    .map((item) => {
      const rows = rowsForPlanItem(item, targets);
      const baseline = getHospitalBaselineSafe(item.knownAdapter) ?? baselineForTarget(rows[0] ?? ({} as MasterDeptTarget));
      const hospitalSlug = baseline?.hospitalSlug ?? slugForHospitalName(item.hospitalName);
      const rowsWithUrls = rows.filter((row) => row.sourceUrlNormalized).length;
      const liveUrlRows = rows.filter((row) => row.sourceUrlStatus === "live" || row.sourceUrlStatus === "redirected").length;
      const nearbyDoctorOrTeamUrlRows = rows.filter((row) => row.nearbyDoctorOrTeamUrls.length > 0).length;
      const directStaffRows = rows.filter((row) => row.sourceUrlPageType === "teamPage" || row.sourceUrlPageType === "doctorsPage").length;
      const existingAdapterParserFamily = baseline?.parserFamilies.join("+") ?? null;
      const institutionType = majority(rows.map((row) => row.institutionType));
      const isResidencyHospitalCandidate = rows.some((row) => row.isResidencyHospitalCandidate);
      const crawlPriority = highestCrawlPriority(rows.map((row) => row.crawlPriority));
      const seedUrlCount = seedUrlsForHospital(hospitalSlug).length;
      const safeSeedUrlCount = safeSeedUrlsForHospital(hospitalSlug).length;
      const needsManualSeedUrl = rowsWithUrls === 0 && seedUrlCount > 0 && safeSeedUrlCount === 0;
      const expectedMappingReadiness: MappingReadinessStatus = nearbyDoctorOrTeamUrlRows || directStaffRows
        ? "partiallyMapped"
        : rowsWithUrls > 0
          ? "reviewNeeded"
          : safeSeedUrlCount > 0
            ? "hospitalRosterOnly"
            : "blocked";
      let plannedAction: NationalRemainingQueueItem["plannedAction"] = "pilot";
      let expectedCrawlReadiness: CrawlReadinessStatus = "pilotReady";
      if (handledSlugs.has(hospitalSlug)) {
        plannedAction = "skipAlreadyUsable";
        expectedCrawlReadiness = item.crawlReadiness;
      } else if (deferredSlugs.has(hospitalSlug) || /שיבא|תל השומר|סורוקה/i.test(item.hospitalName)) {
        plannedAction = "defer";
        expectedCrawlReadiness = "blocked";
      } else if (rowsWithUrls === 0 && safeSeedUrlCount === 0) {
        plannedAction = "adapterInspect";
        expectedCrawlReadiness = "needsAdapter";
      }
      const score = nearbyDoctorOrTeamUrlRows * 3 + liveUrlRows * 2 + directStaffRows * 2 + rowsWithUrls;
      const priority: NationalRemainingQueueItem["priority"] =
        plannedAction !== "pilot" ? "low" : score >= 20 ? "high" : score >= 6 ? "medium" : "low";
      const reasonForPriority = [
        plannedAction === "skipAlreadyUsable" ? "already has usable prior output" : null,
        plannedAction === "defer" ? "explicitly deferred hard case" : null,
        plannedAction === "adapterInspect" && needsManualSeedUrl ? "public seed URL exists but is not marked safe; manual verification required" : null,
        plannedAction === "adapterInspect" && !needsManualSeedUrl ? "no row URLs or no direct pilot source; adapter inspection first" : null,
        rowsWithUrls ? `${rowsWithUrls} Master_Dept URLs` : "no Master_Dept URLs",
        liveUrlRows ? `${liveUrlRows} live/redirected URLs` : null,
        nearbyDoctorOrTeamUrlRows ? `${nearbyDoctorOrTeamUrlRows} nearby doctor/team rows` : null,
        directStaffRows ? `${directStaffRows} direct staff/doctors URLs` : null,
        seedUrlCount ? `${safeSeedUrlCount}/${seedUrlCount} safe seed URLs` : null,
        existingAdapterParserFamily ? `parser=${existingAdapterParserFamily}` : "synthetic generic parser"
      ].filter(Boolean).join("; ");
      return {
        hospitalName: item.hospitalName,
        hospitalSlug,
        providerGuess: item.providerGuess,
        masterDeptRows: item.masterDeptRows,
        rowsWithUrls,
        liveUrlRows,
        nearbyDoctorOrTeamUrlRows,
        existingAdapterParserFamily,
        institutionType,
        isResidencyHospitalCandidate,
        crawlPriority,
        seedUrlCount,
        safeSeedUrlCount,
        needsManualSeedUrl,
        expectedCrawlReadiness,
        expectedMappingReadiness,
        priority,
        reasonForPriority,
        plannedAction
      } satisfies NationalRemainingQueueItem;
    })
    .sort((left, right) => {
      const actionRank = (item: NationalRemainingQueueItem) => item.plannedAction === "pilot" ? 3 : item.plannedAction === "adapterInspect" ? 2 : item.plannedAction === "defer" ? 1 : 0;
      const priorityRank = (item: NationalRemainingQueueItem) => item.priority === "high" ? 3 : item.priority === "medium" ? 2 : 1;
      return actionRank(right) - actionRank(left) ||
        priorityRank(right) - priorityRank(left) ||
        right.nearbyDoctorOrTeamUrlRows - left.nearbyDoctorOrTeamUrlRows ||
        right.liveUrlRows - left.liveUrlRows ||
        right.rowsWithUrls - left.rowsWithUrls ||
        right.masterDeptRows - left.masterDeptRows;
    });
}

export function buildSyntheticBaselineForQueueItem(item: NationalRemainingQueueItem, targets: MasterDeptTarget[]): HospitalBaseline {
  const rows = targets.filter((target) => slugForHospitalName(target.hospitalNameRaw) === item.hospitalSlug || normalizeName(target.hospitalNameRaw) === normalizeName(item.hospitalName));
  const sourceUrls = Array.from(new Set(rows.map((row) => row.sourceUrlNormalized).filter(Boolean) as string[]));
  const nearbyUrls = Array.from(new Set(rows.flatMap((row) => row.nearbyDoctorOrTeamUrls)));
  const registrySeedUrls = safeSeedUrlsForHospital(item.hospitalSlug).map((seed) => seed.seedUrl);
  const directStaffUrls = sourceUrls.filter((url) => /(doctors?|physicians?|team|staff|specialists?|רופאים|רופא|צוות|סגל|מומחים)/i.test(decodeURIComponent(url)));
  const pilotUrlCandidates = Array.from(new Set([...directStaffUrls, ...nearbyUrls, ...sourceUrls, ...registrySeedUrls])).slice(0, 8);
  const homepageUrl = pilotUrlCandidates[0] ?? sourceUrls[0] ?? "https://example.invalid/";
  const provider: WebsiteFamily = rows[0]?.providerGuess === "clalit" ? "clalit" : "unknown";
  return {
    hospitalSlug: item.hospitalSlug,
    hospitalName: item.hospitalName,
    hospitalHebrew: item.hospitalName,
    provider,
    websiteFamily: provider,
    homepageUrl,
    departmentsIndexUrlCandidates: sourceUrls.slice(0, 10),
    doctorIndexUrlCandidates: [],
    pilotUrlCandidates,
    parserFamilies: provider === "clalit" ? ["teamPage", "inlineStaff", "classicDoctorCards"] : ["staticTeamPage", "inlineStaff", "teamPage", "unknown"],
    notes: ["Synthetic Master_Dept-seeded baseline for controlled national sweep."]
  };
}

function getHospitalBaselineSafe(slug: string | null) {
  if (!slug) return null;
  try {
    return getHospitalBaseline(slug);
  } catch {
    return null;
  }
}

export async function buildMasterDeptNationalPlan(options: { inspectWave1Urls?: boolean } = {}) {
  const targets = await loadMasterDeptTargets();
  if (options.inspectWave1Urls) {
    const initialPlan = buildNationalHospitalPlan(targets);
    await inspectMasterDeptTargets(targets, { hospitalNames: initialPlan.filter((item) => item.wave === 1).map((item) => item.hospitalName), limit: 80 });
  }
  const plan = buildNationalHospitalPlan(targets);
  const report = await writeNationalPlanOutputs(targets, plan);
  return { targets, plan, report };
}

export function nationalPlanSummary(targets: MasterDeptTarget[], plan: NationalHospitalPlan[], report: NationalCoverageReport) {
  return {
    totalTargets: targets.length,
    targetsWithUrls: targets.filter((target) => target.sourceUrlNormalized).length,
    totalHospitals: plan.length,
    waveCounts: countBy(plan.map((item) => `wave${item.wave}`)),
    providerGuess: report.hospitalsByProviderGuess,
    readiness: report.hospitalsByReadiness,
    crawlReadiness: report.hospitalsByCrawlReadiness,
    mappingReadiness: report.hospitalsByMappingReadiness,
    safeForFullBatch: report.hospitalsSafeForFullBatch,
    hospitalRosters: report.hospitalsWithWorkingDoctorRoster,
    departmentMappedRosters: report.hospitalsWithDepartmentMappedRoster,
    deferred: report.hospitalsDeferred
  };
}
