import fs from "node:fs/promises";
import path from "node:path";
import { discoverCandidatePages, fetchPublicHtml, inspectHtml } from "./adapters/generic-public-site";
import { getHospitalBaseline, hospitalBaselines } from "./baseline-registry";
import type {
  CandidatePage,
  HospitalBaseline,
  MasterDeptMatchConfidence,
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
  hospitalsByProviderGuess: Record<string, number>;
  hospitalsByReadiness: Record<string, number>;
  hospitalsSafeForFullBatch: string[];
  hospitalsPilotReady: string[];
  hospitalsNeedingAdapter: string[];
  hospitalsDeferred: Array<{ hospitalName: string; reason: string | null }>;
  shebaStatus: string;
  wave1Results: Array<{
    hospital: string;
    readiness: string;
    reviewedRecords: number | null;
    productionReadyCount: number | null;
    mappedRecords: number | null;
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
  return {
    generatedAt: new Date().toISOString(),
    waves: [
      { wave: 1, label: "Proven safe adapters", hospitals: plan.filter((item) => item.wave === 1) },
      { wave: 2, label: "Other Clalit hospitals", hospitals: plan.filter((item) => item.wave === 2) },
      { wave: 3, label: "Government/private generic parser candidates", hospitals: plan.filter((item) => item.wave === 3) },
      { wave: 4, label: "Deferred hard cases", hospitals: plan.filter((item) => item.wave === 4) }
    ]
  };
}

export function matchDoctorToMasterDept(doctor: { hospital: string; sourceUrl: string; unit: string | null; rawText: string }, targets: MasterDeptTarget[]) {
  const hospital = normalizeName(doctor.hospital);
  const source = normalizeSourceUrl(doctor.sourceUrl);
  const doctorProvider = providerGuess(doctor.hospital, doctor.sourceUrl, "");
  const hospitalTargets = targets.filter((target) => targetMatchesDoctorHospital(target, hospital, doctor.hospital, doctorProvider));
  const directSourceMatches = targets.filter((target) => target.sourceUrlNormalized && source && target.sourceUrlNormalized === source);
  if (directSourceMatches.length > 0) return matchResult(directSourceMatches, "sourceUrlMatch", `Master_Dept URL=${directSourceMatches[0].sourceUrlNormalized}; doctor source=${source}`);
  const childSourceMatches = targets.filter((target) => source && target.sourceUrlNormalized && target.nearbyDoctorOrTeamUrls.includes(source) && sameDepartmentPath(target.sourceUrlNormalized, source));
  if (childSourceMatches.length === 1) {
    return matchResult(childSourceMatches, "sourceUrlMatch", `Master_Dept URL=${childSourceMatches[0].sourceUrlNormalized}; discovered child URL=${source}`);
  }
  if (childSourceMatches.length > 1) {
    return matchResult(childSourceMatches, "reviewNeeded", `ambiguous Master_Dept child URL=${source}; candidates=${childSourceMatches.length}`);
  }

  const unit = normalizeName(doctor.unit ?? "");
  if (unit) {
    const exact = hospitalTargets.filter((target) => target.departmentNameNormalized && target.departmentNameNormalized === unit);
    if (exact.length > 0) return matchResult(exact, "normalizedExact", `unit=${doctor.unit}`);
    const specialty = hospitalTargets.filter((target) => target.specialtyNormalized && unit.includes(target.specialtyNormalized));
    if (specialty.length === 1) return matchResult(specialty, "exact", `unit specialty match=${doctor.unit}`);
    if (specialty.length > 1) return matchResult(specialty, "reviewNeeded", `ambiguous unit specialty match=${doctor.unit}`);
  }

  if (hospitalTargets.length === 1) return matchResult(hospitalTargets, "hospitalOnly", `hospital=${doctor.hospital}`);
  if (hospitalTargets.length > 1) return matchResult(hospitalTargets, "reviewNeeded", `hospital=${doctor.hospital}; candidates=${hospitalTargets.length}`);
  return matchResult([], "reviewNeeded", `no Master_Dept match for hospital=${doctor.hospital}`);
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
  return false;
}

function matchResult(targets: MasterDeptTarget[], confidence: MasterDeptMatchConfidence, evidence: string) {
  return {
    matchedMasterHospitalName: targets[0]?.hospitalNameRaw ?? null,
    matchedMasterDeptRowIds: targets.map((target) => target.masterDeptRowId),
    matchedMasterDepartmentNames: Array.from(new Set(targets.map((target) => target.departmentNameRaw).filter(Boolean))),
    matchedMasterSpecialties: Array.from(new Set(targets.map((target) => target.specialtyRaw).filter(Boolean))),
    matchConfidence: confidence,
    matchEvidence: evidence
  };
}

export async function applyMasterDeptMappingToReviewed(hospitalSlug: string, targets: MasterDeptTarget[]) {
  const filePath = path.join(NATIONAL_OUTPUT_DIR, hospitalSlug, "reviewed", "doctors-reviewed.json");
  const raw = await fs.readFile(filePath, "utf8");
  const doctors = JSON.parse(raw) as Array<Record<string, unknown> & { hospital: string; sourceUrl: string; unit: string | null; rawText: string }>;
  const mapped = doctors.map((doctor) => ({ ...doctor, ...matchDoctorToMasterDept(doctor, targets) }));
  await writeJson(filePath, mapped);
  return {
    hospitalSlug,
    reviewedRecords: mapped.length,
    mappedRecords: mapped.filter((doctor) => Array.isArray(doctor.matchedMasterDeptRowIds) && doctor.matchedMasterDeptRowIds.length > 0).length
  };
}

export async function writeNationalPlanOutputs(targets: MasterDeptTarget[], plan: NationalHospitalPlan[], wave1Results: NationalCoverageReport["wave1Results"] = []) {
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
  await writeJson(path.join(NATIONAL_OUTPUT_DIR, "national-waves.json"), buildNationalWaves(plan));
  const report = buildCoverageReport(targets, plan, wave1Results);
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

function buildCoverageReport(targets: MasterDeptTarget[], plan: NationalHospitalPlan[], wave1Results: NationalCoverageReport["wave1Results"]): NationalCoverageReport {
  return {
    generatedAt: new Date().toISOString(),
    totalHospitals: plan.length,
    totalMasterDeptRows: targets.length,
    hospitalsByProviderGuess: countBy(plan.map((item) => item.providerGuess)),
    hospitalsByReadiness: countBy(plan.map((item) => item.currentReadiness)),
    hospitalsSafeForFullBatch: plan.filter((item) => item.currentReadiness === "safeForFullBatch").map((item) => item.hospitalName),
    hospitalsPilotReady: plan.filter((item) => item.currentReadiness === "safeForPilot").map((item) => item.hospitalName),
    hospitalsNeedingAdapter: plan.filter((item) => item.currentReadiness === "needsAdapter").map((item) => item.hospitalName),
    hospitalsDeferred: plan.filter((item) => item.currentReadiness === "deferred").map((item) => ({ hospitalName: item.hospitalName, reason: item.deferReason })),
    shebaStatus: plan.find((item) => /שיבא|תל השומר|sheba/i.test(item.hospitalName))?.deferReason ?? "not present",
    wave1Results
  };
}

function renderCoverageReport(report: NationalCoverageReport) {
  return [
    "# National Hospital Crawler Coverage",
    "",
    `- generatedAt: ${report.generatedAt}`,
    `- total hospitals: ${report.totalHospitals}`,
    `- total Master_Dept rows: ${report.totalMasterDeptRows}`,
    `- Sheba: ${report.shebaStatus}`,
    "",
    "## Provider Guess",
    ...Object.entries(report.hospitalsByProviderGuess).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Readiness",
    ...Object.entries(report.hospitalsByReadiness).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Wave 1 Results",
    ...report.wave1Results.map((item) => `- ${item.hospital}: readiness=${item.readiness}; reviewed=${item.reviewedRecords ?? "n/a"}; productionReady=${item.productionReadyCount ?? "n/a"}; mapped=${item.mappedRecords ?? "n/a"}`)
  ].join("\n");
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
