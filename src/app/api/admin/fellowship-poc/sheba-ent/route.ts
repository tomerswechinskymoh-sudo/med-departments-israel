import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import {
  assertAllowedShebaUrl,
  runShebaEntFellowshipCrawler,
  ShebaEntCrawlerError
} from "@/lib/server/shebaEntCrawler";

export const runtime = "nodejs";

const requestSchema = z.object({
  departmentUrl: z
    .preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), z.string().url().optional()),
  pastedText: z
    .preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), z.string().max(50000).optional()),
  pastedHtml: z
    .preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), z.string().max(500000).optional()),
  endpointUrl: z
    .preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), z.string().url().optional()),
  debug: z.boolean().optional()
});

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "אין הרשאה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "בקשה לא תקינה." }, { status: 403 });
  }

  const rateLimit = checkRateLimit(request, "admin:sheba-ent-fellowship-poc", {
    limit: 20,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[sheba-ent-fellowship-poc] invalid payload", {
      body,
      issues: parsed.error.flatten()
    });
    return NextResponse.json({ ok: false, error: "קלט סריקה לא תקין." }, { status: 400 });
  }

  try {
    if (parsed.data.departmentUrl) {
      assertAllowedShebaUrl(parsed.data.departmentUrl);
    }
    if (parsed.data.endpointUrl) {
      assertAllowedShebaUrl(parsed.data.endpointUrl);
    }

    const result = await runShebaEntFellowshipCrawler({
      departmentUrl: parsed.data.departmentUrl,
      pastedText: parsed.data.pastedText,
      pastedHtml: parsed.data.pastedHtml,
      endpointUrl: parsed.data.endpointUrl,
      debug: parsed.data.debug
    });

    return NextResponse.json(result);
  } catch (error) {
    const isCrawlerError = error instanceof ShebaEntCrawlerError;
    const stack = error instanceof Error ? error.stack : undefined;
    const errorCode = isCrawlerError ? error.code : "unknown";
    const errorMessage = error instanceof Error ? error.message : "סריקת אא״ג שיבא נכשלה.";
    console.error("[sheba-ent-fellowship-poc] crawl failed", {
      code: errorCode,
      message: error instanceof Error ? error.message : String(error),
      stack
    });

    return NextResponse.json(
      {
        ok: false,
        error: errorMessage,
        errorCode,
        diagnosticMessage: error instanceof Error ? error.message : String(error),
        stack
      },
      { status: 500 }
    );
  }
}
