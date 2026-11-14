BEGIN;
-- Owner-approved single-response publication with count/year, 2026-11-14.
-- Existing exact-text, metric-range and review-evidence checks remain in force.
ALTER TABLE "ExternalSurveyAggregate" DROP CONSTRAINT "survey_safe_publication";
ALTER TABLE "ExternalSurveyAggregate" ADD CONSTRAINT "survey_safe_publication" CHECK (
 status <> 'PUBLISHED' OR (respondent_count >= 1 AND value IS NOT NULL
 AND dataset_hash <> '' AND privacy_review_hash IS NOT NULL
 AND privacy_review_hash = dataset_hash AND privacy_evidence IS NOT NULL));
COMMIT;
