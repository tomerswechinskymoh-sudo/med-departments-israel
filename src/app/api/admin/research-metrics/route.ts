import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import { refreshOpenAlexDepartmentMetrics } from "@/lib/server/openalex-research";

const bulkRefreshSchema = z.object({
  departmentId: z.string().cuid().optional(),
  departmentIds: z.array(z.string().cuid()).max(100).optional(),
  years: z.array(z.coerce.number().int().min(1990).max(2100)).max(20).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(5),
  delayMs: z.coerce.number().int().min(100).max(10000).default(500),
  cursor: z.preprocess((value) => (value === null || value === "" ? undefined : value), z.string().cuid().optional()),
  mode: z.enum(["single", "bulk", "batch", "all"]).optional()
}).superRefine((data, ctx) => {
  const mode = data.mode ?? (data.departmentId ? "single" : "bulk");

  if (mode === "single" && !data.departmentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["departmentId"],
      message: "departmentId is required for single refresh."
    });
  }
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
    limit: 600,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bulkRefreshSchema.safeParse(body);
  if (!parsed.success) {
    console.error("Invalid OpenAlex refresh payload", {
      issues: parsed.error.flatten(),
      body
    });
    return NextResponse.json({
      ok: false,
      error: "קלט ריענון OpenAlex לא תקין.",
      processed: 0,
      succeeded: 0,
      failed: 0,
      nextCursor: null,
      done: true,
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    }, { status: 400 });
  }

  const mode = parsed.data.mode ?? (parsed.data.departmentId ? "single" : "bulk");
  const isSingle = mode === "single";
  const importedWhere = {
    importStableKey: {
      not: null
    }
  } as const;
  const departmentIds = isSingle && parsed.data.departmentId
    ? [parsed.data.departmentId]
    : parsed.data.departmentIds;
  const departmentWhere = departmentIds?.length
    ? {
        id: {
          in: departmentIds
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

  if (isSingle && departments.length === 0 && parsed.data.departmentId) {
    results.push({
      departmentId: parsed.data.departmentId,
      status: "failed",
      error: "המחלקה לא נמצאה או אינה מחלקה מיובאת."
    });
  }

  const nextCursor = isSingle ? null : departments.at(-1)?.id ?? null;
  const done = isSingle || departments.length < parsed.data.limit || Boolean(departmentIds?.length);
  const failed = results.filter((result) => result.status === "failed").length;
  const succeeded = results.length - failed;
  const errors = results
    .filter((result) => result.status === "failed")
    .map((result) => ({
      departmentId: result.departmentId,
      message: result.error ?? "ריענון OpenAlex נכשל."
    }));

  await createAuditLog({
    actorUserId: session.userId,
    action: "openalex.bulk_refreshed",
    entityType: "DepartmentResearchMetric",
    entityId: null,
    metadata: {
      requested: departments.length,
      totalImportedDepartments,
      cursor: parsed.data.cursor ?? null,
      nextCursor,
      done,
      mode,
      years: parsed.data.years ?? null,
      results
    }
  });

  return NextResponse.json({
    ok: true,
    message: done
      ? `ריענון OpenAlex הסתיים. עובדו ${results.length} מחלקות בבקשה האחרונה.`
      : `רועננו ${results.length} מחלקות מול OpenAlex. אפשר להמשיך לבאצ׳ הבא.`,
    results,
    processed: results.length,
    succeeded,
    failed,
    totalImportedDepartments,
    nextCursor,
    done,
    errors
  });
}
