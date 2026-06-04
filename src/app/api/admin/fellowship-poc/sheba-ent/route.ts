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
import {
  getLatestShebaEntFellowshipUpload,
  saveShebaEntFellowshipExport
} from "@/lib/server/shebaEntFellowshipStore";

export const runtime = "nodejs";

const requestSchema = z.object({
  mode: z.enum(["crawl", "upload"]).optional(),
  exportJson: z.unknown().optional(),
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

export async function GET() {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "אין הרשאה." }, { status: 403 });
  }

  const latest = await getLatestShebaEntFellowshipUpload();
  if (!latest) {
    return NextResponse.json({
      ok: true,
      message: "לא הועלו עדיין נתוני סריקה.",
      physiciansProcessed: 0,
      results: [],
      warnings: ["לא הועלו עדיין נתוני סריקה."]
    });
  }

  return NextResponse.json(latest);
}

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
    if (parsed.data.mode === "upload") {
      const summary = await saveShebaEntFellowshipExport(
        parsed.data.exportJson,
        session.userId
      );
      const latest = await getLatestShebaEntFellowshipUpload();

      return NextResponse.json({
        ...(latest ?? {
          ok: true,
          physiciansProcessed: 0,
          results: [],
          warnings: []
        }),
        uploadSummary: summary
      });
    }

    const hasManualSource = Boolean(parsed.data.pastedHtml || parsed.data.pastedText || parsed.data.endpointUrl);
    if (process.env.NODE_ENV === "production" && !hasManualSource) {
      const latest = await getLatestShebaEntFellowshipUpload();
      if (!latest) {
        return NextResponse.json({
          ok: true,
          message: "לא הועלו עדיין נתוני סריקה.",
          physiciansProcessed: 0,
          results: [],
          warnings: ["לא הועלו עדיין נתוני סריקה."]
        });
      }
      return NextResponse.json({
        ...latest,
        warnings: [
          "סריקה חיה של שיבא זמינה כרגע רק בהרצה מקומית/worker, לא בפרודקשן Vercel.",
          ...latest.warnings
        ]
      });
    }

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
