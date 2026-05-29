CREATE TABLE IF NOT EXISTS "DataExplanation" (
  "id" TEXT NOT NULL,
  "sheet" TEXT NOT NULL,
  "criterion" TEXT NOT NULL,
  "normalized_criterion" TEXT NOT NULL,
  "metric_key" TEXT,
  "readable_label" TEXT NOT NULL,
  "explanation" TEXT,
  "source_label" TEXT,
  "source_link_policy" TEXT,
  "source_url" TEXT,
  "display_action" TEXT,
  "display_mode" TEXT,
  "visual_type" TEXT,
  "is_hidden" BOOLEAN NOT NULL DEFAULT false,
  "is_highlighted" BOOLEAN NOT NULL DEFAULT false,
  "is_national_metric" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DataExplanation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DataExplanation_sheet_normalized_criterion_key"
  ON "DataExplanation"("sheet", "normalized_criterion");

CREATE INDEX IF NOT EXISTS "DataExplanation_sheet_metric_key_idx"
  ON "DataExplanation"("sheet", "metric_key");

CREATE INDEX IF NOT EXISTS "DataExplanation_is_hidden_is_highlighted_idx"
  ON "DataExplanation"("is_hidden", "is_highlighted");
