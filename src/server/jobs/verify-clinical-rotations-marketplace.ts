import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  createClinicalRotationSyntheticDemoAnonymousKey,
  createClinicalRotationStudentAnonymousKey,
  hashClinicalRotationInviteToken,
  isValidIsraeliId,
  normalizeIsraeliId
} from "@/lib/clinical-rotations-privacy";

type Check = { name: string; ok: boolean };

const root = process.cwd();
const checks: Check[] = [];

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath: string) {
  return fs.existsSync(path.join(root, relativePath));
}

function add(name: string, ok: boolean) {
  checks.push({ name, ok });
}

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/202608090001_clinical_rotations_marketplace_redesign/migration.sql");
const auditFixMigration = read("prisma/migrations/202608090002_clinical_rotations_audit_fixes/migration.sql");
const privacy = read("src/lib/clinical-rotations-privacy.ts");
const clinical = read("src/lib/clinical-rotations.ts");
const validation = read("src/lib/clinical-rotations-validation.ts");
const forms = read("src/components/clinical-rotations/clinical-rotation-forms.tsx");
const publicPage = read("src/app/clinical-rotations/page.tsx");
const verificationPage = read("src/app/admin/clinical-rotations/verifications/page.tsx");
const cleanupRoute = read("src/app/api/internal/clinical-rotations/cleanup/route.ts");
const demoSeed = read("src/lib/server/clinical-rotations-demo-seed.ts");
const header = read("src/components/layout/site-header.tsx");
const footer = read("src/components/layout/site-footer.tsx");
const staticPages = read("src/lib/static-pages.ts");

const normalized = normalizeIsraeliId("123456782");
add("israeli id normalizes to 9 digits", normalized === "123456782");
add("israeli id checksum validates", isValidIsraeliId("123456782"));
add("israeli id checksum rejects invalid id", !isValidIsraeliId("123456789"));

const originalNodeEnv = process.env.NODE_ENV;
const originalHmacSecret = process.env.CLINICAL_ROTATIONS_ID_HMAC_SECRET;
delete process.env.CLINICAL_ROTATIONS_ID_HMAC_SECRET;
const mutableEnv = process.env as Record<string, string | undefined>;
mutableEnv.NODE_ENV = "preview";
let missingSecretFailedClosed = false;
try {
  createClinicalRotationStudentAnonymousKey("123456782");
} catch {
  missingSecretFailedClosed = true;
}
add("HMAC helper fails closed outside development/test without secret", missingSecretFailedClosed);
mutableEnv.NODE_ENV = "development";
const devSyntheticKey = createClinicalRotationSyntheticDemoAnonymousKey("verify-user");
add("synthetic demo key works only through HMAC helper", /^[a-f0-9]{64}$/.test(devSyntheticKey.studentAnonymousKey));
mutableEnv.NODE_ENV = originalNodeEnv;
if (originalHmacSecret === undefined) {
  delete process.env.CLINICAL_ROTATIONS_ID_HMAC_SECRET;
} else {
  process.env.CLINICAL_ROTATIONS_ID_HMAC_SECRET = originalHmacSecret;
}
process.env.CLINICAL_ROTATIONS_ID_HMAC_SECRET = "verify-secret-with-at-least-32-characters";
const hmacA = createClinicalRotationStudentAnonymousKey("123456782");
const hmacB = createClinicalRotationStudentAnonymousKey("123456782");
add("stable HMAC lookup works", hmacA.studentAnonymousKey === hmacB.studentAnonymousKey && hmacA.keyVersion === 1);
add("HMAC is keyed SHA-256 hex", /^[a-f0-9]{64}$/.test(hmacA.studentAnonymousKey));
add("invite token hash is stored form only", hashClinicalRotationInviteToken("token") === crypto.createHash("sha256").update("token").digest("hex"));

add("schema has student identity model", schema.includes("model ClinicalRotationStudentIdentity"));
add("schema has eligibility import models", schema.includes("model ClinicalRotationEligibilityImport") && schema.includes("model ClinicalRotationEligibilityEntry"));
add("schema has group models", schema.includes("model ClinicalRotationGroupApplication") && schema.includes("model ClinicalRotationGroupMember"));
add("schema has cancellation model", schema.includes("model ClinicalRotationCancellation"));
add("schema has payment delivery failure state", schema.includes("LINK_DELIVERY_FAILED"));
add("schema has notification outbox", schema.includes("model ClinicalRotationNotificationOutbox"));
add("schema tracks eligibility source deletion state", schema.includes("sourceDeletionStatus") && schema.includes("sourceDeletionErrorCategory"));
add("schema stores key version", schema.includes("keyVersion") && schema.includes("@map(\"key_version\")"));
add("schema has explicit verifier permission", schema.includes("CAN_REVIEW_IDENTITY_DOCUMENTS"));
add("migration is additive", migration.includes("ALTER TABLE \"ClinicalRotationOffering\"") && migration.includes("CREATE TABLE IF NOT EXISTS \"ClinicalRotationStudentIdentity\""));
add("audit fix migration is additive", auditFixMigration.includes("ALTER TYPE \"ClinicalRotationPaymentStatus\" ADD VALUE") && auditFixMigration.includes("CREATE TABLE IF NOT EXISTS \"ClinicalRotationNotificationOutbox\""));

