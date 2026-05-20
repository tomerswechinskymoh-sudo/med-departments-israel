ALTER TABLE "DepartmentScrapeRevision"
  ADD COLUMN IF NOT EXISTS "suggested_emails_json" JSONB;
