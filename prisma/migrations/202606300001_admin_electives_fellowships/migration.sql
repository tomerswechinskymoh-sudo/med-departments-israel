DO $$
BEGIN
  CREATE TYPE "ElectiveAvailabilityMode" AS ENUM ('OPEN_BY_DEFAULT', 'CLOSED_BY_DEFAULT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ElectiveWindowStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ElectiveApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "FellowshipExperienceVisibility" AS ENUM ('ADMIN_ONLY', 'PUBLIC_ANONYMIZED', 'PUBLIC_IDENTIFIED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ElectiveDepartmentAccount" (
  "id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMP(3),
  "created_by_admin_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ElectiveDepartmentAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ElectiveDepartmentSettings" (
  "id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "max_students_at_once" INTEGER NOT NULL DEFAULT 1,
  "availability_mode" "ElectiveAvailabilityMode" NOT NULL DEFAULT 'CLOSED_BY_DEFAULT',
  "contact_email" TEXT,
  "contact_phone" TEXT,
  "instructions" TEXT,
  "admin_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ElectiveDepartmentSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ElectiveAvailabilityWindow" (
  "id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "status" "ElectiveWindowStatus" NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ElectiveAvailabilityWindow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ElectiveApplication" (
  "id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "applicant_name" TEXT NOT NULL,
  "applicant_email" TEXT NOT NULL,
  "applicant_phone" TEXT,
  "medical_school" TEXT,
  "requested_start_date" TIMESTAMP(3),
  "requested_end_date" TIMESTAMP(3),
  "status" "ElectiveApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "student_notes" TEXT,
  "admin_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ElectiveApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FellowshipSpecialty" (
  "id" TEXT NOT NULL,
  "base_specialty_id" TEXT,
  "slug" TEXT NOT NULL,
  "name_he" TEXT NOT NULL,
  "name_en" TEXT,
  "description" TEXT,
  "before_content" TEXT,
  "during_content" TEXT,
  "after_content" TEXT,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "created_by_admin_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FellowshipSpecialty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FellowshipProgram" (
  "id" TEXT NOT NULL,
  "fellowship_specialty_id" TEXT NOT NULL,
  "base_specialty_id" TEXT,
  "country" TEXT NOT NULL,
  "city" TEXT,
  "institution" TEXT NOT NULL,
  "department_name" TEXT,
  "duration" TEXT,
  "requirements" TEXT,
  "contact_name" TEXT,
  "contact_email" TEXT,
  "contact_phone" TEXT,
  "website_url" TEXT,
  "notes" TEXT,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "created_by_admin_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FellowshipProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FellowshipIsraeliExperience" (
  "id" TEXT NOT NULL,
  "fellowship_program_id" TEXT,
  "fellowship_specialty_id" TEXT,
  "physician_name" TEXT,
  "role_title" TEXT,
  "current_institution" TEXT,
  "contact_email" TEXT,
  "contact_phone" TEXT,
  "experience_text" TEXT,
  "visibility" "FellowshipExperienceVisibility" NOT NULL DEFAULT 'ADMIN_ONLY',
  "notes" TEXT,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "created_by_admin_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FellowshipIsraeliExperience_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ElectiveDepartmentAccount_department_id_key" ON "ElectiveDepartmentAccount"("department_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ElectiveDepartmentAccount_username_key" ON "ElectiveDepartmentAccount"("username");
CREATE INDEX IF NOT EXISTS "ElectiveDepartmentAccount_department_id_is_active_idx" ON "ElectiveDepartmentAccount"("department_id", "is_active");
CREATE INDEX IF NOT EXISTS "ElectiveDepartmentAccount_created_by_admin_id_idx" ON "ElectiveDepartmentAccount"("created_by_admin_id");

CREATE UNIQUE INDEX IF NOT EXISTS "ElectiveDepartmentSettings_department_id_key" ON "ElectiveDepartmentSettings"("department_id");
CREATE INDEX IF NOT EXISTS "ElectiveDepartmentSettings_availability_mode_idx" ON "ElectiveDepartmentSettings"("availability_mode");

CREATE INDEX IF NOT EXISTS "ElectiveAvailabilityWindow_department_id_starts_at_ends_at_idx" ON "ElectiveAvailabilityWindow"("department_id", "starts_at", "ends_at");
CREATE INDEX IF NOT EXISTS "ElectiveAvailabilityWindow_status_starts_at_idx" ON "ElectiveAvailabilityWindow"("status", "starts_at");

CREATE INDEX IF NOT EXISTS "ElectiveApplication_department_id_status_idx" ON "ElectiveApplication"("department_id", "status");
CREATE INDEX IF NOT EXISTS "ElectiveApplication_applicant_email_created_at_idx" ON "ElectiveApplication"("applicant_email", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "FellowshipSpecialty_slug_key" ON "FellowshipSpecialty"("slug");
CREATE INDEX IF NOT EXISTS "FellowshipSpecialty_base_specialty_id_idx" ON "FellowshipSpecialty"("base_specialty_id");
CREATE INDEX IF NOT EXISTS "FellowshipSpecialty_is_published_idx" ON "FellowshipSpecialty"("is_published");

CREATE INDEX IF NOT EXISTS "FellowshipProgram_fellowship_specialty_id_is_published_idx" ON "FellowshipProgram"("fellowship_specialty_id", "is_published");
CREATE INDEX IF NOT EXISTS "FellowshipProgram_base_specialty_id_idx" ON "FellowshipProgram"("base_specialty_id");
CREATE INDEX IF NOT EXISTS "FellowshipProgram_country_city_idx" ON "FellowshipProgram"("country", "city");

CREATE INDEX IF NOT EXISTS "FellowshipIsraeliExperience_fellowship_program_id_idx" ON "FellowshipIsraeliExperience"("fellowship_program_id");
CREATE INDEX IF NOT EXISTS "FellowshipIsraeliExperience_fellowship_specialty_id_visibility_idx" ON "FellowshipIsraeliExperience"("fellowship_specialty_id", "visibility");
CREATE INDEX IF NOT EXISTS "FellowshipIsraeliExperience_visibility_is_published_idx" ON "FellowshipIsraeliExperience"("visibility", "is_published");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ElectiveDepartmentAccount_department_id_fkey') THEN
    ALTER TABLE "ElectiveDepartmentAccount" ADD CONSTRAINT "ElectiveDepartmentAccount_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ElectiveDepartmentAccount_created_by_admin_id_fkey') THEN
    ALTER TABLE "ElectiveDepartmentAccount" ADD CONSTRAINT "ElectiveDepartmentAccount_created_by_admin_id_fkey"
      FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ElectiveDepartmentSettings_department_id_fkey') THEN
    ALTER TABLE "ElectiveDepartmentSettings" ADD CONSTRAINT "ElectiveDepartmentSettings_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ElectiveAvailabilityWindow_department_id_fkey') THEN
    ALTER TABLE "ElectiveAvailabilityWindow" ADD CONSTRAINT "ElectiveAvailabilityWindow_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ElectiveApplication_department_id_fkey') THEN
    ALTER TABLE "ElectiveApplication" ADD CONSTRAINT "ElectiveApplication_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FellowshipSpecialty_base_specialty_id_fkey') THEN
    ALTER TABLE "FellowshipSpecialty" ADD CONSTRAINT "FellowshipSpecialty_base_specialty_id_fkey"
      FOREIGN KEY ("base_specialty_id") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FellowshipSpecialty_created_by_admin_id_fkey') THEN
    ALTER TABLE "FellowshipSpecialty" ADD CONSTRAINT "FellowshipSpecialty_created_by_admin_id_fkey"
      FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FellowshipProgram_fellowship_specialty_id_fkey') THEN
    ALTER TABLE "FellowshipProgram" ADD CONSTRAINT "FellowshipProgram_fellowship_specialty_id_fkey"
      FOREIGN KEY ("fellowship_specialty_id") REFERENCES "FellowshipSpecialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FellowshipProgram_base_specialty_id_fkey') THEN
    ALTER TABLE "FellowshipProgram" ADD CONSTRAINT "FellowshipProgram_base_specialty_id_fkey"
      FOREIGN KEY ("base_specialty_id") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FellowshipProgram_created_by_admin_id_fkey') THEN
    ALTER TABLE "FellowshipProgram" ADD CONSTRAINT "FellowshipProgram_created_by_admin_id_fkey"
      FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FellowshipIsraeliExperience_fellowship_program_id_fkey') THEN
    ALTER TABLE "FellowshipIsraeliExperience" ADD CONSTRAINT "FellowshipIsraeliExperience_fellowship_program_id_fkey"
      FOREIGN KEY ("fellowship_program_id") REFERENCES "FellowshipProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FellowshipIsraeliExperience_fellowship_specialty_id_fkey') THEN
    ALTER TABLE "FellowshipIsraeliExperience" ADD CONSTRAINT "FellowshipIsraeliExperience_fellowship_specialty_id_fkey"
      FOREIGN KEY ("fellowship_specialty_id") REFERENCES "FellowshipSpecialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FellowshipIsraeliExperience_created_by_admin_id_fkey') THEN
    ALTER TABLE "FellowshipIsraeliExperience" ADD CONSTRAINT "FellowshipIsraeliExperience_created_by_admin_id_fkey"
      FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
