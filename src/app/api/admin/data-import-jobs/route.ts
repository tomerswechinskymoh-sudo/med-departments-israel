import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runDuns100CrawlerJob } from "@/lib/server/duns-crawler";

const crawlSchema = z.object({
  rootUrl: z.string().trim().url().max(1000),
  maxPages: z.coerce.number().int().min(1).max(250).default(80),
  yearsDepth: z.coerce.number().int().min(1).max(20).default(5),
  allowedDomains: z.string().trim().max(1000).optional().or(z.literal("")),
  resumeJobId: z.string().cuid().optional().nullable()
});

function splitDomains(value?: string | null) {
  return (value ?? "")
    .split(/\n|,/)
    .map((item) => item.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = crawlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "יש להזין URL תקין והגבלות סריקה תקינות." }, { status: 400 });
  }

  try {
    const result = await runDuns100CrawlerJob(prisma, {
      rootUrl: parsed.data.rootUrl,
      maxPages: parsed.data.maxPages,
      yearsDepth: parsed.data.yearsDepth,
      allowedDomains: splitDomains(parsed.data.allowedDomains),
      resumeJobId: parsed.data.resumeJobId,
      createdById: session.userId
    });

    return NextResponse.json({
      message: "סריקת DUNS100 הסתיימה ונוצר batch לבדיקה.",
      job: result.job,
      batch: result.batch
    });
  } catch (error) {
    const maybeJob = error && typeof error === "object" && "job" in error ? (error as { job?: unknown }).job : null;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "סריקת DUNS100 נכשלה.",
        job: maybeJob
      },
      { status: 500 }
    );
  }
}
