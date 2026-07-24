import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { RoleKey, VerificationStatus } from "@prisma/client";
import {
  createClinicalRotationAuditLog,
  requireClinicalRotationAdminApiSession
} from "@/lib/clinical-rotations";
import { clinicalRotationAdminAccessSchema } from "@/lib/clinical-rotations-validation";
import { createPasswordResetExpiry, createPasswordResetToken, sendPasswordResetEmail } from "@/lib/password-reset";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { hasValidSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const auth = await requireClinicalRotationAdminApiSession();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = clinicalRotationAdminAccessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  if (parsed.data.action === "activate" || parsed.data.action === "deactivate") {
    if (!parsed.data.accessId) {
      return NextResponse.json({ error: "חסר מזהה הרשאה." }, { status: 400 });
    }

    const active = parsed.data.action === "activate";
    const access = await prisma.$transaction(async (tx) => {
      const updated = await tx.clinicalRotationHospitalAccess.update({
        where: { id: parsed.data.accessId! },
        data: {
          isActive: active,
          activatedAt: active ? new Date() : undefined,
          deactivatedAt: active ? null : new Date()
        }
      });
      await createClinicalRotationAuditLog(tx, {
        actorUserId: auth.session.userId,
        action: active ? "clinical_rotation.access_activated" : "clinical_rotation.access_deactivated",
        entityType: "ClinicalRotationHospitalAccess",
        entityId: updated.id,
        hospitalId: updated.hospitalId,
        metadata: { userId: updated.userId, isActive: updated.isActive }
      });
      return updated;
    });

    return NextResponse.json({ ok: true, accessId: access.id });
  }

  if (parsed.data.action === "reset") {
    if (!parsed.data.accessId) {
      return NextResponse.json({ error: "חסר מזהה הרשאה." }, { status: 400 });
    }

    const access = await prisma.clinicalRotationHospitalAccess.findUnique({
      where: { id: parsed.data.accessId },
      include: { user: true, hospital: { select: { name: true } } }
    });

    if (!access) {
      return NextResponse.json({ error: "הרשאת בית החולים לא נמצאה." }, { status: 404 });
    }

    const token = createPasswordResetToken();
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: access.userId },
        data: {
          verificationToken: token,
          tokenExpiry: createPasswordResetExpiry()
        }
      });
      await tx.clinicalRotationHospitalAccess.update({
        where: { id: access.id },
        data: { lastResetAt: new Date() }
      });
      await createClinicalRotationAuditLog(tx, {
        actorUserId: auth.session.userId,
        action: "clinical_rotation.access_reset",
        entityType: "ClinicalRotationHospitalAccess",
        entityId: access.id,
        hospitalId: access.hospitalId,
        metadata: { userId: access.userId }
      });
    });

    const emailResult = await sendPasswordResetEmail({
      to: access.user.email,
      fullName: access.user.fullName,
      token
    });

    return NextResponse.json({ ok: true, delivered: emailResult.delivered, skipped: emailResult.skipped });
  }

  if (!parsed.data.email || !parsed.data.fullName || !parsed.data.hospitalId) {
    return NextResponse.json({ error: "יש להזין שם, אימייל ובית חולים." }, { status: 400 });
  }

  const hospital = await prisma.institution.findUnique({
    where: { id: parsed.data.hospitalId },
    select: { id: true, name: true }
  });

  if (!hospital) {
    return NextResponse.json({ error: "בית החולים לא נמצא." }, { status: 404 });
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const token = createPasswordResetToken();
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: normalizedEmail } });
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            fullName: parsed.data.fullName!,
            roleKey: existing.roleKey === RoleKey.ADMIN ? RoleKey.ADMIN : RoleKey.REPRESENTATIVE,
            emailVerified: true,
            emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
            verificationStatus: VerificationStatus.VERIFIED,
            verificationToken: token,
            tokenExpiry: createPasswordResetExpiry()
          }
        })
      : await tx.user.create({
          data: {
            email: normalizedEmail,
            fullName: parsed.data.fullName!,
            passwordHash: await hashPassword(`Clinical-${randomUUID()}-Temp1`),
            roleKey: RoleKey.REPRESENTATIVE,
            roleStatus: "clinical_rotation_hospital_representative",
            emailVerified: true,
            emailVerifiedAt: new Date(),
            verificationStatus: VerificationStatus.VERIFIED,
            verificationToken: token,
            tokenExpiry: createPasswordResetExpiry()
          }
        });
    const access = await tx.clinicalRotationHospitalAccess.upsert({
      where: {
        userId_hospitalId: {
          userId: user.id,
          hospitalId: hospital.id
        }
      },
      create: {
        userId: user.id,
        hospitalId: hospital.id,
        isActive: parsed.data.isActive,
        activatedAt: parsed.data.isActive ? new Date() : null,
        createdByAdminId: auth.session.userId
      },
      update: {
        isActive: parsed.data.isActive,
        activatedAt: parsed.data.isActive ? new Date() : null,
        deactivatedAt: parsed.data.isActive ? null : new Date(),
        createdByAdminId: auth.session.userId
      }
    });
    await createClinicalRotationAuditLog(tx, {
      actorUserId: auth.session.userId,
      action: "clinical_rotation.access_invited_or_updated",
      entityType: "ClinicalRotationHospitalAccess",
      entityId: access.id,
      hospitalId: hospital.id,
      metadata: { userId: user.id, email: normalizedEmail, isActive: access.isActive }
    });
    return { user, access };
  });

  const emailResult = await sendPasswordResetEmail({
    to: result.user.email,
    fullName: result.user.fullName,
    token
  });

  return NextResponse.json({
    ok: true,
    userId: result.user.id,
    accessId: result.access.id,
    delivered: emailResult.delivered,
    skipped: emailResult.skipped
  });
}
