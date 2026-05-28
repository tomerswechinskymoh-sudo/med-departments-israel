import { NextResponse } from "next/server";
import { RoleKey, UploadedFileCategory, VerificationStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import { signupSchema } from "@/lib/validation";
import { assertUserVerificationProofFile, readOptionalFormFile, storeUploadedFile } from "@/lib/uploads";
import {
  createTokenExpiry,
  createVerificationToken,
  getUserEmailVerificationUrl,
  isDevelopmentEnvironment,
  sendUserVerificationEmail
} from "@/lib/verification";

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const rateLimit = checkRateLimit(request, "auth:signup", {
    limit: 5,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "קלט לא תקין." }, { status: 400 });
  }

  const proofFile = readOptionalFormFile(formData.get("verificationProof"));
  const body = {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    roleStatus: formData.get("roleStatus"),
    proofConfirmed: formData.get("proofConfirmed") === "true",
    marketingConsent: formData.get("marketingConsent") === "true",
    privacyVerificationConsent: formData.get("privacyVerificationConsent") === "true"
  };
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }
  if (!proofFile) {
    return NextResponse.json({ error: "יש להעלות אישור לצורך אימות." }, { status: 400 });
  }

  try {
    assertUserVerificationProofFile(proofFile);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "קובץ האימות אינו תקין." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: {
      email
    }
  });

  const isRejectedReregistration =
    existingUser?.verificationStatus === VerificationStatus.REJECTED;

  if (existingUser && !isRejectedReregistration) {
    return NextResponse.json({ error: "כבר קיים חשבון עם האימייל הזה." }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const roleKey =
    parsed.data.roleStatus === "resident" || parsed.data.roleStatus === "specialist"
      ? RoleKey.RESIDENT
      : RoleKey.STUDENT;
  const verificationToken = createVerificationToken();
  const isDevelopment = isDevelopmentEnvironment();
  const requestOrigin = new URL(request.url).origin;
  const verificationUrl = getUserEmailVerificationUrl(verificationToken, requestOrigin);
  const user = await prisma.$transaction(async (tx) => {
    const userRecord = existingUser
      ? await tx.user.update({
          where: {
            id: existingUser.id
          },
          data: {
            fullName: parsed.data.fullName,
            phone: parsed.data.phone,
            passwordHash,
            roleKey,
            roleStatus: parsed.data.roleStatus,
            emailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpiresAt: createTokenExpiry(24),
            verificationStatus: VerificationStatus.PENDING_EMAIL_VERIFICATION,
            verificationSubmittedAt: new Date(),
            verificationRejectionReason: null,
            verifiedByAdminId: null,
            verifiedAt: null,
            marketingConsent: parsed.data.marketingConsent,
            marketingConsentAt: parsed.data.marketingConsent ? new Date() : null
          }
        })
      : await tx.user.create({
          data: {
            fullName: parsed.data.fullName,
            email,
            phone: parsed.data.phone,
            passwordHash,
            roleKey,
            roleStatus: parsed.data.roleStatus,
            emailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpiresAt: createTokenExpiry(24),
            verificationStatus: VerificationStatus.PENDING_EMAIL_VERIFICATION,
            verificationSubmittedAt: new Date(),
            marketingConsent: parsed.data.marketingConsent,
            marketingConsentAt: parsed.data.marketingConsent ? new Date() : null
          }
        });

    const proof = await storeUploadedFile(tx, {
      file: proofFile,
      category: UploadedFileCategory.USER_VERIFICATION_PROOF,
      uploadedByUserId: userRecord.id,
      isPublic: false
    });

    return tx.user.update({
      where: {
        id: userRecord.id
      },
      data: {
        verificationProofUrl: `/api/files/${proof.id}`
      }
    });
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "auth.registration",
    entityType: "User",
    entityId: user.id,
    metadata: {
      roleStatus: parsed.data.roleStatus,
      marketingConsent: parsed.data.marketingConsent,
      rejectedReregistration: isRejectedReregistration
    }
  });

  const emailDelivery = await sendUserVerificationEmail({
    to: user.email,
    fullName: user.fullName,
    token: verificationToken,
    baseUrl: requestOrigin
  }).catch((error) => {
    console.error("[signup] verification email failed", error);
    return { delivered: false, skipped: false, error: true };
  });

  if (isDevelopment) {
    console.info(`[signup] Development verification link for ${user.email}: ${verificationUrl}`);
  } else if (!emailDelivery.delivered) {
    console.error("[signup] verification email was not delivered", {
      userId: user.id,
      email: user.email,
      skipped: emailDelivery.skipped
    });
    return NextResponse.json(
      {
        error:
          "החשבון נוצר, אבל לא הצלחנו לשלוח מייל אימות. נסו לבקש קישור אימות חדש או פנו לתמיכה."
      },
      { status: 502 }
    );
  }

  await createAuditLog({
    actorUserId: user.id,
    action: "verification.email_sent",
    entityType: "User",
    entityId: user.id,
    metadata: {
      delivered: emailDelivery.delivered,
      skipped: emailDelivery.skipped
    }
  });

  return NextResponse.json({
    ok: true,
    message:
      isDevelopment
        ? "ההרשמה התקבלה. בסביבת פיתוח ניתן לאמת את המייל דרך הקישור שמופיע כאן."
        : "ההרשמה התקבלה. נשלח מייל לאימות החשבון. לאחר אימות כתובת המייל ואישור הסטטוס המקצועי ניתן יהיה לצפות בכל פרטי המחלקות ולהשתמש בכל אפשרויות האתר.",
    verificationUrl: isDevelopment ? verificationUrl : undefined
  });
}
