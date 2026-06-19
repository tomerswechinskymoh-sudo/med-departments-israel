import fs from "node:fs/promises";
import path from "node:path";
import { load, type CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import { fetchClalitHtml } from "./fetch";
import { buildDuplicateDoctorContext, qaForDoctorRecord, summarizeQaFlags } from "./qa";
import type { CandidateBlock, ClalitDepartmentConfig, CrawlerOutputPaths, DoctorListPageResult, DoctorRecord } from "./types";
import { applySorokaIdentityMap } from "./soroka-identity-map";
import { absoluteUrl, normalizeMultilineText, normalizeWhitespace, writeJson } from "./utils";

const MAX_PAGES = 12;

const doctorLikePattern = /(?:ד["״']ר|ד״ר|ד"ר|פרופ['׳]?|פרופ׳|פרופסור)/i;
const doctorNamePattern =
  /((?:ד["״']ר|ד״ר|ד"ר|פרופ['׳]?|פרופ׳|פרופסור)\s+[א-ת][א-ת\s.'׳״"-]{2,90})/i;
const rolePattern = /(מנהל|מנהלת|רופא|רופאה|מומחה|מומחית|אחראי|אחראית|סגן|סגנית|יועץ|יועצת|מחלקה|יחידה|שירות|שרות)/;
const excludedContainerPattern = /(header|footer|nav|menu|breadcrumb|search|pager|paging|pagination|social|share)/i;
const sorokaNonPhysicianStaffPattern =
  /(אחות|אחים|אחיות|מזכיר|מזכירה|מינהל|עובד|עובדת|טכנאי|טכנאית|פיזיותרפ|עבודה סוציאלית|דיאט|רוקח|סטודנט|מתנדב)/;
const candidateSelectors = [
  ".article-item",
  ".doctor",
  ".doctor-card",
  ".doctorCard",
  ".doctor-item",
  ".doctorItem",
  ".doctors li",
  ".doctors-list li",
  ".doctor-list li",
  ".staff li",
  ".staff-list li",
  ".team li",
  "#Team p.p-section-tight",
  "#Team a[href]",
  "p.p-section-tight",
  ".ms-rtestate-field li",
  ".ms-rtestate-field tr",
  ".content li",
  ".content tr",
  ".item",
  ".card",
  "article",
  "li",
  "tr"
];

function countDoctorLikeMatches(text: string) {
  return text.match(new RegExp(doctorLikePattern.source, "gi"))?.length ?? 0;
}

function isExcludedElement($: CheerioAPI, element: Element) {
  const elementHandle = $(element);
  const ownDescriptor = `${element.tagName ?? ""} ${elementHandle.attr("id") ?? ""} ${elementHandle.attr("class") ?? ""}`;

  if (excludedContainerPattern.test(ownDescriptor)) {
    return true;
  }

  return elementHandle.parents().toArray().some((parent) => {
    const parentHandle = $(parent);
    const descriptor = `${parent.tagName ?? ""} ${parentHandle.attr("id") ?? ""} ${parentHandle.attr("class") ?? ""}`;
    return excludedContainerPattern.test(descriptor);
  });
}

function isElement(node: unknown): node is Element {
  return Boolean(node && typeof node === "object" && "tagName" in node);
}

function elementText($: CheerioAPI, element: Element) {
  const clone = $(element).clone();
  clone.find("br").replaceWith("\n");

  return normalizeMultilineText(clone.text());
}

function cleanDoctorName(value: string) {
  const withoutNoise = normalizeWhitespace(value)
    .replace(/^(שם|רופא|רופאה)\s*[:：-]?\s*/i, "")
    .replace(/\s*(יחידה|לפרטים נוספים|קרא עוד|פרטים נוספים).*$/i, "")
    .replace(/\s*[|,]\s*.*$/, "")
    .replace(/\s*[-–—]\s*(מנהל|מנהלת|רופא|רופאה|מומחה|מומחית|אחראי|אחראית|סגן|סגנית).*$/, "")
    .replace(/\s+(מנהל|מנהלת|רופא|רופאה|מומחה|מומחית|אחראי|אחראית|סגן|סגנית).*$/, "")
    .replace(/[.]+$/g, "")
    .trim();
  const match = withoutNoise.match(doctorNamePattern);

  return normalizeWhitespace(match?.[1] ?? withoutNoise);
}

function extractNameFromText(text: string) {
  const lines = text.split("\n").map(normalizeWhitespace).filter(Boolean);
  const doctorLine = lines.find((line) => doctorLikePattern.test(line) && line.length <= 180);
  const match = doctorLine?.match(doctorNamePattern) ?? text.match(doctorNamePattern);

  return match ? cleanDoctorName(match[1]) : null;
}

function extractNameFromElement($: CheerioAPI, element: Element) {
  const elementHandle = $(element);
  const priorityTexts = [
    ...elementHandle.find("h1,h2,h3,h4,h5,strong,b,a").toArray().map((item) => $(item).text()),
    elementHandle.text()
  ];

  for (const text of priorityTexts) {
    const name = extractNameFromText(normalizeMultilineText(text));
    if (name) return name;
  }

  return null;
}

function extractRoleFromText(rawText: string, fullName: string) {
  const normalizedName = normalizeWhitespace(fullName);
  const lines = rawText
    .split("\n")
    .map(normalizeWhitespace)
    .map((line) => normalizeWhitespace(line.replace(normalizedName, "")))
    .filter(Boolean)
    .filter((line) => rolePattern.test(line))
    .slice(0, 2);

  return lines.length > 0 ? lines.join(" | ") : null;
}

function extractProfileUrl($: CheerioAPI, element: Element, sourceUrl: string) {
  const links = $(element).is("a[href]") ? [element] : $(element).find("a[href]").toArray();

  for (const link of links) {
    const href = $(link).attr("href");
    const absolute = absoluteUrl(href, sourceUrl);
    if (!absolute) continue;
    if (/mailto:|tel:/i.test(absolute)) continue;
    if (/page=\d+/i.test(absolute)) continue;

    return absolute;
  }

  return null;
}

function sectionHeadingForStaffElement($: CheerioAPI, element: Element) {
  const handle = $(element);
  const group = handle.closest("span[id*='MedicalStaffControl'],div,section");
  const groupHeading = group.prevAll("p.p-section-bold,h1,h2,h3,h4,h5,h6,strong").first();
  const heading = normalizeWhitespace(groupHeading.text());
  if (heading) return heading.replace(/:$/, "");
  const teamHeading = normalizeWhitespace(handle.closest("#Team").find("h1,h2,h3,h4,h5,h6").first().text());
  return teamHeading || null;
}

function structuredStaffElements($: CheerioAPI) {
  const elements = $("#Team p.p-section-tight,[id*='MedicalStaffControl'] p.p-section-tight")
    .toArray()
    .filter(isElement)
    .filter((element) => doctorLikePattern.test(elementText($, element)));
  return Array.from(new Set(elements));
}

function extractStructuredStaffDoctors($: CheerioAPI, sourceUrl: string, config: ClalitDepartmentConfig) {
  return structuredStaffElements($).flatMap((element): DoctorRecord[] => {
    const rawText = elementText($, element);
    const fullName = extractNameFromElement($, element);
    if (!fullName) return [];
    return [
      {
        fullName,
        titleOrRole: extractRoleFromText(rawText, fullName),
        profileUrl: extractProfileUrl($, element, sourceUrl),
        imageUrl: extractImageUrl($, element, sourceUrl),
        rawText,
        sourceUrl,
        hospital: config.hospital,
        department: config.department,
        sectionHeading: sectionHeadingForStaffElement($, element)
      }
    ];
  });
}

function staffContentRoots($: CheerioAPI) {
  const roots = $("#Team,.ms-rtestate-field").toArray().filter(isElement);
  return roots.filter((root, index) => !roots.some((candidate, candidateIndex) => candidateIndex !== index && $(root).parents().is(candidate)));
}

function adjacentRoleText($: CheerioAPI, anchor: Element) {
  const chunks: string[] = [];
  let sibling = anchor.nextSibling;
  while (sibling && chunks.length < 3) {
    if (isElement(sibling) && sibling.tagName === "br") break;
    if (isElement(sibling) && $(sibling).is("a") && doctorLikePattern.test($(sibling).text())) break;
    if (isElement(sibling) && $(sibling).find("a").toArray().some((link) => doctorLikePattern.test($(link).text()))) break;
    const text = normalizeWhitespace($(sibling).text());
    if (text) chunks.push(text);
    if (isElement(sibling) && $(sibling).find("br").length > 0) break;
    sibling = sibling.nextSibling;
  }
  return normalizeWhitespace(chunks.join(" ").replace(/^[-–—\s]+/, ""));
}

function sectionHeadingForLinkedAnchor($: CheerioAPI, anchor: Element) {
  const paragraph = $(anchor).closest("p");
  const localHeading = normalizeWhitespace(paragraph.find("strong,b").first().text()).replace(/:$/, "");
  if (localHeading) return localHeading;
  return sectionHeadingForStaffElement($, anchor);
}

function extractLinkedStaffDoctors($: CheerioAPI, sourceUrl: string, config: ClalitDepartmentConfig) {
  const doctors: DoctorRecord[] = [];
  for (const root of staffContentRoots($)) {
    $(root)
      .find("a[href]")
      .each((_, anchor) => {
        if (!isElement(anchor)) return;
        const anchorText = normalizeMultilineText($(anchor).text());
        if (!doctorLikePattern.test(anchorText)) return;
        const fullName = extractNameFromText(anchorText);
        if (!fullName) return;
        const roleText = adjacentRoleText($, anchor);
        const rawText = normalizeMultilineText([fullName, roleText].filter(Boolean).join(" - "));
        const closestContainer = $(anchor).closest("p,li,tr,div").get(0);
        const imageContainer = isElement(closestContainer) ? closestContainer : anchor;
        doctors.push({
          fullName,
          titleOrRole: roleText || extractRoleFromText(rawText, fullName),
          profileUrl: extractProfileUrl($, anchor, sourceUrl),
          imageUrl: extractImageUrl($, imageContainer, sourceUrl),
          rawText,
          sourceUrl,
          hospital: config.hospital,
          department: config.department,
          sectionHeading: sectionHeadingForLinkedAnchor($, anchor)
        });
      });
  }
  return doctors;
}

function extractTextLineStaffDoctors($: CheerioAPI, sourceUrl: string, config: ClalitDepartmentConfig) {
  const doctors: DoctorRecord[] = [];
  for (const root of staffContentRoots($)) {
    const clone = $(root).clone();
    clone.find("br").replaceWith("\n");
    const lines = normalizeMultilineText(clone.text())
      .split("\n")
      .map(normalizeWhitespace)
      .filter((line) => doctorLikePattern.test(line));
    for (const line of lines) {
      const segments = line
        .split(/(?=(?:ד["״']ר|ד״ר|ד"ר|פרופ['׳]?|פרופ׳|פרופסור)\s+[א-ת])/i)
        .map(normalizeWhitespace)
        .filter((segment) => doctorLikePattern.test(segment));
      for (const segment of segments) {
        const fullName = extractNameFromText(segment);
        if (!fullName || !rolePattern.test(segment)) continue;
        if (config.hospitalSlug === "soroka" && (segment.length > 240 || sorokaNonPhysicianStaffPattern.test(segment))) continue;
        doctors.push({
          fullName,
          titleOrRole: extractRoleFromText(segment, fullName),
          profileUrl: null,
          imageUrl: null,
          rawText: segment,
          sourceUrl,
          hospital: config.hospital,
          department: config.department,
          sectionHeading: null
        });
      }
    }
  }
  return doctors;
}

function extractImageUrl($: CheerioAPI, element: Element, sourceUrl: string) {
  const image = $(element).find("img").first();
  const source =
    image.attr("src") ??
    image.attr("data-src") ??
    image.attr("data-original") ??
    image.attr("data-lazy-src") ??
    null;

  return absoluteUrl(source, sourceUrl);
}

function elementDescriptor($: CheerioAPI, element: Element) {
  const handle = $(element);
  const id = handle.attr("id");
  const className = handle.attr("class");

  return [
    element.tagName ?? "element",
    id ? `#${id}` : "",
    className ? `.${className.trim().replace(/\s+/g, ".")}` : ""
  ].join("");
}

function inspectDoctorLikeBlocks($: CheerioAPI) {
  const blocks: CandidateBlock[] = [];
  const seen = new Set<string>();

  $("li,tr,article,div,section").each((_, element) => {
    if (!isElement(element)) return;
    if (isExcludedElement($, element)) return;

    const text = elementText($, element);
    if (!doctorLikePattern.test(text)) return;
    if (text.length < 12 || text.length > 1400) return;

    const key = text.slice(0, 260);
    if (seen.has(key)) return;
    seen.add(key);

    blocks.push({
      selector: elementDescriptor($, element),
      textLength: text.length,
      doctorLikeMatches: countDoctorLikeMatches(text),
      textPreview: text.slice(0, 260)
    });
  });

  return blocks
    .sort((left, right) => {
      if (left.doctorLikeMatches !== right.doctorLikeMatches) {
        return left.doctorLikeMatches - right.doctorLikeMatches;
      }

      return left.textLength - right.textLength;
    })
    .slice(0, 20);
}

function elementScore($: CheerioAPI, element: Element, text: string) {
  const descriptor = elementDescriptor($, element);
  const hasProfileLink = $(element).find("a[href]").length > 0 ? 18 : 0;
  const hasImage = $(element).find("img").length > 0 ? 12 : 0;
  const doctorClass = /doctor|staff|team|item|card/i.test(descriptor) ? 12 : 0;
  const compactText = text.length <= 500 ? 10 : 0;
  const matchPenalty = Math.max(0, countDoctorLikeMatches(text) - 1) * 15;

  return hasProfileLink + hasImage + doctorClass + compactText - matchPenalty;
}

function candidateElements($: CheerioAPI) {
  const scored = new Map<Element, { score: number; text: string }>();

  for (const selector of candidateSelectors) {
    $(selector).each((_, element) => {
      if (!isElement(element)) return;
      if (isExcludedElement($, element)) return;

      const text = normalizeMultilineText($(element).text());
      if (!doctorLikePattern.test(text)) return;
      if (text.length < 10 || text.length > 1200) return;

      const childDoctorBlocks = $(element)
        .children()
        .toArray()
        .filter((child) => doctorLikePattern.test(elementText($, child))).length;
      if (childDoctorBlocks > 1) return;

      const score = elementScore($, element, text);
      const existing = scored.get(element);
      if (!existing || score > existing.score) {
        scored.set(element, { score, text });
      }
    });
  }

  return Array.from(scored.entries())
    .sort((left, right) => right[1].score - left[1].score)
    .map(([element]) => element);
}

export function extractDoctorsFromDoctorList($: CheerioAPI, sourceUrl: string, config: ClalitDepartmentConfig) {
  return extractDoctorsFromDoctorListWithDiagnostics($, sourceUrl, config).doctors;
}

function extractDoctorsFromDoctorListWithDiagnostics($: CheerioAPI, sourceUrl: string, config: ClalitDepartmentConfig) {
  const doctors: DoctorRecord[] = [];
  const seen = new Set<string>();

  for (const doctor of [
    ...extractStructuredStaffDoctors($, sourceUrl, config),
    ...extractLinkedStaffDoctors($, sourceUrl, config),
    ...extractTextLineStaffDoctors($, sourceUrl, config)
  ]) {
    const key = doctor.profileUrl ?? `${doctor.fullName}|${doctor.rawText.slice(0, 160)}`;
    const nameKey = `name:${normalizeWhitespace(doctor.fullName).toLowerCase()}`;
    if (seen.has(key) || (doctor.profileUrl === null && seen.has(nameKey))) continue;
    seen.add(key);
    seen.add(nameKey);
    doctors.push(doctor);
  }

  for (const element of candidateElements($)) {
    const rawText = elementText($, element);
    const fullName = extractNameFromElement($, element);
    if (!fullName) continue;

    const profileUrl = extractProfileUrl($, element, sourceUrl);
    const imageUrl = extractImageUrl($, element, sourceUrl);
    const key = profileUrl ?? `${fullName}|${rawText.slice(0, 160)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    doctors.push({
      fullName,
      titleOrRole: extractRoleFromText(rawText, fullName),
      profileUrl,
      imageUrl,
      rawText,
      sourceUrl,
      hospital: config.hospital,
      department: config.department
    });
  }

  if (config.hospitalSlug !== "soroka") {
    return { doctors, rejectedCandidates: [] };
  }

  const refined = applySorokaIdentityMap(doctors);

  return {
    doctors: refined.accepted,
    rejectedCandidates: refined.rejected.map((candidate) => ({
      ...candidate,
      sourceUrl
    }))
  };
}

function pageNumberFromUrl(url: string) {
  const parsedUrl = new URL(url);
  const page = Number(parsedUrl.searchParams.get("page") ?? "1");

  return Number.isInteger(page) && page > 0 ? page : 1;
}

function discoverPaginationUrls($: CheerioAPI, sourceUrl: string) {
  const urls = new Set<string>();
  const source = new URL(sourceUrl);

  $("a[href]").each((_, link) => {
    const href = $(link).attr("href");
    const absolute = absoluteUrl(href, sourceUrl);
    if (!absolute) return;

    const parsed = new URL(absolute);
    const isSameDoctorsPage =
      parsed.hostname === source.hostname &&
      parsed.pathname.replace(/\/+$/, "") === source.pathname.replace(/\/+$/, "");
    if (!isSameDoctorsPage) return;

    const page = parsed.searchParams.get("page");
    const linkText = normalizeWhitespace($(link).text());
    if (!page && !/^\d+$/.test(linkText)) return;

    if (!page && /^\d+$/.test(linkText)) {
      parsed.searchParams.set("page", linkText);
    }

    urls.add(parsed.toString());
  });

  return Array.from(urls).sort((left, right) => pageNumberFromUrl(left) - pageNumberFromUrl(right));
}

async function crawlPage(
  url: string,
  crawlIndex: number,
  config: ClalitDepartmentConfig,
  paths: CrawlerOutputPaths
): Promise<DoctorListPageResult> {
  const html = await fetchClalitHtml(url);
  const $ = load(html);
  const pageNumber = pageNumberFromUrl(url);
  const snapshotPath = path.join(paths.rawListDir, `page-${pageNumber || crawlIndex}.html`);
  const extracted = extractDoctorsFromDoctorListWithDiagnostics($, url, config);

  await fs.writeFile(snapshotPath, html, "utf8");

  return {
    url,
    pageNumber,
    html,
    doctors: extracted.doctors,
    discoveredPageUrls: discoverPaginationUrls($, url),
    candidateBlocks: inspectDoctorLikeBlocks($),
    rejectedCandidates: extracted.rejectedCandidates
  };
}

async function crawlAllPages(config: ClalitDepartmentConfig, paths: CrawlerOutputPaths) {
  const queue = [config.doctorListUrl];
  const seenUrls = new Set<string>();
  const results: DoctorListPageResult[] = [];

  while (queue.length > 0 && results.length < MAX_PAGES) {
    const nextUrl = queue.shift();
    if (!nextUrl || seenUrls.has(nextUrl)) continue;
    seenUrls.add(nextUrl);

    const result = await crawlPage(nextUrl, results.length + 1, config, paths);
    results.push(result);

    for (const discoveredUrl of result.discoveredPageUrls) {
      if (!seenUrls.has(discoveredUrl) && queue.length + results.length < MAX_PAGES) {
        queue.push(discoveredUrl);
      }
    }
  }

  return results.sort((left, right) => left.pageNumber - right.pageNumber);
}

export function dedupeDoctors(doctors: DoctorRecord[]) {
  const seen = new Set<string>();

  return doctors.filter((doctor) => {
    const key = `${doctor.fullName}|${doctor.profileUrl ?? ""}|${doctor.rawText.slice(0, 120)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function crawlClalitDepartmentDoctors(config: ClalitDepartmentConfig, paths: CrawlerOutputPaths) {
  await fs.mkdir(paths.rawListDir, { recursive: true });
  const pages = await crawlAllPages(config, paths);
  const doctors = dedupeDoctors(pages.flatMap((page) => page.doctors));
  const duplicateContext = buildDuplicateDoctorContext(doctors);
  const doctorsWithQa = doctors.map((doctor) => {
    const qa = qaForDoctorRecord(doctor, duplicateContext);
    return {
      ...doctor,
      qaFlags: qa.flags,
      qaNotes: qa.notes,
      qaSeverity: qa.qaSeverity
    };
  });

  await writeJson(paths.doctorsPath, doctorsWithQa);

  return {
    ok: true,
    id: config.id,
    outputPath: paths.doctorsPath,
    rawDir: paths.rawListDir,
    pagesCrawled: pages.length,
    doctorsFound: doctorsWithQa.length,
    qaFlagsSummary: summarizeQaFlags(doctorsWithQa),
    doctorsPerPage: pages.map((page) => ({
      pageNumber: page.pageNumber,
      sourceUrl: page.url,
      doctorsFound: page.doctors.length,
      extractedNames: page.doctors.map((doctor) => doctor.fullName)
    })),
    warnings: pages
      .filter((page) => page.doctors.length === 0)
      .map((page) => `Zero doctors found on page ${page.pageNumber}: ${page.url}`),
    rejectedCandidates: pages.flatMap((page) =>
      (page.rejectedCandidates ?? []).map((candidate) => ({
        pageNumber: page.pageNumber,
        ...candidate
      }))
    ),
    zeroDoctorCandidateBlocks: pages
      .filter((item) => item.doctors.length === 0)
      .map((page) => ({
        pageNumber: page.pageNumber,
        candidateDoctorLikeBlocks: page.candidateBlocks
      }))
  };
}
