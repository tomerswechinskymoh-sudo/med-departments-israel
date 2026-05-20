DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'FAILED_NEEDS_ASSISTED_IMPORT'
      AND enumtypid = '"DataImportBatchStatus"'::regtype
  ) THEN
    ALTER TYPE "DataImportBatchStatus" ADD VALUE 'FAILED_NEEDS_ASSISTED_IMPORT';
  END IF;
END $$;

ALTER TABLE "DataImportSource" ADD COLUMN IF NOT EXISTS "source_label" TEXT;
ALTER TABLE "DataImportRecord" ADD COLUMN IF NOT EXISTS "source_label" TEXT;
