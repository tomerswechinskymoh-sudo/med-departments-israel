import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { load, type CheerioAPI } from "cheerio";
import { absoluteUrl, normalizeWhitespace, safeSlugFromValue, sleep, writeJson } from "./utils";
import type { ClalitHospitalConfig } from "./hospital-config";
import type { ClalitDepartmentConfig } from "./types";

const REQUEST_DELAY_MS = 400;
const CONCURRENCY = 2;
const FETCH_TIMEOUT_MS = 12_000;

export type ClalitDepartmentDiscoveryCandidate = {
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
  patternType: "doctorsPage" | "teamPage" | "staffPage" | "inlineStaffPage" | "unknownStaffPage";
  recommendedParserType: NonNullable<ClalitDepartmentConfig["parserType"]>;
};

type DepartmentLink = { url: string; text: string };
type DepartmentFetchResult = {
  departmentLink: DepartmentLink;
  candidates: ClalitDepartmentDiscoveryCandidate[];
  ok: boolean;
  error: string | null;
  audit: DepartmentDiscoveryAudit;
};

type DepartmentDiscoveryAudit = {
  departmentUrl: string;
  departmentHebrew: string;
  fetched: boolean;
  candidateCount: number;
  patternTypes: string[];
  recommendedParserTypes: string[];
  suspicious: boolean;
  suspiciousEvidence: string[];
  error: string | null;
};

const staffLinkTextPattern =
  /רופאים|רופאי המחלקה|אנשי הצוות|צוות רפואי|הצוות הרפואי|הצוות שלנו|צוות המחלקה|מומחים|רופאים בכירים|doctors|team|staff|physicians|specialists/i;
const staffSectionPattern =
  /צוות הנהלה|רופאים בכירים|צוות רפואי|הצוות הרפואי|אנשי הצוות|רופאי המחלקה|הצוות שלנו|צוות המחלקה|מומחים/i;
