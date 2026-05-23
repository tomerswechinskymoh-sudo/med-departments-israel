ALTER TYPE "UploadedFileCategory" ADD VALUE IF NOT EXISTS 'USER_VERIFICATION_PROOF';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email_verification_token" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email_verification_expires_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role_status" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verification_proof_url" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verification_submitted_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verification_rejection_reason" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_verification_token_key" ON "User"("email_verification_token");
CREATE INDEX IF NOT EXISTS "User_role_status_idx" ON "User"("role_status");

UPDATE "User"
SET
  "email_verified" = true,
  "email_verified_at" = COALESCE("email_verified_at", NOW()),
  "verification_status" = 'VERIFIED',
  "verified_at" = COALESCE("verified_at", NOW())
WHERE
  "email_verified" = false
  AND "verification_status" = 'PENDING_EMAIL_VERIFICATION'
  AND "verification_proof_url" IS NULL;
