import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { decideClinicalRotationIdentityVerification } from "@/lib/clinical-rotations-privacy";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "admin:clinical-rotations:verifications", { limit: 20, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfter);

  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    identityId?: string;
    action?: "approve" | "reject";
    reviewerNote?: string | null;
  } | null;

  if (!body?.identityId || !body.action) {
    return NextResponse.json({ error: "קלט לא תקין." }, { status: 400 });
  }

  const result = await decideClinicalRotationIdentityVerification({
    session,
    identityId: body.identityId,
    approved: body.action === "approve",
    reviewerNote: body.reviewerNote
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
