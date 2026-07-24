-- Standalone hidden clinical rotations module.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClinicalRotationAccessRole') THEN
    CREATE TYPE "ClinicalRotationAccessRole" AS ENUM ('REPRESENTATIVE', 'VIEW_ONLY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClinicalRotationOfferingStatus') THEN
    CREATE TYPE "ClinicalRotationOfferingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClinicalRotationApplicationStatus') THEN
    CREATE TYPE "ClinicalRotationApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'DECLINED', 'CANCELLED', 'COMPLETED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClinicalRotationPaymentStatus') THEN
    CREATE TYPE "ClinicalRotationPaymentStatus" AS ENUM ('NOT_REQUIRED', 'CASH_DUE', 'LINK_PENDING', 'LINK_SENT', 'PAID', 'WAIVED', 'OVERDUE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClinicalRotationPaymentMethod') THEN
    CREATE TYPE "ClinicalRotationPaymentMethod" AS ENUM ('CASH_AT_ROTATION', 'EXTERNAL_PAYMENT_LINK');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClinicalRotationPriceUnit') THEN
    CREATE TYPE "ClinicalRotationPriceUnit" AS ENUM ('TOTAL', 'PER_WEEK');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClinicalRotationCoreSpecialty') THEN
    CREATE TYPE "ClinicalRotationCoreSpecialty" AS ENUM ('INTERNAL_MEDICINE', 'GENERAL_SURGERY', 'PEDIATRICS', 'OBSTETRICS_GYNECOLOGY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClinicalRotationCoreRuleEnforcementMode') THEN
    CREATE TYPE "ClinicalRotationCoreRuleEnforcementMode" AS ENUM ('WARN', 'BLOCK');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ClinicalRotationHospitalAccess" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "hospital_id" TEXT NOT NULL,
  "role" "ClinicalRotationAccessRole" NOT NULL DEFAULT 'REPRESENTATIVE',
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activated_at" TIMESTAMP(3),
  "deactivated_at" TIMESTAMP(3),
  "last_reset_at" TIMESTAMP(3),
  "created_by_admin_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalRotationHospitalAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationHospitalAccess_user_id_hospital_id_key"
  ON "ClinicalRotationHospitalAccess"("user_id", "hospital_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationHospitalAccess_hospital_id_is_active_idx"
  ON "ClinicalRotationHospitalAccess"("hospital_id", "is_active");
CREATE INDEX IF NOT EXISTS "ClinicalRotationHospitalAccess_user_id_is_active_idx"
  ON "ClinicalRotationHospitalAccess"("user_id", "is_active");
CREATE INDEX IF NOT EXISTS "ClinicalRotationHospitalAccess_created_by_admin_id_idx"
  ON "ClinicalRotationHospitalAccess"("created_by_admin_id");

CREATE TABLE IF NOT EXISTS "ClinicalRotationAvailabilityWindow" (
  "id" TEXT NOT NULL,
  "hospital_id" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalRotationAvailabilityWindow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClinicalRotationAvailabilityWindow_hospital_id_starts_at_ends_at_idx"
  ON "ClinicalRotationAvailabilityWindow"("hospital_id", "starts_at", "ends_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationAvailabilityWindow_created_by_user_id_idx"
  ON "ClinicalRotationAvailabilityWindow"("created_by_user_id");

CREATE TABLE IF NOT EXISTS "ClinicalRotationBlackout" (
  "id" TEXT NOT NULL,
  "hospital_id" TEXT NOT NULL,
  "availability_window_id" TEXT,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalRotationBlackout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClinicalRotationBlackout_hospital_id_starts_at_ends_at_idx"
  ON "ClinicalRotationBlackout"("hospital_id", "starts_at", "ends_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationBlackout_availability_window_id_idx"
  ON "ClinicalRotationBlackout"("availability_window_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationBlackout_created_by_user_id_idx"
  ON "ClinicalRotationBlackout"("created_by_user_id");

CREATE TABLE IF NOT EXISTS "ClinicalRotationOffering" (
  "id" TEXT NOT NULL,
  "hospital_id" TEXT NOT NULL,
  "specialty_id" TEXT NOT NULL,
  "department_id" TEXT,
  "core_specialty" "ClinicalRotationCoreSpecialty",
  "slug" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "minimum_participants" INTEGER NOT NULL DEFAULT 1,
  "maximum_capacity" INTEGER,
  "price_amount" DECIMAL(10, 2) NOT NULL,
  "price_currency" TEXT NOT NULL DEFAULT 'ILS',
  "price_unit" "ClinicalRotationPriceUnit" NOT NULL DEFAULT 'PER_WEEK',
  "payment_method" "ClinicalRotationPaymentMethod" NOT NULL,
  "payment_link" TEXT,
  "status" "ClinicalRotationOfferingStatus" NOT NULL DEFAULT 'DRAFT',
  "published_at" TIMESTAMP(3),
  "paused_at" TIMESTAMP(3),
  "closed_at" TIMESTAMP(3),
  "student_instructions" TEXT,
  "internal_notes" TEXT,
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalRotationOffering_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationOffering_slug_key"
  ON "ClinicalRotationOffering"("slug");
CREATE INDEX IF NOT EXISTS "ClinicalRotationOffering_hospital_id_status_starts_at_idx"
  ON "ClinicalRotationOffering"("hospital_id", "status", "starts_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationOffering_specialty_id_status_idx"
  ON "ClinicalRotationOffering"("specialty_id", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationOffering_department_id_idx"
  ON "ClinicalRotationOffering"("department_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationOffering_core_specialty_status_idx"
  ON "ClinicalRotationOffering"("core_specialty", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationOffering_created_by_user_id_idx"
  ON "ClinicalRotationOffering"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationOffering_updated_by_user_id_idx"
  ON "ClinicalRotationOffering"("updated_by_user_id");

CREATE TABLE IF NOT EXISTS "ClinicalRotationApplication" (
  "id" TEXT NOT NULL,
  "offering_id" TEXT NOT NULL,
  "student_user_id" TEXT NOT NULL,
  "hospital_id" TEXT NOT NULL,
  "specialty_id" TEXT NOT NULL,
  "department_id" TEXT,
  "core_specialty" "ClinicalRotationCoreSpecialty",
  "requested_start_at" TIMESTAMP(3) NOT NULL,
  "requested_end_at" TIMESTAMP(3) NOT NULL,
  "status" "ClinicalRotationApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "student_notes" TEXT,
  "hospital_notes" TEXT,
  "admin_notes" TEXT,
  "rule_snapshot_json" JSONB,
  "limit_evaluation_json" JSONB,
  "decided_by_user_id" TEXT,
  "decided_at" TIMESTAMP(3),
  "completed_by_user_id" TEXT,
  "completed_at" TIMESTAMP(3),
  "cancelled_by_user_id" TEXT,
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalRotationApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClinicalRotationApplication_offering_id_status_idx"
  ON "ClinicalRotationApplication"("offering_id", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationApplication_student_user_id_status_requested_start_at_idx"
  ON "ClinicalRotationApplication"("student_user_id", "status", "requested_start_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationApplication_hospital_id_status_requested_start_at_idx"
  ON "ClinicalRotationApplication"("hospital_id", "status", "requested_start_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationApplication_specialty_id_status_idx"
  ON "ClinicalRotationApplication"("specialty_id", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationApplication_core_specialty_status_idx"
  ON "ClinicalRotationApplication"("core_specialty", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationApplication_department_id_idx"
  ON "ClinicalRotationApplication"("department_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationApplication_decided_by_user_id_idx"
  ON "ClinicalRotationApplication"("decided_by_user_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationApplication_completed_by_user_id_idx"
  ON "ClinicalRotationApplication"("completed_by_user_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationApplication_cancelled_by_user_id_idx"
  ON "ClinicalRotationApplication"("cancelled_by_user_id");

CREATE TABLE IF NOT EXISTS "ClinicalRotationPayment" (
  "id" TEXT NOT NULL,
  "application_id" TEXT NOT NULL,
  "status" "ClinicalRotationPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "method" "ClinicalRotationPaymentMethod" NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ILS',
  "payment_link" TEXT,
  "link_sent_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "waived_at" TIMESTAMP(3),
  "overdue_at" TIMESTAMP(3),
  "updated_by_user_id" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalRotationPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationPayment_application_id_key"
  ON "ClinicalRotationPayment"("application_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationPayment_status_updated_at_idx"
  ON "ClinicalRotationPayment"("status", "updated_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationPayment_method_status_idx"
  ON "ClinicalRotationPayment"("method", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationPayment_updated_by_user_id_idx"
  ON "ClinicalRotationPayment"("updated_by_user_id");

CREATE TABLE IF NOT EXISTS "ClinicalRotationCoreRule" (
  "id" TEXT NOT NULL,
  "core_specialty" "ClinicalRotationCoreSpecialty" NOT NULL,
  "specialty_id" TEXT,
  "max_weeks" INTEGER NOT NULL,
  "effective_date" TIMESTAMP(3) NOT NULL,
  "enforcement_mode" "ClinicalRotationCoreRuleEnforcementMode" NOT NULL DEFAULT 'WARN',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "created_by_user_id" TEXT,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicalRotationCoreRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationCoreRule_core_specialty_effective_date_key"
  ON "ClinicalRotationCoreRule"("core_specialty", "effective_date");
CREATE INDEX IF NOT EXISTS "ClinicalRotationCoreRule_core_specialty_is_active_effective_date_idx"
  ON "ClinicalRotationCoreRule"("core_specialty", "is_active", "effective_date");
CREATE INDEX IF NOT EXISTS "ClinicalRotationCoreRule_specialty_id_idx"
  ON "ClinicalRotationCoreRule"("specialty_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationCoreRule_created_by_user_id_idx"
  ON "ClinicalRotationCoreRule"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationCoreRule_updated_by_user_id_idx"
  ON "ClinicalRotationCoreRule"("updated_by_user_id");

CREATE TABLE IF NOT EXISTS "ClinicalRotationAuditLog" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "hospital_id" TEXT,
  "offering_id" TEXT,
  "application_id" TEXT,
  "payment_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalRotationAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClinicalRotationAuditLog_action_created_at_idx"
  ON "ClinicalRotationAuditLog"("action", "created_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationAuditLog_actor_user_id_created_at_idx"
  ON "ClinicalRotationAuditLog"("actor_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationAuditLog_hospital_id_created_at_idx"
  ON "ClinicalRotationAuditLog"("hospital_id", "created_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationAuditLog_offering_id_created_at_idx"
  ON "ClinicalRotationAuditLog"("offering_id", "created_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationAuditLog_application_id_created_at_idx"
  ON "ClinicalRotationAuditLog"("application_id", "created_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationAuditLog_payment_id_created_at_idx"
  ON "ClinicalRotationAuditLog"("payment_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationHospitalAccess_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationHospitalAccess"
      ADD CONSTRAINT "ClinicalRotationHospitalAccess_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationHospitalAccess_hospital_id_fkey') THEN
    ALTER TABLE "ClinicalRotationHospitalAccess"
      ADD CONSTRAINT "ClinicalRotationHospitalAccess_hospital_id_fkey"
      FOREIGN KEY ("hospital_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationHospitalAccess_created_by_admin_id_fkey') THEN
    ALTER TABLE "ClinicalRotationHospitalAccess"
      ADD CONSTRAINT "ClinicalRotationHospitalAccess_created_by_admin_id_fkey"
      FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationAvailabilityWindow_hospital_id_fkey') THEN
    ALTER TABLE "ClinicalRotationAvailabilityWindow"
      ADD CONSTRAINT "ClinicalRotationAvailabilityWindow_hospital_id_fkey"
      FOREIGN KEY ("hospital_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationAvailabilityWindow_created_by_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationAvailabilityWindow"
      ADD CONSTRAINT "ClinicalRotationAvailabilityWindow_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationBlackout_hospital_id_fkey') THEN
    ALTER TABLE "ClinicalRotationBlackout"
      ADD CONSTRAINT "ClinicalRotationBlackout_hospital_id_fkey"
      FOREIGN KEY ("hospital_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationBlackout_availability_window_id_fkey') THEN
    ALTER TABLE "ClinicalRotationBlackout"
      ADD CONSTRAINT "ClinicalRotationBlackout_availability_window_id_fkey"
      FOREIGN KEY ("availability_window_id") REFERENCES "ClinicalRotationAvailabilityWindow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationBlackout_created_by_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationBlackout"
      ADD CONSTRAINT "ClinicalRotationBlackout_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationOffering_hospital_id_fkey') THEN
    ALTER TABLE "ClinicalRotationOffering"
      ADD CONSTRAINT "ClinicalRotationOffering_hospital_id_fkey"
      FOREIGN KEY ("hospital_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationOffering_specialty_id_fkey') THEN
    ALTER TABLE "ClinicalRotationOffering"
      ADD CONSTRAINT "ClinicalRotationOffering_specialty_id_fkey"
      FOREIGN KEY ("specialty_id") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationOffering_department_id_fkey') THEN
    ALTER TABLE "ClinicalRotationOffering"
      ADD CONSTRAINT "ClinicalRotationOffering_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationOffering_created_by_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationOffering"
      ADD CONSTRAINT "ClinicalRotationOffering_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationOffering_updated_by_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationOffering"
      ADD CONSTRAINT "ClinicalRotationOffering_updated_by_user_id_fkey"
      FOREIGN KEY ("updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationApplication_offering_id_fkey') THEN
    ALTER TABLE "ClinicalRotationApplication"
      ADD CONSTRAINT "ClinicalRotationApplication_offering_id_fkey"
      FOREIGN KEY ("offering_id") REFERENCES "ClinicalRotationOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationApplication_student_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationApplication"
      ADD CONSTRAINT "ClinicalRotationApplication_student_user_id_fkey"
      FOREIGN KEY ("student_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationApplication_hospital_id_fkey') THEN
    ALTER TABLE "ClinicalRotationApplication"
      ADD CONSTRAINT "ClinicalRotationApplication_hospital_id_fkey"
      FOREIGN KEY ("hospital_id") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationApplication_specialty_id_fkey') THEN
    ALTER TABLE "ClinicalRotationApplication"
      ADD CONSTRAINT "ClinicalRotationApplication_specialty_id_fkey"
      FOREIGN KEY ("specialty_id") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationApplication_department_id_fkey') THEN
    ALTER TABLE "ClinicalRotationApplication"
      ADD CONSTRAINT "ClinicalRotationApplication_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationApplication_decided_by_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationApplication"
      ADD CONSTRAINT "ClinicalRotationApplication_decided_by_user_id_fkey"
      FOREIGN KEY ("decided_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationApplication_completed_by_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationApplication"
      ADD CONSTRAINT "ClinicalRotationApplication_completed_by_user_id_fkey"
      FOREIGN KEY ("completed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationApplication_cancelled_by_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationApplication"
      ADD CONSTRAINT "ClinicalRotationApplication_cancelled_by_user_id_fkey"
      FOREIGN KEY ("cancelled_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationPayment_application_id_fkey') THEN
    ALTER TABLE "ClinicalRotationPayment"
      ADD CONSTRAINT "ClinicalRotationPayment_application_id_fkey"
      FOREIGN KEY ("application_id") REFERENCES "ClinicalRotationApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationPayment_updated_by_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationPayment"
      ADD CONSTRAINT "ClinicalRotationPayment_updated_by_user_id_fkey"
      FOREIGN KEY ("updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationCoreRule_specialty_id_fkey') THEN
    ALTER TABLE "ClinicalRotationCoreRule"
      ADD CONSTRAINT "ClinicalRotationCoreRule_specialty_id_fkey"
      FOREIGN KEY ("specialty_id") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationCoreRule_created_by_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationCoreRule"
      ADD CONSTRAINT "ClinicalRotationCoreRule_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationCoreRule_updated_by_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationCoreRule"
      ADD CONSTRAINT "ClinicalRotationCoreRule_updated_by_user_id_fkey"
      FOREIGN KEY ("updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationAuditLog_actor_user_id_fkey') THEN
    ALTER TABLE "ClinicalRotationAuditLog"
      ADD CONSTRAINT "ClinicalRotationAuditLog_actor_user_id_fkey"
      FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationAuditLog_hospital_id_fkey') THEN
    ALTER TABLE "ClinicalRotationAuditLog"
      ADD CONSTRAINT "ClinicalRotationAuditLog_hospital_id_fkey"
      FOREIGN KEY ("hospital_id") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationAuditLog_offering_id_fkey') THEN
    ALTER TABLE "ClinicalRotationAuditLog"
      ADD CONSTRAINT "ClinicalRotationAuditLog_offering_id_fkey"
      FOREIGN KEY ("offering_id") REFERENCES "ClinicalRotationOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationAuditLog_application_id_fkey') THEN
    ALTER TABLE "ClinicalRotationAuditLog"
      ADD CONSTRAINT "ClinicalRotationAuditLog_application_id_fkey"
      FOREIGN KEY ("application_id") REFERENCES "ClinicalRotationApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicalRotationAuditLog_payment_id_fkey') THEN
    ALTER TABLE "ClinicalRotationAuditLog"
      ADD CONSTRAINT "ClinicalRotationAuditLog_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "ClinicalRotationPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
