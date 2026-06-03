import * as cheerio from "cheerio";
import {
  FirecrawlScrapeError,
  type FirecrawlScrapeErrorCode,
  scrapeUrlWithFirecrawl
} from "@/lib/server/firecrawlClient";
import {
  hasConfidenceAtLeast,
  matchEntFellowships,
  type DetectedFellowship
} from "@/lib/server/fellowshipMatcher";
import {
  extractListAfterHeading,
  extractTraining,
  type ExtractedTraining
} from "@/lib/server/trainingExtractor";

export type ShebaEntPhysicianResult = {
  physicianName: string | null;
  role: string | null;
  department: string | null;
  hospital: "שיבא";
  sourceUrl: string;
  bioText: string;
  bioTextLength: number;
  medicalSchool: string | null;
  residencySpecialty: string | null;
  residencyInstitution: string | null;
  residencyYears: string | null;
  fellowshipText: string | null;
  fellowshipInstitution: string | null;
  fellowshipCountry: string | null;
  fellowshipYears: string | null;
  clinicalInterests: string[];
  procedures: string[];
  academicTitle: string | null;
  professionalSocieties: string[];
  publicationsLink: string | null;
  extractedTraining: ExtractedTraining;
  detectedFellowships: DetectedFellowship[];
  needsExternalSearch: boolean;
  reason: string;
};

export type ShebaEntCrawlerDebugEntry = {
  name: string | null;
  title: string | null;
  profileUrl: string | null;
};

export type ShebaEntCrawlerDebug = {
  teamCardsFound: number;
  physiciansFound: number;
  seniorPhysiciansFound: number;
  residentsFiltered: number;
  nonPhysiciansFiltered: number;
  profileUrlsFound: number;
  firstEntries: ShebaEntCrawlerDebugEntry[];
  firecrawl?: {
    metadata?: Record<string, unknown>;
    responseKeys?: string[];
    dataKeys?: string[];
    statusCode?: number;
  };
  markdownPreview?: string;
  htmlPreview?: string;
  allLinks?: Array<{ text: string; href: string }>;
  relevantLinks?: Array<{ text: string; href: string }>;
  pageSourceAssessment?: {
    teamSectionInHtml: boolean;
    teamSectionInMarkdown: boolean;
    likelyJavaScriptInjected: boolean;
    likelySeparateApiEndpoint: boolean;
    endpointCandidates: string[];
    notes: string[];
  };
};

export type ShebaEntCrawlerResult = {
  ok: true;
  startUrl: string;
  departmentUrl: string;
  physiciansProcessed: number;
  results: ShebaEntPhysicianResult[];
  warnings: string[];
  debug?: ShebaEntCrawlerDebug;
};

type PhysicianCandidate = {
  physicianName: string | null;
  role: string | null;
  department: string | null;
  profileUrl: string | null;
  cardText: string;
};

type CandidateExtractionReport = {
  candidates: PhysicianCandidate[];
  debug: ShebaEntCrawlerDebug;
};

type LoadedShebaPage = {
  html: string;
  text: string;
  markdown?: string;
  finalUrl: string;
  firecrawl?: {
    metadata?: Record<string, unknown>;
    links?: string[];
    responseKeys?: string[];
    dataKeys?: string[];
    statusCode?: number;
    source: "firecrawl";
  };
};

export class ShebaEntCrawlerError extends Error {
  code: FirecrawlScrapeErrorCode | "empty_page" | "invalid_url" | "unknown";
  stackTrace?: string;

  constructor(code: ShebaEntCrawlerError["code"], message: string, stackTrace?: string) {
    super(message);
    this.name = "ShebaEntCrawlerError";
    this.code = code;
    this.stackTrace = stackTrace;
  }
}