const doctorNamePattern = /(?:ד["״']?ר|ד״ר|פרופ['׳]?|פרופ׳|פרופסור)\s+[א-ת]/i;

export function discoveryPaths(hospitalSlug: string) {
  const baseDir = path.join(process.cwd(), "data", "crawler", "discovery", hospitalSlug);
  const rawDir = path.join(baseDir, "raw");
  return {
    baseDir,
    outputPath: path.join(baseDir, "department-doctor-pages.json"),
    rawDir,
    rawIndexPath: path.join(rawDir, "index.html"),
    rawDepartmentsDir: path.join(rawDir, "departments"),
    auditJsonPath: path.join(baseDir, "discovery-audit.json"),
    auditCsvPath: path.join(baseDir, "discovery-audit.csv")
  };
}

function legacyDiscoveryCachePaths(hospitalSlug: string) {
  const discoveryDir = path.join(process.cwd(), "data", "crawler", "discovery");
  const rawDir = path.join(discoveryDir, "raw");
  return {
    rawIndexPath: path.join(rawDir, `${hospitalSlug}-departments-index.html`),
    rawDepartmentsDir: path.join(rawDir, "departments")
  };
}

async function fetchDiscoveryHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache"
      }
    });
    if (!response.ok) throw new Error(`Fetch failed ${response.status} ${response.statusText} for ${url}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function readTextIfExists(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function sameHospitalUrl(url: string, config: ClalitHospitalConfig) {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "hospitals.clalit.co.il" &&
      parsed.pathname.toLowerCase().includes(`/${config.hospitalSlug.toLowerCase()}/`)
    );
  } catch {
    return false;
  }
}

function compactText(value: string) {
  return normalizeWhitespace(value.replace(/\s+/g, " "));
}

function discoverySnapshotFilename(url: string) {
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);
  return `${safeSlugFromValue(url).slice(0, 90)}-${hash}.html`;
}

function departmentPathPrefixes(config: ClalitHospitalConfig) {
  return config.departmentPathPrefixes?.length
    ? config.departmentPathPrefixes
    : [`/${config.hospitalSlug}/he/departments-and-clinics/`];
}

function matchingDepartmentPrefix(url: string, config: ClalitHospitalConfig) {
  const pathname = new URL(url).pathname.toLowerCase();
  return departmentPathPrefixes(config).find((prefix) => pathname.startsWith(prefix.toLowerCase())) ?? null;
}

function departmentSlugFromUrl(url: string, config: ClalitHospitalConfig) {
  const parsed = new URL(url);
  const prefix = matchingDepartmentPrefix(url, config);
  const remainder = prefix ? parsed.pathname.slice(prefix.length) : parsed.pathname;
  const parts = remainder.split("/").filter(Boolean);
  const firstContentPart = parts.find((part) => part.toLowerCase() !== "pages");
  return (firstContentPart ?? parts.at(-1) ?? "department").replace(/\.aspx$/i, "");
}

function departmentNameFromUrl(url: string, config: ClalitHospitalConfig) {
  const slug = departmentSlugFromUrl(url, config);
  return decodeURIComponent(slug ?? "department")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function idFromDoctorListUrl(url: string, config: ClalitHospitalConfig) {
  return `${config.hospitalSlug}-${departmentSlugFromUrl(url, config)}`
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pageStem(url: string) {
  return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "")
    .replace(/\.aspx$/i, "")
    .toLowerCase();
}

function candidateSourceQuality(candidate: ClalitDepartmentDiscoveryCandidate, config: ClalitHospitalConfig) {
  const stem = pageStem(candidate.sourceDepartmentUrl).replace(/[-_]+/g, "");
  const groupSlug = departmentSlugFromUrl(candidate.doctorListUrl, config).replace(/[-_]+/g, "");
  let score = candidate.discoveryConfidence * 100;
  if (groupSlug && stem.includes(groupSlug)) score += 8;
  if (/(department|dept|clinic|rmc|institute|center)/i.test(pageStem(candidate.sourceDepartmentUrl))) score += 4;
  if (/(hand|tumor|tumors|diseases|skull|sports|unit|service|שירות|יחידה)/i.test(candidate.departmentHebrew)) score -= 3;
  if (candidate.needsReview) score -= 10;
  return score;
}

function extractDepartmentLinks($: CheerioAPI, config: ClalitHospitalConfig) {
  const seen = new Set<string>();
  const links: DepartmentLink[] = [];
  $("a[href]").each((_, link) => {
    const href = $(link).attr("href");
    const absolute = absoluteUrl(href, config.departmentsIndexUrl);
    if (!absolute || !sameHospitalUrl(absolute, config)) return;
    const parsed = new URL(absolute);
    if (!matchingDepartmentPrefix(absolute, config)) return;
    if (parsed.toString() === config.departmentsIndexUrl) return;
    if (!/\/Pages\/.+\.aspx$/i.test(parsed.pathname)) return;
    if (/(?:_doctors|[-_]team|[-_]staff)\.aspx$/i.test(parsed.pathname)) return;
    parsed.hash = "";
    const normalizedUrl = parsed.toString();
    if (seen.has(normalizedUrl)) return;
    seen.add(normalizedUrl);
    links.push({ url: normalizedUrl, text: compactText($(link).text()) || departmentNameFromUrl(normalizedUrl, config) });
  });
  return links;
}

function confidenceForDoctorLink(url: string, anchorText: string) {
  const pathname = new URL(url).pathname.toLowerCase();
  const urlEndsDoctors = /_doctors\.aspx$/i.test(pathname);
  const urlContainsDoctors = pathname.includes("doctors");
  const urlContainsTeam = /(?:team|staff)/i.test(pathname);
  const textSuggestsDoctors = staffLinkTextPattern.test(anchorText);
  if (urlEndsDoctors && textSuggestsDoctors) return 0.95;
  if (urlContainsTeam && textSuggestsDoctors) return 0.95;
  if (urlContainsDoctors) return 0.85;
  if (urlContainsTeam) return 0.85;
  if (textSuggestsDoctors) return 0.7;
  return 0.5;
}

function patternTypeForLink(url: string, anchorText: string): ClalitDepartmentDiscoveryCandidate["patternType"] {
  const pathname = new URL(url).pathname.toLowerCase();
  if (/(?:^|[-_])doctors?\.aspx$/i.test(pathname) || pathname.includes("doctors")) return "doctorsPage";
  if (/(?:^|[-_])team\.aspx$/i.test(pathname) || pathname.includes("team")) return "teamPage";
  if (/(?:^|[-_])staff\.aspx$/i.test(pathname) || pathname.includes("staff")) return "staffPage";
  return staffLinkTextPattern.test(anchorText) ? "unknownStaffPage" : "unknownStaffPage";
}

function parserTypeForPattern(patternType: ClalitDepartmentDiscoveryCandidate["patternType"]) {
  if (patternType === "doctorsPage") return "rabinDoctorsPage" as const;
  if (patternType === "teamPage") return "clalitTeamPage" as const;
  if (patternType === "inlineStaffPage") return "inlineStaffPage" as const;
  return "genericStaffPage" as const;
}

function extractDoctorListCandidates(
  $: CheerioAPI,
  sourceDepartmentUrl: string,
  departmentText: string,
  config: ClalitHospitalConfig
) {
  const candidates: ClalitDepartmentDiscoveryCandidate[] = [];
  $("a[href]").each((_, link) => {
    const href = $(link).attr("href");
    const absolute = absoluteUrl(href, sourceDepartmentUrl);
    if (!absolute || !sameHospitalUrl(absolute, config)) return;
    if (!matchingDepartmentPrefix(absolute, config)) return;
    const anchorText = compactText($(link).text());
    const lowerUrl = absolute.toLowerCase();
    const hasUrlStaffSignal = /(?:doctors?|team|staff)/i.test(new URL(absolute).pathname);
    const hasTextStaffSignal = staffLinkTextPattern.test(anchorText);
    const looksLikeDoctorList =
      lowerUrl.includes("doctors") ||
      lowerUrl.includes("team") ||
      lowerUrl.includes("staff") ||
      lowerUrl.includes("%d7%a8%d7%95%d7%a4") ||
      (config.allowTextOnlyStaffLinks === true && hasTextStaffSignal) ||
      /_doctors\.aspx$/i.test(new URL(absolute).pathname);
    if (!looksLikeDoctorList) return;
    if (!hasUrlStaffSignal && anchorText.length > 120) return;
    const parsed = new URL(absolute);
    parsed.hash = "";
    const doctorListUrl = parsed.toString();
    const confidence = confidenceForDoctorLink(doctorListUrl, anchorText);
    const patternType = patternTypeForLink(doctorListUrl, anchorText);
    candidates.push({
      id: idFromDoctorListUrl(doctorListUrl, config),
      hospital: config.hospitalName,
      hospitalSlug: config.hospitalSlug,
      department: departmentNameFromUrl(sourceDepartmentUrl, config),
      departmentHebrew: departmentText,
      doctorListUrl,
      sourceDepartmentUrl,
      discoveryConfidence: confidence,
      discoveryEvidence: [
        `sourceDepartmentUrl=${sourceDepartmentUrl}`,
        `anchorText=${anchorText || "(empty)"}`,
        `href=${href ?? ""}`,
        `confidenceRule=${confidence}`
      ],
      needsReview: confidence < 0.7,
      patternType,
      recommendedParserType: parserTypeForPattern(patternType)
    });
  });
  return candidates;
}

function inlineStaffCandidate(
  $: CheerioAPI,
  sourceDepartmentUrl: string,
  departmentText: string,
  config: ClalitHospitalConfig
) {
  const team = $("#Team").first();
  if (!team.length) return null;
  const sectionHeadings = team
    .find("h1,h2,h3,h4,h5,h6,p.p-section-bold,strong")
    .toArray()
    .map((element) => compactText($(element).text()))
    .filter((text) => staffSectionPattern.test(text));
  const doctorEntries = team
    .find("p.p-section-tight,a[href]")
    .toArray()
    .map((element) => compactText($(element).text()))
    .filter((text) => doctorNamePattern.test(text));
  if (doctorEntries.length === 0) return null;

  const confidence = team.find("a[href]").toArray().some((link) => doctorNamePattern.test(compactText($(link).text())))
    ? 0.9
    : 0.8;
  const patternType = "inlineStaffPage" as const;
  const candidate: ClalitDepartmentDiscoveryCandidate = {
    id: idFromDoctorListUrl(sourceDepartmentUrl, config),
    hospital: config.hospitalName,
    hospitalSlug: config.hospitalSlug,
    department: departmentNameFromUrl(sourceDepartmentUrl, config),
    departmentHebrew: departmentText,
    doctorListUrl: sourceDepartmentUrl,
    sourceDepartmentUrl,
    discoveryConfidence: confidence,
    discoveryEvidence: [
      `sourceDepartmentUrl=${sourceDepartmentUrl}`,
      `inlineStaffEntries=${doctorEntries.length}`,
      `sectionHeadings=${sectionHeadings.join(" | ") || "#Team"}`,
      `confidenceRule=${confidence}`
    ],
    needsReview: confidence < 0.85,
    patternType,
    recommendedParserType: parserTypeForPattern(patternType)
  };
  return candidate;
}

function suspiciousStaffEvidence($: CheerioAPI, candidates: ClalitDepartmentDiscoveryCandidate[]) {
  if (candidates.length > 0) return [];
  const team = $("#Team").first();
  if (!team.length) return [];
  const text = compactText(team.text());
  const evidence: string[] = [];
  if (staffSectionPattern.test(text)) evidence.push("staff section heading detected");
  if (doctorNamePattern.test(text)) evidence.push("doctor-like text detected without extractable candidate");
  return evidence;
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function discoveryAuditCsv(rows: DepartmentDiscoveryAudit[]) {
  const headers = [
    "departmentUrl",
    "departmentHebrew",
    "fetched",
    "candidateCount",
    "patternTypes",
    "recommendedParserTypes",
    "suspicious",
    "suspiciousEvidence",
    "error"
  ] as const;
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n");
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>) {
  const results: R[] = [];
  let cursor = 0;
  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));
  return results;
}

export async function discoverClalitHospitalDepartments(
  config: ClalitHospitalConfig,
  options: { writeLegacyRabinOutputs?: boolean } = {}
) {
  const paths = discoveryPaths(config.hospitalSlug);
  const legacyPaths = legacyDiscoveryCachePaths(config.hospitalSlug);
  await fs.mkdir(paths.rawDepartmentsDir, { recursive: true });
  const indexHtml =
    (await readTextIfExists(paths.rawIndexPath)) ??
    (await readTextIfExists(legacyPaths.rawIndexPath)) ??
    (await fetchDiscoveryHtml(config.departmentsIndexUrl));
  await fs.writeFile(paths.rawIndexPath, indexHtml, "utf8");
  const departmentLinks = extractDepartmentLinks(load(indexHtml), config);
  const departmentResults = await mapWithConcurrency<DepartmentLink, DepartmentFetchResult>(
    departmentLinks,
    CONCURRENCY,
    async (departmentLink) => {
      await sleep(REQUEST_DELAY_MS);
      try {
        const rawPath = path.join(paths.rawDepartmentsDir, discoverySnapshotFilename(departmentLink.url));
        const legacyRawPath = path.join(legacyPaths.rawDepartmentsDir, `${safeSlugFromValue(departmentLink.url)}.html`);
        const html =
          (await readTextIfExists(rawPath)) ??
          (config.hospitalSlug === "rabin" ? await readTextIfExists(legacyRawPath) : null) ??
          (await fetchDiscoveryHtml(departmentLink.url));
        await fs.writeFile(rawPath, html, "utf8");
        const $ = load(html);
        const candidates = extractDoctorListCandidates($, departmentLink.url, departmentLink.text, config);
        const inlineCandidate = config.discoverInlineStaff
          ? inlineStaffCandidate($, departmentLink.url, departmentLink.text, config)
          : null;
        if (inlineCandidate) candidates.push(inlineCandidate);
        const suspiciousEvidence = suspiciousStaffEvidence($, candidates);
        return {
          departmentLink,
          candidates,
          ok: true,
          error: null,
          audit: {
            departmentUrl: departmentLink.url,
            departmentHebrew: departmentLink.text,
            fetched: true,
            candidateCount: candidates.length,
            patternTypes: Array.from(new Set(candidates.map((candidate) => candidate.patternType))),
            recommendedParserTypes: Array.from(new Set(candidates.map((candidate) => candidate.recommendedParserType))),
            suspicious: suspiciousEvidence.length > 0,
            suspiciousEvidence,
            error: null
          }
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          departmentLink,
          candidates: [],
          ok: false,
          error: message,
          audit: {
            departmentUrl: departmentLink.url,
            departmentHebrew: departmentLink.text,
            fetched: false,
            candidateCount: 0,
            patternTypes: [],
            recommendedParserTypes: [],
            suspicious: true,
            suspiciousEvidence: ["department page fetch failed"],
            error: message
          }
        };
      }
    }
  );
  const seen = new Map<string, ClalitDepartmentDiscoveryCandidate>();
  for (const candidate of departmentResults.flatMap((result) => result.candidates)) {
    const existing = seen.get(candidate.doctorListUrl);
    if (!existing || candidateSourceQuality(candidate, config) > candidateSourceQuality(existing, config)) {
      seen.set(candidate.doctorListUrl, candidate);
    }
  }
  const candidates = Array.from(seen.values()).sort((left, right) =>
    right.discoveryConfidence !== left.discoveryConfidence
      ? right.discoveryConfidence - left.discoveryConfidence
      : left.doctorListUrl.localeCompare(right.doctorListUrl)
  );
  await writeJson(paths.outputPath, candidates);
  const auditRows = departmentResults.map((result) => result.audit);
  await writeJson(paths.auditJsonPath, {
    hospitalSlug: config.hospitalSlug,
    generatedAt: new Date().toISOString(),
    departmentPagesScanned: departmentResults.length,
    candidatesFound: candidates.length,
    patternBreakdown: candidates.reduce<Record<string, number>>((summary, candidate) => {
      summary[candidate.patternType] = (summary[candidate.patternType] ?? 0) + 1;
      return summary;
    }, {}),
    missedSuspiciousPages: auditRows.filter((row) => row.suspicious),
    pages: auditRows
  });
  await fs.writeFile(paths.auditCsvPath, discoveryAuditCsv(auditRows), "utf8");

  if (options.writeLegacyRabinOutputs && config.hospitalSlug === "rabin") {
    const legacyDir = path.join(process.cwd(), "data", "crawler", "discovery");
    const legacyRawDir = path.join(legacyDir, "raw");
    const legacyDepartmentsDir = path.join(legacyRawDir, "departments");
    await fs.mkdir(legacyDepartmentsDir, { recursive: true });
    await writeJson(path.join(legacyDir, "rabin-department-doctor-pages.json"), candidates);
    await fs.writeFile(path.join(legacyRawDir, "rabin-departments-index.html"), indexHtml, "utf8");
    for (const departmentLink of departmentLinks) {
      const filename = discoverySnapshotFilename(departmentLink.url);
      const html = await readTextIfExists(path.join(paths.rawDepartmentsDir, filename));
      if (html) await fs.writeFile(path.join(legacyDepartmentsDir, filename), html, "utf8");
    }
  }

  const byConfidence = candidates.reduce<Record<string, number>>((summary, candidate) => {
    const key = candidate.discoveryConfidence.toFixed(2);
    summary[key] = (summary[key] ?? 0) + 1;
    return summary;
  }, {});
  return {
    ok: true,
    hospitalSlug: config.hospitalSlug,
    startUrl: config.departmentsIndexUrl,
    outputPath: paths.outputPath,
    rawIndexPath: paths.rawIndexPath,
    rawDepartmentsDir: paths.rawDepartmentsDir,
    auditJsonPath: paths.auditJsonPath,
    auditCsvPath: paths.auditCsvPath,
    departmentLinksFound: departmentLinks.length,
    departmentPagesFetched: departmentResults.filter((result) => result.ok).length,
    departmentPagesFailed: departmentResults.filter((result) => !result.ok).length,
    doctorListCandidatesFound: candidates.length,
    candidatesByConfidence: byConfidence,
    candidatesByPattern: candidates.reduce<Record<string, number>>((summary, candidate) => {
      summary[candidate.patternType] = (summary[candidate.patternType] ?? 0) + 1;
      return summary;
    }, {}),
    missedSuspiciousPages: auditRows.filter((row) => row.suspicious).length,
    failedDepartmentPages: departmentResults
      .filter((result) => !result.ok)
      .slice(0, 20)
      .map((result) => ({ url: result.departmentLink.url, text: result.departmentLink.text, error: result.error })),
    first10Candidates: candidates.slice(0, 10)
  };
}
