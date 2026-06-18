import path from "node:path";
import fs from "node:fs/promises";
import { discoveryPaths, type ClalitDepartmentDiscoveryCandidate } from "@/crawler/clalit/hospital-discovery";
import { loadClalitHospitalConfig, type ClalitHospitalConfig } from "@/crawler/clalit/hospital-config";
import { parseArgs, readJson, writeJson } from "@/crawler/clalit/utils";
import type { ClalitDepartmentConfig } from "@/crawler/clalit/types";

const CONFIG_PATH = path.join(process.cwd(), "data", "crawler", "config", "clalit-departments.json");
const FETCH_TIMEOUT_MS = 12_000;

type DiscoveryBatch = {
  name?: string;
  source?: string;
  generatedAt?: string;
  ids?: string[];
};

type DirectUrlStatus = {
  classification: "liveButOffIndex" | "stale404" | "redirect" | "serverError" | "unknown";
  statusCode: number | null;
  finalUrl: string | null;
  contentLength: number;
  doctorLikeMatches: number;
  error: string | null;
};

type MissingReport = {
  id: string;
  doctorListUrl: string;
  sourceDepartmentUrl: string | null;
  departmentHebrew: string;
  directStatus: DirectUrlStatus;
  recommendedAction: "keepConfigured" | "removeConfigured" | "review";
  reason: string;
};

type NewReport = {
  id: string;
  doctorListUrl: string;
  sourceDepartmentUrl: string;
  departmentHebrew: string;
  discoveryConfidence: number;
  classification: "newCandidate" | "likelyReplacement" | "needsReview";
  recommendedAction: "addCandidate" | "review";
  reason: string;
};

