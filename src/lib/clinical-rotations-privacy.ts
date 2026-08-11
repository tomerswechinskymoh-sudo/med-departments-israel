import crypto from "node:crypto";
import ExcelJS from "exceljs";
import {
  ClinicalRotationAdminPermissionKey,
  ClinicalRotationEligibilityImportStatus,
  ClinicalRotationIdentityVerificationStatus,
  ClinicalRotationSourceDeletionStatus,
  Prisma,
  UploadedFileCategory
} from "@prisma/client";
import type { AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertUserVerificationProofFile, storeUploadedFile } from "@/lib/uploads";

export const CLINICAL_ROTATIONS_ID_KEY_VERSION = 1;
const DEV_ID_HMAC_SECRET = "dev-only-clinical-rotations-id-hmac-secret-change-before-production";

export type ClinicalRotationIdentityHash = {
  studentAnonymousKey: string;
  keyVersion: number;
};

async function writeClinicalRotationAuditLog(
  tx: Prisma.TransactionClient | typeof prisma,
  input: {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }
) {
  await tx.clinicalRotationAuditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata
    }
  });
}

export function normalizeIsraeliId(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 0 || digits.length > 9) {
    return null;
  }
  return digits.padStart(9, "0");
}

export function isValidIsraeliId(input: string) {
  const normalized = normalizeIsraeliId(input);
  if (!normalized) {
    return false;
  }

  const checksum = normalized
    .split("")
    .map((digit, index) => {
      const value = Number(digit) * ((index % 2) + 1);
      return value > 9 ? value - 9 : value;
    })
    .reduce((sum, value) => sum + value, 0);

  return checksum % 10 === 0;
}

function getClinicalRotationsIdHmacSecret() {
  const secret = process.env.CLINICAL_ROTATIONS_ID_HMAC_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
    throw new Error("CLINICAL_ROTATIONS_ID_HMAC_SECRET is required.");
  }

  return DEV_ID_HMAC_SECRET;
}

export function createClinicalRotationStudentAnonymousKey(rawIsraeliId: string): ClinicalRotationIdentityHash {
  const normalized = normalizeIsraeliId(rawIsraeliId);
  if (!normalized || !isValidIsraeliId(normalized)) {
    throw new Error("מספר תעודת הזהות אינו תקין.");
  }

  const studentAnonymousKey = crypto
    .createHmac("sha256", getClinicalRotationsIdHmacSecret())
    .update(normalized)
    .digest("hex");

  return {
    studentAnonymousKey,
    keyVersion: CLINICAL_ROTATIONS_ID_KEY_VERSION
  };
}

export function createClinicalRotationSyntheticDemoAnonymousKey(label: string): ClinicalRotationIdentityHash {
  if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
    throw new Error("Synthetic Clinical Rotations demo keys are allowed only in development or test.");
  }

  const normalizedLabel = label.trim().toLowerCase();
  if (!normalizedLabel) {
    throw new Error("Synthetic demo key label is required.");
  }

  return {
    studentAnonymousKey: crypto
      .createHmac("sha256", getClinicalRotationsIdHmacSecret())
      .update(`clinical-rotations-demo:${normalizedLabel}`)
      .digest("hex"),
    keyVersion: CLINICAL_ROTATIONS_ID_KEY_VERSION
  };
}

export function createClinicalRotationInviteToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashClinicalRotationInviteToken(inviteToken: string) {
  return crypto.createHash("sha256").update(inviteToken).digest("hex");
}

export async function hasClinicalRotationIdentityReviewPermission(userId: string) {
  const permission = await prisma.clinicalRotationAdminPermission.findUnique({
    where: {
      userId_key: {
        userId,
        key: ClinicalRotationAdminPermissionKey.CAN_REVIEW_IDENTITY_DOCUMENTS
      }
    },
    select: { isActive: true }
  });

  return permission?.isActive === true;
}

export async function requireClinicalRotationIdentityReviewPermission(session: AppSession) {
  if (session.role !== "admin") {
    return { ok: false as const, status: 403, error: "גישה נדחתה." };
  }

  if (!(await hasClinicalRotationIdentityReviewPermission(session.userId))) {
    return { ok: false as const, status: 403, error: "נדרשת הרשאת אימות מסמכי סבבים קליניים." };
  }

  return { ok: true as const };
}

export async function deleteUploadedFileAndVerify(fileId: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  await db.uploadedFile.delete({ where: { id: fileId } });
  const stillExists = await db.uploadedFile.findUnique({ where: { id: fileId }, select: { id: true } });
  if (stillExists) {
    throw new Error("מחיקת הקובץ מהאחסון נכשלה.");
  }
}

