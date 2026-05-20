DO $$ BEGIN
  CREATE TYPE "DepartmentScrapeRevisionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DepartmentMistakeReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED', 'DISMISSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DepartmentRepresentativeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DepartmentRepresentativeRequesterRole" AS ENUM ('RESIDENT', 'SPECIALIST', 'DEPARTMENT_STAFF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "UploadedFileCategory" ADD VALUE IF NOT EXISTS 'REPRESENTATIVE_REQUEST_PROOF';

CREATE TABLE IF NOT EXISTS "DepartmentScrapeRevision" (
  "id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "source_url" TEXT NOT NULL,
  "status" "DepartmentScrapeRevisionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "confidence_score" DOUBLE PRECISION,
  "raw_text" TEXT,
  "extracted_json" JSONB,
  "proposed_department_head_title" TEXT,
  "proposed_department_head_name" TEXT,
  "proposed_department_head_email" TEXT,
  "proposed_department_head_phone" TEXT,
  "proposed_contact_title" TEXT,
  "proposed_contact_role" TEXT,
  "proposed_contact_name" TEXT,
  "proposed_contact_email" TEXT,
  "proposed_contact_phone" TEXT,
  "proposed_description" TEXT,
  "proposed_senior_physicians_count" INTEGER,
  "proposed_sub_specialties_json" JSONB,
  "proposed_application_url" TEXT,
  "admin_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  "reviewed_by_id" TEXT,

  CONSTRAINT "DepartmentScrapeRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DepartmentMistakeReport" (
  "id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "reporter_name" TEXT NOT NULL,
  "reporter_email" TEXT NOT NULL,
  "reporter_phone" TEXT,
  "status" "DepartmentMistakeReportStatus" NOT NULL DEFAULT 'OPEN',
  "admin_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),

  CONSTRAINT "DepartmentMistakeReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DepartmentRepresentativeRequest" (
  "id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "requester_name" TEXT NOT NULL,
  "requester_email" TEXT NOT NULL,
  "requester_phone" TEXT NOT NULL,
  "requester_role" "DepartmentRepresentativeRequesterRole" NOT NULL,
  "note" TEXT,
  "proof_file_id" TEXT,
  "status" "DepartmentRepresentativeRequestStatus" NOT NULL DEFAULT 'PENDING',
  "admin_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  "reviewed_by_id" TEXT,

  CONSTRAINT "DepartmentRepresentativeRequest_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "DepartmentScrapeRevision" ADD CONSTRAINT "DepartmentScrapeRevision_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "DepartmentScrapeRevision" ADD CONSTRAINT "DepartmentScrapeRevision_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "DepartmentMistakeReport" ADD CONSTRAINT "DepartmentMistakeReport_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "DepartmentRepresentativeRequest" ADD CONSTRAINT "DepartmentRepresentativeRequest_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "DepartmentRepresentativeRequest" ADD CONSTRAINT "DepartmentRepresentativeRequest_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "DepartmentScrapeRevision_department_id_status_idx" ON "DepartmentScrapeRevision"("department_id", "status");
CREATE INDEX IF NOT EXISTS "DepartmentScrapeRevision_created_at_idx" ON "DepartmentScrapeRevision"("created_at");
CREATE INDEX IF NOT EXISTS "DepartmentMistakeReport_department_id_status_idx" ON "DepartmentMistakeReport"("department_id", "status");
CREATE INDEX IF NOT EXISTS "DepartmentMistakeReport_reporter_email_created_at_idx" ON "DepartmentMistakeReport"("reporter_email", "created_at");
CREATE INDEX IF NOT EXISTS "DepartmentRepresentativeRequest_department_id_status_idx" ON "DepartmentRepresentativeRequest"("department_id", "status");
CREATE INDEX IF NOT EXISTS "DepartmentRepresentativeRequest_requester_email_department_id_status_idx" ON "DepartmentRepresentativeRequest"("requester_email", "department_id", "status");
