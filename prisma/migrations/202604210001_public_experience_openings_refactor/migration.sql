-- CreateEnum
CREATE TYPE "RoleKey" AS ENUM ('STUDENT', 'RESIDENT', 'REPRESENTATIVE', 'ADMIN');

-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('HOSPITAL', 'HMO');

-- CreateEnum
CREATE TYPE "ReviewSourceType" AS ENUM ('RESIDENT', 'INTERN', 'STUDENT');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'UPCOMING', 'CLOSED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PublisherRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OpeningType" AS ENUM ('RESIDENCY', 'FELLOWSHIP', 'ACADEMIC_TRACK', 'COMMUNITY_TRACK', 'OTHER');

-- CreateEnum
CREATE TYPE "OpeningApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CONTACTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UploadedFileCategory" AS ENUM ('OPENING_ATTACHMENT', 'APPLICATION_CV', 'APPLICATION_PROFILE_PHOTO', 'APPLICATION_SUPPORTING');

-- CreateTable
CREATE TABLE "Role" (
    "key" "RoleKey" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "role_key" "RoleKey" NOT NULL DEFAULT 'STUDENT',
    "is_approved_publisher" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "InstitutionType" NOT NULL,
    "city" TEXT,
    "summary" TEXT NOT NULL,
    "website_url" TEXT,
    "cover_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "specialty_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_summary" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "practical_info" TEXT NOT NULL,
    "public_contact_email" TEXT,
    "public_contact_phone" TEXT,
    "cover_image_url" TEXT,
    "future_enrichment_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentHead" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "profile_image_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidencyOpening" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "opening_type" "OpeningType" NOT NULL,
    "is_immediate" BOOLEAN NOT NULL DEFAULT false,
    "openings_count" INTEGER,
    "status" "OpportunityStatus" NOT NULL,
    "committee_date" TIMESTAMP(3),
    "application_deadline" TIMESTAMP(3),
    "expected_start_date" TIMESTAMP(3),
    "notes" TEXT,
    "supporting_info" TEXT,
    "content_status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidencyOpening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningAcceptanceCriteria" (
    "id" TEXT NOT NULL,
    "opening_id" TEXT NOT NULL,
    "research_importance" INTEGER NOT NULL DEFAULT 3,
    "department_elective_importance" INTEGER NOT NULL DEFAULT 3,
    "resident_selection_influence" INTEGER NOT NULL DEFAULT 3,
    "specialist_selection_influence" INTEGER NOT NULL DEFAULT 3,
    "department_head_influence" INTEGER NOT NULL DEFAULT 3,
    "medical_school_influence" INTEGER NOT NULL DEFAULT 3,
    "personal_fit_importance" INTEGER NOT NULL DEFAULT 3,
    "previous_department_experience_importance" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpeningAcceptanceCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningApplication" (
    "id" TEXT NOT NULL,
    "opening_id" TEXT NOT NULL,
    "reviewed_by_user_id" TEXT,
    "applicant_type" "ReviewSourceType" NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "did_department_elective" BOOLEAN NOT NULL DEFAULT false,
    "department_elective_details" TEXT,
    "has_research" BOOLEAN NOT NULL DEFAULT false,
    "research_details" TEXT,
    "did_internship_there" BOOLEAN NOT NULL DEFAULT false,
    "internship_details" TEXT,
    "motivation_text" TEXT NOT NULL,
    "relevant_experience" TEXT NOT NULL,
    "additional_notes" TEXT,
    "status" "OpeningApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewer_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpeningApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchOpportunity" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contact_info" TEXT,
    "content_status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialDepartmentUpdate" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "content_status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialDepartmentUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSubmission" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "reviewer_type" "ReviewSourceType" NOT NULL,
    "full_name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "teaching_quality" INTEGER NOT NULL,
    "work_atmosphere" INTEGER NOT NULL,
    "seniors_approachability" INTEGER NOT NULL,
    "research_exposure" INTEGER NOT NULL,
    "lifestyle_balance" INTEGER NOT NULL,
    "overall_recommendation" INTEGER NOT NULL,
    "pros" TEXT NOT NULL,
    "cons" TEXT NOT NULL,
    "tips" TEXT NOT NULL,
    "consent_to_contact" BOOLEAN NOT NULL,
    "consent_to_terms" BOOLEAN NOT NULL,
    "consent_no_patient_info" BOOLEAN NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "admin_note" TEXT,
    "reviewed_by_user_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "reviewer_type" "ReviewSourceType" NOT NULL,
    "display_name" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "teaching_quality" INTEGER NOT NULL,
    "work_atmosphere" INTEGER NOT NULL,
    "seniors_approachability" INTEGER NOT NULL,
    "research_exposure" INTEGER NOT NULL,
    "lifestyle_balance" INTEGER NOT NULL,
    "overall_recommendation" INTEGER NOT NULL,
    "pros" TEXT NOT NULL,
    "cons" TEXT NOT NULL,
    "tips" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewReport" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "reporter_user_id" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublisherRequest" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "department_id" TEXT,
    "institution_id" TEXT,
    "requested_role" "RoleKey" NOT NULL DEFAULT 'REPRESENTATIVE',
    "note" TEXT,
    "status" "PublisherRequestStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "reviewed_by_user_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "department_id" TEXT,
    "opening_id" TEXT,
    "opening_application_id" TEXT,
    "uploaded_by_user_id" TEXT,
    "category" "UploadedFileCategory" NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteDepartment" (
    "user_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteDepartment_pkey" PRIMARY KEY ("user_id","department_id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_key_idx" ON "User"("role_key");

-- CreateIndex
CREATE INDEX "User_is_approved_publisher_idx" ON "User"("is_approved_publisher");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_slug_key" ON "Institution"("slug");

-- CreateIndex
CREATE INDEX "Institution_type_idx" ON "Institution"("type");

-- CreateIndex
CREATE INDEX "Institution_city_idx" ON "Institution"("city");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_slug_key" ON "Specialty"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Department_slug_key" ON "Department"("slug");

-- CreateIndex
CREATE INDEX "Department_institution_id_idx" ON "Department"("institution_id");

-- CreateIndex
CREATE INDEX "Department_specialty_id_idx" ON "Department"("specialty_id");

-- CreateIndex
CREATE INDEX "Department_name_idx" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_institution_id_name_key" ON "Department"("institution_id", "name");

-- CreateIndex
CREATE INDEX "DepartmentHead_department_id_display_order_idx" ON "DepartmentHead"("department_id", "display_order");

-- CreateIndex
CREATE INDEX "ResidencyOpening_department_id_content_status_idx" ON "ResidencyOpening"("department_id", "content_status");

-- CreateIndex
CREATE INDEX "ResidencyOpening_status_content_status_idx" ON "ResidencyOpening"("status", "content_status");

-- CreateIndex
CREATE INDEX "ResidencyOpening_committee_date_idx" ON "ResidencyOpening"("committee_date");

-- CreateIndex
CREATE INDEX "ResidencyOpening_application_deadline_idx" ON "ResidencyOpening"("application_deadline");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningAcceptanceCriteria_opening_id_key" ON "OpeningAcceptanceCriteria"("opening_id");

-- CreateIndex
CREATE INDEX "OpeningApplication_opening_id_status_idx" ON "OpeningApplication"("opening_id", "status");

-- CreateIndex
CREATE INDEX "OpeningApplication_reviewed_by_user_id_idx" ON "OpeningApplication"("reviewed_by_user_id");

-- CreateIndex
CREATE INDEX "ResearchOpportunity_department_id_content_status_idx" ON "ResearchOpportunity"("department_id", "content_status");

-- CreateIndex
CREATE INDEX "OfficialDepartmentUpdate_department_id_content_status_idx" ON "OfficialDepartmentUpdate"("department_id", "content_status");

-- CreateIndex
CREATE INDEX "ReviewSubmission_department_id_status_idx" ON "ReviewSubmission"("department_id", "status");

-- CreateIndex
CREATE INDEX "ReviewSubmission_reviewer_type_status_idx" ON "ReviewSubmission"("reviewer_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Review_submission_id_key" ON "Review"("submission_id");

-- CreateIndex
CREATE INDEX "Review_department_id_published_at_idx" ON "Review"("department_id", "published_at");

-- CreateIndex
CREATE INDEX "ReviewReport_review_id_idx" ON "ReviewReport"("review_id");

-- CreateIndex
CREATE INDEX "PublisherRequest_user_id_status_idx" ON "PublisherRequest"("user_id", "status");

-- CreateIndex
CREATE INDEX "PublisherRequest_department_id_status_idx" ON "PublisherRequest"("department_id", "status");

-- CreateIndex
CREATE INDEX "UploadedFile_department_id_idx" ON "UploadedFile"("department_id");

-- CreateIndex
CREATE INDEX "UploadedFile_opening_id_category_idx" ON "UploadedFile"("opening_id", "category");

-- CreateIndex
CREATE INDEX "UploadedFile_opening_application_id_category_idx" ON "UploadedFile"("opening_application_id", "category");

-- CreateIndex
CREATE INDEX "AuditLog_action_created_at_idx" ON "AuditLog"("action", "created_at");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_key_fkey" FOREIGN KEY ("role_key") REFERENCES "Role"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentHead" ADD CONSTRAINT "DepartmentHead_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidencyOpening" ADD CONSTRAINT "ResidencyOpening_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidencyOpening" ADD CONSTRAINT "ResidencyOpening_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningAcceptanceCriteria" ADD CONSTRAINT "OpeningAcceptanceCriteria_opening_id_fkey" FOREIGN KEY ("opening_id") REFERENCES "ResidencyOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningApplication" ADD CONSTRAINT "OpeningApplication_opening_id_fkey" FOREIGN KEY ("opening_id") REFERENCES "ResidencyOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningApplication" ADD CONSTRAINT "OpeningApplication_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchOpportunity" ADD CONSTRAINT "ResearchOpportunity_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchOpportunity" ADD CONSTRAINT "ResearchOpportunity_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialDepartmentUpdate" ADD CONSTRAINT "OfficialDepartmentUpdate_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialDepartmentUpdate" ADD CONSTRAINT "OfficialDepartmentUpdate_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSubmission" ADD CONSTRAINT "ReviewSubmission_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSubmission" ADD CONSTRAINT "ReviewSubmission_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "ReviewSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherRequest" ADD CONSTRAINT "PublisherRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherRequest" ADD CONSTRAINT "PublisherRequest_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherRequest" ADD CONSTRAINT "PublisherRequest_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublisherRequest" ADD CONSTRAINT "PublisherRequest_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_opening_id_fkey" FOREIGN KEY ("opening_id") REFERENCES "ResidencyOpening"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_opening_application_id_fkey" FOREIGN KEY ("opening_application_id") REFERENCES "OpeningApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteDepartment" ADD CONSTRAINT "FavoriteDepartment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteDepartment" ADD CONSTRAINT "FavoriteDepartment_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
