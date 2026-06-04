import * as cheerio from "cheerio";
import {
  loadPageWithPlaywright,
  PlaywrightLoadError,
  type PlaywrightErrorKind
} from "@/lib/server/department-scraper";
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
  filterReason?: string | null;
};

export type ShebaEntPageType =
  | "senior_physician_profile"
  | "department_team_page"
  | "department_without_visible_team_data"
  | "blocked_or_empty"
  | "insufficient_physician_page"
  | "unknown";

export type ShebaEntCrawlerDebug = {
  pageType?: ShebaEntPageType;
  pageClassificationReasons?: string[];
  liveCrawlBlocked?: boolean;
  teamCardsFound: number;
  physiciansFound: number;
  seniorPhysiciansFound: number;
  residentsFiltered: number;
  nonPhysiciansFiltered: number;
  profileUrlsFound: number;
  deeperCandidateUrls?: string[];
  deeperUrlsAttempted?: string[];
  externalSearchNeeded?: boolean;
  externalSearchQueries?: string[];
  externalSearchResults?: Array<{ title: string; url: string; source: string }>;
  firstEntries: ShebaEntCrawlerDebugEntry[];
  liveSource?: {
    provider: "playwright" | "manual" | "endpoint" | "sheba_elasticsearch";
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

type PageClassification = {
  pageType: ShebaEntPageType;
  pageClassificationReasons: string[];
};

type PersonCard = {
  name: string | null;
  title: string | null;
  profileUrl: string | null;
  text: string;
  filterReason: string;
};

type LoadedShebaPage = {
  html: string;
  text: string;
  markdown?: string;
  finalUrl: string;
  source: "playwright" | "manual" | "endpoint" | "sheba_elasticsearch";
  live?: {
    metadata?: Record<string, unknown>;
    links?: string[];
    responseKeys?: string[];
    dataKeys?: string[];
    statusCode?: number;
  };
};

type ShebaElasticHit = {
  _id: string;
  _source?: Record<string, unknown>;
};

type ShebaElasticSearchResponse = {
  hits?: {
    total?: { value?: number } | number;
    hits?: ShebaElasticHit[];
  };
};

export class ShebaEntCrawlerError extends Error {
  code:
    | PlaywrightErrorKind
    | "live_crawl_unavailable"
    | "blocked_or_empty"
    | "empty_page"
    | "invalid_url"
    | "endpoint_fetch_failed"
    | "sheba_elasticsearch_failed"
    | "unknown";
  stackTrace?: string;

  constructor(code: ShebaEntCrawlerError["code"], message: string, stackTrace?: string) {
    super(message);
    this.name = "ShebaEntCrawlerError";
    this.code = code;
    this.stackTrace = stackTrace;
  }
}

const SHEBA_START_URL = "https://www.shebaonline.org/";
const SHEBA_PUBLIC_ES_URL = "https://elstprd.sheba.co.il:9200";
const SHEBA_PUBLIC_ES_AUTH = "Basic cmVhZG9ubHk6cmVhZG9ubHk=";
const SHEBA_ENT_DEPARTMENT_ID = "2971ad08-f9c2-4cb8-8d03-b7356bc48664";
const SHEBA_ENT_DEPARTMENT_TITLE = "מחלקת אף-אוזן-גרון\nוניתוחי ראש וצוואר";
const DEFAULT_DEPARTMENT_CANDIDATES = [
  "https://www.shebaonline.org/department/otolaryngology-head-and-neck-surgery/",
  "https://eng.sheba.co.il/otolaryngology_head_neck_surgery",
  "https://www.sheba.co.il/%D7%90%D7%A3_%D7%90%D7%95%D7%96%D7%9F_%D7%92%D7%A8%D7%95%D7%9F/"
];
const ALLOWED_HOSTS = new Set([
  "sheba.co.il",
  "www.sheba.co.il",
  "eng.sheba.co.il",
  "elstprd.sheba.co.il",
  "shebaonline.org",
  "www.shebaonline.org"
]);
const SENIOR_PRIORITY_PATTERNS = [
  /מומח(?:ה|ית)/,
  /מנהל(?:ת)?\s+מערך/,
  /מנהל(?:ת)?\s+מחלקה/,
  /סגן(?:ית)?\s+מנהל(?:ת)?\s+מחלקה/,
  /סגן(?:ית)?\s+מנהל(?:ת)?/,
  /מנהל(?:ת)?\s+יחידה/,
  /מנהל(?:ת)?\s+שירות/,
  /מרכז(?:ת)?\s+תחום/,
  /רופא(?:ה)?\s+בכיר(?:ה)?/,
  /רופאה\s+בכירה/,
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
  /סטאז׳ר(?:ית)?/,
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
  /דר(?:['׳״"])?/,
  /דוקטור/,
  /\bdr\.?\b/i,
  /פרופ(?:'|׳|סור)?(?!יל)/,
  /פרופסור/,
  /\bprof\.?\b/i,
  /\bprofessor\b/i,
  /רופא(?:ה)?/,
  /physician/i,
  ...SENIOR_PRIORITY_PATTERNS
];
const TEAM_HEADING_PATTERNS = [
  /הצוות\s+שלנו/,
  /הרופאים\s+שלנו/,
  /הצוות\s+הרפואי/,
  /צוות\s+המחלקה/,
  /רופאי\s+המחלקה/,
  /סגל\s+רפואי/,
  /\bour team\b/i,
  /\bmedical team\b/i,
  /\bmedical staff\b/i
];
const DEBUG_PREVIEW_LENGTH = 5000;
const RELEVANT_LINK_PATTERN =
  /doctor|physician|profile|staff|team|profiles|about|doctor card|רופא|רופאים|צוות|סגל|אודות/i;
const ENDPOINT_CANDIDATE_PATTERN =
  /(?:https?:)?\/\/[^"'\s<>]+|\/(?:api|wp-json|wp-admin\/admin-ajax|_next\/data|graphql|umbraco|sitecore|doctors?|physicians?|staff|team)[^"'\s<>]*/gi;
const BLOCKED_PAGE_PATTERNS = [
  /אנחנו\s+בטיפול/,
  /לא\s+מתאפשרת\s+גישה\s+לאתר\s+שיבא/,
  /\bforbidden\b/i,
  /\b403\b/,
  /cloudflare/i,
  /maintenance/i
];
const EXTERNAL_SEARCH_PRIORITIES = [
  "private physician website",
  "Infomed physician page",
  "Doctorim physician page",
  "hospital profile page",
  "academic/faculty page",
  "LinkedIn",
  "conference/society page"
];

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

  if (process.env.NODE_ENV === "production") {
    throw new ShebaEntCrawlerError(
      "live_crawl_unavailable",
      "סריקה חיה של שיבא אינה זמינה בפרודקשן. השתמש בהדבקת HTML/טקסט או הזן endpoint פנימי אם נמצא."
    );
  }

  try {
    const rendered = await loadPageWithPlaywright(url, {
      timeoutMs: 25000
    });

    if (!rendered.html?.trim() && !rendered.text.trim()) {
      throw new ShebaEntCrawlerError("empty_page", "Playwright לא החזיר HTML או טקסט.");
    }

    return {
      html: rendered.html || rendered.text,
      text: rendered.bodyInnerText || rendered.text,
      finalUrl: rendered.finalUrl || url,
      source: "playwright",
      live: {
        statusCode: rendered.statusCode ?? undefined,
        links: rendered.anchorLinks.map((link) => link.href).filter(Boolean)
      }
    };
  } catch (error) {
    if (error instanceof ShebaEntCrawlerError) {
      throw error;
    }
    if (error instanceof PlaywrightLoadError) {
      throw new ShebaEntCrawlerError(error.kind, error.message, error.stack);
    }

    throw new ShebaEntCrawlerError(
      "unknown",
      `טעינת Playwright נכשלה: ${error instanceof Error ? error.message : "שגיאה לא ידועה"}`,
      error instanceof Error ? error.stack : undefined
    );
  }
}

function loadedPageFromManualContent(content: string, sourceUrl = "manual:pasted-content"): LoadedShebaPage {
  const looksLikeHtml = /<\w+[\s>]/.test(content);
  return {
    html: looksLikeHtml ? content : `<main>${content}</main>`,
    text: looksLikeHtml ? visibleTextFromHtml(content) : content,
    markdown: looksLikeHtml ? undefined : content,
    finalUrl: sourceUrl,
    source: "manual"
  };
}

function flattenJsonText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(flattenJsonText).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => `${key}: ${flattenJsonText(entry)}`)
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function linksFromJsonText(text: string, baseUrl: string) {
  return Array.from(text.matchAll(/https?:\/\/[^\s"'<>()]+|\/[^\s"'<>()]+/g))
    .map((match) => absoluteUrl(match[0], baseUrl))
    .filter((url): url is string => Boolean(url));
}

async function loadShebaEndpoint(endpointUrl: string): Promise<LoadedShebaPage> {
  assertAllowedShebaUrl(endpointUrl);

  try {
    const response = await fetch(endpointUrl, {
      headers: {
        accept: "application/json,text/html,text/plain;q=0.9,*/*;q=0.8"
      },
      signal: AbortSignal.timeout(20000)
    });
    const contentType = response.headers.get("content-type") ?? "";
    const raw = await response.text();
    let text = raw;
    let html = raw;

    if (/json/i.test(contentType) || /^[\[{]/.test(raw.trim())) {
      const json = JSON.parse(raw) as unknown;
      text = flattenJsonText(json);
      html = `<pre>${text}</pre>`;
    }

    return {
      html,
      text: /<\w+[\s>]/.test(html) ? visibleTextFromHtml(html) || text : text,
      finalUrl: endpointUrl,
      source: "endpoint",
      live: {
        statusCode: response.status,
        links: linksFromJsonText(raw, endpointUrl)
      }
    };
  } catch (error) {
    throw new ShebaEntCrawlerError(
      "endpoint_fetch_failed",
      `טעינת endpoint פנימי נכשלה: ${error instanceof Error ? error.message : "שגיאה לא ידועה"}`,
      error instanceof Error ? error.stack : undefined
    );
  }
}

async function searchShebaElasticsearch(index: string, body: Record<string, unknown>) {
  try {
    const response = await fetch(`${SHEBA_PUBLIC_ES_URL}/${index}/_search`, {
      method: "POST",
      headers: {
        authorization: SHEBA_PUBLIC_ES_AUTH,
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000)
    });
    const json = (await response.json()) as ShebaElasticSearchResponse & {
      error?: unknown;
      status?: number;
    };

    if (!response.ok || json.error) {
      throw new Error(`Sheba Elasticsearch ${index} returned ${response.status}: ${JSON.stringify(json.error ?? json).slice(0, 400)}`);
    }

    return json;
  } catch (error) {
    throw new ShebaEntCrawlerError(
      "sheba_elasticsearch_failed",
      `טעינת נתוני צוות מ-Sheba Elasticsearch נכשלה: ${error instanceof Error ? error.message : "שגיאה לא ידועה"}`,
      error instanceof Error ? error.stack : undefined
    );
  }
}

function elasticTotal(response: ShebaElasticSearchResponse) {
  const total = response.hits?.total;
  return typeof total === "number" ? total : total?.value ?? response.hits?.hits?.length ?? 0;
}

function sourceString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function sourceBoolean(source: Record<string, unknown>, key: string) {
  return source[key] === true;
}

function sourceDepartments(source: Record<string, unknown>) {
  const departments = source.departments;
  if (!Array.isArray(departments)) return [];

  return departments
    .map((department) => {
      if (!department || typeof department !== "object") return null;
      const record = department as Record<string, unknown>;
      return {
        id: typeof record.id === "string" ? record.id : "",
        name: typeof record.name === "string" ? record.name : ""
      };
    })
    .filter((department): department is { id: string; name: string } => Boolean(department));
}

function shebaProfileUrl(link: string) {
  if (!link) return null;
  try {
    return new URL(link, "https://www.sheba.co.il/").toString();
  } catch {
    return null;
  }
}

function candidateFromShebaElasticHit(hit: ShebaElasticHit): PhysicianCandidate {
  const source = hit._source ?? {};
  const title = sourceString(source, "title") || sourceString(source, "title_Suggest") || null;
  const desc = sourceString(source, "desc");
  const typeText = sourceString(source, "typeText");
  const email = sourceString(source, "email");
  const departments = sourceDepartments(source);
  const seniorDoctor = sourceBoolean(source, "seniorDoctor");
  const profileUrl = shebaProfileUrl(sourceString(source, "link"));
  const cardText = [
    title,
    typeText,
    seniorDoctor ? "רופא בכיר" : "",
    desc,
    email,
    ...departments.map((department) => department.name)
  ]
    .filter(Boolean)
    .join("\n");

  return {
    physicianName: title,
    role: desc || (seniorDoctor ? "רופא בכיר" : typeText || null),
    department: departments.find((department) => department.id === SHEBA_ENT_DEPARTMENT_ID)?.name ?? SHEBA_ENT_DEPARTMENT_TITLE,
    profileUrl,
    cardText
  };
}

async function loadShebaEntDoctorsFromElasticsearch() {
  const departmentResponse = await searchShebaElasticsearch("he_internal_department_index", {
    size: 5,
    query: {
      bool: {
        should: [
          { term: { "id.keyword": SHEBA_ENT_DEPARTMENT_ID } },
          { match_phrase: { title: SHEBA_ENT_DEPARTMENT_TITLE } },
          { match: { title: "אף אוזן גרון" } }
        ],
        minimum_should_match: 1
      }
    }
  });
  const doctorsResponse = await searchShebaElasticsearch("he_doctor_index", {
    size: 100,
    query: {
      bool: {
        filter: [
          {
            term: {
              "departments.id.keyword": SHEBA_ENT_DEPARTMENT_ID
            }
          }
        ]
      }
    },
    sort: [{ "title.keyword": "asc" }]
  });
  const rawCandidates = (doctorsResponse.hits?.hits ?? []).map(candidateFromShebaElasticHit);
  const seniorCandidates = rawCandidates.filter(isSeniorPhysicianCandidate);
  const residentsFiltered = rawCandidates.filter(
    (candidate) => classifyCandidate(candidate) === "resident"
  ).length;
  const nonPhysiciansFiltered = rawCandidates.filter(
    (candidate) => classifyCandidate(candidate) === "nonPhysician"
  ).length;

  return {
    departmentResponse,
    doctorsResponse,
    rawCandidates,
    candidates: seniorCandidates,
    debug: {
      pageType: "department_team_page" as const,
      pageClassificationReasons: [
        "senior physicians loaded from Sheba public Elasticsearch he_doctor_index by ENT department id."
      ],
      liveCrawlBlocked: false,
      teamCardsFound: rawCandidates.length,
      physiciansFound: rawCandidates.filter(isPhysicianLikeCandidate).length,
      seniorPhysiciansFound: seniorCandidates.length,
      residentsFiltered,
      nonPhysiciansFiltered,
      profileUrlsFound: new Set(seniorCandidates.map((candidate) => candidate.profileUrl).filter(Boolean)).size,
      deeperCandidateUrls: [],
      deeperUrlsAttempted: [],
      externalSearchNeeded: true,
      externalSearchQueries: Array.from(
        new Set(seniorCandidates.flatMap((candidate) => externalSearchQueries(candidate.physicianName)))
      ),
      externalSearchResults: [],
      firstEntries: rawCandidates.slice(0, 10).map((candidate) => {
        const classification = classifyCandidate(candidate);
        return {
          name: candidate.physicianName,
          title: candidate.role,
          profileUrl: candidate.profileUrl,
          filterReason:
            classification === "senior"
              ? "kept: senior physician"
              : classification === "resident"
                ? "filtered: resident/fellow/intern/student"
                : "filtered: non-physician/admin/para-medical"
        };
      }),
      liveSource: {
        provider: "sheba_elasticsearch" as const,
        metadata: {
          endpoint: SHEBA_PUBLIC_ES_URL,
          departmentIndex: "he_internal_department_index",
          doctorIndex: "he_doctor_index",
          departmentId: SHEBA_ENT_DEPARTMENT_ID,
          departmentHits: elasticTotal(departmentResponse),
          doctorHits: elasticTotal(doctorsResponse)
        },
        statusCode: 200
      }
    } satisfies ShebaEntCrawlerDebug
  };
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

function sourceLinks(links: string[] | undefined, baseUrl: string) {
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
    ...sourceLinks(page.live?.links, page.finalUrl)
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

  if (teamSectionInHtml) notes.push("team section heading appears in source HTML.");
  if (teamSectionInMarkdown) notes.push("team section heading appears in source markdown/text.");
  if (!teamSectionInHtml && !teamSectionInMarkdown) {
    notes.push("team section heading does not appear in source HTML/markdown.");
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

function countMatches(patterns: RegExp[], value: string) {
  return patterns.reduce((count, pattern) => count + (pattern.test(value) ? 1 : 0), 0);
}

function countPhysicianNameMatches(value: string) {
  return Array.from(value.matchAll(/(?:ד["״']?ר|דר(?:['׳״"])?|דוקטור|פרופ(?:'|׳|סור)?|פרופסור|Dr\.?|Prof\.?|Professor)[^\n|,]{2,80}/gi)).length;
}

function countPersonVisuals(html: string) {
  const $ = cheerio.load(html);
  const imageCount = $("img,picture,[class*='image'],[class*='avatar'],[class*='photo']").length;
  const cardCount = $(
    "article,li,.card,.doctor,.team,.staff,.person,.member,.profile,[class*='card'],[class*='doctor'],[class*='person'],[class*='profile']"
  ).length;

  return imageCount + cardCount;
}

function classifyPage(
  text: string,
  html: string,
  links: Array<{ text: string; href: string }>,
  statusCode?: number | null
): PageClassification {
  const combined = `${text}\n${visibleTextFromHtml(html)}\n${links.map(relevantLinkText).join("\n")}`;
  const reasons: string[] = [];
  const physicianNameCount = countPhysicianNameMatches(combined);
  const seniorRoleCount = countMatches(SENIOR_PRIORITY_PATTERNS, combined);
  const excludedRoleCount = countMatches(IGNORE_ROLE_PATTERNS, combined);
  const teamHeading = TEAM_HEADING_PATTERNS.some((pattern) => pattern.test(combined));
  const personVisuals = countPersonVisuals(html);
  const teamLinkCount = findTeamCandidateLinks(links).length;

  if (statusCode === 403 || BLOCKED_PAGE_PATTERNS.some((pattern) => pattern.test(combined))) {
    reasons.push("blocked/maintenance indicators detected.");
    if (statusCode === 403) reasons.push("statusCode=403.");
    return { pageType: "blocked_or_empty", pageClassificationReasons: reasons };
  }

  if (physicianNameCount >= 1 && seniorRoleCount >= 1 && personVisuals <= 4 && !teamHeading) {
    reasons.push("one strong physician name/title with senior role and limited person visuals.");
    return {
      pageType: text.length >= 300 ? "senior_physician_profile" : "insufficient_physician_page",
      pageClassificationReasons: reasons
    };
  }

  if (personVisuals >= 3 && teamHeading && physicianNameCount >= 2 && seniorRoleCount + excludedRoleCount >= 1) {
    reasons.push("team heading, multiple person visuals, multiple physician title/name patterns.");
    return { pageType: "department_team_page", pageClassificationReasons: reasons };
  }

  if ((/מחלקה|department|otolaryngology|אף אוזן גרון|אא["״']?ג/i.test(combined) || teamLinkCount > 0) && physicianNameCount === 0) {
    reasons.push("department-like page without visible physician names.");
    if (teamLinkCount > 0) reasons.push("deeper team/profile candidate links found.");
    return {
      pageType: "department_without_visible_team_data",
      pageClassificationReasons: reasons
    };
  }

  if (physicianNameCount >= 2) {
    reasons.push("multiple physician name/title patterns found.");
    return { pageType: "department_team_page", pageClassificationReasons: reasons };
  }

  reasons.push("insufficient signals for profile or team page.");
  return { pageType: "unknown", pageClassificationReasons: reasons };
}

function findTeamCandidateLinks(links: Array<{ text: string; href: string }>) {
  return links
    .filter((link) =>
      /הצוות שלנו|הרופאים שלנו|צוות|רופאים|סגל רפואי|doctors|physicians|staff|team|profiles|about|אודות/i.test(
        relevantLinkText(link)
      )
    )
    .map((link) => link.href)
    .filter((href, index, values) => values.indexOf(href) === index)
    .slice(0, 12);
}

function extractPersonCards(text: string, html: string, links: Array<{ text: string; href: string }>, baseUrl: string) {
  const candidates = dedupeCandidates([
    ...extractRawTeamCandidates(html, baseUrl),
    ...extractMarkdownTeamCandidates(text, baseUrl),
    ...links
      .filter((link) => PHYSICIAN_CUE_PATTERNS.some((pattern) => pattern.test(relevantLinkText(link))))
      .map((link) => candidateFromCard(link.text || link.href, link.href, link.text))
  ]);

  return candidates.map<PersonCard>((candidate) => {
    const classification = classifyCandidate(candidate);
    const filterReason =
      classification === "senior"
        ? "kept: senior physician"
        : classification === "resident"
          ? "filtered: resident/fellow/intern/student"
          : "filtered: non-physician/admin/para-medical";
    return {
      name: candidate.physicianName,
      title: candidate.role,
      profileUrl: candidate.profileUrl,
      text: candidate.cardText,
      filterReason
    };
  });
}

function shouldExternalSearch(profileText: string, detectedFellowships: DetectedFellowship[]) {
  if (profileText.length < 300) return true;
  if (!/education|training|fellowship|residency|התמחות|השתלמות|לימודים|קורות חיים/i.test(profileText)) {
    return true;
  }
  return detectedFellowships.length === 0;
}

function externalSearchQueries(physicianName: string | null) {
  if (!physicianName) return [];

  return [
    `"${physicianName}"`,
    `"${physicianName}" קורות חיים`,
    `"${physicianName}" אודות`,
    `"${physicianName}" התמחות על`,
    `"${physicianName}" fellowship`,
    `"${physicianName}" Infomed`,
    `"${physicianName}" דוקטורים`,
    `"${physicianName}" רופא אף אוזן גרון`
  ];
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
  if (candidate.physicianName && isPhysicianLikeCandidate(candidate)) return "senior";
  if (NON_PHYSICIAN_FILTER_PATTERNS.some((pattern) => pattern.test(text))) return "nonPhysician";

  return "nonPhysician";
}

function shouldExcludePerson(name: string | null, title: string | null, text: string) {
  return IGNORE_ROLE_PATTERNS.some((pattern) => pattern.test(`${name ?? ""} ${title ?? ""} ${text}`));
}

function isSeniorPhysician(name: string | null, title: string | null, text: string) {
  const value = `${name ?? ""} ${title ?? ""} ${text}`;
  if (RESIDENT_FILTER_PATTERNS.some((pattern) => pattern.test(value))) return false;
  if (SENIOR_PRIORITY_PATTERNS.some((pattern) => pattern.test(value))) return true;

  return PHYSICIAN_CUE_PATTERNS.some((pattern) => pattern.test(value));
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
  const pageClassification = page
    ? classifyPage(page.text, page.html, allLinks, page.live?.statusCode)
    : classifyPage(visibleTextFromHtml(html), html, []);
  const deeperCandidateUrls = findTeamCandidateLinks(allLinks);
  const sourceDebug = options.includeSourceDebug && page
    ? {
        liveSource: {
          provider: page.source,
          metadata: page.live?.metadata,
          responseKeys: page.live?.responseKeys,
          dataKeys: page.live?.dataKeys,
          statusCode: page.live?.statusCode
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
      pageType: pageClassification.pageType,
      pageClassificationReasons: pageClassification.pageClassificationReasons,
      liveCrawlBlocked: pageClassification.pageType === "blocked_or_empty",
      teamCardsFound: rawCandidates.length,
      physiciansFound: rawCandidates.filter(isPhysicianLikeCandidate).length,
      seniorPhysiciansFound: seniorCandidates.length,
      residentsFiltered,
      nonPhysiciansFiltered,
      profileUrlsFound: new Set(seniorCandidates.map((candidate) => candidate.profileUrl).filter(Boolean)).size,
      deeperCandidateUrls,
      deeperUrlsAttempted: [],
      externalSearchNeeded: false,
      externalSearchQueries: [],
      externalSearchResults: [],
      firstEntries: rawCandidates.slice(0, 10).map((candidate) => ({
        name: candidate.physicianName,
        title: candidate.role,
        profileUrl: candidate.profileUrl,
        filterReason:
          classifyCandidate(candidate) === "senior"
            ? "kept: senior physician"
            : classifyCandidate(candidate) === "resident"
              ? "filtered: resident/fellow/intern/student"
              : "filtered: non-physician/admin/para-medical"
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
  const needsSearch = shouldExternalSearch(text, detectedFellowships);
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
    needsExternalSearch: needsSearch || externalSearch.value,
    reason: needsSearch ? "פרופיל בכיר קצר/חסר הכשרה או עדות פלושיפ; נדרש חיפוש חיצוני." : externalSearch.reason
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

function blockedWarning() {
  return "שיבא החזיר עמוד חסימה/תחזוקה במקום תוכן מחלקה. השתמש בהדבקת HTML/טקסט או הזן endpoint פנימי אם נמצא.";
}

function emptyCrawlerDebug(patch: Partial<ShebaEntCrawlerDebug> = {}): ShebaEntCrawlerDebug {
  return {
    pageType: "unknown",
    pageClassificationReasons: [],
    liveCrawlBlocked: false,
    teamCardsFound: 0,
    physiciansFound: 0,
    seniorPhysiciansFound: 0,
    residentsFiltered: 0,
    nonPhysiciansFiltered: 0,
    profileUrlsFound: 0,
    deeperCandidateUrls: [],
    deeperUrlsAttempted: [],
    externalSearchNeeded: false,
    externalSearchQueries: [],
    externalSearchResults: [],
    firstEntries: [],
    ...patch
  };
}

function mergeDebug(base: ShebaEntCrawlerDebug, patch: Partial<ShebaEntCrawlerDebug>): ShebaEntCrawlerDebug {
  return {
    ...base,
    ...patch,
    deeperCandidateUrls: patch.deeperCandidateUrls ?? base.deeperCandidateUrls,
    deeperUrlsAttempted: patch.deeperUrlsAttempted ?? base.deeperUrlsAttempted,
    externalSearchQueries: patch.externalSearchQueries ?? base.externalSearchQueries,
    externalSearchResults: patch.externalSearchResults ?? base.externalSearchResults
  };
}

async function processLoadedShebaPage(
  page: LoadedShebaPage,
  options: {
    includeSourceDebug?: boolean;
    allowDeeperCrawl?: boolean;
    allowProfileCrawl?: boolean;
    warnings: string[];
  }
): Promise<ShebaEntCrawlerResult> {
  const allLinks = extractAllPageLinks(page);
  const classification = classifyPage(page.text, page.html, allLinks, page.live?.statusCode);
  const extractionReport = extractPhysicianCandidateReport(page.html || page.text, page.finalUrl, {
    page,
    includeSourceDebug: options.includeSourceDebug
  });
  let debug = mergeDebug(extractionReport.debug, {
    pageType: classification.pageType,
    pageClassificationReasons: classification.pageClassificationReasons,
    liveCrawlBlocked: classification.pageType === "blocked_or_empty"
  });

  if (classification.pageType === "blocked_or_empty") {
    options.warnings.push(blockedWarning());
    debug = mergeDebug(debug, {
      teamCardsFound: 0,
      physiciansFound: 0,
      seniorPhysiciansFound: 0,
      residentsFiltered: 0,
      nonPhysiciansFiltered: 0,
      profileUrlsFound: 0,
      firstEntries: []
    });
    return {
      ok: true,
      startUrl: SHEBA_START_URL,
      departmentUrl: page.finalUrl,
      physiciansProcessed: 0,
      results: [],
      warnings: options.warnings,
      debug
    };
  }

  if (
    classification.pageType === "senior_physician_profile" ||
    classification.pageType === "insufficient_physician_page"
  ) {
    const candidate = candidateFromCard(page.text, page.finalUrl, maybePhysicianName(page.text) ?? undefined, maybeRole(page.text) ?? undefined);
    const result = resultFromProfile({
      candidate,
      sourceUrl: page.finalUrl,
      html: page.html,
      renderedText: page.text
    });
    const queries = result.needsExternalSearch ? externalSearchQueries(result.physicianName) : [];
    debug = mergeDebug(debug, {
      externalSearchNeeded: result.needsExternalSearch,
      externalSearchQueries: queries,
      externalSearchResults: []
    });

    return {
      ok: true,
      startUrl: SHEBA_START_URL,
      departmentUrl: page.finalUrl,
      physiciansProcessed: 1,
      results: [result],
      warnings: options.warnings,
      debug
    };
  }

  if (
    classification.pageType === "department_without_visible_team_data" &&
    options.allowDeeperCrawl !== false
  ) {
    const deeperCandidateUrls = findTeamCandidateLinks(allLinks);
    const deeperUrlsAttempted: string[] = [];

    for (const url of deeperCandidateUrls.slice(0, 6)) {
      if (process.env.NODE_ENV === "production") break;
      try {
        const deeperPage = await loadShebaPage(url);
        deeperUrlsAttempted.push(deeperPage.finalUrl || url);
        const deeperResult = await processLoadedShebaPage(deeperPage, {
          includeSourceDebug: options.includeSourceDebug,
          allowDeeperCrawl: false,
          allowProfileCrawl: options.allowProfileCrawl,
          warnings: options.warnings
        });
        debug = mergeDebug(debug, {
          deeperCandidateUrls,
          deeperUrlsAttempted,
          externalSearchNeeded: deeperResult.debug?.externalSearchNeeded,
          externalSearchQueries: deeperResult.debug?.externalSearchQueries,
          externalSearchResults: deeperResult.debug?.externalSearchResults
        });
        if (deeperResult.results.length > 0) {
          return {
            ...deeperResult,
            departmentUrl: page.finalUrl,
            warnings: options.warnings,
            debug: mergeDebug(deeperResult.debug ?? debug, {
              deeperCandidateUrls,
              deeperUrlsAttempted
            })
          };
        }
      } catch (error) {
        deeperUrlsAttempted.push(url);
        options.warnings.push(
          `טעינת קישור צוות נכשלה (${url}): ${error instanceof Error ? error.message : "שגיאה לא ידועה"}`
        );
      }
    }
    debug = mergeDebug(debug, {
      deeperCandidateUrls,
      deeperUrlsAttempted
    });
  }

  const candidates = extractionReport.candidates;
  const results: ShebaEntPhysicianResult[] = [];
  const externalQueries: string[] = [];
  let externalSearchNeeded = false;

  if (candidates.length === 0) {
    options.warnings.push("לא נמצאו כרטיסי רופאים בכירים בעמוד. נסה להדביק HTML מלא של עמוד שיבא או endpoint פנימי.");
  }

  for (const candidate of candidates) {
    if (candidate.profileUrl && options.allowProfileCrawl !== false && process.env.NODE_ENV !== "production") {
      try {
        const profilePage = await loadShebaPage(candidate.profileUrl);
        const profileClassification = classifyPage(
          profilePage.text,
          profilePage.html,
          extractAllPageLinks(profilePage),
          profilePage.live?.statusCode
        );
        if (profileClassification.pageType === "blocked_or_empty") {
          throw new ShebaEntCrawlerError("blocked_or_empty", blockedWarning());
        }
        const result = resultFromProfile({
          candidate,
          sourceUrl: profilePage.finalUrl || candidate.profileUrl,
          html: profilePage.html,
          renderedText: profilePage.text
        });
        if (result.needsExternalSearch) {
          externalSearchNeeded = true;
          externalQueries.push(...externalSearchQueries(result.physicianName));
        }
        results.push(result);
        continue;
      } catch (error) {
        options.warnings.push(
          `טעינת פרופיל נכשלה עבור ${candidate.physicianName ?? candidate.profileUrl}: ${
            error instanceof Error ? error.message : "שגיאה לא ידועה"
          }`
        );
      }
    }

    const result = resultFromCandidateOnly(candidate, page.finalUrl, {
      forceNeedsExternalSearchReason: candidate.profileUrl
        ? "נמצא URL פרופיל אך סריקה חיה אינה זמינה/נכשלה; נדרש חיפוש חיצוני."
        : "נמצא כרטיס רופא בכיר ללא URL פרופיל."
    });
    externalSearchNeeded = true;
    externalQueries.push(...externalSearchQueries(result.physicianName));
    results.push(result);
  }

  debug = mergeDebug(debug, {
    externalSearchNeeded,
    externalSearchQueries: Array.from(new Set(externalQueries)),
    externalSearchResults: []
  });

  return {
    ok: true,
    startUrl: SHEBA_START_URL,
    departmentUrl: page.finalUrl,
    physiciansProcessed: results.length,
    results,
    warnings: options.warnings,
    debug
  };
}

export async function runShebaEntFellowshipCrawler(input: {
  departmentUrl?: string | null;
  pastedText?: string | null;
  pastedHtml?: string | null;
  endpointUrl?: string | null;
  debug?: boolean | null;
} = {}): Promise<ShebaEntCrawlerResult> {
  const warnings: string[] = [];

  if (input.pastedHtml?.trim()) {
    const page = loadedPageFromManualContent(
      input.pastedHtml.trim(),
      input.departmentUrl ?? "manual:pasted-html"
    );

    return processLoadedShebaPage(page, {
      includeSourceDebug: Boolean(input.debug),
      allowDeeperCrawl: false,
      allowProfileCrawl: false,
      warnings
    });
  }

  if (input.endpointUrl?.trim()) {
    const page = await loadShebaEndpoint(input.endpointUrl.trim());

    return processLoadedShebaPage(page, {
      includeSourceDebug: Boolean(input.debug),
      allowDeeperCrawl: process.env.NODE_ENV !== "production",
      allowProfileCrawl: process.env.NODE_ENV !== "production",
      warnings
    });
  }

  if (input.pastedText?.trim()) {
    const page = loadedPageFromManualContent(
      input.pastedText.trim(),
      input.departmentUrl ?? "manual:pasted-text"
    );
    const pageResult = await processLoadedShebaPage(page, {
      includeSourceDebug: Boolean(input.debug),
      allowDeeperCrawl: false,
      allowProfileCrawl: false,
      warnings
    });

    if (pageResult.results.length > 0 || pageResult.debug?.liveCrawlBlocked) {
      return pageResult;
    }

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
      warnings: ["בוצע ניתוח מתוך טקסט מודבק ידנית, ללא טעינת עמוד שיבא."],
      debug: input.debug ? pageResult.debug : undefined
    };
  }

  try {
    const elastic = await loadShebaEntDoctorsFromElasticsearch();
    const results = elastic.candidates.map((candidate) =>
      resultFromCandidateOnly(candidate, candidate.profileUrl ?? `${SHEBA_PUBLIC_ES_URL}/he_doctor_index/_search`, {
        forceNeedsExternalSearchReason:
          "נתוני צוות נשלפו ממקור הנתונים הפומבי של שיבא; פרופיל הכשרה מלא לא זמין ברשומת המקור ולכן נדרש חיפוש חיצוני להשלמת פלושיפים."
      })
    );

    return {
      ok: true,
      startUrl: SHEBA_START_URL,
      departmentUrl: input.departmentUrl ?? `${SHEBA_PUBLIC_ES_URL}/he_doctor_index/_search`,
      physiciansProcessed: results.length,
      results,
      warnings,
      debug: input.debug ? elastic.debug : undefined
    };
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "טעינת מקור הנתונים הפומבי של שיבא נכשלה.");
  }

  try {
    const departmentUrl = await findDepartmentUrl(input.departmentUrl, warnings);
    const departmentPage = await loadShebaPage(departmentUrl);

    return processLoadedShebaPage(departmentPage, {
      includeSourceDebug: Boolean(input.debug),
      allowDeeperCrawl: true,
      allowProfileCrawl: true,
      warnings
    });
  } catch (error) {
    if (error instanceof ShebaEntCrawlerError && error.code === "live_crawl_unavailable") {
      warnings.push(error.message);
      return {
        ok: true,
        startUrl: SHEBA_START_URL,
        departmentUrl: input.departmentUrl ?? DEFAULT_DEPARTMENT_CANDIDATES[0],
        physiciansProcessed: 0,
        results: [],
        warnings,
        debug: input.debug
          ? emptyCrawlerDebug({
              pageType: "blocked_or_empty",
              pageClassificationReasons: ["production live crawl disabled"],
              liveCrawlBlocked: true
            })
          : undefined
      };
    }

    throw error;
  }
}

export const shebaEntCrawlerInternals = {
  classifyPage,
  extractAllPageLinks,
  extractEndpointCandidates,
  extractPhysicianCandidates,
  extractPhysicianCandidateReport,
  extractPersonCards,
  findTeamCandidateLinks,
  loadShebaEntDoctorsFromElasticsearch,
  loadShebaPage,
  visibleTextFromHtml,
  isSeniorPhysician,
  isSeniorPhysicianCandidate,
  shouldExcludePerson,
  shouldExternalSearch,
  resultFromProfile
};
