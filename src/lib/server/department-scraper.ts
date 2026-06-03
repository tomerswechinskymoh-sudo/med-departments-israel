type ScrapeExtraction = {
  confidenceScore: number | null;
  departmentHeadTitle: string | null;
  departmentHeadName: string | null;
  departmentHeadEmail: string | null;
  departmentHeadPhone: string | null;
  contactTitle: string | null;
  contactRole: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  seniorPhysiciansCount: number | null;
  bedsCount: number | null;
  subSpecialties: string[] | null;
  applicationUrl: string | null;
  researchActivity: string | null;
  description: string | null;
  warnings: string[] | null;
};

export type ScrapeDiagnostics = {
  fetchTextLength: number;
  playwrightTextLength: number | null;
  statusCode: number | null;
  finalUrl: string;
  usedPlaywright: boolean;
  extractedEmails: string[];
  extractedEmailsRaw: string[];
  extractedEmailsNormalized: string[];
  emailSourceBreakdown: Record<EmailSourceKey, string[]>;
  extractedPhones: string[];
  fetchError?: string;
  playwrightError?: string;
};

export type ScrapeTextResult = {
  rawText: string;
  diagnostics: ScrapeDiagnostics;
};

type EmailSourceKey =
  | "rawHtml"
  | "visibleText"
  | "playwrightInnerText"
  | "mailtoLinks"
  | "anchorHrefs";

type CheerioApi = {
  (selector: string): {
    remove: () => void;
    text: () => string;
  };
};

type PlaywrightModule = {
  chromium: {
    launch: (options: { headless: boolean }) => Promise<{
      newContext: (options: {
        userAgent: string;
        extraHTTPHeaders: Record<string, string>;
      }) => Promise<{
        newPage: () => Promise<{
          goto: (
            url: string,
            options: { waitUntil: "networkidle"; timeout: number }
          ) => Promise<{ status: () => number } | null>;
          url: () => string;
          locator: (selector: string) => {
            first: () => {
              textContent: (options: { timeout: number }) => Promise<string | null>;
            };
            evaluateAll: <T>(callback: (elements: Element[]) => T[]) => Promise<T[]>;
          };
          evaluate: <T>(callback: () => T) => Promise<T>;
          content: () => Promise<string>;
        }>;
      }>;
      close: () => Promise<void>;
    }>;
  };
};

const MAX_HTML_LENGTH = 320000;
const MAX_TEXT_LENGTH = 24000;
const MIN_TEXT_LENGTH = 120;
const PLAYWRIGHT_FALLBACK_TEXT_LENGTH = 1200;
const FETCH_TIMEOUT_MS = 9000;
const PLAYWRIGHT_TIMEOUT_MS = 12000;
const SCRAPER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const browserLikeHeaders = {
  "user-agent": SCRAPER_USER_AGENT,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
  "accept-language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  pragma: "no-cache"
};

export type PlaywrightPageLoadResult = {
  text: string;
  bodyInnerText: string;
  html: string;
  mailtoLinks: string[];
  telLinks: string[];
  anchorHrefs: string[];
  anchorLinks: Array<{ href: string; text: string }>;
  statusCode: number | null;
  finalUrl: string;
};

export type PlaywrightErrorKind =
  | "package_missing"
  | "browser_missing"
  | "chromium_launch_failed"
  | "page_navigation_failed"
  | "timeout"
  | "permissions"
  | "runtime"
  | "unknown";

export class PlaywrightLoadError extends Error {
  kind: PlaywrightErrorKind;
  causeError: unknown;

  constructor(kind: PlaywrightErrorKind, message: string, causeError?: unknown) {
    super(message);
    this.name = "PlaywrightLoadError";
    this.kind = kind;
    this.causeError = causeError;
  }
}

function emptyEmailSourceBreakdown(): Record<EmailSourceKey, string[]> {
  return {
    rawHtml: [],
    visibleText: [],
    playwrightInnerText: [],
    mailtoLinks: [],
    anchorHrefs: []
  };
}

export class ScrapeTextError extends Error {
  diagnostics: ScrapeDiagnostics;
  rawText: string;

