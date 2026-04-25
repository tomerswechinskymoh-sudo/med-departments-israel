ALTER TYPE "UploadedFileCategory" ADD VALUE 'REVIEW_VERIFICATION_PROOF';

ALTER TABLE "UploadedFile"
ADD COLUMN "review_submission_id" TEXT;

CREATE INDEX "UploadedFile_review_submission_id_category_idx"
ON "UploadedFile"("review_submission_id", "category");

ALTER TABLE "UploadedFile"
ADD CONSTRAINT "UploadedFile_review_submission_id_fkey"
FOREIGN KEY ("review_submission_id") REFERENCES "ReviewSubmission"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