export async function submitClinicalRotationIdentityVerification(input: {
  session: AppSession;
  rawIsraeliId: string;
  document: File;
}) {
  const identityHash = createClinicalRotationStudentAnonymousKey(input.rawIsraeliId);
  assertUserVerificationProofFile(input.document);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.clinicalRotationStudentIdentity.findUnique({
      where: { userId: input.session.userId },
      select: { pendingDocumentFileId: true, status: true }
    });

    if (existing?.pendingDocumentFileId) {
      await deleteUploadedFileAndVerify(existing.pendingDocumentFileId, tx);
    }

    const uploaded = await storeUploadedFile(tx, {
      file: input.document,
      category: UploadedFileCategory.CLINICAL_ROTATION_IDENTITY_DOCUMENT,
      uploadedByUserId: input.session.userId,
      isPublic: false
    });

    const identity = await tx.clinicalRotationStudentIdentity.upsert({
      where: { userId: input.session.userId },
      create: {
        userId: input.session.userId,
        studentAnonymousKey: identityHash.studentAnonymousKey,
        keyVersion: identityHash.keyVersion,
        status: ClinicalRotationIdentityVerificationStatus.PENDING_REVIEW,
        pendingDocumentFileId: uploaded.id,
        submittedAt: new Date()
      },
      update: {
        studentAnonymousKey: identityHash.studentAnonymousKey,
        keyVersion: identityHash.keyVersion,
        status: ClinicalRotationIdentityVerificationStatus.PENDING_REVIEW,
        pendingDocumentFileId: uploaded.id,
        submittedAt: new Date(),
        decidedAt: null,
        verifierUserId: null,
        documentDeletedAt: null,
        reviewerNote: null
      }
    });

    await writeClinicalRotationAuditLog(tx, {
      actorUserId: input.session.userId,
      action: "clinical_rotation.identity_submitted",
      entityType: "ClinicalRotationStudentIdentity",
      entityId: identity.id,
      metadata: { keyVersion: identityHash.keyVersion }
    });

    return identity;
  });
}

export async function decideClinicalRotationIdentityVerification(input: {
  session: AppSession;
  identityId: string;
  approved: boolean;
  reviewerNote?: string | null;
}) {
  const permission = await requireClinicalRotationIdentityReviewPermission(input.session);
  if (!permission.ok) {
    return permission;
  }

  const identity = await prisma.clinicalRotationStudentIdentity.findUnique({
    where: { id: input.identityId },
    select: { id: true, pendingDocumentFileId: true, status: true }
  });

  if (!identity) {
    return { ok: false as const, status: 404, error: "בקשת האימות לא נמצאה." };
  }

  if (!identity.pendingDocumentFileId) {
    return { ok: false as const, status: 409, error: "אין מסמך ממתין למחיקה." };
  }

  await deleteUploadedFileAndVerify(identity.pendingDocumentFileId);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.clinicalRotationStudentIdentity.update({
      where: { id: input.identityId },
      data: {
        status: input.approved
          ? ClinicalRotationIdentityVerificationStatus.APPROVED
          : ClinicalRotationIdentityVerificationStatus.REJECTED,
        pendingDocumentFileId: null,
        decidedAt: now,
        verifierUserId: input.session.userId,
        documentDeletedAt: now,
        reviewerNote: input.reviewerNote?.trim() || null
      }
    });

    await writeClinicalRotationAuditLog(tx, {
      actorUserId: input.session.userId,
      action: input.approved
        ? "clinical_rotation.identity_approved"
        : "clinical_rotation.identity_rejected",
      entityType: "ClinicalRotationStudentIdentity",
      entityId: input.identityId,
      metadata: { documentDeleted: true }
    });
  });

  return { ok: true as const };
}

export async function cleanupExpiredClinicalRotationIdentityDocuments(now = new Date()) {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const expired = await prisma.clinicalRotationStudentIdentity.findMany({
    where: {
      status: ClinicalRotationIdentityVerificationStatus.PENDING_REVIEW,
      submittedAt: { lt: cutoff },
      pendingDocumentFileId: { not: null }
    },
    select: { id: true, pendingDocumentFileId: true }
  });

  for (const identity of expired) {
    if (!identity.pendingDocumentFileId) continue;
    await deleteUploadedFileAndVerify(identity.pendingDocumentFileId);
    await prisma.clinicalRotationStudentIdentity.update({
      where: { id: identity.id },
      data: {
        status: ClinicalRotationIdentityVerificationStatus.EXPIRED,
        pendingDocumentFileId: null,
        documentDeletedAt: new Date()
      }
    });
  }

  return { deleted: expired.length };
}

