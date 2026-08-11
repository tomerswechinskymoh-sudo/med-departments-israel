-- Clinical Rotations marketplace audit fixes: payment-link delivery, source deletion state, notification outbox.
ALTER TYPE "ClinicalRotationPaymentStatus" ADD VALUE IF NOT EXISTS 'LINK_DELIVERY_FAILED';

DO $$ BEGIN
    CREATE TYPE "ClinicalRotationSourceDeletionStatus" AS ENUM ('NOT_STORED', 'PENDING_DELETION', 'DELETED', 'RETRY_NEEDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClinicalRotationNotificationOutboxType" AS ENUM ('PAYMENT_LINK_EMAIL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClinicalRotationNotificationOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "ClinicalRotationEligibilityImport"
  ADD COLUMN IF NOT EXISTS "source_file_id" TEXT,
  ADD COLUMN IF NOT EXISTS "source_deletion_status" "ClinicalRotationSourceDeletionStatus" NOT NULL DEFAULT 'NOT_STORED',
  ADD COLUMN IF NOT EXISTS "source_deletion_error_category" TEXT,
  ADD COLUMN IF NOT EXISTS "source_deletion_retry_at" TIMESTAMP(3);

UPDATE "ClinicalRotationEligibilityImport"
SET "source_deletion_status" = 'DELETED'
WHERE "source_deleted_at" IS NOT NULL
  AND "source_deletion_status" = 'NOT_STORED';

CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationEligibilityImport_source_file_id_key"
  ON "ClinicalRotationEligibilityImport"("source_file_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationEligibilityImport_source_deletion_status_source_deletion_retry_at_idx"
  ON "ClinicalRotationEligibilityImport"("source_deletion_status", "source_deletion_retry_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationEligibilityImport_source_file_id_fkey'
  ) THEN
    ALTER TABLE "ClinicalRotationEligibilityImport"
      ADD CONSTRAINT "ClinicalRotationEligibilityImport_source_file_id_fkey"
      FOREIGN KEY ("source_file_id")
      REFERENCES "UploadedFile"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ClinicalRotationNotificationOutbox" (
  "id" TEXT NOT NULL,
  "type" "ClinicalRotationNotificationOutboxType" NOT NULL,
  "status" "ClinicalRotationNotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "payment_id" TEXT,
  "application_id" TEXT,
  "group_id" TEXT,
  "hospital_id" TEXT,
  "offering_id" TEXT,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "locked_at" TIMESTAMP(3),
  "next_attempt_at" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "last_error_category" TEXT,
  "created_by_user_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalRotationNotificationOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationNotificationOutbox_type_payment_id_key"
  ON "ClinicalRotationNotificationOutbox"("type", "payment_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationNotificationOutbox_status_next_attempt_at_idx"
  ON "ClinicalRotationNotificationOutbox"("status", "next_attempt_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationNotificationOutbox_application_id_idx"
  ON "ClinicalRotationNotificationOutbox"("application_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationNotificationOutbox_group_id_idx"
  ON "ClinicalRotationNotificationOutbox"("group_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationNotificationOutbox_hospital_id_status_idx"
  ON "ClinicalRotationNotificationOutbox"("hospital_id", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationNotificationOutbox_offering_id_idx"
  ON "ClinicalRotationNotificationOutbox"("offering_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationNotificationOutbox_created_by_user_id_idx"
  ON "ClinicalRotationNotificationOutbox"("created_by_user_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationNotificationOutbox_payment_id_fkey') THEN
    ALTER TABLE "ClinicalRotationNotificationOutbox"
      ADD CONSTRAINT "ClinicalRotationNotificationOutbox_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "ClinicalRotationPayment"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationNotificationOutbox_application_id_fkey') THEN
    ALTER TABLE "ClinicalRotationNotificationOutbox"
      ADD CONSTRAINT "ClinicalRotationNotificationOutbox_application_id_fkey"
      FOREIGN KEY ("application_id") REFERENCES "ClinicalRotationApplication"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationNotificationOutbox_group_id_fkey') THEN
    ALTER TABLE "ClinicalRotationNotificationOutbox"
      ADD CONSTRAINT "ClinicalRotationNotificationOutbox_group_id_fkey"
      FOREIGN KEY ("group_id") REFERENCES "ClinicalRotationGroupApplication"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationNotificationOutbox_hospital_id_fkey') THEN
    ALTER TABLE "ClinicalRotationNotificationOutbox"
      ADD CONSTRAINT "ClinicalRotationNotificationOutbox_hospital_id_fkey"
      FOREIGN KEY ("hospital_id") REFERENCES "Institution"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationNotificationOutbox_offering_id_fkey') THEN
    ALTER TABLE "ClinicalRotationNotificationOutbox"
      ADD CONSTRAINT "ClinicalRotationNotificationOutbox_offering_id_fkey"
      FOREIGN KEY ("offering_id") REFERENCES "ClinicalRotationOffering"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationNotificationOutbox_created_by_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationNotificationOutbox"
      ADD CONSTRAINT "ClinicalRotationNotificationOutbox_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
