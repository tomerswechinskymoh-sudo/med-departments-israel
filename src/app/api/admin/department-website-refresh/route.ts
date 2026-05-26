import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import { createDepartmentWebsiteRefreshSuggestion } from "@/lib/server/department-website-refresh";

const bulkRefreshSchema = z.object({
  departmentIds: z.array(z.string().cuid()).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  delayMs: z.coerce.number().int().min(250).max(10000).default(1500)
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
  const rateLimit = checkRateLimit(request, "admin:department-website-refresh", {
    limit: 4,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bulkRefreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "קלט ריענון לא תקין." }, { status: 400 });
  }

  const departments = await prisma.department.findMany({
    where: {
      ...(parsed.data.departmentIds?.length
        ? {
            id: {
              in: parsed.data.departmentIds
            }
          }
        : {
            websiteUrl: {
              not: null
            }
          })
    },
    select: {
      id: true,
      websiteUrl: true,
      institution: {
        select: {
          websiteUrl: true
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    },
    take: parsed.data.limit
  });
  const results: Array<{ departmentId: string; revisionId?: string; status: string; error?: string }> = [];

  for (const [index, department] of departments.entries()) {
    try {
      const sourceUrl = department.websiteUrl ?? department.institution.websiteUrl;
      if (!sourceUrl) {
        results.push({ departmentId: department.id, status: "skipped", error: "אין כתובת אתר למחלקה." });
      } else {
        const revision = await createDepartmentWebsiteRefreshSuggestion(prisma, {
          departmentId: department.id,
          sourceUrl
        });
        results.push({
          departmentId: department.id,
          revisionId: revision.id,
          status: revision.status
        });
      }
    } catch (error) {
      results.push({
        departmentId: department.id,
        status: "failed",
        error: error instanceof Error ? error.message : "ריענון נכשל."
      });
    }

    if (index < departments.length - 1) {
      await wait(parsed.data.delayMs);
    }
  }

  await createAuditLog({
    actorUserId: session.userId,
    action: "department_website_refresh.bulk_created",
    entityType: "DepartmentScrapeRevision",
    entityId: null,
    metadata: {
      requested: departments.length,
      results
    }
  });

  return NextResponse.json({
    message: `נוצרו/נבדקו ${results.length} דראפטים מריענון אתרים.`,
    results
  });
}
