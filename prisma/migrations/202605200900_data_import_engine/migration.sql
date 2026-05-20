DO $$
BEGIN
  CREATE TYPE "DataImportBatchStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ImportRecordStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DataSourceType" AS ENUM ('DUNS100', 'HOSPITAL_WEBSITE', 'MINISTRY_REPORT', 'MANUAL_PASTE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DataImportTarget" AS ENUM ('DUNS100_PHYSICIANS', 'DEPARTMENT_METRICS', 'DEPARTMENT_LEADERSHIP', 'RESIDENCY_OPENINGS', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DataImportBatch" (
  "id" TEXT NOT NULL,
  "source_type" "DataSourceType" NOT NULL,
  "target" "DataImportTarget" NOT NULL,
  "source_url" TEXT,
  "extraction_instruction" TEXT NOT NULL,
  "raw_text" TEXT,
  "raw_html" TEXT,
  "parsed_json" JSONB,
  "status" "DataImportBatchStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "created_by_id" TEXT,
  "reviewed_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  CONSTRAINT "DataImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DataImportSource" (
  "id" TEXT NOT NULL,
  "batch_id" TEXT NOT NULL,
  "source_url" TEXT,
  "final_url" TEXT,
  "raw_text" TEXT,
  "raw_html" TEXT,
  "diagnostics" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataImportSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DataImportRecord" (
  "id" TEXT NOT NULL,
  "batch_id" TEXT NOT NULL,
  "source_type" "DataSourceType" NOT NULL,
  "target" "DataImportTarget" NOT NULL,
  "status" "ImportRecordStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "record_type" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "raw_text" TEXT,
  "source_snippet" TEXT,
  "source_url" TEXT,
  "ranking_year" INTEGER,
  "physician_name" TEXT,
  "role_title" TEXT,
  "hospital_name_raw" TEXT,
  "specialty_raw" TEXT,
  "normalized_hospital_id" TEXT,
  "normalized_specialty_id" TEXT,
  "normalized_department_id" TEXT,
  "confidence_score" DOUBLE PRECISION,
  "dedupe_key" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataImportRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DepartmentExternalPerson" (
  "id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "source_name" TEXT NOT NULL,
  "person_name" TEXT NOT NULL,
  "role_title" TEXT,
  "description" TEXT,
  "source_url" TEXT,
  "ranking_year" INTEGER,
  "source_record_id" TEXT,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DepartmentExternalPerson_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DataImportBatch_status_created_at_idx" ON "DataImportBatch"("status", "created_at");
CREATE INDEX IF NOT EXISTS "DataImportBatch_source_type_target_idx" ON "DataImportBatch"("source_type", "target");
CREATE INDEX IF NOT EXISTS "DataImportSource_batch_id_idx" ON "DataImportSource"("batch_id");
CREATE INDEX IF NOT EXISTS "DataImportRecord_batch_id_status_idx" ON "DataImportRecord"("batch_id", "status");
CREATE INDEX IF NOT EXISTS "DataImportRecord_normalized_department_id_idx" ON "DataImportRecord"("normalized_department_id");
CREATE INDEX IF NOT EXISTS "DataImportRecord_source_type_target_idx" ON "DataImportRecord"("source_type", "target");
CREATE INDEX IF NOT EXISTS "DataImportRecord_ranking_year_idx" ON "DataImportRecord"("ranking_year");
CREATE UNIQUE INDEX IF NOT EXISTS "DataImportRecord_dedupe_key_key" ON "DataImportRecord"("dedupe_key");
CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentExternalPerson_department_id_source_name_person_n_key" ON "DepartmentExternalPerson"("department_id", "source_name", "person_name", "ranking_year");
CREATE INDEX IF NOT EXISTS "DepartmentExternalPerson_department_id_source_name_approved_idx" ON "DepartmentExternalPerson"("department_id", "source_name", "approved");
CREATE INDEX IF NOT EXISTS "DepartmentExternalPerson_source_record_id_idx" ON "DepartmentExternalPerson"("source_record_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DataImportBatch_created_by_id_fkey') THEN
    ALTER TABLE "DataImportBatch" ADD CONSTRAINT "DataImportBatch_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DataImportBatch_reviewed_by_id_fkey') THEN
    ALTER TABLE "DataImportBatch" ADD CONSTRAINT "DataImportBatch_reviewed_by_id_fkey"
      FOREIGN KEY ("reviewed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DataImportSource_batch_id_fkey') THEN
    ALTER TABLE "DataImportSource" ADD CONSTRAINT "DataImportSource_batch_id_fkey"
      FOREIGN KEY ("batch_id") REFERENCES "DataImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DataImportRecord_batch_id_fkey') THEN
    ALTER TABLE "DataImportRecord" ADD CONSTRAINT "DataImportRecord_batch_id_fkey"
      FOREIGN KEY ("batch_id") REFERENCES "DataImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DataImportRecord_normalized_department_id_fkey') THEN
    ALTER TABLE "DataImportRecord" ADD CONSTRAINT "DataImportRecord_normalized_department_id_fkey"
      FOREIGN KEY ("normalized_department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DepartmentExternalPerson_department_id_fkey') THEN
    ALTER TABLE "DepartmentExternalPerson" ADD CONSTRAINT "DepartmentExternalPerson_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DepartmentExternalPerson_source_record_id_fkey') THEN
    ALTER TABLE "DepartmentExternalPerson" ADD CONSTRAINT "DepartmentExternalPerson_source_record_id_fkey"
      FOREIGN KEY ("source_record_id") REFERENCES "DataImportRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
