import { load } from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { CandidatePage, FetchSnapshot, HospitalBaseline, HospitalDoctorRecord, ParserFamily } from "../types";
import { absoluteUrl, normalizeText, normalizeWhitespace } from "@/crawler/clalit/utils";

const doctorTitlePattern =
  /(?:ד["״']ר|ד״ר|ד"ר|ד'\s?ר|פרופ['׳]?|פרופ׳|פרופסור|Dr\.?|Prof\.?)\s+[א-תA-Za-z][א-תA-Za-z\s.'׳״"-]{2,90}/i;
const hebrewDoctorTitlePrefix = /^(ד["״']ר|ד״ר|ד"ר|ד'\s?ר|פרופ['׳]?|פרופ׳|פרופסור)\s+/;
const linkCandidatePattern =
  /(רופאים|רופאי המחלקה|אנשי הצוות|צוות רפואי|הצוות הרפואי|הצוות שלנו|צוות המחלקה|מומחים|רופאים בכירים|doctors|doctor|team|staff|physicians|specialists)/i;
const noisyTextPattern =
  /(כניסה|יציאה|הרשמה|חיפוש|זימון תור|ניווט|תפריט|פייסבוק|instagram|youtube|accessibility|footer|header)/i;
const fileAssetPattern = /\.(?:pdf|docx?|xlsx?|pptx?|png|jpe?g|gif|webp)(?:[?#].*)?$/i;
const noisyUrlPattern =
  /(?:\/news\/|news_|\/gen_info\/|covid|academy_and_research\/documents|publications|publication|newsletter|press|\/documents\/)/i;

export async function fetchPublicHtml(url: string, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
    const html = await response.text();
    return {
      ok: response.ok,
      statusCode: response.status,
      finalUrl: response.url || url,
      html,
      error: response.ok ? null : `${response.status} ${response.statusText}`
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      finalUrl: url,
      html: "",
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function inspectHtml(url: string, html: string, ok = true, statusCode: number | null = 200, error: string | null = null): FetchSnapshot {
  const $ = load(html);
  return {
    url,
    ok,
    statusCode,
    finalUrl: url,
    title: normalizeWhitespace($("title").first().text()) || null,
    h1: headings($, "h1"),
    h2: headings($, "h2").slice(0, 20),
    htmlLength: html.length,
    visibleTextLength: normalizeText($("body").text()).length,
    error
  };
}

function headings($: CheerioAPI, selector: string) {
  return $(selector)
    .toArray()
    .map((node) => normalizeWhitespace($(node).text()))
    .filter(Boolean);
}

function sameDomain(url: string, sourceUrl: string) {
  try {
    return new URL(url).hostname === new URL(sourceUrl).hostname;
  } catch {
    return false;
  }
}

function isNoisyCrawlerUrl(url: string, anchorText = "") {
  const joined = `${url} ${anchorText}`;
  return fileAssetPattern.test(url) || noisyUrlPattern.test(joined);
}

function patternTypeFor(url: string, text: string): CandidatePage["patternType"] {
  const joined = `${url} ${text}`;
  if (/doctorssearch|doctors-lobby|our-specialists|רופאים מומחים/i.test(joined)) return "doctorIndex";
  if (/doctors|physicians|רופאים/i.test(joined)) return "doctorPage";
  if (/team|הצוות|צוות/i.test(joined)) return "teamPage";
  if (/staff|אנשי הצוות/i.test(joined)) return "staffPage";
  if (/department|clinic|unit|מחלקה|מרפאה|יחידה/i.test(joined)) return "departmentPage";
  return "unknown";
}

function parserFamilyFor(type: CandidatePage["patternType"], baseline: HospitalBaseline): ParserFamily {
  if (type === "doctorIndex") return baseline.parserFamilies.includes("doctorIndexAssisted") ? "doctorIndexAssisted" : "searchDriven";
  if (type === "teamPage" || type === "staffPage") return "teamPage";
  if (type === "departmentPage") return "inlineStaff";
  return baseline.parserFamilies[0] ?? "unknown";
}

export function discoverCandidatePages(html: string, sourceUrl: string, baseline: HospitalBaseline) {
  const $ = load(html);
  const candidates = new Map<string, CandidatePage>();

  $("a[href]").each((_, anchor) => {
    const href = absoluteUrl($(anchor).attr("href"), sourceUrl);
    if (!href || !sameDomain(href, sourceUrl)) return;
    const anchorText = normalizeWhitespace($(anchor).text());
    if (isNoisyCrawlerUrl(href, anchorText)) return;
    const evidence = `${anchorText} ${href}`;
    if (!linkCandidatePattern.test(evidence) && !/doctor|staff|team|physician|specialist/i.test(href)) return;
    const patternType = patternTypeFor(href, anchorText);
    const confidence = patternType === "doctorIndex" ? 0.9 : patternType === "doctorPage" || patternType === "teamPage" ? 0.82 : 0.65;
    const existing = candidates.get(href);
    if (existing && existing.confidence >= confidence) return;
    candidates.set(href, {
      url: href,
      sourceUrl,
      anchorText,
      patternType,
      parserFamily: parserFamilyFor(patternType, baseline),
      confidence,
      evidence: evidence.slice(0, 500)
    });
  });

  return Array.from(candidates.values()).sort((left, right) => right.confidence - left.confidence || left.url.localeCompare(right.url));
}

function cleanName(value: string) {
  const match = normalizeWhitespace(value).match(doctorTitlePattern);
  return normalizeWhitespace(match?.[0] ?? value)
    .replace(/\s*[|,]\s*.*$/, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/[.]+$/g, "");
}

function normalizeDoctorName(value: string) {
  return cleanName(value)
    .replace(hebrewDoctorTitlePrefix, "")
    .replace(/^(Dr\.?|Prof\.?)\s+/i, "")
    .replace(/[׳'״"]/g, "")
    .replace(/[.\-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titlePrefix(value: string) {
  return normalizeWhitespace(value).match(/^(ד["״']?ר|ד״ר|ד"ר|פרופ['׳]?|פרופ׳|פרופסור|Dr\.?|Prof\.?)/i)?.[1] ?? null;
}

function imageFrom($: CheerioAPI, root: ReturnType<CheerioAPI>, sourceUrl: string) {
  for (const image of root.find("img").toArray()) {
    const src = $(image).attr("src") ?? $(image).attr("data-src") ?? $(image).attr("data-original") ?? null;
    const absolute = absoluteUrl(src, sourceUrl);
    if (absolute) return absolute;
  }
  return null;
}

function roleFromRaw(rawText: string, fullName: string) {
  const lines = rawText
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .filter((line) => line !== fullName);
  return lines.find((line) => /(מנהל|מנהלת|רופא|רופאה|מומחה|מומחית|אחראי|אחראית|director|physician|specialist|consultant)/i.test(line)) ?? null;
}

function candidateRoot($: CheerioAPI, node: Parameters<CheerioAPI>[0]) {
  return $(node).closest("article,li,dd,tr,.doctor,.doctor-card,.team-member,.staff-member,.card,.item,div");
}

export function extractDoctorsFromHtml(html: string, sourceUrl: string, baseline: HospitalBaseline, parserFamily: ParserFamily) {
  if (isNoisyCrawlerUrl(sourceUrl)) return [];

  const $ = load(html);
  const doctors = new Map<string, HospitalDoctorRecord>();

  $("a[href]").each((_, anchor) => {
    const text = normalizeWhitespace($(anchor).text());
    const href = absoluteUrl($(anchor).attr("href"), sourceUrl);
    const rawRoot = candidateRoot($, anchor);
    const rawText = normalizeText(rawRoot.text() || text);
    const evidence = `${text} ${href ?? ""} ${rawText.slice(0, 160)}`;
    if (!doctorTitlePattern.test(evidence) || noisyTextPattern.test(evidence)) return;
    const textHasDoctorName = doctorTitlePattern.test(text);
    const rawDoctorMatches = rawText.match(new RegExp(doctorTitlePattern.source, "gi")) ?? [];
    if (!textHasDoctorName && rawDoctorMatches.length !== 1) return;
    const fullName = cleanName(textHasDoctorName ? text : rawText);
    const normalizedName = normalizeDoctorName(fullName);
    if (!normalizedName || normalizedName.length < 3 || normalizedName.length > 80) return;
    const profileUrl = href && !/#|javascript:/i.test(href) ? href : null;
    const key = `${normalizedName}::${profileUrl ?? sourceUrl}`;
    doctors.set(key, {
      fullName,
      normalizedName,
      titlePrefix: titlePrefix(fullName),
      role: roleFromRaw(rawText, fullName),
      unit: null,
      profileUrl,
      imageUrl: imageFrom($, rawRoot, sourceUrl),
      rawText: rawText.slice(0, 2000),
      sourceUrl,
      hospitalSlug: baseline.hospitalSlug,
      hospital: baseline.hospitalName,
      parserFamily,
      sourceEvidence: rawText.slice(0, 500),
      qaFlags: profileUrl ? [] : ["missingProfileUrl"],
      qaSeverity: profileUrl ? "ok" : "review"
    });
  });

  if (doctors.size === 0) {
    const bodyText = normalizeText($("body").text());
    const matches = bodyText.match(new RegExp(doctorTitlePattern.source, "gi")) ?? [];
    for (const match of matches.slice(0, 80)) {
      if (noisyTextPattern.test(match)) continue;
      const fullName = cleanName(match);
      const normalizedName = normalizeDoctorName(fullName);
      if (!normalizedName || doctors.has(`${normalizedName}::${sourceUrl}`)) continue;
      doctors.set(`${normalizedName}::${sourceUrl}`, {
        fullName,
        normalizedName,
        titlePrefix: titlePrefix(fullName),
        role: null,
        unit: null,
        profileUrl: null,
        imageUrl: null,
        rawText: match,
        sourceUrl,
        hospitalSlug: baseline.hospitalSlug,
        hospital: baseline.hospitalName,
        parserFamily,
        sourceEvidence: match,
        qaFlags: ["missingProfileUrl", "textOnlyCandidate"],
        qaSeverity: "review"
      });
    }
  }

  return Array.from(doctors.values()).sort((left, right) => left.normalizedName.localeCompare(right.normalizedName, "he"));
}

export function inspectProfileHtml(html: string) {
  const $ = load(html);
  const text = normalizeText($("main,article,body").first().text());
  const usefulSections = /(השכלה|התמחות|מומחיות|תחומי|ניסיון|תפקיד|פרסומים|education|specialty|specialties|fellowship|experience)/i.test(text);
  const partialSections = /(טלפון|דוא"ל|מייל|תפקיד|יחידה|מחלקה|phone|email|department|unit)/i.test(text);
  return {
    textLength: text.length,
    completeness: usefulSections ? "full" : partialSections || text.length > 250 ? "partial" : "listOnly",
    snippet: text.slice(0, 1000)
  } as const;
}
