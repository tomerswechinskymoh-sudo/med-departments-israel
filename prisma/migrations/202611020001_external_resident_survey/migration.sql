BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- CreateEnum
CREATE TYPE "SurveyPublicationStatus" AS ENUM ('PENDING_PUBLICATION_RIGHTS', 'PENDING_PRIVACY_REVIEW', 'SUPPRESSED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "ExternalSurveySource" (
    "id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL DEFAULT 'EXTERNAL_SURVEY',
    "title" TEXT NOT NULL,
    "import_version" TEXT NOT NULL,
    "dataset_hash" TEXT NOT NULL DEFAULT '',
    "aggregate_rights_status" TEXT NOT NULL DEFAULT 'PENDING_PUBLICATION_RIGHTS',
    "quote_rights_status" TEXT NOT NULL DEFAULT 'PENDING_PUBLICATION_RIGHTS',
    "aggregate_rights_evidence" JSONB,
    "quote_rights_evidence" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalSurveySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSurveyResponse" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "raw_encrypted" TEXT NOT NULL,
    "reported_at" TIMESTAMP(3),
    "report_year" INTEGER,
    "specialty_id" TEXT,
    "institution_id" TEXT,
    "specialty_detail" TEXT,
    "match_level" TEXT NOT NULL,
    "normalized" JSONB NOT NULL,
    "has_tip" BOOLEAN NOT NULL,
    "tip_status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "tip_risk_flags" JSONB NOT NULL,
    "approved_tip" TEXT,
    "tip_review_evidence" JSONB,
    "status" "SurveyPublicationStatus" NOT NULL DEFAULT 'PENDING_PUBLICATION_RIGHTS',
    "import_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalSurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSurveyMapping" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "raw_value" TEXT NOT NULL,
    "target_id" TEXT,
    "category" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "match_status" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "review_evidence" JSONB,

    CONSTRAINT "ExternalSurveyMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSurveyImport" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "file_hash" TEXT NOT NULL,
    "import_version" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "inserted_count" INTEGER NOT NULL,
    "report" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalSurveyImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSurveyAggregate" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "group_key" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "institution_id" TEXT,
    "metric_key" TEXT NOT NULL,
    "respondent_count" INTEGER NOT NULL,
    "value" DOUBLE PRECISION,
    "method" TEXT NOT NULL,
    "calculated_count" INTEGER NOT NULL,
    "period_start_year" INTEGER,
    "period_end_year" INTEGER,
    "dataset_hash" TEXT NOT NULL,
    "privacy_review_hash" TEXT,
    "privacy_evidence" JSONB,
    "status" "SurveyPublicationStatus" NOT NULL DEFAULT 'PENDING_PUBLICATION_RIGHTS',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalSurveyAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalSurveyResponse_source_id_specialty_id_idx" ON "ExternalSurveyResponse"("source_id", "specialty_id");

-- CreateIndex
CREATE INDEX "ExternalSurveyResponse_source_id_tip_status_idx" ON "ExternalSurveyResponse"("source_id", "tip_status");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSurveyResponse_source_id_fingerprint_key" ON "ExternalSurveyResponse"("source_id", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSurveyMapping_source_id_kind_raw_value_key" ON "ExternalSurveyMapping"("source_id", "kind", "raw_value");

-- CreateIndex
CREATE INDEX "ExternalSurveyImport_source_id_file_hash_idx" ON "ExternalSurveyImport"("source_id", "file_hash");

-- CreateIndex
CREATE INDEX "ExternalSurveyAggregate_specialty_id_status_institution_id_idx" ON "ExternalSurveyAggregate"("specialty_id", "status", "institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSurveyAggregate_source_id_group_key_metric_key_key" ON "ExternalSurveyAggregate"("source_id", "group_key", "metric_key");

-- AddForeignKey
ALTER TABLE "ExternalSurveyResponse" ADD CONSTRAINT "ExternalSurveyResponse_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "ExternalSurveySource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSurveyResponse" ADD CONSTRAINT "ExternalSurveyResponse_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSurveyResponse" ADD CONSTRAINT "ExternalSurveyResponse_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSurveyMapping" ADD CONSTRAINT "ExternalSurveyMapping_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "ExternalSurveySource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSurveyImport" ADD CONSTRAINT "ExternalSurveyImport_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "ExternalSurveySource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSurveyAggregate" ADD CONSTRAINT "ExternalSurveyAggregate_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "ExternalSurveySource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSurveyAggregate" ADD CONSTRAINT "ExternalSurveyAggregate_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSurveyAggregate" ADD CONSTRAINT "ExternalSurveyAggregate_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Fail closed even if a later caller attempts to bypass the publication service.
ALTER TABLE "ExternalSurveySource" ADD CONSTRAINT "survey_source_type" CHECK (source_type = 'EXTERNAL_SURVEY');
ALTER TABLE "ExternalSurveySource" ADD CONSTRAINT "survey_rights_status" CHECK (aggregate_rights_status IN ('PENDING_PUBLICATION_RIGHTS','DOCUMENTED') AND quote_rights_status IN ('PENDING_PUBLICATION_RIGHTS','DOCUMENTED'));
ALTER TABLE "ExternalSurveyMapping" ADD CONSTRAINT "survey_mapping_confidence" CHECK (confidence BETWEEN 0 AND 1 AND kind IN ('SPECIALTY','INSTITUTION'));
ALTER TABLE "ExternalSurveyResponse" ADD CONSTRAINT "survey_tip_status" CHECK (tip_status IN ('NONE','PENDING_REVIEW','APPROVED','REJECTED'));
ALTER TABLE "ExternalSurveyResponse" ADD CONSTRAINT "survey_raw_encrypted" CHECK (raw_encrypted LIKE 'v1.%');
ALTER TABLE "ExternalSurveyResponse" ADD CONSTRAINT "survey_quote_publication" CHECK (status <> 'PUBLISHED' OR (tip_status = 'APPROVED' AND approved_tip IS NOT NULL AND tip_review_evidence IS NOT NULL));
ALTER TABLE "ExternalSurveyAggregate" ADD CONSTRAINT "survey_metric_range" CHECK (respondent_count >= 0 AND calculated_count BETWEEN 0 AND respondent_count AND metric_key IN ('shifts','hours','calm','peers','seniors','family'));
ALTER TABLE "ExternalSurveyAggregate" ADD CONSTRAINT "survey_safe_publication" CHECK (status <> 'PUBLISHED' OR (respondent_count >= 10 AND value IS NOT NULL AND institution_id IS NULL AND dataset_hash <> '' AND privacy_review_hash IS NOT NULL AND privacy_review_hash = dataset_hash AND privacy_evidence IS NOT NULL));
REVOKE ALL ON "ExternalSurveySource", "ExternalSurveyResponse", "ExternalSurveyMapping", "ExternalSurveyImport", "ExternalSurveyAggregate" FROM PUBLIC;
COMMIT;
