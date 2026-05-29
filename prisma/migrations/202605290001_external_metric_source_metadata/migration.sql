ALTER TABLE "DepartmentExternalMetric"
  ADD COLUMN IF NOT EXISTS "source_url" TEXT,
  ADD COLUMN IF NOT EXISTS "query_used" TEXT;
