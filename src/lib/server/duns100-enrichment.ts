import { type PrismaClient } from "@prisma/client";

type DbClient = PrismaClient;
type PlaywrightModule = typeof import("playwright");

type DunsPage = {
  url: string;
  title: string;
  text: string;
  normalizedText: string;
  links: Array<{ href: string; text: string }>;
};

type AliasRule = {
  match: string[];
  aliases: string[];
};

const DUNS_ROOT_URL = "https://www.duns100.co.il/rating/Duns_100_medical";
const MAX_DUNS_PAGES_PER_DEPARTMENT = 4;
const DUNS_USER_AGENT = "hitmachut.org admin DUNS100 metrics crawler";

const INSTITUTION_ALIAS_RULES: AliasRule[] = [
  { match: ["שיבא", "תל השומר"], aliases: ["שיבא", "תל השומר", "המרכז הרפואי שיבא"] },
  { match: ["איכילוב", "סוראסקי"], aliases: ["איכילוב", "סוראסקי", "המרכז הרפואי תל אביב"] },
  { match: ["רמבם", "רמב\"ם"], aliases: ["רמבם", "רמב\"ם"] },
  { match: ["סורוקה"], aliases: ["סורוקה"] },
  { match: ["רבין", "בילינסון"], aliases: ["רבין", "בילינסון", "ביילינסון"] },
  { match: ["השרון"], aliases: ["השרון", "מרכז רפואי רבין"] },
  { match: ["שניידר"], aliases: ["שניידר"] },
  { match: ["הדסה", "עין כרם"], aliases: ["הדסה", "עין כרם"] },
  { match: ["הר הצופים"], aliases: ["הדסה הר הצופים", "הר הצופים"] },
  { match: ["שערי צדק"], aliases: ["שערי צדק"] },
  { match: ["שמיר", "אסף הרופא"], aliases: ["שמיר", "אסף הרופא"] },
  { match: ["ברזילי"], aliases: ["ברזילי"] },
  { match: ["אסותא אשדוד"], aliases: ["אסותא אשדוד"] },
  { match: ["הלל יפה"], aliases: ["הלל יפה"] },
  { match: ["לגליל", "גליל"], aliases: ["המרכז הרפואי לגליל", "גליל"] },
  { match: ["זיו"], aliases: ["זיו", "צפת"] },
  { match: ["פוריה", "ברוך פדה"], aliases: ["פוריה", "ברוך פדה", "צפון"] },
  { match: ["בני ציון"], aliases: ["בני ציון"] },
  { match: ["כרמל"], aliases: ["כרמל"] },
  { match: ["העמק"], aliases: ["העמק"] },
  { match: ["מאיר"], aliases: ["מאיר"] },
  { match: ["קפלן"], aliases: ["קפלן"] },
  { match: ["לניאדו"], aliases: ["לניאדו", "צאנז"] },
  { match: ["מעיני הישועה"], aliases: ["מעיני הישועה"] },
  { match: ["וולפסון"], aliases: ["וולפסון"] },
  { match: ["יוספטל"], aliases: ["יוספטל"] },
  { match: ["נצרת", "סקוטי", "אנגלי"], aliases: ["נצרת", "הסקוטי", "אנגלי"] },
  { match: ["משפחה הקדושה"], aliases: ["משפחה הקדושה"] },
  { match: ["סן ונסן", "צרפתי"], aliases: ["סן ונסן", "צרפתי"] }
];

const SPECIALTY_ALIAS_RULES: AliasRule[] = [
  { match: ["פנימית"], aliases: ["רפואה פנימית", "פנימית"] },
  { match: ["ילדים"], aliases: ["רפואת ילדים", "ילדים", "פדיאטריה"] },
  { match: ["משפחה"], aliases: ["רפואת משפחה", "משפחה"] },
  { match: ["כירורגיה כללית"], aliases: ["כירורגיה כללית", "כירורגיה"] },
  { match: ["אורתופד"], aliases: ["אורתופדיה", "אורתופדים", "כירורגיה אורתופדית"] },
  { match: ["אורולוג"], aliases: ["אורולוגיה", "אורולוגים"] },
  { match: ["אונקולוג"], aliases: ["אונקולוגיה", "אונקולוגים"] },
  { match: ["גינקולוג", "יילוד"], aliases: ["גינקולוגיה", "נשים", "יילוד"] },
  { match: ["הרדמה"], aliases: ["הרדמה", "מרדימים"] },
  { match: ["עיניים"], aliases: ["עיניים", "רפואת עיניים"] },
  { match: ["עור"], aliases: ["עור", "דרמטולוגיה"] },
  { match: ["א.א.ג", "ראש וצוואר"], aliases: ["אף אוזן גרון", "א.א.ג", "ראש וצוואר"] },
  { match: ["נוירולוג"], aliases: ["נוירולוגיה", "נוירולוגים"] },
  { match: ["נוירוכירורג"], aliases: ["נוירוכירורגיה", "נוירוכירורגים"] },
  { match: ["קרדיולוג"], aliases: ["קרדיולוגיה", "קרדיולוגים"] },
  { match: ["רדיולוג"], aliases: ["רדיולוגיה", "דימות"] },
  { match: ["פתולוג"], aliases: ["פתולוגיה", "פתולוגים"] },
  { match: ["פסיכיאטר"], aliases: ["פסיכיאטריה", "פסיכיאטרים"] },
  { match: ["גריאטר"], aliases: ["גריאטריה"] },
  { match: ["דחופה"], aliases: ["רפואה דחופה", "מיון"] },
  { match: ["שיקום", "פיזיקלית"], aliases: ["שיקום", "רפואה פיזיקלית"] }
];