add("privacy helper uses HMAC not plain hash for ID", privacy.includes("createHmac(\"sha256\"") && !privacy.includes("createHash(\"sha256\").update(normalized"));
add("privacy helper hard-fails outside development/test without secret", privacy.includes("NODE_ENV !== \"development\" && process.env.NODE_ENV !== \"test\"") && privacy.includes("CLINICAL_ROTATIONS_ID_HMAC_SECRET is required"));
add("privacy helper deletes uploaded file and verifies absence", privacy.includes("deleteUploadedFileAndVerify") && privacy.includes("findUnique({ where: { id: fileId }"));
add("cleanup job exists", exists("src/server/jobs/cleanup-clinical-rotation-identity-documents.ts"));
add("scheduled cleanup handler is secret-protected", cleanupRoute.includes("CLINICAL_ROTATIONS_CLEANUP_SECRET") && cleanupRoute.includes("timingSafeEqual") && cleanupRoute.includes("runClinicalRotationRetentionCleanup"));
add("ops doc covers pseudonymous limitation and key rotation", read("docs/clinical-rotations-marketplace-ops.md").includes("pseudonymous") && read("docs/clinical-rotations-marketplace-ops.md").includes("Key Rotation"));

add("application flow blocks missing eligibility import", clinical.includes("NO_ACTIVE_IMPORT") || privacy.includes("NO_ACTIVE_IMPORT"));
add("application flow stores student key but not raw id", clinical.includes("studentAnonymousKey") && !clinical.includes("rawIsraeliId"));
add("capacity lock uses FOR UPDATE", clinical.includes("FOR UPDATE"));
add("self approval denied", clinical.includes("אי אפשר לאשר בקשה של עצמך"));
add("preview offerings blocked server-side", clinical.includes("isPreviewOnly") && clinical.includes("applicationBlockedReason"));
add("group invite hashes token", clinical.includes("hashClinicalRotationInviteToken"));
add("group create checks overlapping conflicts", clinical.includes("const creatorConflict = await findClinicalRotationDateConflict"));
add("group join checks overlapping conflicts", clinical.includes("const joinerConflict = await findClinicalRotationDateConflict"));
add("group approval rechecks member conflicts", clinical.includes("excludeApplicationIds: groupApplicationIds"));
add("payment links use outbox before LINK_SENT", clinical.includes("enqueueClinicalRotationPaymentLinkEmail") && clinical.includes("ClinicalRotationNotificationOutboxStatus.SENT") && clinical.includes("emailResult.delivered"));
add("group approval starts external payment as pending", clinical.includes(": ClinicalRotationPaymentStatus.LINK_PENDING") && !clinical.includes("linkSentAt: group.offering.paymentMethod === ClinicalRotationPaymentMethod.EXTERNAL_PAYMENT_LINK ? new Date() : null"));
add("payment retry action is wired", clinical.includes("retryClinicalRotationPaymentLink") && validation.includes("retryPaymentLink"));
add("cancellation workflow writes audit", clinical.includes("clinical_rotation.cancellation_requested") && clinical.includes("clinical_rotation.cancellation_approved"));
add("verification page does not query document metadata for normal admins", verificationPage.indexOf("if (!canReviewDocuments)") < verificationPage.indexOf("findMany") && verificationPage.includes("pendingCount"));
add("eligibility import sets sourceDeletedAt after verified deletion", privacy.indexOf("await deleteUploadedFileAndVerify(sourceUpload.id)") < privacy.indexOf("sourceDeletedAt: activatedAt") && privacy.includes("RETRY_NEEDED"));
add("demo seed has hard local guards", demoSeed.includes("ALLOW_CLINICAL_ROTATIONS_DEMO_SEED") && demoSeed.includes("NODE_ENV !== \"development\"") && demoSeed.includes("Refusing to seed Clinical Rotations demo data into a Neon database"));
add("demo seed avoids raw Israeli IDs", !demoSeed.includes("rawIsraeliId") && !demoSeed.includes("israeliId") && demoSeed.includes("createClinicalRotationSyntheticDemoAnonymousKey"));

add("identity form posts multipart", forms.includes("/api/clinical-rotations/identity") && forms.includes("type=\"file\""));
add("eligibility import form posts multipart", forms.includes("/api/admin/clinical-rotations/eligibility-imports"));
add("group join route exists", exists("src/app/clinical-rotations/groups/[inviteToken]/page.tsx"));
add("coordinator groups page exists", exists("src/app/clinical-rotations/hospital/groups/page.tsx"));
add("admin verification page exists", exists("src/app/admin/clinical-rotations/verifications/page.tsx"));
add("admin eligibility import page exists", exists("src/app/admin/clinical-rotations/eligibility-imports/page.tsx"));
add("admin cancellations and audit pages exist", exists("src/app/admin/clinical-rotations/cancellations/page.tsx") && exists("src/app/admin/clinical-rotations/audit/page.tsx"));

add("clinical rotations noindex metadata is used", read("src/app/clinical-rotations/layout.tsx").includes("clinicalRotationNoIndexMetadata"));
add("admin clinical rotations noindex metadata is used", read("src/app/admin/clinical-rotations/layout.tsx").includes("clinicalRotationNoIndexMetadata"));
add("localhost demo banner exists", read("src/components/clinical-rotations/clinical-rotations-demo-banner.tsx").includes("סביבת הדגמה"));
add("public page has Hebrew empty state", publicPage.includes("אין כרגע סבבים קליניים פתוחים"));
add("header excludes clinical rotations", !header.includes("clinical-rotations"));
add("footer excludes clinical rotations", !footer.includes("clinical-rotations"));
add("static sitemap excludes clinical rotations", !staticPages.includes("clinical-rotations"));
add("client bundle does not mention HMAC secret", !forms.includes("CLINICAL_ROTATIONS_ID_HMAC_SECRET") && !publicPage.includes("studentAnonymousKey"));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
