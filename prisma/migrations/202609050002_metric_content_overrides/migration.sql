ALTER TABLE "MetricExplanationOverride"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "explanation" TEXT,
  ADD COLUMN "source_label" TEXT,
  ADD COLUMN "source_url" TEXT;

UPDATE "MetricExplanationOverride"
SET "explanation" = "text"
WHERE "explanation" IS NULL
  AND "text" IS NOT NULL;

ALTER TABLE "MetricExplanationOverride"
  ALTER COLUMN "text" DROP NOT NULL;
