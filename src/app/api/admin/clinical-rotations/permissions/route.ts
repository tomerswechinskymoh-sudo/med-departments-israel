import { NextResponse } from "next/server";
import { ClinicalRotationAdminPermissionKey } from "@prisma/client";
import { requireClinicalRotationAdminApiSession } from "@/lib/clinical-rotations";
import { createClinicalRotationAuditLog } from "@/lib/clinical-rotations";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "admin:clinical-rotations:permissions", { limit: 20, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfter);

  const auth = await requireClinicalRotationAdminApiSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { email?: string; isActive?: boolean } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "יש להזין אימייל." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, roleKey: true } });
  if (!user || user.roleKey !== "ADMIN") {
    return NextResponse.json({ error: "נמצא רק חשבון אדמין יכול לקבל הרשאת מסמכי אימות." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const saved = await tx.clinicalRotationAdminPermission.upsert({
      where: { userId_key: { userId: user.id, key: ClinicalRotationAdminPermissionKey.CAN_REVIEW_IDENTITY_DOCUMENTS } },
      create: {
        userId: user.id,
        key: ClinicalRotationAdminPermissionKey.CAN_REVIEW_IDENTITY_DOCUMENTS,
        isActive: body?.isActive !== false,
        grantedByUserId: auth.session.userId,
        revokedAt: body?.isActive === false ? new Date() : null
      },
      update: {
        isActive: body?.isActive !== false,
        grantedByUserId: auth.session.userId,
        revokedAt: body?.isActive === false ? new Date() : null
      }
    });

    await createClinicalRotationAuditLog(tx, {
      actorUserId: auth.session.userId,
      action: "clinical_rotation.admin_permission_updated",
      entityType: "ClinicalRotationAdminPermission",
      entityId: saved.id,
      metadata: { key: saved.key, isActive: saved.isActive }
    });
  });

  return NextResponse.json({ ok: true });
}
