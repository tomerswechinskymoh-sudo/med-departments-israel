DO $$
BEGIN
  CREATE TYPE "DunsImportBatchStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DunsImportBatch" (
  "id" TEXT NOT NULL,
  "source_url" TEXT,
  "raw_text" TEXT,
  "parsed_json" JSONB,
  "status" "DunsImportBatchStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  "reviewed_by_id" TEXT,
  CONSTRAINT "DunsImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DunsPhysicianRecord" (
  "id" TEXT NOT NULL,
  "batch_id" TEXT NOT NULL,
  "physician_name" TEXT NOT NULL,
  "role_title" TEXT,
  "hospital_name_raw" TEXT NOT NULL,
  "specialty_raw" TEXT NOT NULL,
  "raw_text" TEXT,
  "source_url" TEXT,
  "ranking_year" INTEGER,
  "dedupe_key" TEXT,
  "normalized_hospital_id" TEXT,
  "normalized_specialty_id" TEXT,
  "normalized_department_id" TEXT,
  "confidence_score" DOUBLE PRECISION,
  CONSTRAINT "DunsPhysicianRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DepartmentExternalMetric" (
  "id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "metric_key" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "source_name" TEXT NOT NULL,
  "source_batch_id" TEXT,
  "confidence_score" DOUBLE PRECISION,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DepartmentExternalMetric_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DunsPhysicianRecord" ADD COLUMN IF NOT EXISTS "role_title" TEXT;
ALTER TABLE "DunsPhysicianRecord" ADD COLUMN IF NOT EXISTS "raw_text" TEXT;
ALTER TABLE "DunsPhysicianRecord" ADD COLUMN IF NOT EXISTS "source_url" TEXT;
ALTER TABLE "DunsPhysicianRecord" ADD COLUMN IF NOT EXISTS "ranking_year" INTEGER;
ALTER TABLE "DunsPhysicianRecord" ADD COLUMN IF NOT EXISTS "dedupe_key" TEXT;
ALTER TABLE "DunsPhysicianRecord" ADD COLUMN IF NOT EXISTS "normalized_department_id" TEXT;

CREATE INDEX IF NOT EXISTS "DunsImportBatch_status_created_at_idx" ON "DunsImportBatch"("status", "created_at");
CREATE INDEX IF NOT EXISTS "DunsPhysicianRecord_batch_id_idx" ON "DunsPhysicianRecord"("batch_id");
CREATE INDEX IF NOT EXISTS "DunsPhysicianRecord_normalized_hospital_id_normalized_specialty_id_idx" ON "DunsPhysicianRecord"("normalized_hospital_id", "normalized_specialty_id");
CREATE INDEX IF NOT EXISTS "DunsPhysicianRecord_normalized_department_id_idx" ON "DunsPhysicianRecord"("normalized_department_id");
CREATE INDEX IF NOT EXISTS "DunsPhysicianRecord_ranking_year_idx" ON "DunsPhysicianRecord"("ranking_year");
CREATE UNIQUE INDEX IF NOT EXISTS "DunsPhysicianRecord_dedupe_key_key" ON "DunsPhysicianRecord"("dedupe_key");
CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentExternalMetric_department_id_metric_key_source_name_key" ON "DepartmentExternalMetric"("department_id", "metric_key", "source_name");
CREATE INDEX IF NOT EXISTS "DepartmentExternalMetric_metric_key_approved_idx" ON "DepartmentExternalMetric"("metric_key", "approved");
CREATE INDEX IF NOT EXISTS "DepartmentExternalMetric_source_batch_id_idx" ON "DepartmentExternalMetric"("source_batch_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DunsImportBatch_reviewed_by_id_fkey') THEN
    ALTER TABLE "DunsImportBatch" ADD CONSTRAINT "DunsImportBatch_reviewed_by_id_fkey"
      FOREIGN KEY ("reviewed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DunsPhysicianRecord_batch_id_fkey') THEN
    ALTER TABLE "DunsPhysicianRecord" ADD CONSTRAINT "DunsPhysicianRecord_batch_id_fkey"
      FOREIGN KEY ("batch_id") REFERENCES "DunsImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DunsPhysicianRecord_normalized_hospital_id_fkey') THEN
    ALTER TABLE "DunsPhysicianRecord" ADD CONSTRAINT "DunsPhysicianRecord_normalized_hospital_id_fkey"
      FOREIGN KEY ("normalized_hospital_id") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DunsPhysicianRecord_normalized_specialty_id_fkey') THEN
    ALTER TABLE "DunsPhysicianRecord" ADD CONSTRAINT "DunsPhysicianRecord_normalized_specialty_id_fkey"
      FOREIGN KEY ("normalized_specialty_id") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DunsPhysicianRecord_normalized_department_id_fkey') THEN
    ALTER TABLE "DunsPhysicianRecord" ADD CONSTRAINT "DunsPhysicianRecord_normalized_department_id_fkey"
      FOREIGN KEY ("normalized_department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DepartmentExternalMetric_department_id_fkey') THEN
    ALTER TABLE "DepartmentExternalMetric" ADD CONSTRAINT "DepartmentExternalMetric_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DepartmentExternalMetric_source_batch_id_fkey') THEN
    ALTER TABLE "DepartmentExternalMetric" ADD CONSTRAINT "DepartmentExternalMetric_source_batch_id_fkey"
      FOREIGN KEY ("source_batch_id") REFERENCES "DunsImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
