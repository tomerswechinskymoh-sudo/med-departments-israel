import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { discoverCandidatePages, fetchPublicHtml, inspectHtml } from "./adapters/generic-public-site";
import { getHospitalBaseline, hospitalBaselines } from "./baseline-registry";
import type {
  CandidatePage,
  CanonicalDoctor,
  DoctorDepartmentLink,
  HospitalBaseline,
  HospitalPilotEvaluation,
  MasterDeptMatchConfidence,
  MasterDeptMatchEvidence,
  MasterDeptSourceUrlPageType,
  MasterDeptSourceUrlStatus,
  MasterDeptTarget,
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
  hospitalsByReadiness: Record<string, number>;
  hospitalsSafeForFullBatch: string[];
  hospitalsPilotReady: string[];
  hospitalsNeedingAdapter: string[];
  hospitalsDeferred: Array<{ hospitalName: string; reason: string | null }>;
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
  sorokaStatus: string;
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

export type Wave2Result = {
  hospital: string;
  readiness: string;
  reviewedRecords: number;
  productionReadyCount: number;
  mappedRecords: number;
  mappingStats: MappingStats;
  canonicalStats: CanonicalStats;
  mainBlocker: string | null;
};

export type CanonicalStats = {
  canonicalDoctors: number;
  doctorDepartmentLinks: number;
  productionReadyCanonicalDoctors: number;
  sourceUrlMatchLinks: number;
  reviewNeededLinks: number;
  duplicateProfileUrlGroupsBefore: number;
  duplicateProfileUrlGroupsAfter: number;
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
  return normalizeWhitespace(value)
    .replace(/[׳'״"]/g, "")
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/\b(המרכז|מרכז|הרפואי|בית|חולים|בי\"ח|ביהח|ע\"ש|עש)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
      const directStaffUrlCount = items.filter((item) => item.sourceUrlPageType === "teamPage" || item.sourceUrlPageType === "doctorsPage").length;
      const departmentUrlCount = items.filter((item) => item.sourceUrlNormalized && item.sourceUrlPageType !== "teamPage" && item.sourceUrlPageType !== "doctorsPage").length;
      const pendingUrlCount = items.filter((item) => item.sourceUrlStatus === "pending").length;
      const readiness = readinessForHospital(first, baseline);
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

function readinessForHospital(target: MasterDeptTarget, baseline: HospitalBaseline | null): NationalHospitalPlan["currentReadiness"] {
  if (target.crawlerStatus === "deferred") return "deferred";
  if (target.providerGuess === "ichilov" || target.providerGuess === "hadassah" || baseline?.hospitalSlug === "ichilov" || baseline?.hospitalSlug === "hadassah" || baseline?.hospitalSlug === "meir") return "safeForFullBatch";
  if (baseline?.provider === "clalit") return "safeForPilot";
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
    return stats ? { ...item, canonicalStatsSourceHospitalSlug: slug, canonicalStats: stats } : item;
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
      canonicalDoctors: 0,
      doctorDepartmentLinks: 0,
      productionReadyCanonicalDoctors: 0,
      sourceUrlMatchLinks: 0,
      reviewNeededLinks: 0,
      duplicateProfileUrlGroupsBefore: 0,
      duplicateProfileUrlGroupsAfter: 0
    };
  }
}

async function writeCanonicalOutputs(hospitalSlug: string, records: Array<Record<string, unknown>>, targets: MasterDeptTarget[]) {
  const canonical = canonicalizeDoctors(hospitalSlug, records, targets);
  const outputDir = path.join(NATIONAL_OUTPUT_DIR, hospitalSlug, "canonical");
  await writeJson(path.join(outputDir, "canonical-doctors.json"), canonical.canonicalDoctors);
  await writeJson(path.join(outputDir, "doctor-department-links.json"), canonical.doctorDepartmentLinks);
  await writeJson(path.join(outputDir, "summary.json"), canonical.stats);
  return canonical;
}

function canonicalizeDoctors(hospitalSlug: string, records: Array<Record<string, unknown>>, targets: MasterDeptTarget[]) {
  const targetsById = new Map(targets.map((target) => [target.masterDeptRowId, target]));
  const byCanonicalKey = new Map<string, CanonicalDoctor>();
  const links: DoctorDepartmentLink[] = [];
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

    const rowIds = shouldExpandCandidateRows(record) && Array.isArray(record.matchedMasterDeptRowIds) && record.matchedMasterDeptRowIds.length > 0
      ? record.matchedMasterDeptRowIds.map(String)
      : [null];
    for (const rowId of rowIds) {
      const target = rowId ? targetsById.get(rowId) : null;
      links.push({
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
      });
    }
  }

  const canonicalDoctors = Array.from(byCanonicalKey.values()).sort((left, right) => left.normalizedName.localeCompare(right.normalizedName, "he"));
  const doctorDepartmentLinks = dedupeLinks(links).sort((left, right) => left.canonicalDoctorId.localeCompare(right.canonicalDoctorId) || String(left.masterDeptRowId).localeCompare(String(right.masterDeptRowId)));
  const afterDuplicateProfileUrlGroups = duplicateCanonicalProfileUrlGroups(canonicalDoctors);
  const stats: CanonicalStats = {
    canonicalDoctors: canonicalDoctors.length,
    doctorDepartmentLinks: doctorDepartmentLinks.length,
    productionReadyCanonicalDoctors: canonicalDoctors.filter((doctor) => doctor.productionReady).length,
    sourceUrlMatchLinks: doctorDepartmentLinks.filter((link) => link.matchConfidence === "sourceUrlMatch").length,
    reviewNeededLinks: doctorDepartmentLinks.filter((link) => link.matchConfidence === "reviewNeeded").length,
    duplicateProfileUrlGroupsBefore: beforeDuplicateProfileUrlGroups,
    duplicateProfileUrlGroupsAfter: afterDuplicateProfileUrlGroups
  };
  return { canonicalDoctors, doctorDepartmentLinks, stats };
}

function dedupeLinks(links: DoctorDepartmentLink[]) {
  const byKey = new Map<string, DoctorDepartmentLink>();
  for (const link of links) {
    const key = [link.canonicalDoctorId, link.masterDeptRowId ?? "none", link.extractedFromUrl ?? "none", link.matchConfidence].join("::");
    if (!byKey.has(key)) byKey.set(key, link);
  }
  return Array.from(byKey.values());
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
    crawlerStatus: target.crawlerStatus,
    deferReason: target.deferReason
  })));
  await writeJson(path.join(NATIONAL_OUTPUT_DIR, "national-crawl-plan.json"), plan);
  await writeCsv(path.join(NATIONAL_OUTPUT_DIR, "national-crawl-plan.csv"), plan.map((item) => ({ ...item, knownStartingUrls: item.knownStartingUrls.join(" | ") })));
  await writeJson(path.join(NATIONAL_OUTPUT_DIR, "national-waves.json"), buildNationalWavesWithCanonicalStats(plan, options.canonicalStatsByHospital ?? {}));
  const wave2SelectedHospitals = options.wave2SelectedHospitals ?? [];
  await writeJson(path.join(NATIONAL_OUTPUT_DIR, "wave2-plan.json"), wave2SelectedHospitals);
  await writeCsv(path.join(NATIONAL_OUTPUT_DIR, "wave2-plan.csv"), wave2SelectedHospitals.map((item) => ({ ...item, hospitalNames: item.hospitalNames.join(" | ") })));
  const report = buildCoverageReport(targets, plan, {
    wave1Results: options.wave1Results ?? [],
    wave1MappingBefore: options.wave1MappingBefore ?? {},
    wave1MappingAfter: options.wave1MappingAfter ?? {},
    canonicalStatsByHospital: options.canonicalStatsByHospital ?? {},
    wave2SelectedHospitals,
    wave2Results: options.wave2Results ?? []
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
  }
): NationalCoverageReport {
  const wave1Plans = plan.filter((item) => item.wave === 1);
  const wave1Attempted = new Set(options.wave1Results.map((item) => item.hospital));
  return {
    generatedAt: new Date().toISOString(),
    totalHospitals: plan.length,
    totalMasterDeptRows: targets.length,
    rowsWithUrls: targets.filter((target) => target.sourceUrlNormalized).length,
    sourceUrlStatusCounts: countBy(targets.map((target) => target.sourceUrlStatus)),
    sourceUrlPageTypeCounts: countBy(targets.map((target) => target.sourceUrlPageType)),
    nearbyDoctorOrTeamUrlRows: targets.filter((target) => target.nearbyDoctorOrTeamUrls.length > 0).length,
    hospitalsByProviderGuess: countBy(plan.map((item) => item.providerGuess)),
    hospitalsByReadiness: countBy(plan.map((item) => item.currentReadiness)),
    hospitalsSafeForFullBatch: plan.filter((item) => item.currentReadiness === "safeForFullBatch").map((item) => item.hospitalName),
    hospitalsPilotReady: plan.filter((item) => item.currentReadiness === "safeForPilot").map((item) => item.hospitalName),
    hospitalsNeedingAdapter: plan.filter((item) => item.currentReadiness === "needsAdapter").map((item) => item.hospitalName),
    hospitalsDeferred: plan.filter((item) => item.currentReadiness === "deferred").map((item) => ({ hospitalName: item.hospitalName, reason: item.deferReason })),
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
    sorokaStatus: "Improved pilot available; full Soroka batch is not marked safe."
  };
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
    `- Sheba: ${report.shebaStatus}`,
    "",
    "## URL Status",
    ...Object.entries(report.sourceUrlStatusCounts).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Provider Guess",
    ...Object.entries(report.hospitalsByProviderGuess).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Readiness",
    ...Object.entries(report.hospitalsByReadiness).map(([key, value]) => `- ${key}: ${value}`),
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
    ...Object.entries(report.canonicalStatsByHospital).map(([hospital, stats]) => `- ${hospital}: canonicalDoctors=${stats.canonicalDoctors}; doctorDepartmentLinks=${stats.doctorDepartmentLinks}; productionReadyCanonicalDoctors=${stats.productionReadyCanonicalDoctors}; sourceUrlMatchLinks=${stats.sourceUrlMatchLinks}; reviewNeededLinks=${stats.reviewNeededLinks}; duplicateProfileGroups ${stats.duplicateProfileUrlGroupsBefore} -> ${stats.duplicateProfileUrlGroupsAfter}`),
    "",
    "## Wave 2 Selected",
    ...report.wave2SelectedHospitals.map((item) => `- ${item.hospitalSlug}: ${item.hospitalNames.join(" / ")}; rows=${item.masterDeptRows}; URLs=${item.rowsWithUrls}; nearby=${item.nearbyDoctorOrTeamUrlRows}; mode=${item.plannedMode}; reason=${item.whySelected}`),
    "",
    "## Wave 2 Results",
    ...report.wave2Results.map((item) => `- ${item.hospital}: readiness=${item.readiness}; reviewed=${item.reviewedRecords}; productionReady=${item.productionReadyCount}; sourceUrlMatch=${item.mappingStats.sourceUrlMatch}; reviewNeeded=${item.mappingStats.reviewNeeded}; blocker=${item.mainBlocker ?? "none"}`),
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
    safeForFullBatch: report.hospitalsSafeForFullBatch,
    deferred: report.hospitalsDeferred
  };
}