function clinicalRotationSafeErrorCategory(error: unknown) {
  if (!(error instanceof Error)) {
    return "UNKNOWN";
  }
  if (error.message.includes("מחיקת הקובץ")) {
    return "SOURCE_DELETE_VERIFY_FAILED";
  }
  return "SOURCE_DELETE_FAILED";
}

export async function retryClinicalRotationEligibilitySourceDeletion(now = new Date()) {
  const imports = await prisma.clinicalRotationEligibilityImport.findMany({
    where: {
      sourceDeletionStatus: ClinicalRotationSourceDeletionStatus.RETRY_NEEDED,
      sourceFileId: { not: null },
      OR: [{ sourceDeletionRetryAt: null }, { sourceDeletionRetryAt: { lte: now } }]
    },
    select: { id: true, sourceFileId: true }
  });

  let deleted = 0;
  let failed = 0;

  for (const entry of imports) {
    if (!entry.sourceFileId) continue;
    try {
      await deleteUploadedFileAndVerify(entry.sourceFileId);
      await prisma.clinicalRotationEligibilityImport.update({
        where: { id: entry.id },
        data: {
          sourceFileId: null,
          sourceDeletedAt: new Date(),
          sourceDeletionStatus: ClinicalRotationSourceDeletionStatus.DELETED,
          sourceDeletionErrorCategory: null,
          sourceDeletionRetryAt: null
        }
      });
      deleted += 1;
    } catch (error) {
      failed += 1;
      await prisma.clinicalRotationEligibilityImport.update({
        where: { id: entry.id },
        data: {
          sourceDeletionStatus: ClinicalRotationSourceDeletionStatus.RETRY_NEEDED,
          sourceDeletionErrorCategory: clinicalRotationSafeErrorCategory(error),
          sourceDeletionRetryAt: new Date(now.getTime() + 60 * 60 * 1000)
        }
      });
    }
  }

  return { deleted, failed };
}

export async function runClinicalRotationRetentionCleanup(now = new Date()) {
  const identityDocuments = await cleanupExpiredClinicalRotationIdentityDocuments(now);
  const eligibilitySources = await retryClinicalRotationEligibilitySourceDeletion(now);
  return { identityDocuments, eligibilitySources };
}

function parseCsvRows(text: string) {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

async function readEligibilityIds(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as any);
    const ids: string[] = [];
    workbook.eachSheet((worksheet) => {
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          const value = String(cell.value ?? "").trim();
          if (value) ids.push(value);
        });
      });
    });
    return ids;
  }

  return parseCsvRows(await file.text());
}

