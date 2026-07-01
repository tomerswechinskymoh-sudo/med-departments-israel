-- Student electives preview support.
ALTER TYPE "ElectiveApplicationStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "ElectiveApplicationStatus" ADD VALUE IF NOT EXISTS 'WAITLISTED';

ALTER TABLE "ElectiveApplication"
  ADD COLUMN IF NOT EXISTS "applicant_user_id" TEXT;

CREATE INDEX IF NOT EXISTS "ElectiveApplication_applicant_user_id_created_at_idx"
  ON "ElectiveApplication"("applicant_user_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ElectiveApplication_applicant_user_id_fkey'
  ) THEN
    ALTER TABLE "ElectiveApplication"
      ADD CONSTRAINT "ElectiveApplication_applicant_user_id_fkey"
      FOREIGN KEY ("applicant_user_id")
      REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
