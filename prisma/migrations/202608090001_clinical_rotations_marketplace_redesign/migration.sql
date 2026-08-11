ALTER TYPE "ClinicalRotationOfferingStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "ClinicalRotationApplicationStatus" ADD VALUE IF NOT EXISTS 'WAITLISTED';
ALTER TYPE "ClinicalRotationApplicationStatus" ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUESTED';
ALTER TYPE "UploadedFileCategory" ADD VALUE IF NOT EXISTS 'CLINICAL_ROTATION_IDENTITY_DOCUMENT';
ALTER TYPE "UploadedFileCategory" ADD VALUE IF NOT EXISTS 'CLINICAL_ROTATION_ELIGIBILITY_IMPORT';

DO $$ BEGIN
    CREATE TYPE "ClinicalRotationAdminPermissionKey" AS ENUM ('CAN_REVIEW_IDENTITY_DOCUMENTS');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClinicalRotationIdentityVerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClinicalRotationEligibilityImportStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClinicalRotationGroupStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'DECLINED', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClinicalRotationGroupMemberStatus" AS ENUM ('JOINED', 'APPROVED', 'DECLINED', 'CANCELLED', 'REMOVED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClinicalRotationCancellationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'RECORDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClinicalRotationCancellationActorType" AS ENUM ('STUDENT', 'COORDINATOR', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClinicalRotationCancellationReasonCategory" AS ENUM ('SCHEDULE_CONFLICT', 'PERSONAL', 'ELIGIBILITY', 'CAPACITY', 'PAYMENT', 'HOSPITAL', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "ClinicalRotationStudentIdentity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "student_anonymous_key" TEXT,
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "status" "ClinicalRotationIdentityVerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "pending_document_file_id" TEXT,
    "submitted_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "verifier_user_id" TEXT,
    "document_deleted_at" TIMESTAMP(3),
    "reviewer_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClinicalRotationStudentIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClinicalRotationAdminPermission" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key" "ClinicalRotationAdminPermissionKey" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "granted_by_user_id" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClinicalRotationAdminPermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClinicalRotationEligibilityImport" (
    "id" TEXT NOT NULL,
    "source_label" TEXT NOT NULL,
    "status" "ClinicalRotationEligibilityImportStatus" NOT NULL DEFAULT 'INACTIVE',
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "accepted_row_count" INTEGER NOT NULL DEFAULT 0,
    "rejected_row_count" INTEGER NOT NULL DEFAULT 0,
    "validation_summary_json" JSONB,
    "source_deleted_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClinicalRotationEligibilityImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClinicalRotationEligibilityEntry" (
    "id" TEXT NOT NULL,
    "import_id" TEXT NOT NULL,
    "student_anonymous_key" TEXT NOT NULL,
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClinicalRotationEligibilityEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ClinicalRotationOffering"
    ADD COLUMN IF NOT EXISTS "min_duration_weeks" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "max_duration_weeks" INTEGER NOT NULL DEFAULT 12,
    ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "requirements" TEXT,
    ADD COLUMN IF NOT EXISTS "cancellation_policy" TEXT,
    ADD COLUMN IF NOT EXISTS "work_language" TEXT,
    ADD COLUMN IF NOT EXISTS "department_contact_name" TEXT,
    ADD COLUMN IF NOT EXISTS "department_contact_email" TEXT,
    ADD COLUMN IF NOT EXISTS "requires_dean_approval" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "requires_insurance" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "group_registration_enabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "group_min_size" INTEGER,
    ADD COLUMN IF NOT EXISTS "group_max_size" INTEGER,
    ADD COLUMN IF NOT EXISTS "is_preview_only" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "application_blocked_reason" TEXT;

ALTER TABLE "ClinicalRotationApplication"
    ADD COLUMN IF NOT EXISTS "student_anonymous_key" TEXT,
    ADD COLUMN IF NOT EXISTS "key_version" INTEGER,
    ADD COLUMN IF NOT EXISTS "group_id" TEXT,
    ADD COLUMN IF NOT EXISTS "duration_weeks" INTEGER,
    ADD COLUMN IF NOT EXISTS "eligibility_snapshot_json" JSONB,
    ADD COLUMN IF NOT EXISTS "compliance_snapshot_json" JSONB,
    ADD COLUMN IF NOT EXISTS "accepted_requirements_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ClinicalRotationGroupApplication" (
    "id" TEXT NOT NULL,
    "offering_id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "department_id" TEXT,
    "creator_user_id" TEXT NOT NULL,
    "creator_student_anonymous_key" TEXT,
    "key_version" INTEGER,
    "status" "ClinicalRotationGroupStatus" NOT NULL DEFAULT 'SUBMITTED',
    "invite_token_hash" TEXT NOT NULL,
    "invite_expires_at" TIMESTAMP(3) NOT NULL,
    "invite_revoked_at" TIMESTAMP(3),
    "max_members" INTEGER NOT NULL,
    "requested_start_at" TIMESTAMP(3) NOT NULL,
    "requested_end_at" TIMESTAMP(3) NOT NULL,
    "duration_weeks" INTEGER NOT NULL,
    "accepted_requirements_at" TIMESTAMP(3),
    "compliance_snapshot_json" JSONB,
    "coordinator_notes" TEXT,
    "decided_by_user_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClinicalRotationGroupApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClinicalRotationGroupMember" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "student_anonymous_key" TEXT,
    "key_version" INTEGER,
    "status" "ClinicalRotationGroupMemberStatus" NOT NULL DEFAULT 'JOINED',
    "compliance_snapshot_json" JSONB,
    "accepted_requirements_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClinicalRotationGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClinicalRotationCancellation" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "group_id" TEXT,
    "student_user_id" TEXT,
    "student_anonymous_key" TEXT,
    "key_version" INTEGER,
    "hospital_id" TEXT NOT NULL,
    "offering_id" TEXT NOT NULL,
    "department_id" TEXT,
    "actor_user_id" TEXT,
    "actor_type" "ClinicalRotationCancellationActorType" NOT NULL,
    "status" "ClinicalRotationCancellationStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason_category" "ClinicalRotationCancellationReasonCategory" NOT NULL,
    "note" TEXT,
    "application_status_at_request" "ClinicalRotationApplicationStatus" NOT NULL,
    "payment_status_at_request" "ClinicalRotationPaymentStatus",
    "before_approval" BOOLEAN NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_by_user_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClinicalRotationCancellation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ClinicalRotationAuditLog"
    ADD COLUMN IF NOT EXISTS "group_id" TEXT,
    ADD COLUMN IF NOT EXISTS "cancellation_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationStudentIdentity_user_id_key" ON "ClinicalRotationStudentIdentity"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationStudentIdentity_student_anonymous_key_key" ON "ClinicalRotationStudentIdentity"("student_anonymous_key");
CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationStudentIdentity_pending_document_file_id_key" ON "ClinicalRotationStudentIdentity"("pending_document_file_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationStudentIdentity_status_submitted_at_idx" ON "ClinicalRotationStudentIdentity"("status", "submitted_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationStudentIdentity_student_anonymous_key_key_version_idx" ON "ClinicalRotationStudentIdentity"("student_anonymous_key", "key_version");
CREATE INDEX IF NOT EXISTS "ClinicalRotationStudentIdentity_verifier_user_id_idx" ON "ClinicalRotationStudentIdentity"("verifier_user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationAdminPermission_user_id_key_key" ON "ClinicalRotationAdminPermission"("user_id", "key");
CREATE INDEX IF NOT EXISTS "ClinicalRotationAdminPermission_key_is_active_idx" ON "ClinicalRotationAdminPermission"("key", "is_active");
CREATE INDEX IF NOT EXISTS "ClinicalRotationAdminPermission_granted_by_user_id_idx" ON "ClinicalRotationAdminPermission"("granted_by_user_id");

CREATE INDEX IF NOT EXISTS "ClinicalRotationEligibilityImport_status_activated_at_idx" ON "ClinicalRotationEligibilityImport"("status", "activated_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationEligibilityImport_key_version_idx" ON "ClinicalRotationEligibilityImport"("key_version");
CREATE INDEX IF NOT EXISTS "ClinicalRotationEligibilityImport_created_by_user_id_idx" ON "ClinicalRotationEligibilityImport"("created_by_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationEligibilityEntry_import_id_key_version_student_anonymous_key_key" ON "ClinicalRotationEligibilityEntry"("import_id", "key_version", "student_anonymous_key");
CREATE INDEX IF NOT EXISTS "ClinicalRotationEligibilityEntry_key_version_student_anonymous_key_idx" ON "ClinicalRotationEligibilityEntry"("key_version", "student_anonymous_key");

CREATE INDEX IF NOT EXISTS "UploadedFile_uploaded_by_user_id_category_idx" ON "UploadedFile"("uploaded_by_user_id", "category");
CREATE INDEX IF NOT EXISTS "ClinicalRotationOffering_group_registration_enabled_status_idx" ON "ClinicalRotationOffering"("group_registration_enabled", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationOffering_is_preview_only_status_idx" ON "ClinicalRotationOffering"("is_preview_only", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationApplication_student_anonymous_key_key_version_status_idx" ON "ClinicalRotationApplication"("student_anonymous_key", "key_version", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationApplication_group_id_status_idx" ON "ClinicalRotationApplication"("group_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationGroupApplication_invite_token_hash_key" ON "ClinicalRotationGroupApplication"("invite_token_hash");
CREATE INDEX IF NOT EXISTS "ClinicalRotationGroupApplication_offering_id_status_idx" ON "ClinicalRotationGroupApplication"("offering_id", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationGroupApplication_hospital_id_status_requested_start_at_idx" ON "ClinicalRotationGroupApplication"("hospital_id", "status", "requested_start_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationGroupApplication_creator_user_id_status_idx" ON "ClinicalRotationGroupApplication"("creator_user_id", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationGroupApplication_creator_student_anonymous_key_key_version_idx" ON "ClinicalRotationGroupApplication"("creator_student_anonymous_key", "key_version");
CREATE INDEX IF NOT EXISTS "ClinicalRotationGroupApplication_invite_expires_at_idx" ON "ClinicalRotationGroupApplication"("invite_expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationGroupMember_application_id_key" ON "ClinicalRotationGroupMember"("application_id");
CREATE UNIQUE INDEX IF NOT EXISTS "ClinicalRotationGroupMember_group_id_user_id_key" ON "ClinicalRotationGroupMember"("group_id", "user_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationGroupMember_group_id_status_idx" ON "ClinicalRotationGroupMember"("group_id", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationGroupMember_student_anonymous_key_key_version_idx" ON "ClinicalRotationGroupMember"("student_anonymous_key", "key_version");

CREATE INDEX IF NOT EXISTS "ClinicalRotationCancellation_application_id_status_idx" ON "ClinicalRotationCancellation"("application_id", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationCancellation_group_id_status_idx" ON "ClinicalRotationCancellation"("group_id", "status");
CREATE INDEX IF NOT EXISTS "ClinicalRotationCancellation_student_anonymous_key_key_version_requested_at_idx" ON "ClinicalRotationCancellation"("student_anonymous_key", "key_version", "requested_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationCancellation_hospital_id_requested_at_idx" ON "ClinicalRotationCancellation"("hospital_id", "requested_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationCancellation_offering_id_requested_at_idx" ON "ClinicalRotationCancellation"("offering_id", "requested_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationCancellation_department_id_idx" ON "ClinicalRotationCancellation"("department_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationCancellation_actor_user_id_idx" ON "ClinicalRotationCancellation"("actor_user_id");
CREATE INDEX IF NOT EXISTS "ClinicalRotationCancellation_decided_by_user_id_idx" ON "ClinicalRotationCancellation"("decided_by_user_id");

CREATE INDEX IF NOT EXISTS "ClinicalRotationAuditLog_group_id_created_at_idx" ON "ClinicalRotationAuditLog"("group_id", "created_at");
CREATE INDEX IF NOT EXISTS "ClinicalRotationAuditLog_cancellation_id_created_at_idx" ON "ClinicalRotationAuditLog"("cancellation_id", "created_at");

DO $$ BEGIN
    ALTER TABLE "ClinicalRotationStudentIdentity" ADD CONSTRAINT "ClinicalRotationStudentIdentity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationStudentIdentity" ADD CONSTRAINT "ClinicalRotationStudentIdentity_verifier_user_id_fkey" FOREIGN KEY ("verifier_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationStudentIdentity" ADD CONSTRAINT "ClinicalRotationStudentIdentity_pending_document_file_id_fkey" FOREIGN KEY ("pending_document_file_id") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationAdminPermission" ADD CONSTRAINT "ClinicalRotationAdminPermission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationAdminPermission" ADD CONSTRAINT "ClinicalRotationAdminPermission_granted_by_user_id_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationEligibilityImport" ADD CONSTRAINT "ClinicalRotationEligibilityImport_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationEligibilityEntry" ADD CONSTRAINT "ClinicalRotationEligibilityEntry_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "ClinicalRotationEligibilityImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationGroupApplication" ADD CONSTRAINT "ClinicalRotationGroupApplication_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "ClinicalRotationOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationGroupApplication" ADD CONSTRAINT "ClinicalRotationGroupApplication_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationGroupApplication" ADD CONSTRAINT "ClinicalRotationGroupApplication_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationGroupApplication" ADD CONSTRAINT "ClinicalRotationGroupApplication_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationGroupApplication" ADD CONSTRAINT "ClinicalRotationGroupApplication_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationApplication" ADD CONSTRAINT "ClinicalRotationApplication_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "ClinicalRotationGroupApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationGroupMember" ADD CONSTRAINT "ClinicalRotationGroupMember_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "ClinicalRotationGroupApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationGroupMember" ADD CONSTRAINT "ClinicalRotationGroupMember_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "ClinicalRotationApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationGroupMember" ADD CONSTRAINT "ClinicalRotationGroupMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationCancellation" ADD CONSTRAINT "ClinicalRotationCancellation_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "ClinicalRotationApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationCancellation" ADD CONSTRAINT "ClinicalRotationCancellation_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "ClinicalRotationGroupApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationCancellation" ADD CONSTRAINT "ClinicalRotationCancellation_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationCancellation" ADD CONSTRAINT "ClinicalRotationCancellation_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationCancellation" ADD CONSTRAINT "ClinicalRotationCancellation_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "ClinicalRotationOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationCancellation" ADD CONSTRAINT "ClinicalRotationCancellation_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationCancellation" ADD CONSTRAINT "ClinicalRotationCancellation_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationCancellation" ADD CONSTRAINT "ClinicalRotationCancellation_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationAuditLog" ADD CONSTRAINT "ClinicalRotationAuditLog_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "ClinicalRotationGroupApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE "ClinicalRotationAuditLog" ADD CONSTRAINT "ClinicalRotationAuditLog_cancellation_id_fkey" FOREIGN KEY ("cancellation_id") REFERENCES "ClinicalRotationCancellation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
