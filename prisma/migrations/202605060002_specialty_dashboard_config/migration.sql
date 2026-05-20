CREATE TABLE IF NOT EXISTS "SpecialtyDashboardConfig" (
  "id" TEXT NOT NULL,
  "specialty_id" TEXT NOT NULL,
  "enabled_metrics_json" JSONB NOT NULL,
  "display_order_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpecialtyDashboardConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SpecialtyDashboardConfig_specialty_id_key"
  ON "SpecialtyDashboardConfig"("specialty_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SpecialtyDashboardConfig_specialty_id_fkey'
  ) THEN
    ALTER TABLE "SpecialtyDashboardConfig"
      ADD CONSTRAINT "SpecialtyDashboardConfig_specialty_id_fkey"
      FOREIGN KEY ("specialty_id") REFERENCES "Specialty"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
