import { Prisma, type PrismaClient } from "@prisma/client";
import { parseDataImportRecords, type DataImportPage } from "@/lib/server/data-import-engine";

type PlaywrightModule = typeof import("playwright");

type CrawlOptions = {
  rootUrl: string;
  maxPages?: number;
  yearsDepth?: number;
  allowedDomains?: string[];
  createdById?: string | null;
  resumeJobId?: string | null;
};

type CrawlProgress = {
  categoriesDiscovered: number;
  yearsDiscovered: number;
  pagesVisited: number;
  physiciansExtracted: number;
  failedPages: number;
  visitedUrls: string[];
  queuedUrls: string[];
};

const DEFAULT_DELAY_MS = 850;
const DEFAULT_MAX_PAGES = 80;
const DEFAULT_YEARS_DEPTH = 5;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrl(url: string) {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.toString();
}

function sameAllowedDomain(url: string, allowedDomains: string[]) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return allowedDomains.some((domain) => hostname === domain.replace(/^www\./, ""));
  } catch {
    return false;
  }
}

function isMedicalRatingCandidate(url: string, text = "") {
  const value = `${url} ${text}`.toLowerCase();
  return (
    value.includes("duns") &&
    (value.includes("medical") ||
      value.includes("doctor") ||
      value.includes("rating") ||
      value.includes("רפוא") ||
      value.includes("רופא") ||
      value.includes("בריאות"))
  );
}

