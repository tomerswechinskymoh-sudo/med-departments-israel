DO $$
BEGIN
  CREATE TYPE "DataImportJobStatus" AS ENUM ('RUNNING', 'FAILED', 'PARTIAL', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DataImportJob" (
  "id" TEXT NOT NULL,
  "source_type" "DataSourceType" NOT NULL DEFAULT 'DUNS100',
  "target" "DataImportTarget" NOT NULL DEFAULT 'DUNS100_PHYSICIANS',
  "status" "DataImportJobStatus" NOT NULL DEFAULT 'RUNNING',
  "root_url" TEXT NOT NULL,
  "max_pages" INTEGER NOT NULL DEFAULT 80,
  "years_depth" INTEGER NOT NULL DEFAULT 5,
  "allowed_domains_json" JSONB,
  "progress_json" JSONB,
  "error_message" TEXT,
  "batch_id" TEXT,
  "created_by_id" TEXT,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataImportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DataImportJob_status_updated_at_idx" ON "DataImportJob"("status", "updated_at");
CREATE INDEX IF NOT EXISTS "DataImportJob_source_type_target_idx" ON "DataImportJob"("source_type", "target");
CREATE INDEX IF NOT EXISTS "DataImportJob_batch_id_idx" ON "DataImportJob"("batch_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DataImportJob_batch_id_fkey') THEN
    ALTER TABLE "DataImportJob" ADD CONSTRAINT "DataImportJob_batch_id_fkey"
      FOREIGN KEY ("batch_id") REFERENCES "DataImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DataImportJob_created_by_id_fkey') THEN
    ALTER TABLE "DataImportJob" ADD CONSTRAINT "DataImportJob_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
