BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
ALTER TABLE "ExternalSurveyAggregate" DROP CONSTRAINT "survey_metric_range";
ALTER TABLE "ExternalSurveyAggregate" ADD CONSTRAINT "survey_metric_range" CHECK (
  respondent_count >= 0 AND calculated_count BETWEEN 0 AND respondent_count
  AND metric_key IN ('shifts','hours','calm','peers','seniors','family','salaryGross','salaryNet')
  AND (metric_key NOT IN ('salaryGross','salaryNet') OR value IS NULL OR (value BETWEEN 1000 AND 100000 AND method = 'MEDIAN'))
);
COMMIT;
