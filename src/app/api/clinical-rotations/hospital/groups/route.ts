import { NextResponse } from "next/server";
import { requireClinicalRotationHospitalApiAccess, updateClinicalRotationGroupStatus } from "@/lib/clinical-rotations";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "clinical-rotations:hospital-groups", { limit: 30, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfter);

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    groupId?: string;
    action?: "approve" | "decline" | "cancel" | "revokeInvite";
    notes?: string | null;
  } | null;

  if (!body?.groupId || !body.action) {
    return NextResponse.json({ error: "קלט לא תקין." }, { status: 400 });
  }

  const group = await prisma.clinicalRotationGroupApplication.findUnique({
    where: { id: body.groupId },
    select: { hospitalId: true }
  });
  if (!group) return NextResponse.json({ error: "הקבוצה לא נמצאה." }, { status: 404 });

  const auth = await requireClinicalRotationHospitalApiAccess(group.hospitalId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const result = await updateClinicalRotationGroupStatus({
    session: auth.session,
    groupId: body.groupId,
    action: body.action,
    notes: body.notes
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
