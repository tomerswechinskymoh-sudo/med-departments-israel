import path from "node:path";
import type { ClalitDepartmentConfig } from "./types";
import type { ClalitHospitalConfig } from "./hospital-config";
import { discoveryPaths, type ClalitDepartmentDiscoveryCandidate } from "./hospital-discovery";
import { readJson, writeJson } from "./utils";

type PageType = NonNullable<ClalitDepartmentConfig["pageType"]>;

const CONFIG_PATH = path.join(process.cwd(), "data", "crawler", "config", "clalit-departments.json");

function normalizedUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  return url.toString().replace(/\/$/, "").toLowerCase();
}

function classifyPageType(candidate: ClalitDepartmentDiscoveryCandidate): PageType {
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
    "aspx"
  ]);
  return Array.from(new Set(urlWords.filter((word) => !stopWords.has(word.toLowerCase())))).slice(0, 10);
}

function prefixedId(candidateId: string, hospitalSlug: string) {
  const normalized = candidateId
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.startsWith(`${hospitalSlug}-`) ? normalized : `${hospitalSlug}-${normalized}`;
}

function uniqueId(baseId: string, usedIds: Set<string>) {
  if (!usedIds.has(baseId)) return baseId;
  let suffix = 2;
  while (usedIds.has(`${baseId}-${suffix}`)) suffix += 1;
  return `${baseId}-${suffix}`;
}

export async function importClalitHospitalDiscovery(
  hospital: ClalitHospitalConfig,
  options: { dryRun?: boolean; force?: boolean; discoveryPath?: string } = {}
) {
  const discoveryPath = options.discoveryPath ?? discoveryPaths(hospital.hospitalSlug).outputPath;
  const batchPath = path.join(
    process.cwd(),
    "data",
    "crawler",
    "config",
    `${hospital.hospitalSlug}-all-discovered.json`
  );
  const candidates = await readJson<ClalitDepartmentDiscoveryCandidate[]>(discoveryPath);
  const originalConfigs = await readJson<ClalitDepartmentConfig[]>(CONFIG_PATH);
  const configs = originalConfigs.map((config) => ({ ...config }));
  const configByUrl = new Map(configs.map((config) => [normalizedUrl(config.doctorListUrl), config]));
  const usedIds = new Set(configs.map((config) => config.id));
  const batchIds: string[] = [];
  const imported: string[] = [];
  const updated: string[] = [];
  const preserved: string[] = [];
  const removed: string[] = [];
  let existingBatchIds: string[] = [];
  try {
    const existingBatch = await readJson<{ ids?: string[] }>(batchPath);
    existingBatchIds = existingBatch.ids ?? [];
  } catch {
    existingBatchIds = [];
  }

  for (const candidate of candidates) {
    const urlKey = normalizedUrl(candidate.doctorListUrl);
    const pageType = classifyPageType(candidate);
    const candidateId = prefixedId(candidate.id, hospital.hospitalSlug);
    const existing =
      configByUrl.get(urlKey) ??
      (options.force
        ? configs.find(
            (config) =>
              config.id === candidateId &&
              config.hospitalSlug === hospital.hospitalSlug &&
              !batchIds.includes(config.id)
          )
        : undefined);
    if (existing) {
      if (options.force) {
        existing.hospital = candidate.hospital;
        existing.hospitalSlug = hospital.hospitalSlug;
        existing.department = candidate.department;
        existing.departmentHebrew = candidate.departmentHebrew;
        existing.doctorListUrl = candidate.doctorListUrl;
        existing.departmentKeywordsHebrew = hebrewKeywords(candidate.departmentHebrew);
        existing.departmentKeywordsEnglish = englishKeywords(candidate);
        existing.pageType = pageType;
        existing.needsReview = candidate.needsReview || candidate.discoveryConfidence < 0.95 || pageType !== "coreDepartment";
        existing.sourceDepartmentUrl = candidate.sourceDepartmentUrl;
        existing.discoveryConfidence = candidate.discoveryConfidence;
        existing.parserType = candidate.recommendedParserType;
        existing.allowSmallDepartment = candidate.recommendedParserType !== "rabinDoctorsPage";
        existing.minSpecialtyEvidenceCoverage = candidate.recommendedParserType === "rabinDoctorsPage" ? undefined : 0;
        existing.maxMissingProfileUrlCoverage = candidate.recommendedParserType === "rabinDoctorsPage" ? undefined : 1;
        configByUrl.set(urlKey, existing);
        updated.push(existing.id);
      } else {
        preserved.push(existing.id);
      }
      batchIds.push(existing.id);
      continue;
    }

    const id = uniqueId(prefixedId(candidate.id, hospital.hospitalSlug), usedIds);
    const config: ClalitDepartmentConfig = {
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
    configs.push(config);
    configByUrl.set(urlKey, config);
    usedIds.add(id);
    imported.push(id);
    batchIds.push(id);
  }

  const configById = new Map(configs.map((config) => [config.id, config]));
  const existingBatchUrls = new Set(
    existingBatchIds
      .map((id) => configById.get(id)?.doctorListUrl)
      .filter((url): url is string => Boolean(url))
      .map((url) => normalizedUrl(url))
  );
  const freshDiscoveryUrls = new Set(candidates.map((candidate) => normalizedUrl(candidate.doctorListUrl)));
  const missingFromFreshDiscovery = Array.from(existingBatchUrls).filter((url) => !freshDiscoveryUrls.has(url));
  const newInFreshDiscovery = Array.from(freshDiscoveryUrls).filter((url) => !existingBatchUrls.has(url));

  const uniqueBatchIds = Array.from(new Set([...existingBatchIds.filter((id) => configById.has(id)), ...batchIds]));
  const batch = {
    name: `All discovered ${hospital.hospitalName} doctor-list pages`,
    source: path.relative(process.cwd(), discoveryPath),
    generatedAt: new Date().toISOString(),
    ids: uniqueBatchIds
  };
  if (!options.dryRun) {
    await writeJson(CONFIG_PATH, configs);
    await writeJson(batchPath, batch);
  }

  return {
    dryRun: Boolean(options.dryRun),
    force: Boolean(options.force),
    hospitalSlug: hospital.hospitalSlug,
    discoveryPath,
    discoveryCandidates: candidates.length,
    uniqueDiscoveryUrls: new Set(candidates.map((candidate) => normalizedUrl(candidate.doctorListUrl))).size,
    existingConfigCount: originalConfigs.length,
    importedCount: imported.length,
    updatedCount: updated.length,
    preservedCount: preserved.length,
    removedCount: removed.length,
    finalConfigCount: configs.length,
    batchCount: uniqueBatchIds.length,
    driftWarning:
      missingFromFreshDiscovery.length > 0 || newInFreshDiscovery.length > 0
        ? {
            message:
              "Discovery drift detected. Existing configured candidates were preserved; run compare:clalit-hospital-discovery for review.",
            missingFromFreshDiscoveryCount: missingFromFreshDiscovery.length,
            newInFreshDiscoveryCount: newInFreshDiscovery.length,
            reportCommand: `npm run compare:clalit-hospital-discovery -- --hospital ${hospital.hospitalSlug}`
          }
        : null,
    imported,
    updated,
    preserved,
    removed,
    batchPath,
    pageTypes: Object.fromEntries(
      Array.from(new Set(uniqueBatchIds.map((id) => configs.find((config) => config.id === id)?.pageType ?? "unknown"))).map(
        (pageType) => [
          pageType,
          uniqueBatchIds.filter((id) => configs.find((config) => config.id === id)?.pageType === pageType).length
        ]
      )
    )
  };
}