const doctorNamePattern = /(?:ד["״']?ר|ד״ר|פרופ['׳]?|פרופ׳|פרופסור)\s+[א-ת]/gi;

function normalizeUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  return url.toString().replace(/\/$/, "").toLowerCase();
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function urlGroup(value: string) {
  const parts = new URL(value).pathname.split("/").filter(Boolean);
  const pagesIndex = parts.findIndex((part) => part.toLowerCase() === "pages");
  if (pagesIndex > 0) return parts[pagesIndex - 1].toLowerCase();
  return parts.at(-2)?.toLowerCase() ?? parts.at(-1)?.toLowerCase() ?? "";
}

async function readJsonIfExists<T>(filePath: string, fallback: T) {
  try {
    return await readJson<T>(filePath);
  } catch {
    return fallback;
  }
}

async function fetchDirectUrlStatus(url: string): Promise<DirectUrlStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache"
      }
    });
    const contentType = response.headers.get("content-type") ?? "";
    const finalUrl = response.url || url;
    let text = "";
    if (/text\/html|text\/plain|application\/xhtml\+xml/i.test(contentType)) {
      text = (await response.text()).slice(0, 500_000);
    }
    const doctorLikeMatches = text.match(doctorNamePattern)?.length ?? 0;
    const normalizedInputUrl = normalizeUrl(url);
    const normalizedFinalUrl = normalizeUrl(finalUrl);
    const classification: DirectUrlStatus["classification"] =
      response.status === 404 || response.status === 410
        ? "stale404"
        : response.status >= 500
          ? "serverError"
          : normalizedFinalUrl !== normalizedInputUrl
            ? "redirect"
            : response.ok
              ? "liveButOffIndex"
              : "unknown";
    return {
      classification,
      statusCode: response.status,
      finalUrl,
      contentLength: text.length,
      doctorLikeMatches,
      error: null
    };
  } catch (error) {
    return {
      classification: "unknown",
      statusCode: null,
      finalUrl: null,
      contentLength: 0,
      doctorLikeMatches: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function recommendedMissingAction(status: DirectUrlStatus): MissingReport["recommendedAction"] {
  if (status.classification === "liveButOffIndex") return "keepConfigured";
  if (status.classification === "stale404" && status.doctorLikeMatches === 0) return "removeConfigured";
  return "review";
}

function classifyNewCandidate(
  candidate: ClalitDepartmentDiscoveryCandidate,
  missingConfigured: ClalitDepartmentConfig[]
): Pick<NewReport, "classification" | "recommendedAction" | "reason"> {
  if (candidate.discoveryConfidence < 0.85) {
    return {
      classification: "needsReview",
      recommendedAction: "review",
      reason: "discovery confidence below automatic-add threshold"
    };
  }
  const candidateGroup = urlGroup(candidate.doctorListUrl);
  const replacement = missingConfigured.find(
    (config) =>
      config.id === candidate.id ||
      urlGroup(config.doctorListUrl) === candidateGroup ||
      config.departmentHebrew === candidate.departmentHebrew
  );
  if (replacement) {
    return {
      classification: "likelyReplacement",
      recommendedAction: "review",
      reason: `possible replacement for configured id ${replacement.id}`
    };
  }
  return {
    classification: "newCandidate",
    recommendedAction: "addCandidate",
    reason: "new high-confidence candidate not present in configured batch"
  };
}

function classifyPageType(candidate: ClalitDepartmentDiscoveryCandidate): NonNullable<ClalitDepartmentConfig["pageType"]> {
  const hebrew = candidate.departmentHebrew ?? "";
  const sourceFilename = new URL(candidate.sourceDepartmentUrl).pathname.split("/").pop() ?? "";
  const doctorFilename = new URL(candidate.doctorListUrl).pathname.split("/").pop() ?? "";
  const text = `${candidate.department} ${sourceFilename} ${doctorFilename}`.toLowerCase().replace(/[_-]+/g, " ");
  if (hebrew.includes("מעבדה") || /\b(lab|laboratory)\b/.test(text)) return "lab";
  if (hebrew.includes("שירות") || /\bservice\b/.test(text)) return "service";
  if (hebrew.includes("מרפא") || /\bclinic(s)?\b/.test(text)) return "clinic";
  if (hebrew.includes("מחלק") || hebrew.includes("מערך") || /\b(department|dept)\b/.test(text)) return "coreDepartment";
  if (hebrew.includes("מכון") || hebrew.includes("מרכז") || /\b(institute|center|centre)\b/.test(text)) return "institute";
  if (hebrew.includes("יחידה") || /\bunit\b/.test(text)) return "unit";
  return "unknown";
}

function hebrewKeywords(value: string) {
  const stopWords = new Set(["בית", "חולים", "בילינסון", "השרון", "מרכז", "רפואי", "מחלקה", "מרפאה", "מערך"]);
  return Array.from(
    new Set(
      value
        .split(/[\s,()״"'–-]+/)
        .map((word) => word.trim())
        .filter((word) => /[א-ת]/.test(word) && word.length >= 3 && !stopWords.has(word))
    )
  ).slice(0, 10);
}

function englishKeywords(candidate: ClalitDepartmentDiscoveryCandidate) {
  const sourceFilename = new URL(candidate.sourceDepartmentUrl).pathname.split("/").pop() ?? "";
  const doctorFilename = new URL(candidate.doctorListUrl).pathname.split("/").pop() ?? "";
  const urlWords = `${candidate.department} ${sourceFilename} ${doctorFilename}`
    .replace(/[^A-Za-z]+/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4);
  const stopWords = new Set([
    "https",
    "hospitals",
    "clalit",
    candidate.hospitalSlug.toLowerCase(),
    "departments",
    "clinics",
    "pages",
    "doctors",
    "doctor",
    "team",
    "staff",
    "aspx"
  ]);
  return Array.from(new Set(urlWords.filter((word) => !stopWords.has(word.toLowerCase())))).slice(0, 10);
}

function uniqueId(baseId: string, usedIds: Set<string>) {
  if (!usedIds.has(baseId)) return baseId;
  let suffix = 2;
  while (usedIds.has(`${baseId}-${suffix}`)) suffix += 1;
  return `${baseId}-${suffix}`;
}

function configFromCandidate(
  candidate: ClalitDepartmentDiscoveryCandidate,
  hospital: ClalitHospitalConfig,
  usedIds: Set<string>
): ClalitDepartmentConfig {
  const pageType = classifyPageType(candidate);
  const id = uniqueId(candidate.id, usedIds);
  usedIds.add(id);
  return {
    id,
    hospital: candidate.hospital,
    hospitalSlug: hospital.hospitalSlug,
    department: candidate.department,
    departmentHebrew: candidate.departmentHebrew,
    doctorListUrl: candidate.doctorListUrl,
    departmentKeywordsHebrew: hebrewKeywords(candidate.departmentHebrew),
    departmentKeywordsEnglish: englishKeywords(candidate),
    allowedCrossUnits: [],
    allowSmallDepartment: candidate.recommendedParserType !== "rabinDoctorsPage",
    minSpecialtyEvidenceCoverage: candidate.recommendedParserType === "rabinDoctorsPage" ? undefined : 0,
    maxMissingProfileUrlCoverage: candidate.recommendedParserType === "rabinDoctorsPage" ? undefined : 1,
    pageType,
    needsReview: candidate.needsReview || candidate.discoveryConfidence < 0.95 || pageType !== "coreDepartment",
    sourceDepartmentUrl: candidate.sourceDepartmentUrl,
    discoveryConfidence: candidate.discoveryConfidence,
    parserType: candidate.recommendedParserType
  };
}

function driftCsv(rows: Array<Record<string, unknown>>) {
  const headers = [
    "kind",
    "id",
    "doctorListUrl",
    "sourceDepartmentUrl",
    "departmentHebrew",
    "classification",
    "recommendedAction",
    "statusCode",
    "finalUrl",
    "discoveryConfidence",
    "reason"
  ];
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const hospitalSlug = args.get("hospital");
  if (!hospitalSlug) throw new Error("Missing --hospital <hospitalSlug>.");
  const applyAdditions = args.has("apply-additions");
  const applyRemovals = args.has("apply-removals");
  const hospital = await loadClalitHospitalConfig(hospitalSlug);
  const paths = discoveryPaths(hospital.hospitalSlug);
  const batchPath = path.join(process.cwd(), "data", "crawler", "config", `${hospital.hospitalSlug}-all-discovered.json`);
  const reportJsonPath = path.join(paths.baseDir, "discovery-drift-report.json");
  const reportCsvPath = path.join(paths.baseDir, "discovery-drift-report.csv");

  const [batch, configs, discovered] = await Promise.all([
    readJsonIfExists<DiscoveryBatch>(batchPath, { ids: [] }),
    readJson<ClalitDepartmentConfig[]>(CONFIG_PATH),
    readJson<ClalitDepartmentDiscoveryCandidate[]>(paths.outputPath)
  ]);
  const batchIds = batch.ids ?? [];
  const configById = new Map(configs.map((config) => [config.id, config]));
  const configured = batchIds.map((id) => configById.get(id)).filter((config): config is ClalitDepartmentConfig => Boolean(config));
  const configuredByUrl = new Map(configured.map((config) => [normalizeUrl(config.doctorListUrl), config]));
  const discoveredByUrl = new Map(discovered.map((candidate) => [normalizeUrl(candidate.doctorListUrl), candidate]));
  const missingConfigured = configured.filter((config) => !discoveredByUrl.has(normalizeUrl(config.doctorListUrl)));
  const newCandidates = discovered.filter((candidate) => !configuredByUrl.has(normalizeUrl(candidate.doctorListUrl)));

  const missingReports: MissingReport[] = [];
  for (const config of missingConfigured) {
    const directStatus = await fetchDirectUrlStatus(config.doctorListUrl);
    const recommendedAction = recommendedMissingAction(directStatus);
    const reason =
      recommendedAction === "keepConfigured"
        ? "URL is still live but absent from current hospital index"
        : recommendedAction === "removeConfigured"
          ? "URL returned 404/410 and no doctor-like content was found"
          : `direct URL status requires human review: ${directStatus.classification}`;
    missingReports.push({
      id: config.id,
      doctorListUrl: config.doctorListUrl,
      sourceDepartmentUrl: config.sourceDepartmentUrl ?? null,
      departmentHebrew: config.departmentHebrew,
      directStatus,
      recommendedAction,
      reason
    });
  }

  const newReports: NewReport[] = newCandidates.map((candidate) => {
    const classification = classifyNewCandidate(candidate, missingConfigured);
    return {
      id: candidate.id,
      doctorListUrl: candidate.doctorListUrl,
      sourceDepartmentUrl: candidate.sourceDepartmentUrl,
      departmentHebrew: candidate.departmentHebrew,
      discoveryConfidence: candidate.discoveryConfidence,
      ...classification
    };
  });

  const applied = {
    additions: [] as string[],
    removals: [] as string[]
  };
  let nextConfigs = configs.map((config) => ({ ...config }));
  let nextBatchIds = [...batchIds];
  if (applyAdditions) {
    const usedIds = new Set(nextConfigs.map((config) => config.id));
    const configuredUrls = new Set(nextConfigs.map((config) => normalizeUrl(config.doctorListUrl)));
    for (const report of newReports.filter((row) => row.recommendedAction === "addCandidate")) {
      const candidate = discoveredByUrl.get(normalizeUrl(report.doctorListUrl));
      if (!candidate || configuredUrls.has(normalizeUrl(candidate.doctorListUrl))) continue;
      const config = configFromCandidate(candidate, hospital, usedIds);
      nextConfigs.push(config);
      nextBatchIds.push(config.id);
      configuredUrls.add(normalizeUrl(config.doctorListUrl));
      applied.additions.push(config.id);
    }
  }
  if (applyRemovals) {
    const removalUrls = new Set(
      missingReports.filter((row) => row.recommendedAction === "removeConfigured").map((row) => normalizeUrl(row.doctorListUrl))
    );
    if (removalUrls.size > 0) {
      const removalIds = new Set(
        nextConfigs
          .filter((config) => config.hospitalSlug === hospital.hospitalSlug && removalUrls.has(normalizeUrl(config.doctorListUrl)))
          .map((config) => config.id)
      );
      nextConfigs = nextConfigs.filter((config) => !removalIds.has(config.id));
      nextBatchIds = nextBatchIds.filter((id) => !removalIds.has(id));
      applied.removals = Array.from(removalIds);
    }
  }
  if (applyAdditions || applyRemovals) {
    await writeJson(CONFIG_PATH, nextConfigs);
    await writeJson(batchPath, {
      name: batch.name ?? `All discovered ${hospital.hospitalName} doctor-list pages`,
      source: batch.source ?? path.relative(process.cwd(), paths.outputPath),
      generatedAt: new Date().toISOString(),
      ids: Array.from(new Set(nextBatchIds))
    });
  }

  const reportRows: Array<Record<string, unknown>> = [
    ...missingReports.map((row) => ({
      kind: "missingConfigured",
      id: row.id,
      doctorListUrl: row.doctorListUrl,
      sourceDepartmentUrl: row.sourceDepartmentUrl,
      departmentHebrew: row.departmentHebrew,
      classification: row.directStatus.classification,
      recommendedAction: row.recommendedAction,
      statusCode: row.directStatus.statusCode,
      finalUrl: row.directStatus.finalUrl,
      discoveryConfidence: "",
      reason: row.reason
    })),
    ...newReports.map((row) => ({
      kind: "newDiscovery",
      id: row.id,
      doctorListUrl: row.doctorListUrl,
      sourceDepartmentUrl: row.sourceDepartmentUrl,
      departmentHebrew: row.departmentHebrew,
      classification: row.classification,
      recommendedAction: row.recommendedAction,
      statusCode: "",
      finalUrl: "",
      discoveryConfidence: row.discoveryConfidence,
      reason: row.reason
    }))
  ];

  const recommendedActions = reportRows.map((row) => ({
    kind: row.kind,
    id: row.id,
    doctorListUrl: row.doctorListUrl,
    recommendedAction: row.recommendedAction,
    reason: row.reason
  }));

  const report = {
    ok: true,
    hospitalSlug: hospital.hospitalSlug,
    generatedAt: new Date().toISOString(),
    configuredCount: configured.length,
    discoveredCount: discovered.length,
    unchangedCount: configured.filter((config) => discoveredByUrl.has(normalizeUrl(config.doctorListUrl))).length,
    missingFromFreshDiscovery: missingReports,
    newInFreshDiscovery: newReports,
    staleConfiguredCandidates: missingReports.filter((row) => row.directStatus.classification === "stale404"),
    liveButOffIndexCandidates: missingReports.filter((row) => row.directStatus.classification === "liveButOffIndex"),
    recommendedActions,
    applied,
    reportJsonPath,
    reportCsvPath
  };

  await writeJson(reportJsonPath, report);
  await fs.mkdir(path.dirname(reportCsvPath), { recursive: true });
  await fs.writeFile(reportCsvPath, driftCsv(reportRows), "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