function yearFromValue(value: string) {
  const match = value.match(/(?:20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

async function updateJobProgress(prisma: PrismaClient, jobId: string, progress: CrawlProgress) {
  await prisma.dataImportJob.update({
    where: { id: jobId },
    data: {
      progressJson: progress as unknown as Prisma.InputJsonValue
    }
  });
}

export async function runDuns100CrawlerJob(prisma: PrismaClient, options: CrawlOptions) {
  const rootUrl = normalizeUrl(options.rootUrl);
  const rootDomain = new URL(rootUrl).hostname.replace(/^www\./, "");
  const allowedDomains = options.allowedDomains?.length ? options.allowedDomains : [rootDomain];
  const maxPages = Math.max(1, Math.min(options.maxPages ?? DEFAULT_MAX_PAGES, 250));
  const yearsDepth = Math.max(1, Math.min(options.yearsDepth ?? DEFAULT_YEARS_DEPTH, 20));
  const existingJob = options.resumeJobId
    ? await prisma.dataImportJob.findUnique({ where: { id: options.resumeJobId } })
    : null;
  const previousProgress =
    existingJob?.progressJson && typeof existingJob.progressJson === "object" && !Array.isArray(existingJob.progressJson)
      ? (existingJob.progressJson as unknown as Partial<CrawlProgress>)
      : {};
  const job = existingJob
    ? await prisma.dataImportJob.update({
        where: { id: existingJob.id },
        data: {
          status: "RUNNING",
          errorMessage: null,
          startedAt: new Date(),
          maxPages,
          yearsDepth,
          allowedDomainsJson: allowedDomains as unknown as Prisma.InputJsonValue
        }
      })
    : await prisma.dataImportJob.create({
        data: {
          sourceType: "DUNS100",
          target: "DUNS100_PHYSICIANS",
          rootUrl,
          maxPages,
          yearsDepth,
          allowedDomainsJson: allowedDomains as unknown as Prisma.InputJsonValue,
          createdById: options.createdById ?? null,
          startedAt: new Date(),
          progressJson: {
            categoriesDiscovered: 0,
            yearsDiscovered: 0,
            pagesVisited: 0,
            physiciansExtracted: 0,
            failedPages: 0,
            visitedUrls: [],
            queuedUrls: [rootUrl]
          }
        }
      });
  const playwright = await optionalImport<PlaywrightModule>("playwright");

  if (!playwright) {
    await prisma.dataImportJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: "Playwright אינו זמין בסביבת הריצה."
      }
    });
    throw new Error("Playwright אינו זמין בסביבת הריצה.");
  }

  const visited = new Set<string>(previousProgress.visitedUrls ?? []);
  const queued = new Set<string>([rootUrl, ...(previousProgress.queuedUrls ?? [])]);
  const categoryUrls = new Set<string>();
  const yearUrls = new Set<string>();
  const pages: DataImportPage[] = [];
  let failedPages = previousProgress.failedPages ?? 0;
  let browser: Awaited<ReturnType<PlaywrightModule["chromium"]["launch"]>> | null = null;

  const progress = (): CrawlProgress => ({
    categoriesDiscovered: categoryUrls.size,
    yearsDiscovered: unique(Array.from(yearUrls).map((url) => String(yearFromValue(url) ?? ""))).filter(Boolean).length,
    pagesVisited: visited.size,
    physiciansExtracted: 0,
    failedPages,
    visitedUrls: Array.from(visited).slice(-300),
    queuedUrls: Array.from(queued).slice(0, 300)
  });

  try {
    browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      extraHTTPHeaders: {
        "accept-language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    async function visit(url: string, attempt = 1): Promise<{ text: string; title: string; links: Array<{ href: string; text: string }> } | null> {
      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 22000 });
        await page.waitForTimeout(500);
        const result = await page.evaluate(() => ({
          title: document.title,
          text: document.body?.innerText ?? "",
          links: Array.from(document.querySelectorAll("a[href]")).map((anchor) => ({
            href: (anchor as HTMLAnchorElement).href,
            text: anchor.textContent ?? ""
          }))
        }));
        return result;
      } catch {
        if (attempt < 3) {
          await sleep(DEFAULT_DELAY_MS * attempt);
          return visit(url, attempt + 1);
        }
        failedPages += 1;
        return null;
      } finally {
        await page.close().catch(() => undefined);
      }
    }

    while (queued.size > 0 && visited.size < maxPages) {
      const [url] = queued;
      queued.delete(url);
      if (!url || visited.has(url) || !sameAllowedDomain(url, allowedDomains)) continue;

      await sleep(DEFAULT_DELAY_MS);
      const result = await visit(url);
      visited.add(url);

      if (!result) {
        await updateJobProgress(prisma, job.id, progress());
        continue;
      }

      pages.push({
        rawText: result.text.slice(0, 60000),
        rawHtml: null,
        sourceUrl: url,
        sourceLabel: result.title || url,
        diagnostics: { crawler: "playwright", title: result.title }
      });

      for (const link of result.links) {
        let href: string;
        try {
          href = normalizeUrl(new URL(link.href, url).toString());
        } catch {
          continue;
        }
        if (!sameAllowedDomain(href, allowedDomains)) continue;
        if (isMedicalRatingCandidate(href, link.text)) {
          categoryUrls.add(href);
          if (!visited.has(href) && visited.size + queued.size < maxPages * 2) queued.add(href);
        }
        const year = yearFromValue(`${href} ${link.text}`);
        if (year && isMedicalRatingCandidate(href, link.text)) {
          yearUrls.add(href);
        }
      }

      const recentYears = unique(Array.from(yearUrls))
        .sort((left, right) => (yearFromValue(right) ?? 0) - (yearFromValue(left) ?? 0))
        .slice(0, yearsDepth * Math.max(1, categoryUrls.size || 1));
      for (const yearUrl of recentYears) {
        if (!visited.has(yearUrl)) queued.add(yearUrl);
      }

      await updateJobProgress(prisma, job.id, progress());
    }

    const parsedResult = await parseDataImportRecords(prisma, {
      rawText: pages.map((page) => page.rawText).join("\n\n--- page ---\n\n"),
      pages,
      sourceUrl: rootUrl,
      sourceType: "DUNS100",
      target: "DUNS100_PHYSICIANS",
      extractionInstruction: "Extract DUNS100 physicians and match them to departments"
    });
    const batch = await prisma.dataImportBatch.create({
      data: {
        sourceType: "DUNS100",
        target: "DUNS100_PHYSICIANS",
        sourceUrl: rootUrl,
        extractionInstruction: "Crawler: Extract DUNS100 physicians and match them to departments",
        rawText: pages.map((page) => page.rawText).join("\n\n--- page ---\n\n").slice(0, 120000),
        parsedJson: {
          summary: parsedResult.summary,
          unmatchedCount: parsedResult.unmatchedCount,
          crawlerProgress: {
            ...progress(),
            physiciansExtracted: parsedResult.records.length
          },
          processingSummary: {
            pagesProcessed: pages.length,
            recordsExtracted: parsedResult.records.length,
            matchedRecords: parsedResult.records.length - parsedResult.unmatchedCount,
            unmatchedRecords: parsedResult.unmatchedCount
          }
        },
        status: "PENDING_REVIEW",
        createdById: options.createdById ?? null,
        sources: {
          createMany: {
            data: pages.map((page) => ({
              sourceUrl: page.sourceUrl ?? null,
              sourceLabel: page.sourceLabel ?? null,
              finalUrl: page.sourceUrl ?? null,
              rawText: page.rawText,
              rawHtml: page.rawHtml ?? null,
              diagnostics: (page.diagnostics ?? {}) as Prisma.InputJsonValue
            }))
          }
        },
        records: {
          createMany: {
            skipDuplicates: true,
            data: parsedResult.records.map((record) => ({
              sourceType: record.sourceType,
              target: record.target,
              recordType: record.recordType,
              payloadJson: record.payloadJson,
              rawText: record.rawText,
              sourceSnippet: record.sourceSnippet,
              sourceUrl: record.sourceUrl,
              sourceLabel: record.sourceLabel,
              rankingYear: record.rankingYear,
              physicianName: record.physicianName,
              roleTitle: record.roleTitle,
              hospitalNameRaw: record.hospitalNameRaw,
              specialtyRaw: record.specialtyRaw,
              normalizedHospitalId: record.normalizedHospitalId,
              normalizedSpecialtyId: record.normalizedSpecialtyId,
              normalizedDepartmentId: record.normalizedDepartmentId,
              confidenceScore: record.confidenceScore,
              dedupeKey: record.dedupeKey
            }))
          }
        }
      },
      include: {
        records: {
          take: 12,
          orderBy: {
            physicianName: "asc"
          }
        }
      }
    });
    const finalStatus = failedPages > 0 ? "PARTIAL" : "COMPLETED";
    const finalProgress = {
      ...progress(),
      physiciansExtracted: parsedResult.records.length
    };
    const finishedJob = await prisma.dataImportJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        batchId: batch.id,
        progressJson: finalProgress as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
        errorMessage: failedPages > 0 ? `${failedPages} עמודים נכשלו במהלך הסריקה.` : null
      }
    });

    return { job: finishedJob, batch };
  } catch (error) {
    const failedJob = await prisma.dataImportJob.update({
      where: { id: job.id },
      data: {
        status: pages.length > 0 ? "PARTIAL" : "FAILED",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "סריקת DUNS100 נכשלה.",
        progressJson: progress() as unknown as Prisma.InputJsonValue
      }
    });
    throw Object.assign(error instanceof Error ? error : new Error("סריקת DUNS100 נכשלה."), {
      job: failedJob
    });
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
