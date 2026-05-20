DO $$
BEGIN
  CREATE TYPE "VerificationStatus" AS ENUM (
    'PENDING_EMAIL_VERIFICATION',
    'PENDING_PROOF',
    'PENDING_ADMIN_REVIEW',
    'VERIFIED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING_EMAIL_VERIFICATION';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verification_token" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "token_expiry" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verified_by_admin_id" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);

ALTER TABLE "ReviewSubmission" ADD COLUMN IF NOT EXISTS "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING_PROOF';
ALTER TABLE "ReviewSubmission" ADD COLUMN IF NOT EXISTS "verification_token" TEXT;
ALTER TABLE "ReviewSubmission" ADD COLUMN IF NOT EXISTS "token_expiry" TIMESTAMP(3);
ALTER TABLE "ReviewSubmission" ADD COLUMN IF NOT EXISTS "proof_uploaded_at" TIMESTAMP(3);
ALTER TABLE "ReviewSubmission" ADD COLUMN IF NOT EXISTS "verified_by_admin_id" TEXT;
ALTER TABLE "ReviewSubmission" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);

ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "verification_status" "VerificationStatus" NOT NULL DEFAULT 'VERIFIED';

CREATE UNIQUE INDEX IF NOT EXISTS "User_verification_token_key" ON "User"("verification_token");
CREATE INDEX IF NOT EXISTS "User_verification_status_idx" ON "User"("verification_status");
CREATE UNIQUE INDEX IF NOT EXISTS "ReviewSubmission_verification_token_key" ON "ReviewSubmission"("verification_token");
CREATE INDEX IF NOT EXISTS "ReviewSubmission_verification_status_idx" ON "ReviewSubmission"("verification_status");

DO $$
BEGIN
  ALTER TABLE "User"
    ADD CONSTRAINT "User_verified_by_admin_id_fkey"
    FOREIGN KEY ("verified_by_admin_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ReviewSubmission"
    ADD CONSTRAINT "ReviewSubmission_verified_by_admin_id_fkey"
    FOREIGN KEY ("verified_by_admin_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
