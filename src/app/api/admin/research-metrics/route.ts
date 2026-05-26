import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import { refreshOpenAlexDepartmentMetrics } from "@/lib/server/openalex-research";

const bulkRefreshSchema = z.object({
  departmentIds: z.array(z.string().cuid()).max(50).optional(),
  years: z.array(z.coerce.number().int().min(1990).max(2100)).max(20).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  delayMs: z.coerce.number().int().min(250).max(10000).default(1200)
});

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }
  const rateLimit = checkRateLimit(request, "admin:openalex-bulk-refresh", {
    limit: 4,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bulkRefreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "קלט ריענון OpenAlex לא תקין." }, { status: 400 });
  }

  const departments = await prisma.department.findMany({
    where: parsed.data.departmentIds?.length
      ? {
          id: {
            in: parsed.data.departmentIds
          }
        }
      : undefined,
    select: {
      id: true
    },
    orderBy: {
      updatedAt: "desc"
    },
    take: parsed.data.limit
  });
  const results: Array<{ departmentId: string; status: string; needsMapping?: boolean; error?: string }> = [];

  for (const [index, department] of departments.entries()) {
    try {
      const result = await refreshOpenAlexDepartmentMetrics(prisma, {
        departmentId: department.id,
        years: parsed.data.years
      });
      results.push({
        departmentId: department.id,
        status: "updated",
        needsMapping: result.needsMapping
      });
    } catch (error) {
      results.push({
        departmentId: department.id,
        status: "failed",
        error: error instanceof Error ? error.message : "ריענון OpenAlex נכשל."
      });
    }

    if (index < departments.length - 1) {
      await wait(parsed.data.delayMs);
    }
  }

  await createAuditLog({
    actorUserId: session.userId,
    action: "openalex.bulk_refreshed",
    entityType: "DepartmentResearchMetric",
    entityId: null,
    metadata: {
      requested: departments.length,
      years: parsed.data.years ?? null,
      results
    }
  });

  return NextResponse.json({
    message: `רועננו ${results.length} מחלקות מול OpenAlex.`,
    results
  });
}
