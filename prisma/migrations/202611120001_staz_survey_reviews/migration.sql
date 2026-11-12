BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- CreateEnum
CREATE TYPE "SurveyReviewStatus" AS ENUM ('PENDING_REVIEW', 'NEEDS_MAPPING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "SurveyReviewSource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isPublicEnabled" BOOLEAN NOT NULL DEFAULT false,
    "permissionConfirmedAt" TIMESTAMP(3),
    "permissionConfirmedBy" TEXT,
    "permissionEvidence" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyReviewSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyReviewImport" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "csvHash" TEXT NOT NULL,
    "workbookHash" TEXT,
    "actorUserId" TEXT,
    "report" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyReviewImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyReview" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceReviewKey" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sourceRowNumber" INTEGER NOT NULL,
    "sourceColumnLetter" TEXT NOT NULL,
    "sourceYear" INTEGER NOT NULL,
    "originalHospital" TEXT NOT NULL,
    "originalDepartmentOrScope" TEXT NOT NULL,
    "sourceQuestion" TEXT NOT NULL,
    "rawEncrypted" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "sourceVerified" BOOLEAN NOT NULL DEFAULT false,
    "workbookHash" TEXT,
    "suggestedDepartmentId" TEXT,
    "mappingConfidence" TEXT NOT NULL,
    "mappingReason" TEXT NOT NULL,
    "mappedInstitutionId" TEXT,
    "targetDepartmentId" TEXT,
    "mappingConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "mappingExceptionReason" TEXT,
    "status" "SurveyReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "approvedPublicText" TEXT,
    "publishText" BOOLEAN NOT NULL DEFAULT false,
    "publishRatings" BOOLEAN NOT NULL DEFAULT false,
    "privacyReviewed" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyReviewRating" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "metricCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "questionCode" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "sourceRowNumber" INTEGER NOT NULL,
    "sourceColumn" TEXT NOT NULL,
    "rawAnswer" TEXT NOT NULL,
    "scale" TEXT NOT NULL,
    "normalizedValue" INTEGER,
    "rotationContext" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "selected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SurveyReviewRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurveyReviewImport_sourceId_createdAt_idx" ON "SurveyReviewImport"("sourceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyReview_sourceReviewKey_key" ON "SurveyReview"("sourceReviewKey");

-- CreateIndex
CREATE INDEX "SurveyReview_sourceId_status_idx" ON "SurveyReview"("sourceId", "status");

-- CreateIndex
CREATE INDEX "SurveyReview_targetDepartmentId_status_idx" ON "SurveyReview"("targetDepartmentId", "status");

-- CreateIndex
CREATE INDEX "SurveyReview_originalHospital_originalDepartmentOrScope_idx" ON "SurveyReview"("originalHospital", "originalDepartmentOrScope");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyReviewRating_reviewId_metricCode_key" ON "SurveyReviewRating"("reviewId", "metricCode");

-- AddForeignKey
ALTER TABLE "SurveyReviewImport" ADD CONSTRAINT "SurveyReviewImport_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SurveyReviewSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyReview" ADD CONSTRAINT "SurveyReview_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SurveyReviewSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyReview" ADD CONSTRAINT "SurveyReview_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "SurveyReviewImport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyReview" ADD CONSTRAINT "SurveyReview_targetDepartmentId_fkey" FOREIGN KEY ("targetDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyReviewRating" ADD CONSTRAINT "SurveyReviewRating_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "SurveyReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Defense in depth: independent gates and evidence constraints.
ALTER TABLE "SurveyReviewSource" ADD CONSTRAINT "survey_source_permission_gate"
  CHECK (NOT "isPublicEnabled" OR ("permissionConfirmedAt" IS NOT NULL AND "permissionEvidence" IS NOT NULL AND length(btrim("permissionEvidence")) >= 12));
ALTER TABLE "SurveyReview" ADD CONSTRAINT "survey_review_source_coordinates"
  CHECK ("sourceRowNumber" >= 3 AND "sourceYear" BETWEEN 2020 AND 2025 AND "sourceColumnLetter" IN ('BL','BP','BG'));
ALTER TABLE "SurveyReview" ADD CONSTRAINT "survey_review_approval_gate"
  CHECK (status <> 'APPROVED' OR ("targetDepartmentId" IS NOT NULL AND "mappingConfirmed" AND "privacyReviewed" AND "sourceVerified" AND ("publishText" OR "publishRatings") AND (NOT "publishText" OR ("approvedPublicText" IS NOT NULL AND length(btrim("approvedPublicText")) > 0))));
ALTER TABLE "SurveyReview" ADD CONSTRAINT "survey_no_hospital_department_ratings"
  CHECK ("sourceColumnLetter" <> 'BG' OR NOT "publishRatings");
ALTER TABLE "SurveyReviewRating" ADD CONSTRAINT "survey_rating_range"
  CHECK (("normalizedValue" IS NULL OR "normalizedValue" BETWEEN 1 AND 5) AND (NOT selected OR (verified AND "normalizedValue" IS NOT NULL)));

COMMIT;
