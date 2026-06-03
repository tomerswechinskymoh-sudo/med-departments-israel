export type FirecrawlScrapeResult = {
  text: string;
  markdown?: string;
  html?: string;
  metadata?: Record<string, unknown>;
  links?: string[];
  responseKeys?: string[];
  dataKeys?: string[];
  statusCode?: number;
  source: "firecrawl";
};

export type FirecrawlScrapeErrorCode =
  | "firecrawl_key_missing"
  | "firecrawl_http_error"
  | "firecrawl_timeout"
  | "firecrawl_empty_response"
  | "firecrawl_invalid_response"
  | "firecrawl_request_failed";

export class FirecrawlScrapeError extends Error {
  code: FirecrawlScrapeErrorCode;
  status?: number;

  constructor(code: FirecrawlScrapeErrorCode, message: string, status?: number) {
    super(message);
    this.name = "FirecrawlScrapeError";
    this.code = code;
    this.status = status;
  }
}

type FirecrawlApiResponse = {
  success?: boolean;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    content?: string;
    text?: string;
    metadata?: Record<string, unknown>;
    links?: string[];
  };
  markdown?: string;
  html?: string;
  rawHtml?: string;
  content?: string;
  text?: string;
  metadata?: Record<string, unknown>;
  links?: string[];
  error?: string;
  message?: string;
};

const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";
const FIRECRAWL_TIMEOUT_MS = 30000;

function firecrawlApiKey() {
  return process.env.FIRECRAWL_API_KEY?.trim() ?? "";
}

function textFromResponse(payload: FirecrawlApiResponse) {
  const data = payload.data ?? payload;
  const markdown = data.markdown?.trim();
  const html = (data.html ?? data.rawHtml)?.trim();
  const text = (data.text ?? data.content ?? markdown)?.trim() ?? "";
  const metadata = data.metadata ?? payload.metadata;
  const links = data.links ?? payload.links;

  return {
    text,
    markdown,
    html,
    metadata,
    links
  };
}

export async function scrapeUrlWithFirecrawl(url: string): Promise<FirecrawlScrapeResult> {
  const apiKey = firecrawlApiKey();
  if (!apiKey) {
    throw new FirecrawlScrapeError("firecrawl_key_missing", "סריקה חיה דורשת FIRECRAWL_API_KEY.");
  }

  let response: Response;
  try {
    response = await fetch(FIRECRAWL_SCRAPE_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html"],
        onlyMainContent: true,
        timeout: FIRECRAWL_TIMEOUT_MS
      }),
      signal: AbortSignal.timeout(FIRECRAWL_TIMEOUT_MS + 5000)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FirecrawlScrapeError(
      /timeout|timed out|abort/i.test(message) ? "firecrawl_timeout" : "firecrawl_request_failed",
      `Firecrawl request failed: ${message}`
    );
  }

  let payload: FirecrawlApiResponse;
  try {
    payload = (await response.json()) as FirecrawlApiResponse;
  } catch {
    throw new FirecrawlScrapeError(
      "firecrawl_invalid_response",
      "Firecrawl returned a non-JSON response.",
      response.status
    );
  }

  if (!response.ok || payload.success === false) {
    throw new FirecrawlScrapeError(
      "firecrawl_http_error",
      payload.error ?? payload.message ?? `Firecrawl scrape failed with status ${response.status}.`,
      response.status
    );
  }

  const extracted = textFromResponse(payload);
  if (!extracted.text && !extracted.html) {
    throw new FirecrawlScrapeError("firecrawl_empty_response", "Firecrawl לא החזיר טקסט או HTML.", response.status);
  }

  return {
    text: extracted.text || extracted.html || "",
    markdown: extracted.markdown,
    html: extracted.html,
    metadata: extracted.metadata,
    links: extracted.links,
    responseKeys: Object.keys(payload),
    dataKeys: payload.data ? Object.keys(payload.data) : undefined,
    statusCode: response.status,
    source: "firecrawl"
  };
}
