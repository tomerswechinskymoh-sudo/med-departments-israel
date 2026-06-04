import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import {
  runShebaEntFellowshipCrawler,
  shebaEntCrawlerInternals
} from "@/lib/server/shebaEntCrawler";

const departmentUrl =
  process.argv.find((arg) => arg.startsWith("--url="))?.slice("--url=".length) ??
  "https://www.shebaonline.org/department/otolaryngology-head-and-neck-surgery/";
const outDir = path.join(process.cwd(), "tmp", "sheba-ent");
const knownNames = ["הצוות שלנו", "ערן אלון", "עומרי פריד", "עדית גבאי"];
const relevantTeamPattern = /הצוות שלנו|הרופאים שלנו|צוות|רופאים|סגל רפואי|doctors|physicians|staff|team|profiles|about|אודות/i;
const profilePattern = /doctor|physician|profile|רופא|פרופ|ד["״']?ר|דר(?:['׳״"])?/i;
const browserHeaders = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
  "accept-language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  pragma: "no-cache"
};

async function writeJson(fileName: string, value: unknown) {
  await fs.writeFile(path.join(outDir, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function directFetchHtml(url: string) {
  try {
    const response = await fetch(url, {
      headers: browserHeaders,
      signal: AbortSignal.timeout(20000)
    });
    const html = await response.text();
    return {
      ok: true as const,
      status: response.status,
      finalUrl: response.url || url,
      html
    };
  } catch (error) {
    return {
      ok: false as const,
      status: null,
      finalUrl: url,
      html: "",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function renderedSnapshot(url: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: browserHeaders["user-agent"],
      extraHTTPHeaders: browserHeaders
    });
    const page = await context.newPage();
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    await page.waitForTimeout(2000);
    const screenshotPath = path.join(outDir, "screenshot.png");
    const html = await page.content();
    const text = await page.evaluate(() => document.body?.innerText ?? "");
    const links = await page
      .locator("a[href]")
      .evaluateAll((elements) =>
        elements.map((element) => ({
          text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
          href: element.getAttribute("href") ?? ""
        }))
      )
      .catch(() => []);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return {
      ok: true as const,
      status: response?.status() ?? null,
      finalUrl: page.url(),
      html,
      text,
      links,
      screenshotPath
    };
  } catch (error) {
    return {
      ok: false as const,
      status: null,
      finalUrl: url,
      html: "",
      text: "",
      links: [] as Array<{ text: string; href: string }>,
      screenshotPath: null,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
  } finally {
    await browser.close();
  }
}

function containsMap(value: string) {
  return Object.fromEntries(knownNames.map((name) => [name, value.includes(name)]));
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const direct = await directFetchHtml(departmentUrl);
  await fs.writeFile(path.join(outDir, "raw.html"), direct.html, "utf8");

  const rendered = await renderedSnapshot(departmentUrl);
  await fs.writeFile(path.join(outDir, "rendered.html"), rendered.html, "utf8");
  await fs.writeFile(path.join(outDir, "text.txt"), rendered.text, "utf8");

  const loadedPage = await shebaEntCrawlerInternals.loadShebaPage(departmentUrl);
  const links = shebaEntCrawlerInternals.extractAllPageLinks(loadedPage);
  const classification = shebaEntCrawlerInternals.classifyPage(
    loadedPage.text,
    loadedPage.html,
    links,
    loadedPage.live?.statusCode
  );
  const extraction = shebaEntCrawlerInternals.extractPhysicianCandidateReport(
    loadedPage.html || loadedPage.text,
    loadedPage.finalUrl,
    {
      page: loadedPage,
      includeSourceDebug: true
    }
  );
  const elastic = await shebaEntCrawlerInternals.loadShebaEntDoctorsFromElasticsearch();
  const crawlResult = await runShebaEntFellowshipCrawler({
    departmentUrl,
    debug: true
  });
  const renderedLinks = rendered.links.map((link) => ({
    text: link.text,
    href: new URL(link.href, rendered.finalUrl).toString()
  }));
  const likelyTeamLinks = links.filter((link) => relevantTeamPattern.test(`${link.text} ${link.href}`));
  const likelyProfileLinks = links.filter((link) => profilePattern.test(`${link.text} ${link.href}`));
  const endpointCandidates = shebaEntCrawlerInternals.extractEndpointCandidates(loadedPage);
  const debug = {
    directFetch: {
      ok: direct.ok,
      status: direct.status,
      finalUrl: direct.finalUrl,
      htmlLength: direct.html.length,
      error: "error" in direct ? direct.error : undefined,
      contains: containsMap(direct.html)
    },
    renderedFetch: {
      ok: rendered.ok,
      status: rendered.status,
      finalUrl: rendered.finalUrl,
      htmlLength: rendered.html.length,
      textLength: rendered.text.length,
      error: "error" in rendered ? rendered.error : undefined,
      containsHtml: containsMap(rendered.html),
      containsText: containsMap(rendered.text)
    },
    actualCrawlerLoad: {
      finalUrl: loadedPage.finalUrl,
      status: loadedPage.live?.statusCode ?? null,
      htmlLength: loadedPage.html.length,
      textLength: loadedPage.text.length,
      containsHtml: containsMap(loadedPage.html),
      containsText: containsMap(loadedPage.text)
    },
    classification,
    extractionDebug: extraction.debug,
    elasticDebug: elastic.debug,
    endpointCandidates,
    crawlWarnings: crawlResult.warnings
  };
  const people = {
    pageExtractedCandidates: extraction.candidates,
    elasticCandidates: elastic.candidates,
    crawlerResults: crawlResult.results.map((result) => ({
      physicianName: result.physicianName,
      role: result.role,
      sourceUrl: result.sourceUrl,
      bioTextLength: result.bioTextLength,
      detectedFellowships: result.detectedFellowships,
      needsExternalSearch: result.needsExternalSearch,
      reason: result.reason
    }))
  };

  await writeJson("links.json", {
    actualCrawlerLinks: links,
    renderedLinks,
    likelyTeamLinks,
    likelyProfileLinks,
    endpointCandidates
  });
  await writeJson("debug.json", debug);
  await writeJson("people.json", people);
  await writeJson("team-api.json", elastic.doctorsResponse);
  await writeJson("department-api.json", elastic.departmentResponse);

  const summary = {
    fetchedUrl: departmentUrl,
    finalUrl: loadedPage.finalUrl,
    status: loadedPage.live?.statusCode ?? null,
    htmlLength: loadedPage.html.length,
    textLength: loadedPage.text.length,
    containsTeamHeading: loadedPage.html.includes("הצוות שלנו") || loadedPage.text.includes("הצוות שלנו"),
    containsKnownNames: {
      "ערן אלון": loadedPage.html.includes("ערן אלון") || loadedPage.text.includes("ערן אלון"),
      "עומרי פריד": loadedPage.html.includes("עומרי פריד") || loadedPage.text.includes("עומרי פריד"),
      "עדית גבאי": loadedPage.html.includes("עדית גבאי") || loadedPage.text.includes("עדית גבאי")
    },
    numberOfLinks: links.length,
    numberOfLikelyTeamLinks: likelyTeamLinks.length,
    numberOfLikelyPhysicianProfileLinks: likelyProfileLinks.length,
    numberOfExtractedPhysicians: crawlResult.results.length,
    numberOfElasticCandidates: elastic.candidates.length,
    pageType: classification.pageType,
    files: [
      "tmp/sheba-ent/raw.html",
      "tmp/sheba-ent/rendered.html",
      "tmp/sheba-ent/screenshot.png",
      "tmp/sheba-ent/text.txt",
      "tmp/sheba-ent/links.json",
      "tmp/sheba-ent/debug.json",
      "tmp/sheba-ent/people.json",
      "tmp/sheba-ent/team-api.json",
      "tmp/sheba-ent/department-api.json"
    ]
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
