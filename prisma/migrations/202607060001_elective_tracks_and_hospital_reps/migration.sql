-- Hidden electives MVP: track-specific elective settings and payment metadata.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ElectiveTrackType') THEN
    CREATE TYPE "ElectiveTrackType" AS ENUM ('ISRAELI_FACULTY_STUDENT', 'ABROAD_ISRAELI_STUDENT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ElectiveDepartmentTrackSettings" (
  "id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "track_type" "ElectiveTrackType" NOT NULL,
  "allow_applications" BOOLEAN NOT NULL DEFAULT false,
  "max_students_at_once" INTEGER NOT NULL DEFAULT 1,
  "min_duration_days" INTEGER,
  "max_duration_days" INTEGER,
  "notes" TEXT,
  "payment_required" BOOLEAN NOT NULL DEFAULT false,
  "payment_amount" DECIMAL(10, 2),
  "payment_currency" TEXT NOT NULL DEFAULT 'ILS',
  "payment_link" TEXT,
  "payment_instructions" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ElectiveDepartmentTrackSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ElectiveDepartmentTrackSettings_department_track_key"
  ON "ElectiveDepartmentTrackSettings"("department_id", "track_type");

CREATE INDEX IF NOT EXISTS "ElectiveDepartmentTrackSettings_track_allow_idx"
  ON "ElectiveDepartmentTrackSettings"("track_type", "allow_applications");

CREATE INDEX IF NOT EXISTS "ElectiveDepartmentTrackSettings_department_allow_idx"
  ON "ElectiveDepartmentTrackSettings"("department_id", "allow_applications");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ElectiveDepartmentTrackSettings_department_id_fkey'
  ) THEN
    ALTER TABLE "ElectiveDepartmentTrackSettings"
      ADD CONSTRAINT "ElectiveDepartmentTrackSettings_department_id_fkey"
      FOREIGN KEY ("department_id")
      REFERENCES "Department"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ElectiveAvailabilityWindow"
  ADD COLUMN IF NOT EXISTS "track_type" "ElectiveTrackType";

CREATE INDEX IF NOT EXISTS "ElectiveAvailabilityWindow_department_track_dates_idx"
  ON "ElectiveAvailabilityWindow"("department_id", "track_type", "starts_at", "ends_at");

ALTER TABLE "ElectiveApplication"
  ADD COLUMN IF NOT EXISTS "track_type" "ElectiveTrackType" NOT NULL DEFAULT 'ISRAELI_FACULTY_STUDENT';

CREATE INDEX IF NOT EXISTS "ElectiveApplication_department_track_status_idx"
  ON "ElectiveApplication"("department_id", "track_type", "status");