export async function importClinicalRotationEligibilityList(input: {
  session: AppSession;
  file: File;
  sourceLabel: string;
  activate: boolean;
}) {
  if (input.session.role !== "admin") {
    return { ok: false as const, status: 403, error: "גישה נדחתה." };
  }

  const lowerName = input.file.name.toLowerCase();
  if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".xlsx")) {
    return { ok: false as const, status: 400, error: "אפשר להעלות CSV או XLSX בלבד." };
  }

  const sourceUpload = await storeUploadedFile(prisma, {
    file: input.file,
    category: UploadedFileCategory.CLINICAL_ROTATION_ELIGIBILITY_IMPORT,
    uploadedByUserId: input.session.userId,
    isPublic: false
  });

  try {
    const rawIds = await readEligibilityIds(input.file);
    const entries = new Map<string, ClinicalRotationIdentityHash>();
    let rejectedRowCount = 0;

    for (const rawId of rawIds) {
      try {
        const hashed = createClinicalRotationStudentAnonymousKey(rawId);
        entries.set(`${hashed.keyVersion}:${hashed.studentAnonymousKey}`, hashed);
      } catch {
        rejectedRowCount += 1;
      }
    }

    const accepted = Array.from(entries.values());
    const saved = await prisma.$transaction(async (tx) => {
      const created = await tx.clinicalRotationEligibilityImport.create({
        data: {
          sourceLabel: input.sourceLabel.trim() || "ייבוא זכאות",
          status: ClinicalRotationEligibilityImportStatus.INACTIVE,
          keyVersion: CLINICAL_ROTATIONS_ID_KEY_VERSION,
          rowCount: rawIds.length,
          acceptedRowCount: accepted.length,
          rejectedRowCount,
          validationSummary: {
            rows: rawIds.length,
            accepted: accepted.length,
            rejected: rejectedRowCount,
            duplicatesRemoved: rawIds.length - accepted.length - rejectedRowCount
          },
          sourceFileId: sourceUpload.id,
          sourceDeletionStatus: ClinicalRotationSourceDeletionStatus.PENDING_DELETION,
          activatedAt: null,
          createdByUserId: input.session.userId,
          entries: {
            createMany: {
              data: accepted.map((entry) => ({
                studentAnonymousKey: entry.studentAnonymousKey,
                keyVersion: entry.keyVersion
              }))
            }
          }
        }
      });

      return created;
    });

    try {
      await deleteUploadedFileAndVerify(sourceUpload.id);
    } catch (error) {
      await prisma.clinicalRotationEligibilityImport.update({
        where: { id: saved.id },
        data: {
          status: ClinicalRotationEligibilityImportStatus.FAILED,
          sourceDeletionStatus: ClinicalRotationSourceDeletionStatus.RETRY_NEEDED,
          sourceDeletionErrorCategory: clinicalRotationSafeErrorCategory(error),
          sourceDeletionRetryAt: new Date(Date.now() + 60 * 60 * 1000),
          validationSummary: {
            rows: rawIds.length,
            accepted: accepted.length,
            rejected: rejectedRowCount,
            duplicatesRemoved: rawIds.length - accepted.length - rejectedRowCount,
            sourceDeletion: {
              status: "RETRY_NEEDED",
              errorCategory: clinicalRotationSafeErrorCategory(error)
            }
          }
        }
      });
      return {
        ok: false as const,
        status: 500,
        error: "ייבוא הזכאות נשמר ככשל זמני כי מחיקת קובץ המקור לא אומתה. יש להריץ ניקוי חוזר לפני הפעלה."
      };
    }

    const activatedAt = new Date();
    const activated = await prisma.$transaction(async (tx) => {
      if (input.activate) {
        await tx.clinicalRotationEligibilityImport.updateMany({
          where: { status: ClinicalRotationEligibilityImportStatus.ACTIVE },
          data: {
            status: ClinicalRotationEligibilityImportStatus.INACTIVE,
            deactivatedAt: activatedAt
          }
        });
      }

      const updated = await tx.clinicalRotationEligibilityImport.update({
        where: { id: saved.id },
        data: {
          status: input.activate
            ? ClinicalRotationEligibilityImportStatus.ACTIVE
            : ClinicalRotationEligibilityImportStatus.INACTIVE,
          sourceFileId: null,
          sourceDeletedAt: activatedAt,
          sourceDeletionStatus: ClinicalRotationSourceDeletionStatus.DELETED,
          sourceDeletionErrorCategory: null,
          sourceDeletionRetryAt: null,
          activatedAt: input.activate ? activatedAt : null
        }
      });

      await writeClinicalRotationAuditLog(tx, {
        actorUserId: input.session.userId,
        action: input.activate
          ? "clinical_rotation.eligibility_import_activated"
          : "clinical_rotation.eligibility_import_created",
        entityType: "ClinicalRotationEligibilityImport",
        entityId: saved.id,
        metadata: {
          rowCount: rawIds.length,
          acceptedRowCount: accepted.length,
          rejectedRowCount,
          keyVersion: CLINICAL_ROTATIONS_ID_KEY_VERSION,
          sourceDeleted: true
        }
      });

      return updated;
    });

    return { ok: true as const, import: activated };
  } catch (error) {
    await deleteUploadedFileAndVerify(sourceUpload.id).catch(() => undefined);
    throw error;
  }
}

export async function getClinicalRotationEligibilityState(studentAnonymousKey: string, keyVersion: number) {
  const activeImport = await prisma.clinicalRotationEligibilityImport.findFirst({
    where: { status: ClinicalRotationEligibilityImportStatus.ACTIVE },
    select: { id: true, activatedAt: true },
    orderBy: [{ activatedAt: "desc" }, { createdAt: "desc" }]
  });

  if (!activeImport) {
    return {
      ok: false as const,
      code: "NO_ACTIVE_IMPORT" as const,
      message: "הרשמה לסבבים תיפתח לאחר עדכון רשימת הזכאות של משרד הבריאות."
    };
  }

  const match = await prisma.clinicalRotationEligibilityEntry.findUnique({
    where: {
      importId_keyVersion_studentAnonymousKey: {
        importId: activeImport.id,
        keyVersion,
        studentAnonymousKey
      }
    },
    select: { id: true }
  });

  if (!match) {
    return {
      ok: false as const,
      code: "NOT_ELIGIBLE" as const,
      message: "לא נמצאה התאמה ברשימת הזכאות הפעילה לסבבים קליניים."
    };
  }

  return {
    ok: true as const,
    importId: activeImport.id,
    keyVersion
  };
}

export const clinicalRotationPrivacyOperationsNote = [
  "HMAC identifiers are pseudonymous internal keys, not anonymous data.",
  "Secret rotation requires keeping legacy verification capability or re-importing/re-verifying records for prior key versions.",
  "Raw Israeli IDs must never be logged, persisted, exported, or sent to the browser."
] as const;
