ALTER TABLE "Specialty"
  ADD COLUMN IF NOT EXISTS "data_source_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "data_last_updated" TIMESTAMP(3);

ALTER TABLE "Department"
  ADD COLUMN IF NOT EXISTS "import_stable_key" TEXT,
  ADD COLUMN IF NOT EXISTS "application_url" TEXT,
  ADD COLUMN IF NOT EXISTS "data_source_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "data_last_updated" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Department_import_stable_key_key"
  ON "Department"("import_stable_key");

ALTER TABLE "DepartmentScrapeRevision"
  ADD COLUMN IF NOT EXISTS "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "extraction_warnings_json" JSONB,
  ADD COLUMN IF NOT EXISTS "proposed_beds_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "proposed_research_activity" TEXT;

CREATE TABLE IF NOT EXISTS "SpecialtyMetric" (
  "id" TEXT NOT NULL,
  "specialty_id" TEXT NOT NULL,
  "metric_key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" DOUBLE PRECISION,
  "raw_value" TEXT,
  "unit" TEXT,
  "source_notes" TEXT,
  "last_updated" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpecialtyMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SpecialtyYearlyMetric" (
  "id" TEXT NOT NULL,
  "specialty_id" TEXT NOT NULL,
  "metric_key" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "value" DOUBLE PRECISION,
  "raw_value" TEXT,
  "unit" TEXT,
  "source_notes" TEXT,
  "last_updated" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpecialtyYearlyMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DepartmentMetric" (
  "id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "metric_key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" DOUBLE PRECISION,
  "raw_value" TEXT,
  "unit" TEXT,
  "source_notes" TEXT,
  "last_updated" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DepartmentMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DepartmentYearlyMetric" (
  "id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "metric_key" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "value" DOUBLE PRECISION,
  "raw_value" TEXT,
  "unit" TEXT,
  "source_notes" TEXT,
  "last_updated" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DepartmentYearlyMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DepartmentResearchMetric" (
  "id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "publications_count" INTEGER,
  "source" TEXT NOT NULL DEFAULT 'OpenAlex',
  "query_used" TEXT,
  "confidence_score" DOUBLE PRECISION,
  "needs_mapping" BOOLEAN NOT NULL DEFAULT false,
  "is_ambiguous" BOOLEAN NOT NULL DEFAULT false,
  "raw_response_json" JSONB,
  "warnings_json" JSONB,
  "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DepartmentResearchMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OpenAlexAliasMapping" (
  "id" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "hebrew_name" TEXT NOT NULL,
  "aliases_json" JSONB NOT NULL,
  "keywords_json" JSONB,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpenAlexAliasMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DataImportRowLog" (
  "id" TEXT NOT NULL,
  "batch_id" TEXT,
  "source_file" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "row_number" INTEGER NOT NULL,
  "stable_key" TEXT,
  "status" TEXT NOT NULL,
  "warnings_json" JSONB,
  "errors_json" JSONB,
  "payload_json" JSONB,
  "normalized_specialty_id" TEXT,
  "normalized_department_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataImportRowLog_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "SpecialtyMetric" ADD CONSTRAINT "SpecialtyMetric_specialty_id_fkey"
    FOREIGN KEY ("specialty_id") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SpecialtyYearlyMetric" ADD CONSTRAINT "SpecialtyYearlyMetric_specialty_id_fkey"
    FOREIGN KEY ("specialty_id") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "DepartmentMetric" ADD CONSTRAINT "DepartmentMetric_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "DepartmentYearlyMetric" ADD CONSTRAINT "DepartmentYearlyMetric_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "DepartmentResearchMetric" ADD CONSTRAINT "DepartmentResearchMetric_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "DataImportRowLog" ADD CONSTRAINT "DataImportRowLog_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "DataImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "DataImportRowLog" ADD CONSTRAINT "DataImportRowLog_normalized_department_id_fkey"
    FOREIGN KEY ("normalized_department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SpecialtyMetric_specialty_id_metric_key_key"
  ON "SpecialtyMetric"("specialty_id", "metric_key");
CREATE INDEX IF NOT EXISTS "SpecialtyMetric_metric_key_idx"
  ON "SpecialtyMetric"("metric_key");

CREATE UNIQUE INDEX IF NOT EXISTS "SpecialtyYearlyMetric_specialty_id_metric_key_year_key"
  ON "SpecialtyYearlyMetric"("specialty_id", "metric_key", "year");
CREATE INDEX IF NOT EXISTS "SpecialtyYearlyMetric_metric_key_year_idx"
  ON "SpecialtyYearlyMetric"("metric_key", "year");

CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentMetric_department_id_metric_key_key"
  ON "DepartmentMetric"("department_id", "metric_key");
CREATE INDEX IF NOT EXISTS "DepartmentMetric_metric_key_idx"
  ON "DepartmentMetric"("metric_key");

CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentYearlyMetric_department_id_metric_key_year_key"
  ON "DepartmentYearlyMetric"("department_id", "metric_key", "year");
CREATE INDEX IF NOT EXISTS "DepartmentYearlyMetric_metric_key_year_idx"
  ON "DepartmentYearlyMetric"("metric_key", "year");

CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentResearchMetric_department_id_year_source_key"
  ON "DepartmentResearchMetric"("department_id", "year", "source");
CREATE INDEX IF NOT EXISTS "DepartmentResearchMetric_needs_mapping_confidence_score_idx"
  ON "DepartmentResearchMetric"("needs_mapping", "confidence_score");
CREATE INDEX IF NOT EXISTS "DepartmentResearchMetric_year_source_idx"
  ON "DepartmentResearchMetric"("year", "source");

CREATE UNIQUE INDEX IF NOT EXISTS "OpenAlexAliasMapping_entity_type_hebrew_name_key"
  ON "OpenAlexAliasMapping"("entity_type", "hebrew_name");
CREATE INDEX IF NOT EXISTS "OpenAlexAliasMapping_entity_type_idx"
  ON "OpenAlexAliasMapping"("entity_type");

CREATE INDEX IF NOT EXISTS "DataImportRowLog_batch_id_status_idx"
  ON "DataImportRowLog"("batch_id", "status");
CREATE INDEX IF NOT EXISTS "DataImportRowLog_target_status_idx"
  ON "DataImportRowLog"("target", "status");
CREATE INDEX IF NOT EXISTS "DataImportRowLog_normalized_department_id_idx"
  ON "DataImportRowLog"("normalized_department_id");