const pageCache = new Map<string, Promise<DunsPage | null>>();

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

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("he")
    .replace(/&nbsp;/g, " ")
    .replace(/[״"׳']/g, "")
    .replace(/[-–—_/(){}\[\],.;:|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function aliasesFromRules(value: string, rules: AliasRule[]) {
  const normalized = normalizeText(value);
  return rules.flatMap((rule) =>
    rule.match.some((token) => normalized.includes(normalizeText(token))) ? rule.aliases : []
  );
}

function aliasesForInstitution(name: string) {
  return unique([
    name,
    name.replace(/^בי["׳']?ח\s+/i, ""),
    name.replace(/^בית החולים\s+/i, ""),
    name.replace(/^המרכז הרפואי\s+/i, ""),
    ...aliasesFromRules(name, INSTITUTION_ALIAS_RULES)
  ]);
}

function aliasesForSpecialty(name: string) {
  return unique([name, ...aliasesFromRules(name, SPECIALTY_ALIAS_RULES)]);
}

function extractTitle(html: string) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
}

function extractLinks(html: string, baseUrl: string) {
  const links: Array<{ href: string; text: string }> = [];
  const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html))) {
    try {
      const href = new URL(match[1], baseUrl).toString();
      links.push({
        href,
        text: stripHtml(match[2] ?? "")
      });
    } catch {
      // Ignore malformed hrefs.
    }
  }

  return links;
}

async function fetchDunsPage(url: string) {
  if (!pageCache.has(url)) {
    pageCache.set(
      url,
      (async () => {
        try {
          const response = await fetch(url, {
            headers: {
              accept: "text/html,application/xhtml+xml",
              "accept-language": "he-IL,he;q=0.9,en-US;q=0.7,en;q=0.6",
              "user-agent": DUNS_USER_AGENT
            },
            signal: AbortSignal.timeout(18000)
          });

          if (response.ok) {
            const html = await response.text();
            const text = stripHtml(html);

            return {
              url,
              title: stripHtml(extractTitle(html)),
              text,
              normalizedText: normalizeText(text),
              links: extractLinks(html, url)
            };
          }
        } catch {
          // Playwright fallback below handles hosts that block plain server-side fetch.
        }

        return renderDunsPageWithPlaywright(url);
      })()
    );
  }

  return pageCache.get(url)!;
}

async function renderDunsPageWithPlaywright(url: string) {
  const playwright = await optionalImport<PlaywrightModule>("playwright");
  if (!playwright) return null;

  let browser: Awaited<ReturnType<PlaywrightModule["chromium"]["launch"]>> | null = null;

  try {
    browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      extraHTTPHeaders: {
        "accept-language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1600);
    const result = await page.evaluate(() => ({
      title: document.title,
      text: document.body?.innerText ?? "",
      html: document.documentElement?.outerHTML ?? "",
      links: Array.from(document.querySelectorAll("a[href]")).map((anchor) => ({
        href: (anchor as HTMLAnchorElement).href,
        text: anchor.textContent ?? ""
      }))
    }));
    await context.close().catch(() => undefined);

    const text = result.text.trim() || stripHtml(result.html);
    if (!text || /just a moment|checking your browser|cloudflare/i.test(text.slice(0, 2000))) {
      return null;
    }

    return {
      url,
      title: result.title,
      text,
      normalizedText: normalizeText(text),
      links: result.links
    };
  } catch {
    return null;
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

function isDunsMedicalLink(link: { href: string; text: string }) {
  const value = normalizeText(`${link.href} ${link.text}`);
  return (
    value.includes("duns") &&
    (value.includes("medical") ||
      value.includes("רפוא") ||
      value.includes("רופא") ||
      value.includes("בריאות") ||
      value.includes("דירוג"))
  );
}

async function candidatePagesForSpecialty(specialtyAliases: string[]) {
  const root = await fetchDunsPage(DUNS_ROOT_URL);
  if (!root) return [];

  const normalizedSpecialtyAliases = specialtyAliases.map(normalizeText);
  const links = root.links
    .filter(isDunsMedicalLink)
    .filter((link) => {
      const normalized = normalizeText(`${link.text} ${link.href}`);
      return normalizedSpecialtyAliases.some((alias) => alias && normalized.includes(alias));
    })
    .map((link) => link.href);

  return unique([DUNS_ROOT_URL, ...links]).slice(0, MAX_DUNS_PAGES_PER_DEPARTMENT);
}

function countAliasContexts(
  page: DunsPage,
  hospitalAliases: string[],
  specialtyAliases: string[]
) {
  const contexts = new Set<string>();
  const specialtyOnPage = specialtyAliases
    .map(normalizeText)
    .some((alias) => alias && page.normalizedText.includes(alias));

  for (const alias of hospitalAliases.map(normalizeText).filter(Boolean)) {
    let cursor = 0;
    while (cursor < page.normalizedText.length) {
      const index = page.normalizedText.indexOf(alias, cursor);
      if (index === -1) break;
      cursor = index + alias.length;
      const context = page.normalizedText.slice(Math.max(0, index - 180), index + alias.length + 180);
      const contextHasSpecialty = specialtyAliases
        .map(normalizeText)
        .some((specialtyAlias) => specialtyAlias && context.includes(specialtyAlias));

      if (specialtyOnPage || contextHasSpecialty) {
        contexts.add(context.slice(0, 220));
      }
    }
  }

  return contexts.size;
}

function confidenceForDunsMatch(input: {
  count: number;
  pagesFetched: number;
  pagesMatched: number;
  categoryMatched: boolean;
}) {
  if (input.pagesFetched === 0) return 0.1;
  if (input.count === 0) return input.categoryMatched ? 0.36 : 0.24;
  if (input.pagesMatched > 1) return 0.74;
  return input.categoryMatched ? 0.64 : 0.52;
}

export async function refreshDuns100DepartmentMetric(
  db: DbClient,
  input: { departmentId: string }
) {
  const department = await db.department.findFirst({
    where: {
      id: input.departmentId,
      importStableKey: {
        not: null
      }
    },
    include: {
      institution: true,
      specialty: true
    }
  });

  if (!department) {
    throw new Error("המחלקה לא נמצאה או אינה מחלקה מיובאת.");
  }

  const hospitalAliases = aliasesForInstitution(department.institution.name);
  const specialtyAliases = aliasesForSpecialty(department.specialty.name);
  const pageUrls = await candidatePagesForSpecialty(specialtyAliases);
  const pages = (await Promise.all(pageUrls.map((url) => fetchDunsPage(url)))).filter(
    (page): page is DunsPage => Boolean(page)
  );
  const pageMatches = pages.map((page) => ({
    page,
    count: countAliasContexts(page, hospitalAliases, specialtyAliases)
  }));
  const matchedPages = pageMatches.filter((item) => item.count > 0);
  const count = Math.min(
    50,
    pageMatches.reduce((sum, item) => sum + item.count, 0)
  );
  const sourceUrl = matchedPages[0]?.page.url ?? pages[0]?.url ?? DUNS_ROOT_URL;
  const queryUsed = JSON.stringify({
    hospitalAliases,
    specialtyAliases,
    pageUrls,
    matchedPages: matchedPages.map((item) => ({
      url: item.page.url,
      title: item.page.title,
      count: item.count
    }))
  });
  const confidenceScore = confidenceForDunsMatch({
    count,
    pagesFetched: pages.length,
    pagesMatched: matchedPages.length,
    categoryMatched: pageUrls.length > 1
  });

  const metric = await db.departmentExternalMetric.upsert({
    where: {
      departmentId_metricKey_sourceName: {
        departmentId: department.id,
        metricKey: "duns100PhysiciansCount",
        sourceName: "DUNS100"
      }
    },
    create: {
      departmentId: department.id,
      metricKey: "duns100PhysiciansCount",
      value: count,
      sourceName: "DUNS100",
      sourceUrl,
      queryUsed,
      confidenceScore,
      approved: true
    },
    update: {
      value: count,
      sourceUrl,
      queryUsed,
      confidenceScore,
      approved: true
    }
  });

  return {
    departmentId: department.id,
    metric,
    count,
    confidenceScore,
    sourceUrl,
    queryUsed,
    pagesFetched: pages.length,
    matchedPages: matchedPages.length
  };
}
