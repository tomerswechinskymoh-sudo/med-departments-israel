-- Add independent controls without changing stored source data or other visibility.
ALTER TABLE "SourceVisibility"
  ADD COLUMN "ima_finance" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "ima_exams" BOOLEAN NOT NULL DEFAULT true;

-- Preserve the existing financial privacy setting; exam publication was requested.
UPDATE "SourceVisibility"
SET "ima_finance" = "ima", "revision" = "revision" + 1, "updated_at" = CURRENT_TIMESTAMP;
