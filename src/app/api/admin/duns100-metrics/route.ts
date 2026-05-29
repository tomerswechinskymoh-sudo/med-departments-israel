import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import { refreshDuns100DepartmentMetric } from "@/lib/server/duns100-enrichment";

const bulkRefreshSchema = z.object({
  departmentIds: z.array(z.string().cuid()).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(5),
  delayMs: z.coerce.number().int().min(100).max(10000).default(700),
  cursor: z.string().cuid().optional(),
  mode: z.enum(["batch", "all"]).default("batch")
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
  const rateLimit = checkRateLimit(request, "admin:duns100-bulk-refresh", {
    limit: 600,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bulkRefreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "קלט ריענון DUNS100 לא תקין." }, { status: 400 });
  }

  const importedWhere = {
    importStableKey: {
      not: null
    }
  } as const;
  const departmentWhere = parsed.data.departmentIds?.length
    ? {
        id: {
          in: parsed.data.departmentIds
        },
        ...importedWhere
      }
    : {
        ...importedWhere,
        ...(parsed.data.cursor
          ? {
              id: {
                gt: parsed.data.cursor
              }
            }
          : {})
      };
  const [totalImportedDepartments, departments] = await Promise.all([
    prisma.department.count({
      where: importedWhere
    }),
    prisma.department.findMany({
      where: departmentWhere,
      select: {
        id: true
      },
      orderBy: {
        id: "asc"
      },
      take: parsed.data.limit
    })
  ]);
  const results: Array<{
    departmentId: string;
    status: string;
    count?: number;
    confidenceScore?: number;
    sourceUrl?: string;
    error?: string;
  }> = [];

  for (const [index, department] of departments.entries()) {
    try {
      const result = await refreshDuns100DepartmentMetric(prisma, {
        departmentId: department.id
      });
      results.push({
        departmentId: department.id,
        status: "updated",
        count: result.count,
        confidenceScore: result.confidenceScore,
        sourceUrl: result.sourceUrl
      });
    } catch (error) {
      results.push({
        departmentId: department.id,
        status: "failed",
        error: error instanceof Error ? error.message : "ריענון DUNS100 נכשל."
      });
    }

    if (index < departments.length - 1) {
      await wait(parsed.data.delayMs);
    }
  }

  const nextCursor = departments.at(-1)?.id ?? null;
  const done = departments.length < parsed.data.limit || Boolean(parsed.data.departmentIds?.length);

  await createAuditLog({
    actorUserId: session.userId,
    action: "duns100.bulk_refreshed",
    entityType: "DepartmentExternalMetric",
    entityId: null,
    metadata: {
      requested: departments.length,
      totalImportedDepartments,
      cursor: parsed.data.cursor ?? null,
      nextCursor,
      done,
      mode: parsed.data.mode,
      results
    }
  });

  return NextResponse.json({
    message: done
      ? `ריענון DUNS100 הסתיים. עובדו ${results.length} מחלקות בבקשה האחרונה.`
      : `רועננו ${results.length} מחלקות מול DUNS100. אפשר להמשיך לבאצ׳ הבא.`,
    results,
    processed: results.length,
    totalImportedDepartments,
    nextCursor,
    done
  });
}
