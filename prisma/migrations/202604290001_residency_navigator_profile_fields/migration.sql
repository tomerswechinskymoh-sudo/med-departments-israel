-- Optional residency navigator profile fields. All columns are nullable to keep
-- existing seeded/imported department pages valid while richer data is added.
ALTER TABLE "Institution"
  ADD COLUMN IF NOT EXISTS "region" TEXT;

ALTER TABLE "Department"
  ADD COLUMN IF NOT EXISTS "website_url" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_name" TEXT,
  ADD COLUMN IF NOT EXISTS "residents_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "median_residency_length" TEXT,
  ADD COLUMN IF NOT EXISTS "shlav_aleph_pass_rate" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "shlav_bet_pass_rate" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "new_residents_this_year" INTEGER,
  ADD COLUMN IF NOT EXISTS "expected_graduates_this_year" INTEGER,
  ADD COLUMN IF NOT EXISTS "gender_balance" TEXT,
  ADD COLUMN IF NOT EXISTS "perks" TEXT,
  ADD COLUMN IF NOT EXISTS "candidate_preferences" TEXT,
  ADD COLUMN IF NOT EXISTS "education_location_breakdown" JSONB;

CREATE INDEX IF NOT EXISTS "Institution_region_idx" ON "Institution"("region");
