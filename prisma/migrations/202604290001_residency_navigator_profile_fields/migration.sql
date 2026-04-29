-- Optional residency navigator profile fields. All columns are nullable to keep
-- existing seeded/imported department pages valid while richer data is added.
ALTER TABLE "Institution"
  ADD COLUMN "region" TEXT;

ALTER TABLE "Department"
  ADD COLUMN "website_url" TEXT,
  ADD COLUMN "contact_name" TEXT,
  ADD COLUMN "residents_count" INTEGER,
  ADD COLUMN "median_residency_length" TEXT,
  ADD COLUMN "shlav_aleph_pass_rate" DOUBLE PRECISION,
  ADD COLUMN "shlav_bet_pass_rate" DOUBLE PRECISION,
  ADD COLUMN "new_residents_this_year" INTEGER,
  ADD COLUMN "expected_graduates_this_year" INTEGER,
  ADD COLUMN "gender_balance" TEXT,
  ADD COLUMN "perks" TEXT,
  ADD COLUMN "candidate_preferences" TEXT,
  ADD COLUMN "education_location_breakdown" JSONB;

CREATE INDEX "Institution_region_idx" ON "Institution"("region");
