CREATE TYPE "MetricExplanationScope" AS ENUM ('GLOBAL', 'SPECIALTY', 'DEPARTMENT');

CREATE TABLE "MetricExplanationOverride" (
  "id" TEXT NOT NULL,
  "metric_key" TEXT NOT NULL,
  "scope_type" "MetricExplanationScope" NOT NULL,
  "scope_key" TEXT NOT NULL,
  "specialty_id" TEXT,
  "department_id" TEXT,
  "text" TEXT NOT NULL,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MetricExplanationOverride_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MetricExplanationOverride_scope_consistency_check" CHECK (
    ("scope_type" = 'GLOBAL' AND "scope_key" = 'GLOBAL' AND "specialty_id" IS NULL AND "department_id" IS NULL)
    OR
    ("scope_type" = 'SPECIALTY' AND "scope_key" = "specialty_id" AND "specialty_id" IS NOT NULL AND "department_id" IS NULL)
    OR
    ("scope_type" = 'DEPARTMENT' AND "scope_key" = "department_id" AND "specialty_id" IS NOT NULL AND "department_id" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "MetricExplanationOverride_metric_key_scope_type_scope_key_key"
  ON "MetricExplanationOverride"("metric_key", "scope_type", "scope_key");
CREATE INDEX "MetricExplanationOverride_metric_key_idx"
  ON "MetricExplanationOverride"("metric_key");
CREATE INDEX "MetricExplanationOverride_scope_type_specialty_id_metric_key_idx"
  ON "MetricExplanationOverride"("scope_type", "specialty_id", "metric_key");
CREATE INDEX "MetricExplanationOverride_scope_type_department_id_metric_key_idx"
  ON "MetricExplanationOverride"("scope_type", "department_id", "metric_key");
CREATE INDEX "MetricExplanationOverride_updated_by_user_id_idx"
  ON "MetricExplanationOverride"("updated_by_user_id");

ALTER TABLE "MetricExplanationOverride"
  ADD CONSTRAINT "MetricExplanationOverride_specialty_id_fkey"
  FOREIGN KEY ("specialty_id") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetricExplanationOverride"
  ADD CONSTRAINT "MetricExplanationOverride_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetricExplanationOverride"
  ADD CONSTRAINT "MetricExplanationOverride_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "SpecialtyDashboardConfig"
SET
  "enabled_metrics_json" = CASE
    WHEN jsonb_typeof("enabled_metrics_json") = 'array'
      AND NOT ("enabled_metrics_json" @> '["relativeDemandIndex"]'::jsonb)
      THEN "enabled_metrics_json" || '["relativeDemandIndex"]'::jsonb
    ELSE "enabled_metrics_json"
  END,
  "display_order_json" = CASE
    WHEN jsonb_typeof("display_order_json") = 'array'
      AND NOT ("display_order_json" @> '["relativeDemandIndex"]'::jsonb)
      THEN "display_order_json" || '["relativeDemandIndex"]'::jsonb
    ELSE "display_order_json"
  END;
