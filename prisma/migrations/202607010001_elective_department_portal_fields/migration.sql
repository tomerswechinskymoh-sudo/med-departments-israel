-- Add department-representative portal fields for private elective management.
ALTER TABLE "ElectiveDepartmentSettings"
  ADD COLUMN IF NOT EXISTS "min_duration_days" INTEGER,
  ADD COLUMN IF NOT EXISTS "max_duration_days" INTEGER,
  ADD COLUMN IF NOT EXISTS "allow_applications" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "ElectiveAvailabilityWindow"
  ADD COLUMN IF NOT EXISTS "capacity_override" INTEGER,
  ADD COLUMN IF NOT EXISTS "reason" TEXT;