  constructor(message: string, diagnostics: ScrapeDiagnostics, rawText = "") {
    super(message);
    this.name = "ScrapeTextError";
    this.diagnostics = diagnostics;
    this.rawText = rawText;
  }
}

async function optionalImport<T>(specifier: string): Promise<T | null> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string
    ) => Promise<T>;

    return await dynamicImport(specifier);
  } catch {
    return null;
  }
}

async function dynamicImport<T>(specifier: string): Promise<T> {
  const importFn = new Function("specifier", "return import(specifier)") as (
    specifier: string
  ) => Promise<T>;

  return importFn(specifier);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function classifyPlaywrightError(error: unknown, fallback: PlaywrightErrorKind): PlaywrightErrorKind {
  const message = errorMessage(error).toLowerCase();

  if (/cannot find package|module not found|cannot find module|err_module_not_found/.test(message)) {
    return "package_missing";
  }
  if (/executable doesn't exist|browser.*not found|please run.*playwright install|install.*browsers|chromium.*not found/.test(message)) {
    return "browser_missing";
  }
  if (/timeout|timed out/.test(message)) {
    return "timeout";
  }
  if (/permission|eacces|eperm|sandbox/.test(message)) {
    return "permissions";
  }
  if (/edge runtime|window is not defined|process is not defined/.test(message)) {
    return "runtime";
  }
  if (/net::|navigation|goto|ssl|certificate|err_/.test(message)) {
    return "page_navigation_failed";
  }

  return fallback;
}

function sanitizeText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function decodeText(value: string) {
  let decoded = value
    .normalize("NFKC")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(parseInt(decimal, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&#64;|&commat;/g, "@")
    .replace(/&#46;/g, ".")
    .replace(/[＠﹫]/g, "@")
    .replace(/[．。]/g, ".")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "");

  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Some hospital pages contain partial percent-encoding; keep the original decoded HTML text.
  }

  return decoded;
}

function normalizeEmailSearchText(value: string) {
  return decodeText(value)
    .replace(/\s*(?:\[|\(|\{)\s*at\s*(?:\]|\)|\})\s*/gi, "@")
    .replace(/\s+at\s+/gi, "@")
    .replace(/\s*שטרודל\s*/g, "@")
    .replace(/\s*@\s*/g, "@")
    .replace(/\s*(?:\[|\(|\{)\s*dot\s*(?:\]|\)|\})\s*/gi, ".")
    .replace(/\s+dot\s+/gi, ".")
    .replace(/\s*\.\s*/g, ".");
}

function normalizeEmailCandidate(value: string) {
  const normalized = normalizeEmailSearchText(value)
    .replace(/^mailto:/i, "")
    .split("?")[0]
    .replace(/[<>"'()[\]{},;:]+$/g, "")
    .replace(/^[<>"'()[\]{},;:]+/g, "")
    .trim();

  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalized)) {
    return null;
  }

  const [localPart, domainPart] = normalized.split("@");
  return `${localPart}@${domainPart.toLowerCase()}`;
}

function extractEmailsFromSource(source: string) {
  const rawCandidates: string[] = [];
  const emails: string[] = [];
  const decoded = decodeText(source);

  for (const match of decoded.matchAll(/mailto:([^"'<>\s?]+)/gi)) {
    rawCandidates.push(match[0]);
    const email = normalizeEmailCandidate(match[1] ?? "");
    if (email) emails.push(email);
  }

  for (const text of [source, decoded, normalizeEmailSearchText(source)]) {
    for (const match of text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
      rawCandidates.push(match[0]);
      const email = normalizeEmailCandidate(match[0]);
      if (email) emails.push(email);
    }
  }

  return {
    rawCandidates: uniqueStrings(rawCandidates),
    emails: uniqueStrings(emails)
  };
}

function normalizePhoneCandidate(value: string) {
  const decoded = decodeText(value)
    .replace(/^tel:/i, "")
    .split("?")[0]
    .trim();
  const hasPlus = decoded.includes("+");
  const digits = decoded.replace(/[^\d]/g, "");

  if (digits.length < 8 || digits.length > 13) {
    return null;
  }

  if (hasPlus && digits.startsWith("972")) {
    return `+${digits}`;
  }

  if (digits.startsWith("972")) {
    return `+${digits}`;
  }

  return digits.startsWith("0") ? digits : null;
}

function extractPhonesFromSources(...sources: string[]) {
  const phones: string[] = [];

  for (const source of sources) {
    const decoded = decodeText(source);
    for (const match of decoded.matchAll(/tel:([^"'<>\s]+)/gi)) {
      const phone = normalizePhoneCandidate(match[1] ?? "");
      if (phone) phones.push(phone);
    }

    for (const match of decoded.matchAll(/(?:\+972|0)(?:[\s().-]?\d){7,10}/g)) {
      const phone = normalizePhoneCandidate(match[0]);
      if (phone) phones.push(phone);
    }
  }

  return uniqueStrings(phones);
}

function extractContactHints(...sources: string[]) {
  return {
    emails: uniqueStrings(sources.flatMap((source) => extractEmailsFromSource(source).emails)),
    phones: extractPhonesFromSources(...sources)
  };
}

function mergeContactHints(
  diagnostics: ScrapeDiagnostics,
  hints: { emails: string[]; phones: string[] }
) {
  diagnostics.extractedEmails = uniqueStrings([...diagnostics.extractedEmails, ...hints.emails]);
  diagnostics.extractedPhones = uniqueStrings([...diagnostics.extractedPhones, ...hints.phones]);
}

function mergeEmailDiagnostics(
  diagnostics: ScrapeDiagnostics,
  sourceKey: EmailSourceKey,
  sourceValue: string | string[]
) {
  const sources = Array.isArray(sourceValue) ? sourceValue : [sourceValue];
  const sourceEmails: string[] = [];
  const sourceRaw: string[] = [];

  for (const source of sources) {
    const extracted = extractEmailsFromSource(source);
    sourceEmails.push(...extracted.emails);
    sourceRaw.push(...extracted.rawCandidates);
  }

  diagnostics.extractedEmailsRaw = uniqueStrings([...diagnostics.extractedEmailsRaw, ...sourceRaw]);
  diagnostics.extractedEmailsNormalized = uniqueStrings([
    ...diagnostics.extractedEmailsNormalized,
    ...sourceEmails
  ]);
  diagnostics.extractedEmails = diagnostics.extractedEmailsNormalized;
  diagnostics.emailSourceBreakdown[sourceKey] = uniqueStrings([
    ...diagnostics.emailSourceBreakdown[sourceKey],
    ...sourceEmails
  ]);
}

async function extractTextWithCheerio(html: string) {
  const cheerioModule = await optionalImport<{
    load: (html: string) => CheerioApi;
  }>("cheerio");

  if (!cheerioModule) {
    return sanitizeText(html);
  }

  const $ = cheerioModule.load(html);
  $("script, style, noscript, svg, nav, header, footer").remove();

  return sanitizeText($("main").text() || $("article").text() || $("body").text() || html);
}

export async function loadPageWithPlaywright(
  sourceUrl: string,
  options: { timeoutMs?: number } = {}
): Promise<PlaywrightPageLoadResult> {
  let playwrightModule: PlaywrightModule;

  try {
    playwrightModule = await dynamicImport<PlaywrightModule>("playwright");
  } catch (error) {
    const kind = classifyPlaywrightError(error, "package_missing");
    throw new PlaywrightLoadError(
      kind,
      kind === "package_missing"
        ? `Playwright package missing: ${errorMessage(error)}`
        : `Playwright dynamic import failed: ${errorMessage(error)}`,
      error
    );
  }

  let browser: Awaited<ReturnType<PlaywrightModule["chromium"]["launch"]>>;

  try {
    browser = await playwrightModule.chromium.launch({ headless: true });
  } catch (error) {
    const kind = classifyPlaywrightError(error, "chromium_launch_failed");
    throw new PlaywrightLoadError(
      kind,
      kind === "browser_missing"
        ? `Playwright browser missing: ${errorMessage(error)}`
        : `Chromium launch failed: ${errorMessage(error)}`,
      error
    );
  }

  try {
    const context = await browser.newContext({
      userAgent: SCRAPER_USER_AGENT,
      extraHTTPHeaders: browserLikeHeaders
    });
    const page = await context.newPage();
    let response: { status: () => number } | null;

    try {
      response = await page.goto(sourceUrl, {
        waitUntil: "networkidle",
        timeout: options.timeoutMs ?? PLAYWRIGHT_TIMEOUT_MS
      });
    } catch (error) {
      throw new PlaywrightLoadError(
        classifyPlaywrightError(error, "page_navigation_failed"),
        `Page navigation failed: ${errorMessage(error)}`,
        error
      );
    }
    const candidates = await Promise.allSettled(
      ["main", "article", "body"].map((selector) =>
        page.locator(selector).first().textContent({ timeout: 2000 })
      )
    );
    const bodyInnerText = await page
      .evaluate(() => document.body?.innerText ?? "")
      .catch(() => "");
    const text =
      candidates
        .map((candidate) => (candidate.status === "fulfilled" ? candidate.value : null))
        .find((value) => value && sanitizeText(value).length >= MIN_TEXT_LENGTH) ?? "";
    const mailtoLinks = await page
      .locator("a[href^='mailto:']")
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("href") ?? ""))
      .catch(() => []);
    const telLinks = await page
      .locator("a[href^='tel:']")
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("href") ?? ""))
      .catch(() => []);
    const anchorHrefs = await page
      .locator("a[href]")
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("href") ?? ""))
      .catch(() => []);
    const anchorLinks = await page
      .locator("a[href]")
      .evaluateAll((elements) =>
        elements.map((element) => ({
          href: element.getAttribute("href") ?? "",
          text: element.textContent?.replace(/\s+/g, " ").trim() ?? ""
        }))
      )
      .catch(() => []);
    const html = await page.content().catch(() => "");

    return {
      text: sanitizeText(text || bodyInnerText),
      bodyInnerText: sanitizeText(bodyInnerText),
      html,
      mailtoLinks,
      telLinks,
      anchorHrefs,
      anchorLinks,
      statusCode: response?.status() ?? null,
      finalUrl: page.url()
    };
  } finally {
    await browser.close();
  }
}

async function extractTextWithPlaywright(sourceUrl: string) {
  return loadPageWithPlaywright(sourceUrl);
}

export function validateScrapeUrl(value: string) {
  const url = new URL(value);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("אפשר לסרוק רק כתובות http/https.");
  }

  return url.toString();
}

export async function scrapeDepartmentUrl(sourceUrl: string): Promise<ScrapeTextResult> {
  const diagnostics: ScrapeDiagnostics = {
    fetchTextLength: 0,
    playwrightTextLength: null,
    statusCode: null,
    finalUrl: sourceUrl,
    usedPlaywright: false,
    extractedEmails: [],
    extractedEmailsRaw: [],
    extractedEmailsNormalized: [],
    emailSourceBreakdown: emptyEmailSourceBreakdown(),
    extractedPhones: []
  };
  let rawText = "";
  let fetchWasUsable = false;

  try {
    const response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: browserLikeHeaders,
      redirect: "follow"
    });

    diagnostics.statusCode = response.status;
    diagnostics.finalUrl = response.url || sourceUrl;

    if (!response.ok) {
      throw new Error(`האתר החזיר שגיאה (${response.status}).`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error("הקישור לא נראה כמו עמוד HTML שניתן לסרוק.");
    }

    const rawHtml = (await response.text()).slice(0, MAX_HTML_LENGTH);
    rawText = await extractTextWithCheerio(rawHtml);
    mergeEmailDiagnostics(diagnostics, "rawHtml", [rawHtml, decodeText(rawHtml)]);
    mergeEmailDiagnostics(diagnostics, "visibleText", rawText);
    mergeContactHints(diagnostics, extractContactHints(rawHtml, rawText));
    diagnostics.fetchTextLength = rawText.length;
    fetchWasUsable = rawText.length >= MIN_TEXT_LENGTH;
  } catch (error) {
    diagnostics.fetchError = error instanceof Error ? error.message : "Fetch failed.";
  }

  if (rawText.length < PLAYWRIGHT_FALLBACK_TEXT_LENGTH) {
    diagnostics.usedPlaywright = true;

    try {
      const rendered = await extractTextWithPlaywright(sourceUrl);
      diagnostics.playwrightTextLength = rendered.text.length;
      diagnostics.statusCode = rendered.statusCode ?? diagnostics.statusCode;
      diagnostics.finalUrl = rendered.finalUrl || diagnostics.finalUrl;
      mergeEmailDiagnostics(diagnostics, "visibleText", rendered.text);
      mergeEmailDiagnostics(diagnostics, "playwrightInnerText", rendered.bodyInnerText);
      mergeEmailDiagnostics(diagnostics, "mailtoLinks", rendered.mailtoLinks);
      mergeEmailDiagnostics(diagnostics, "anchorHrefs", rendered.anchorHrefs);
      mergeContactHints(
        diagnostics,
        extractContactHints(
          rendered.text,
          rendered.bodyInnerText,
          rendered.mailtoLinks.join(" "),
          rendered.telLinks.join(" "),
          rendered.anchorHrefs.join(" ")
        )
      );

      if (rendered.text.length > rawText.length) {
        rawText = rendered.text;
      }
    } catch (error) {
      diagnostics.playwrightError = error instanceof Error ? error.message : "Playwright failed.";
    }
  }

  if (rawText.length < 120) {
    const reason = fetchWasUsable
      ? "לא נמצא מספיק טקסט בעמוד לסריקה."
      : diagnostics.fetchError ?? diagnostics.playwrightError ?? "לא נמצא מספיק טקסט בעמוד לסריקה.";
    throw new ScrapeTextError(reason, diagnostics, rawText);
  }

  return {
    rawText,
    diagnostics
  };
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeExtraction(value: Record<string, unknown>): ScrapeExtraction {
  const subSpecialties = Array.isArray(value.subSpecialties)
    ? value.subSpecialties.map((item) => nullableString(item)).filter((item): item is string => Boolean(item))
    : null;

  return {
    confidenceScore: nullableNumber(value.confidenceScore),
    departmentHeadTitle: nullableString(value.departmentHeadTitle),
    departmentHeadName: nullableString(value.departmentHeadName),
    departmentHeadEmail: nullableString(value.departmentHeadEmail),
    departmentHeadPhone: nullableString(value.departmentHeadPhone),
    contactTitle: nullableString(value.contactTitle),
    contactRole: nullableString(value.contactRole),
    contactName: nullableString(value.contactName),
    contactEmail: nullableString(value.contactEmail),
    contactPhone: nullableString(value.contactPhone),
    seniorPhysiciansCount: nullableNumber(value.seniorPhysiciansCount),
    bedsCount: nullableNumber(value.bedsCount),
    subSpecialties,
    applicationUrl: nullableString(value.applicationUrl),
    researchActivity: nullableString(value.researchActivity),
    description: nullableString(value.description),
    warnings: Array.isArray(value.warnings)
      ? value.warnings.map((item) => nullableString(item)).filter((item): item is string => Boolean(item))
      : null
  };
}

export async function extractDepartmentScrape(input: {
  departmentName: string;
  institutionName: string;
  specialtyName: string;
  sourceUrl: string;
  rawText: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY לא מוגדר בסביבה.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract hospital department information. Return JSON only. Do not invent emails, phones, names, links, counts, or units. Use null when not found. Hebrew description must be neutral, factual, concise, and based only on supplied scraped content and staff info."
        },
        {
          role: "user",
          content: JSON.stringify({
            departmentName: input.departmentName,
            institutionName: input.institutionName,
            specialtyName: input.specialtyName,
            sourceUrl: input.sourceUrl,
            requiredKeys: [
              "confidenceScore",
              "departmentHeadTitle",
              "departmentHeadName",
              "departmentHeadEmail",
              "departmentHeadPhone",
              "contactTitle",
              "contactRole",
              "contactName",
              "contactEmail",
              "contactPhone",
              "seniorPhysiciansCount",
              "bedsCount",
              "subSpecialties",
              "applicationUrl",
              "researchActivity",
              "warnings",
              "description"
            ],
            rawText: input.rawText
          })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI extraction failed (${response.status}).`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI לא החזיר תוכן תקין.");
  }

  return normalizeExtraction(JSON.parse(content) as Record<string, unknown>);
}