const SHEBA_START_URL = "https://www.shebaonline.org/";
const DEFAULT_DEPARTMENT_CANDIDATES = [
  "https://www.shebaonline.org/department/otolaryngology-head-and-neck-surgery/",
  "https://eng.sheba.co.il/otolaryngology_head_neck_surgery",
  "https://www.sheba.co.il/%D7%90%D7%A3_%D7%90%D7%95%D7%96%D7%9F_%D7%92%D7%A8%D7%95%D7%9F/"
];
const ALLOWED_HOSTS = new Set([
  "sheba.co.il",
  "www.sheba.co.il",
  "eng.sheba.co.il",
  "shebaonline.org",
  "www.shebaonline.org"
]);
const SENIOR_PRIORITY_PATTERNS = [
  /מנהל(?:ת)?\s+מערך/,
  /מנהל(?:ת)?\s+מחלקה/,
  /סגן(?:ית)?\s+מנהל(?:ת)?\s+מחלקה/,
  /סגן(?:ית)?\s+מנהל(?:ת)?/,
  /מנהל(?:ת)?\s+יחידה/,
  /מנהל(?:ת)?\s+שירות/,
  /מרכז(?:ת)?\s+תחום/,
  /רופא(?:ה)?\s+בכיר(?:ה)?/,
  /פרופ(?:'|׳|סור)?(?!יל)/,
  /\bprof\.?\b/i,
  /\bprofessor\b/i,
  /\bsenior physician\b/i,
  /\bchair(?:man|person)?\b/i,
  /\bdirector\b/i,
  /\bdeputy\b/i,
  /\bhead\b/i,
  /\bconsultant\b/i,
  /\battending\b/i
];
const RESIDENT_FILTER_PATTERNS = [
  /מתמחה(?:\/ית)?/,
  /סטאז(?:'|׳)?ר(?:ית)?/,
  /\bresident\b/i,
  /\bfellow\b/i,
  /\bintern\b/i,
  /\bstudent\b/i,
  /סטודנט(?:ית)?/
];
const NON_PHYSICIAN_FILTER_PATTERNS = [
  /(?:^|\s)אח(?:\s|$)/,
  /אחות/,
  /צוות\s+סיעודי/,
  /פרא-?רפואי/,
  /קלינאי(?:ת)?\s+תקשורת/,
  /עובד(?:ת)?\s+מחקר/,
  /מזכיר(?:ה|ות)?/,
  /מתאמ(?:ת|ות)/,
  /צוות\s+מנהלי/,
  /מנהלה/,
  /\bnurse\b/i,
  /\bsecretary\b/i,
  /\bcoordinator\b/i,
  /\badministrative\b/i
];
const IGNORE_ROLE_PATTERNS = [...RESIDENT_FILTER_PATTERNS, ...NON_PHYSICIAN_FILTER_PATTERNS];
const PHYSICIAN_CUE_PATTERNS = [
  /ד["״']?ר/,
  /\bdr\.?\b/i,
  /פרופ(?:'|׳|סור)?(?!יל)/,
  /\bprof\.?\b/i,
  /\bprofessor\b/i,
  /רופא(?:ה)?/,
  /physician/i,
  ...SENIOR_PRIORITY_PATTERNS
];
const TEAM_HEADING_PATTERNS = [
  /הצוות\s+שלנו/,
  /הצוות\s+הרפואי/,
  /צוות\s+המחלקה/,
  /\bour team\b/i,
  /\bmedical team\b/i,
  /\bmedical staff\b/i
];
const DEBUG_PREVIEW_LENGTH = 5000;
const RELEVANT_LINK_PATTERN =
  /doctor|physician|profile|staff|team|doctor card|רופא|צוות|אודות/i;
const ENDPOINT_CANDIDATE_PATTERN =
  /(?:https?:)?\/\/[^"'\s<>]+|\/(?:api|wp-json|wp-admin\/admin-ajax|_next\/data|graphql|umbraco|sitecore|doctors?|physicians?|staff|team)[^"'\s<>]*/gi;

function isAllowedShebaUrl(value: string) {
  try {
    return ALLOWED_HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

export function assertAllowedShebaUrl(value: string) {
  if (!isAllowedShebaUrl(value)) {
    throw new Error("מותר לסרוק רק URL של שיבא עבור POC זה.");
  }
}

function absoluteUrl(href: string | undefined, baseUrl: string) {
  if (!href) return null;
  try {
    const url = new URL(href, baseUrl);
    if (!ALLOWED_HOSTS.has(url.hostname)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function loadShebaPage(url: string): Promise<LoadedShebaPage> {
  try {
    assertAllowedShebaUrl(url);
  } catch (error) {
    throw new ShebaEntCrawlerError(
      "invalid_url",
      error instanceof Error ? error.message : "URL לא תקין.",
      error instanceof Error ? error.stack : undefined
    );
  }

  try {
    const rendered = await scrapeUrlWithFirecrawl(url);

    if (!rendered.html?.trim() && !rendered.text.trim()) {
      throw new ShebaEntCrawlerError("empty_page", "Firecrawl לא החזיר HTML או טקסט.");
    }

    return {
      html: rendered.html ?? rendered.markdown ?? rendered.text,
      text: rendered.text,
      markdown: rendered.markdown,
      finalUrl: url,
      firecrawl: {
        metadata: rendered.metadata,
        links: rendered.links,
        responseKeys: rendered.responseKeys,
        dataKeys: rendered.dataKeys,
        statusCode: rendered.statusCode,
        source: rendered.source
      }
    };
  } catch (error) {
    if (error instanceof ShebaEntCrawlerError) {
      throw error;
    }
    if (error instanceof FirecrawlScrapeError) {
      throw new ShebaEntCrawlerError(error.code, error.message, error.stack);
    }

    throw new ShebaEntCrawlerError(
      "unknown",
      `טעינת Firecrawl נכשלה: ${error instanceof Error ? error.message : "שגיאה לא ידועה"}`,
      error instanceof Error ? error.stack : undefined
    );
  }
}

function visibleTextFromHtml(html: string) {
  const $ = cheerio.load(html);
  $("script,style,noscript,svg,iframe,form,header,footer,nav").remove();
  $("br").replaceWith("\n");

  return $("body")
    .text()
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function linkRows(html: string, baseUrl: string) {
  const $ = cheerio.load(html);

  return $("a")
    .toArray()
    .map((node) => {
      const element = $(node);
      return {
        text: compactText(element.text()),
        href: absoluteUrl(element.attr("href"), baseUrl),
        cardText: compactText(
          element
            .closest(
              "article,li,.card,.doctor,.team,.staff,.person,.member,.elementor-column,.elementor-widget,.jet-listing-grid__item,[class*='card'],[class*='doctor'],[class*='team'],[class*='staff'],[class*='person'],[class*='member']"
            )
            .text()
        )
      };
    })
    .filter((row): row is { text: string; href: string; cardText: string } => Boolean(row.href));
}

function markdownLinks(markdown: string | undefined, baseUrl: string) {
  if (!markdown) return [];
  const links: Array<{ text: string; href: string }> = [];
  const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = markdownLinkPattern.exec(markdown))) {
    const href = absoluteUrl(match[2], baseUrl);
    if (href) {
      links.push({
        text: compactText(match[1]),
        href
      });
    }
  }

  return links;
}

function firecrawlLinks(links: string[] | undefined, baseUrl: string) {
  return (links ?? [])
    .map((link) => absoluteUrl(link, baseUrl))
    .filter((link): link is string => Boolean(link))
    .map((href) => ({ text: "", href }));
}

function dedupeLinks(links: Array<{ text: string; href: string }>) {
  const seen = new Set<string>();
  const deduped: Array<{ text: string; href: string }> = [];

  for (const link of links) {
    const key = `${link.href}::${link.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(link);
  }

  return deduped;
}

function relevantLinkText(link: { text: string; href: string }) {
  try {
    return `${link.text} ${link.href} ${decodeURIComponent(link.href)}`;
  } catch {
    return `${link.text} ${link.href}`;
  }
}

function extractAllPageLinks(page: LoadedShebaPage) {
  return dedupeLinks([
    ...linkRows(page.html, page.finalUrl).map((link) => ({
      text: link.text || link.cardText,
      href: link.href
    })),
    ...markdownLinks(page.markdown ?? page.text, page.finalUrl),
    ...firecrawlLinks(page.firecrawl?.links, page.finalUrl)
  ]);
}

function extractEndpointCandidates(page: LoadedShebaPage) {
  const source = [page.html, page.markdown, page.text].filter(Boolean).join("\n");
  const matches = source.match(ENDPOINT_CANDIDATE_PATTERN) ?? [];

  return Array.from(
    new Set(
      matches
        .map((candidate) => candidate.replace(/\\u002F/g, "/").replace(/&amp;/g, "&"))
        .map((candidate) => absoluteUrl(candidate, page.finalUrl))
        .filter((candidate): candidate is string => Boolean(candidate))
        .filter((candidate) => {
          const decoded = (() => {
            try {
              return decodeURIComponent(candidate);
            } catch {
              return candidate;
            }
          })();
          return RELEVANT_LINK_PATTERN.test(decoded) || /api|ajax|graphql|wp-json|_next\/data/i.test(candidate);
        })
    )
  ).slice(0, 80);
}

function assessPageSource(page: LoadedShebaPage, allLinks: Array<{ text: string; href: string }>) {
  const html = page.html ?? "";
  const markdown = page.markdown ?? page.text ?? "";
  const teamSectionInHtml = TEAM_HEADING_PATTERNS.some((pattern) => pattern.test(html));
  const teamSectionInMarkdown = TEAM_HEADING_PATTERNS.some((pattern) => pattern.test(markdown));
  const endpointCandidates = extractEndpointCandidates(page);
  const relevantLinks = allLinks.filter((link) => RELEVANT_LINK_PATTERN.test(relevantLinkText(link)));
  const notes: string[] = [];

  if (teamSectionInHtml) notes.push("team section heading appears in Firecrawl HTML.");
  if (teamSectionInMarkdown) notes.push("team section heading appears in Firecrawl markdown/text.");
  if (!teamSectionInHtml && !teamSectionInMarkdown) {
    notes.push("team section heading does not appear in Firecrawl HTML/markdown.");
  }
  if (endpointCandidates.length > 0) {
    notes.push("API/script-like endpoint candidates were found in page source.");
  }
  if (relevantLinks.length > 0) {
    notes.push("Relevant physician/team links were found.");
  }

  return {
    teamSectionInHtml,
    teamSectionInMarkdown,
    likelyJavaScriptInjected:
      !teamSectionInHtml && !teamSectionInMarkdown && (/script/i.test(html) || endpointCandidates.length > 0),
    likelySeparateApiEndpoint: endpointCandidates.length > 0,
    endpointCandidates,
    notes
  };
}

function looksLikeEntDepartmentLink(row: { text: string; href: string }) {
  const value = `${row.text} ${row.href}`.toLocaleLowerCase("he");

  return /otolaryngology|ear[-\s]?nose[-\s]?throat|head[-\s]?and[-\s]?neck|ent|אוזן|גרון|אא/.test(value);
}

async function findDepartmentUrl(inputUrl: string | null | undefined, warnings: string[]) {
  if (inputUrl) {
    assertAllowedShebaUrl(inputUrl);
    return inputUrl;
  }

  try {
    const startPage = await loadShebaPage(SHEBA_START_URL);
    const startHtml = startPage.html || startPage.text;
    const links = linkRows(startHtml, SHEBA_START_URL);
    const linkedCandidate = links.find(looksLikeEntDepartmentLink)?.href;
    if (linkedCandidate) return linkedCandidate;
  } catch (error) {
    warnings.push(`סריקת עמוד הבית של שיבא נכשלה: ${error instanceof Error ? error.message : "שגיאה לא ידועה"}`);
  }

  return DEFAULT_DEPARTMENT_CANDIDATES[0];
}

function maybePhysicianName(text: string) {
  const lines = text.split(/\n| {2,}/).map((line) => line.trim()).filter(Boolean);
  const direct = lines.find((line) => /^(?:Dr\.?|Prof\.?|Professor|ד"ר|ד״ר|פרופ)/i.test(line));
  const cleanName = (value: string) =>
    value
      .replace(/\b(?:Senior Physician|Chairman|Director|Deputy|Head|Resident|Nurse|Otolaryngology|Read More)\b.*$/i, "")
      .replace(/\b(?:מנהל|סגן|רופא|מתמחה|אח|אחות|מחלקה|קרא עוד|למידע נוסף)\b.*$/, "")
      .replace(/\s+/g, " ")
      .trim();

  if (direct) return cleanName(direct);

  const match = text.match(/((?:Dr\.?|Prof\.?|Professor|ד"ר|ד״ר|פרופ(?:'|׳|סור)?(?!יל))[^,\n|]{3,80})/i);
  return match?.[1] ? cleanName(match[1]) : null;
}

function maybeRole(text: string) {
  const lines = text.split(/\n| {2,}/).map((line) => line.trim()).filter(Boolean);
  const roleLine = lines.find((line) =>
    [...SENIOR_PRIORITY_PATTERNS, ...IGNORE_ROLE_PATTERNS].some((pattern) => pattern.test(line))
  );
  if (roleLine) return roleLine;
  const directPattern = [...SENIOR_PRIORITY_PATTERNS, ...IGNORE_ROLE_PATTERNS].find((pattern) =>
    pattern.test(text)
  );

  return directPattern ? text.match(directPattern)?.[0] ?? null : null;
}

function candidateText(candidate: PhysicianCandidate) {
  return `${candidate.physicianName ?? ""} ${candidate.role ?? ""} ${candidate.cardText}`;
}

function isPhysicianLikeCandidate(candidate: PhysicianCandidate) {
  return PHYSICIAN_CUE_PATTERNS.some((pattern) => pattern.test(candidateText(candidate)));
}

function classifyCandidate(candidate: PhysicianCandidate): "senior" | "resident" | "nonPhysician" {
  const text = `${candidate.role ?? ""} ${candidate.cardText}`;
  if (RESIDENT_FILTER_PATTERNS.some((pattern) => pattern.test(text))) return "resident";
  if (SENIOR_PRIORITY_PATTERNS.some((pattern) => pattern.test(text))) return "senior";
  if (isPhysicianLikeCandidate(candidate)) return "senior";
  if (NON_PHYSICIAN_FILTER_PATTERNS.some((pattern) => pattern.test(text))) return "nonPhysician";

  return "nonPhysician";
}

function isSeniorPhysicianCandidate(candidate: PhysicianCandidate) {
  return classifyCandidate(candidate) === "senior";
}

function dedupeCandidates(candidates: PhysicianCandidate[]) {
  const seen = new Set<string>();
  const deduped: PhysicianCandidate[] = [];

  for (const candidate of candidates) {
    const key = candidate.profileUrl ?? candidate.physicianName ?? candidate.cardText.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function teamScopeScore(text: string, linkCount: number) {
  const physicianCueCount = PHYSICIAN_CUE_PATTERNS.reduce(
    (count, pattern) => count + (pattern.test(text) ? 1 : 0),
    0
  );
  const teamHeadingScore = TEAM_HEADING_PATTERNS.some((pattern) => pattern.test(text)) ? 20 : 0;

  return teamHeadingScore + physicianCueCount * 10 + linkCount;
}

function extractTeamScopedHtml(html: string) {
  const $ = cheerio.load(html);
  const headings = $("h1,h2,h3,h4,h5,h6,[role='heading']")
    .toArray()
    .filter((node) => TEAM_HEADING_PATTERNS.some((pattern) => pattern.test(compactText($(node).text()))));
  const scopes: string[] = [];

  for (const heading of headings) {
    let current = $(heading);
    let best = current;
    let bestScore = 0;

    for (let depth = 0; depth < 7; depth += 1) {
      const text = compactText(current.text());
      const score = teamScopeScore(text, current.find("a[href]").length);
      if (score >= bestScore && text.length < 50000) {
        best = current;
        bestScore = score;
      }
      const parent = current.parent();
      if (!parent.length || parent.is("body,html")) break;
      current = parent;
    }

    const bestHtml = $.html(best);
    if (bestHtml) scopes.push(bestHtml);

    const siblingParts: string[] = [];
    let sibling = $(heading).parent().next();
    while (sibling.length && siblingParts.length < 24) {
      const hasNextHeading = sibling
        .find("h1,h2,h3,h4,[role='heading']")
        .toArray()
        .some((node) => !TEAM_HEADING_PATTERNS.some((pattern) => pattern.test(compactText($(node).text()))));
      if (hasNextHeading) break;
      const siblingHtml = $.html(sibling);
      if (siblingHtml) siblingParts.push(siblingHtml);
      sibling = sibling.next();
    }
    if (siblingParts.length) scopes.push(siblingParts.join("\n"));
  }

  return scopes.length ? scopes.join("\n") : html;
}

function profileUrlFromCard(cardHtml: string, departmentUrl: string) {
  const $ = cheerio.load(cardHtml);
  const links = $("a[href]")
    .toArray()
    .map((node) => {
      const element = $(node);
      return {
        text: compactText(element.text()),
        href: absoluteUrl(element.attr("href"), departmentUrl)
      };
    })
    .filter((row): row is { text: string; href: string } => Boolean(row.href));

  return (
    links.find((row) =>
      /\/doctor|\/doctors|physician|profile|staff|team|קרא עוד|למידע נוסף|רופא/i.test(
        `${row.text} ${row.href}`
      )
    )?.href ??
    links.find((row) => !/mailto:|tel:|#/.test(row.href))?.href ??
    null
  );
}

function candidateFromCard(
  cardText: string,
  profileUrl: string | null,
  preferredNameText?: string,
  preferredTitleText?: string
) {
  const name = maybePhysicianName(preferredNameText ?? "") ?? maybePhysicianName(cardText);

  return {
    physicianName: name,
    role: preferredTitleText ? compactText(preferredTitleText) : maybeRole(cardText),
    department: /אף אוזן גרון|אא"?ג|otolaryngology|ENT/i.test(cardText)
      ? "אף אוזן גרון"
      : "Otolaryngology - Head and Neck Surgery",
    profileUrl,
    cardText
  } satisfies PhysicianCandidate;
}

function extractMarkdownTeamCandidates(content: string, departmentUrl: string) {
  const lines = content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const startIndex = lines.findIndex((line) =>
    TEAM_HEADING_PATTERNS.some((pattern) => pattern.test(line))
  );
  const scopedLines = startIndex >= 0
    ? lines.slice(startIndex + 1).filter((line) => !/^#{1,3}\s+/.test(line))
    : lines;

  return scopedLines
    .filter((line) =>
      [...PHYSICIAN_CUE_PATTERNS, ...IGNORE_ROLE_PATTERNS].some((pattern) => pattern.test(line))
    )
    .slice(0, 80)
    .map((line) => {
      const markdownLink = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      const linkText = markdownLink?.[1] ?? line;
      const profileUrl = markdownLink?.[2] ? absoluteUrl(markdownLink[2], departmentUrl) : null;
      return candidateFromCard(line, profileUrl, linkText);
    });
}

function extractRawTeamCandidates(html: string, departmentUrl: string) {
  const scopedHtml = extractTeamScopedHtml(html);
  const $ = cheerio.load(scopedHtml);
  const candidates: PhysicianCandidate[] = [];
  const cardSelector = [
    "article",
    "li",
    ".card",
    ".doctor",
    ".team",
    ".staff",
    ".person",
    ".member",
    ".elementor-column",
    ".elementor-widget",
    ".jet-listing-grid__item",
    "[class*='card']",
    "[class*='doctor']",
    "[class*='team']",
    "[class*='staff']",
    "[class*='person']",
    "[class*='member']"
  ].join(",");

  $(cardSelector).each((_, node) => {
    const element = $(node);
    if (element.find("a[href]").length > 3 || element.find(cardSelector).length > 1) return;
    const cardText = compactText(element.text());
    if (cardText.length < 3 || cardText.length > 4000) return;
    const hasRelevantCue = [...PHYSICIAN_CUE_PATTERNS, ...IGNORE_ROLE_PATTERNS].some((pattern) =>
      pattern.test(cardText)
    );
    if (!hasRelevantCue) return;
    const preferredNameText = compactText(
      element.find("h1,h2,h3,h4,h5,h6,strong,b,[class*='name']").first().text()
    );
    const preferredTitleText = compactText(
      element.find("p,.title,.role,.position,[class*='title'],[class*='role'],[class*='position']").first().text()
    );
    const profileUrl = profileUrlFromCard($.html(element) ?? "", departmentUrl);
    candidates.push(candidateFromCard(cardText, profileUrl, preferredNameText, preferredTitleText));
  });

  for (const row of linkRows(scopedHtml, departmentUrl)) {
    const linkContext = `${row.text} ${row.href} ${row.cardText}`;
    const hasRelevantCue = [...PHYSICIAN_CUE_PATTERNS, ...IGNORE_ROLE_PATTERNS].some((pattern) =>
      pattern.test(linkContext)
    );
    if (!hasRelevantCue) continue;
    candidates.push(candidateFromCard(row.cardText || row.text, row.href, row.text));
  }

  if (candidates.length === 0) {
    candidates.push(...extractMarkdownTeamCandidates(html, departmentUrl));
  }

  return dedupeCandidates(candidates);
}

function extractPhysicianCandidateReport(
  html: string,
  departmentUrl: string,
  options: { page?: LoadedShebaPage; includeSourceDebug?: boolean } = {}
): CandidateExtractionReport {
  const rawCandidates = extractRawTeamCandidates(html, departmentUrl);
  const seniorCandidates = rawCandidates.filter(isSeniorPhysicianCandidate);
  const residentsFiltered = rawCandidates.filter(
    (candidate) => classifyCandidate(candidate) === "resident"
  ).length;
  const nonPhysiciansFiltered = rawCandidates.filter(
    (candidate) => classifyCandidate(candidate) === "nonPhysician"
  ).length;
  const page = options.page;
  const allLinks = page ? extractAllPageLinks(page) : [];
  const relevantLinks = allLinks.filter((link) => RELEVANT_LINK_PATTERN.test(relevantLinkText(link)));
  const sourceDebug = options.includeSourceDebug && page
    ? {
        firecrawl: {
          metadata: page.firecrawl?.metadata,
          responseKeys: page.firecrawl?.responseKeys,
          dataKeys: page.firecrawl?.dataKeys,
          statusCode: page.firecrawl?.statusCode
        },
        markdownPreview: (page.markdown ?? page.text ?? "").slice(0, DEBUG_PREVIEW_LENGTH),
        htmlPreview: (page.html ?? "").slice(0, DEBUG_PREVIEW_LENGTH),
        allLinks: allLinks.slice(0, 300),
        relevantLinks: relevantLinks.slice(0, 120),
        pageSourceAssessment: assessPageSource(page, allLinks)
      }
    : {};

  return {
    candidates: seniorCandidates,
    debug: {
      teamCardsFound: rawCandidates.length,
      physiciansFound: rawCandidates.filter(isPhysicianLikeCandidate).length,
      seniorPhysiciansFound: seniorCandidates.length,
      residentsFiltered,
      nonPhysiciansFiltered,
      profileUrlsFound: new Set(seniorCandidates.map((candidate) => candidate.profileUrl).filter(Boolean)).size,
      firstEntries: rawCandidates.slice(0, 10).map((candidate) => ({
        name: candidate.physicianName,
        title: candidate.role,
        profileUrl: candidate.profileUrl
      })),
      ...sourceDebug
    }
  };
}

function extractPhysicianCandidates(html: string, departmentUrl: string) {
  return extractPhysicianCandidateReport(html, departmentUrl).candidates;
}

function valueAfterHeading(text: string, headings: string[]) {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  for (const heading of headings) {
    const index = lines.findIndex((line) => line.toLocaleLowerCase("he") === heading.toLocaleLowerCase("he"));
    if (index >= 0) return lines[index + 1] ?? null;
  }

  return null;
}

function extractPublicationsLink(html: string, sourceUrl: string) {
  return linkRows(html, sourceUrl).find((row) =>
    /publication|pubmed|google scholar|מאמר|פרסומים/i.test(`${row.text} ${row.href}`)
  )?.href ?? null;
}

function academicTitleFromText(text: string, name: string | null) {
  const title = text.match(/\b(?:Professor|Prof\.|Associate Professor|Assistant Professor)\b/i)?.[0];
  if (title) return title;
  if (name && /פרופ|Prof\.|Professor/i.test(name)) return name.match(/פרופ|Prof\.|Professor/i)?.[0] ?? null;
  return null;
}

function topFellowshipConfidence(detected: DetectedFellowship[]) {
  return detected[0]?.confidence ?? null;
}

function needsExternalSearch(input: {
  detectedFellowships: DetectedFellowship[];
  bioTextLength: number;
  role: string | null;
}) {
  const hasHighEvidence = hasConfidenceAtLeast(topFellowshipConfidence(input.detectedFellowships), "High");
  const isSeniorRole = input.role
    ? SENIOR_PRIORITY_PATTERNS.some((pattern) => pattern.test(input.role ?? ""))
    : false;
  const reasons: string[] = [];

  if (!hasHighEvidence) reasons.push("לא זוהה פלושיפ בביטחון High/Very High");
  if (input.bioTextLength < 500) reasons.push("טקסט ביוגרפי קצר מ-500 תווים");
  if (isSeniorRole && !hasHighEvidence) reasons.push("תפקיד בכיר ללא עדות פלושיפ חזקה");

  return {
    value: reasons.length > 0,
    reason: reasons.length > 0 ? reasons.join("; ") : "זוהתה עדות פלושיפ מספקת בטקסט הקיים"
  };
}

function clinicalInterestsFromText(text: string) {
  const explicit = extractListAfterHeading(text, [/^Areas of Expertise$/i, /^Clinical Interests$/i, /^תחומי מומחיות$/, /^תחומי עניין קליניים$/]);
  if (explicit.length > 0) return explicit.slice(0, 8);

  const matches = text.match(/(?:laryngology|neurotology|rhinology|sleep surgery|head and neck oncology|cochlear implants|voice disorders|sinus surgery|אוטולוגיה|רינולוגיה|מיתרי קול|ראש וצוואר|שתלי שבלול)/gi);
  return Array.from(new Set(matches ?? [])).slice(0, 8);
}

function proceduresFromText(text: string) {
  const matches = text.match(/(?:endoscopic sinus surgery|cochlear implant|microvascular reconstruction|free flap|TORS|rhinoplasty|thyroid surgery|ניתוחי סינוסים|שתלי שבלול|שחזור מיקרווסקולרי|ניתוחי אף|בלוטת התריס)/gi);

  return Array.from(new Set(matches ?? [])).slice(0, 8);
}

function societiesFromText(text: string) {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const explicit = extractListAfterHeading(text, [/^Professional Societies$/i, /^Memberships$/i, /^איגודים מקצועיים$/]);
  if (explicit.length > 0) return explicit.slice(0, 8);

  return lines.filter((line) => /society|association|academy|איגוד|חברה מקצועית/i.test(line)).slice(0, 8);
}

function resultFromProfile(input: {
  candidate: PhysicianCandidate;
  sourceUrl: string;
  html: string;
  renderedText?: string;
}) {
  const text = input.renderedText?.trim() || visibleTextFromHtml(input.html);
  const $ = cheerio.load(input.html);
  const name = $("h1").first().text().replace(/\s+/g, " ").trim() || input.candidate.physicianName;
  const role = valueAfterHeading(text, ["Position", "Role", "תפקיד"]) ?? input.candidate.role;
  const department = valueAfterHeading(text, ["Department", "מחלקה"]) ?? input.candidate.department;
  const training = extractTraining(text);
  const detectedFellowships = matchEntFellowships(text);
  const externalSearch = needsExternalSearch({
    detectedFellowships,
    bioTextLength: text.length,
    role
  });
  const firstFellowship = training.fellowships[0] ?? null;

  return {
    physicianName: name,
    role,
    department,
    hospital: "שיבא" as const,
    sourceUrl: input.sourceUrl,
    bioText: text,
    bioTextLength: text.length,
    medicalSchool: training.medicalSchool,
    residencySpecialty: training.residencySpecialty,
    residencyInstitution: training.residencyInstitution,
    residencyYears: training.residencyYears,
    fellowshipText: firstFellowship?.rawText ?? null,
    fellowshipInstitution: firstFellowship?.institution ?? null,
    fellowshipCountry: firstFellowship?.country ?? null,
    fellowshipYears: firstFellowship?.years ?? null,
    clinicalInterests: clinicalInterestsFromText(text),
    procedures: proceduresFromText(text),
    academicTitle: academicTitleFromText(text, name),
    professionalSocieties: societiesFromText(text),
    publicationsLink: extractPublicationsLink(input.html, input.sourceUrl),
    extractedTraining: training,
    detectedFellowships,
    needsExternalSearch: externalSearch.value,
    reason: externalSearch.reason
  };
}

function resultFromCandidateOnly(
  candidate: PhysicianCandidate,
  departmentUrl: string,
  options: { forceNeedsExternalSearchReason?: string } = {}
): ShebaEntPhysicianResult {
  const text = candidate.cardText;
  const training = extractTraining(text);
  const detectedFellowships = matchEntFellowships(text);
  const externalSearch = needsExternalSearch({
    detectedFellowships,
    bioTextLength: text.length,
    role: candidate.role
  });
  const firstFellowship = training.fellowships[0] ?? null;

  return {
    physicianName: candidate.physicianName,
    role: candidate.role,
    department: candidate.department,
    hospital: "שיבא",
    sourceUrl: candidate.profileUrl ?? departmentUrl,
    bioText: text,
    bioTextLength: text.length,
    medicalSchool: training.medicalSchool,
    residencySpecialty: training.residencySpecialty,
    residencyInstitution: training.residencyInstitution,
    residencyYears: training.residencyYears,
    fellowshipText: firstFellowship?.rawText ?? null,
    fellowshipInstitution: firstFellowship?.institution ?? null,
    fellowshipCountry: firstFellowship?.country ?? null,
    fellowshipYears: firstFellowship?.years ?? null,
    clinicalInterests: clinicalInterestsFromText(text),
    procedures: proceduresFromText(text),
    academicTitle: academicTitleFromText(text, candidate.physicianName),
    professionalSocieties: societiesFromText(text),
    publicationsLink: null,
    extractedTraining: training,
    detectedFellowships,
    needsExternalSearch: Boolean(options.forceNeedsExternalSearchReason) || externalSearch.value,
    reason: options.forceNeedsExternalSearchReason ?? externalSearch.reason
  };
}

export async function runShebaEntFellowshipCrawler(input: {
  departmentUrl?: string | null;
  pastedText?: string | null;
  debug?: boolean | null;
} = {}): Promise<ShebaEntCrawlerResult> {
  const warnings: string[] = [];

  if (input.pastedText?.trim()) {
    const candidate: PhysicianCandidate = {
      physicianName: maybePhysicianName(input.pastedText),
      role: maybeRole(input.pastedText),
      department: "אף אוזן גרון",
      profileUrl: null,
      cardText: input.pastedText.trim()
    };
    const result = resultFromCandidateOnly(candidate, input.departmentUrl ?? "manual:pasted-text");

    return {
      ok: true,
      startUrl: SHEBA_START_URL,
      departmentUrl: input.departmentUrl ?? "manual:pasted-text",
      physiciansProcessed: 1,
      results: [result],
      warnings: ["בוצע ניתוח מתוך טקסט מודבק ידנית, ללא טעינת עמוד שיבא."]
    };
  }

  const departmentUrl = await findDepartmentUrl(input.departmentUrl, warnings);
  const departmentPage = await loadShebaPage(departmentUrl);
  const departmentHtml = departmentPage.html || departmentPage.text;
  const extractionReport = extractPhysicianCandidateReport(
    departmentHtml,
    departmentPage.finalUrl || departmentUrl,
    {
      page: departmentPage,
      includeSourceDebug: Boolean(input.debug)
    }
  );
  const candidates = extractionReport.candidates;
  const results: ShebaEntPhysicianResult[] = [];

  if (candidates.length === 0) {
    warnings.push("לא נמצאו כרטיסי רופאים בכירים בעמוד המחלקה. נסה להדביק URL ידני של עמוד אא״ג שיבא.");
  }

  for (const candidate of candidates) {
    if (!candidate.profileUrl) {
      results.push(
        resultFromCandidateOnly(candidate, departmentUrl, {
          forceNeedsExternalSearchReason: "נמצא כרטיס רופא בכיר ללא URL פרופיל."
        })
      );
      continue;
    }

    try {
      const profilePage = await loadShebaPage(candidate.profileUrl);
      results.push(resultFromProfile({
        candidate,
        sourceUrl: profilePage.finalUrl || candidate.profileUrl,
        html: profilePage.html,
        renderedText: profilePage.text
      }));
    } catch (error) {
      warnings.push(
        `טעינת פרופיל נכשלה עבור ${candidate.physicianName ?? candidate.profileUrl}: ${
          error instanceof Error ? error.message : "שגיאה לא ידועה"
        }`
      );
      results.push(
        resultFromCandidateOnly(candidate, departmentUrl, {
          forceNeedsExternalSearchReason: "נמצא URL פרופיל אך טעינת הפרופיל נכשלה."
        })
      );
    }
  }

  return {
    ok: true,
    startUrl: SHEBA_START_URL,
    departmentUrl: departmentPage.finalUrl || departmentUrl,
    physiciansProcessed: results.length,
    results,
    warnings,
    debug: extractionReport.debug
  };
}

export const shebaEntCrawlerInternals = {
  extractPhysicianCandidates,
  extractPhysicianCandidateReport,
  visibleTextFromHtml,
  isSeniorPhysicianCandidate,
  resultFromProfile
};
