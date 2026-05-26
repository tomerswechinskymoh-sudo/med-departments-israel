import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import { refreshOpenAlexDepartmentMetrics } from "@/lib/server/openalex-research";

const refreshSchema = z.object({
  years: z.array(z.coerce.number().int().min(1990).max(2100)).max(20).optional()
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }
  const rateLimit = checkRateLimit(request, "admin:openalex-department-refresh", {
    limit: 20,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const { departmentId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "טווח שנים לא תקין." }, { status: 400 });
  }

  const result = await refreshOpenAlexDepartmentMetrics(prisma, {
    departmentId,
    years: parsed.data.years
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: "openalex.department_refreshed",
    entityType: "Department",
    entityId: departmentId,
    metadata: {
      years: parsed.data.years ?? null,
      needsMapping: result.needsMapping
    }
  });

  return NextResponse.json({
    message: result.needsMapping
      ? "המחלקה סומנה כחסרת מיפוי OpenAlex."
      : "מדדי OpenAlex עודכנו ונשמרו כפעילות מחקרית משוערת.",
    result
  });
}
