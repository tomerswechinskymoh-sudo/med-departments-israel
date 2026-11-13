ALTER TABLE "SurveyReviewSource" ADD COLUMN "autoApprovalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SurveyReview" ADD COLUMN "automationCategory" TEXT, ADD COLUMN "automationReason" TEXT, ADD COLUMN "automationVersion" TEXT;
CREATE INDEX "SurveyReview_sourceId_automationCategory_idx" ON "SurveyReview"("sourceId", "automationCategory");
