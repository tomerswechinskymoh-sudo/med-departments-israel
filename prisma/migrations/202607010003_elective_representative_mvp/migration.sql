-- Private electives MVP: multi-department representatives and decision workflow.
ALTER TYPE "ElectiveApplicationStatus" ADD VALUE IF NOT EXISTS 'ALTERNATIVE_OFFERED';
ALTER TYPE "ElectiveApplicationStatus" ADD VALUE IF NOT EXISTS 'ALTERNATIVE_ACCEPTED';
ALTER TYPE "ElectiveApplicationStatus" ADD VALUE IF NOT EXISTS 'ALTERNATIVE_DECLINED';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ElectiveRepresentativeAssignmentRole') THEN
    CREATE TYPE "ElectiveRepresentativeAssignmentRole" AS ENUM ('PRIMARY', 'SECONDARY', 'VIEW_ONLY');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ElectiveRepresentativeAccount" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "phone" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ElectiveRepresentativeAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ElectiveRepresentativeAccount_email_key"
  ON "ElectiveRepresentativeAccount"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "ElectiveRepresentativeAccount_username_key"
  ON "ElectiveRepresentativeAccount"("username");

CREATE INDEX IF NOT EXISTS "ElectiveRepresentativeAccount_is_active_idx"
  ON "ElectiveRepresentativeAccount"("is_active");

CREATE TABLE IF NOT EXISTS "ElectiveRepresentativeDepartmentAssignment" (
  "id" TEXT NOT NULL,
  "representative_account_id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "role" "ElectiveRepresentativeAssignmentRole" NOT NULL DEFAULT 'PRIMARY',
  "receives_application_emails" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ElectiveRepresentativeDepartmentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ElectiveRepresentativeDepartmentAssignment_representative_department_key"
  ON "ElectiveRepresentativeDepartmentAssignment"("representative_account_id", "department_id");

CREATE INDEX IF NOT EXISTS "ElectiveRepresentativeDepartmentAssignment_department_id_idx"
  ON "ElectiveRepresentativeDepartmentAssignment"("department_id");

CREATE INDEX IF NOT EXISTS "ElectiveRepresentativeDepartmentAssignment_receives_emails_idx"
  ON "ElectiveRepresentativeDepartmentAssignment"("receives_application_emails");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ElectiveRepresentativeDepartmentAssignment_representative_account_id_fkey'
  ) THEN
    ALTER TABLE "ElectiveRepresentativeDepartmentAssignment"
      ADD CONSTRAINT "ElectiveRepresentativeDepartmentAssignment_representative_account_id_fkey"
      FOREIGN KEY ("representative_account_id")
      REFERENCES "ElectiveRepresentativeAccount"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ElectiveRepresentativeDepartmentAssignment_department_id_fkey'
  ) THEN
    ALTER TABLE "ElectiveRepresentativeDepartmentAssignment"
      ADD CONSTRAINT "ElectiveRepresentativeDepartmentAssignment_department_id_fkey"
      FOREIGN KEY ("department_id")
      REFERENCES "Department"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ElectiveApplication"
  ADD COLUMN IF NOT EXISTS "representative_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "proposed_start_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "proposed_end_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "proposed_by_representative_id" TEXT,
  ADD COLUMN IF NOT EXISTS "decision_by_representative_id" TEXT,
  ADD COLUMN IF NOT EXISTS "decision_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ElectiveApplication_proposed_by_representative_id_idx"
  ON "ElectiveApplication"("proposed_by_representative_id");

CREATE INDEX IF NOT EXISTS "ElectiveApplication_decision_by_representative_id_idx"
  ON "ElectiveApplication"("decision_by_representative_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ElectiveApplication_proposed_by_representative_id_fkey'
  ) THEN
    ALTER TABLE "ElectiveApplication"
      ADD CONSTRAINT "ElectiveApplication_proposed_by_representative_id_fkey"
      FOREIGN KEY ("proposed_by_representative_id")
      REFERENCES "ElectiveRepresentativeAccount"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ElectiveApplication_decision_by_representative_id_fkey'
  ) THEN
    ALTER TABLE "ElectiveApplication"
      ADD CONSTRAINT "ElectiveApplication_decision_by_representative_id_fkey"
      FOREIGN KEY ("decision_by_representative_id")
      REFERENCES "ElectiveRepresentativeAccount"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
