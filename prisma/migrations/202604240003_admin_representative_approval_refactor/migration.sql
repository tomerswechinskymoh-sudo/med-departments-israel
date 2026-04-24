CREATE TABLE "RepresentativeProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "contact_details" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepresentativeProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RepresentativeAssignment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepresentativeAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DepartmentChangeRequest" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "submitted_by_user_id" TEXT NOT NULL,
    "reviewed_by_user_id" TEXT,
    "summary" TEXT,
    "payload" JSONB NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "admin_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentChangeRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ResidencyOpening"
ADD COLUMN "reviewed_by_user_id" TEXT,
ADD COLUMN "supersedes_opening_id" TEXT,
ADD COLUMN "review_note" TEXT,
ADD COLUMN "reviewed_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "RepresentativeProfile_user_id_key" ON "RepresentativeProfile"("user_id");
CREATE UNIQUE INDEX "RepresentativeAssignment_user_id_department_id_key" ON "RepresentativeAssignment"("user_id", "department_id");
CREATE INDEX "RepresentativeAssignment_department_id_idx" ON "RepresentativeAssignment"("department_id");
CREATE INDEX "DepartmentChangeRequest_department_id_status_idx" ON "DepartmentChangeRequest"("department_id", "status");
CREATE INDEX "DepartmentChangeRequest_submitted_by_user_id_status_idx" ON "DepartmentChangeRequest"("submitted_by_user_id", "status");
CREATE INDEX "ResidencyOpening_supersedes_opening_id_idx" ON "ResidencyOpening"("supersedes_opening_id");

ALTER TABLE "RepresentativeProfile"
ADD CONSTRAINT "RepresentativeProfile_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepresentativeAssignment"
ADD CONSTRAINT "RepresentativeAssignment_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepresentativeAssignment"
ADD CONSTRAINT "RepresentativeAssignment_department_id_fkey"
FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepresentativeAssignment"
ADD CONSTRAINT "RepresentativeAssignment_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DepartmentChangeRequest"
ADD CONSTRAINT "DepartmentChangeRequest_department_id_fkey"
FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DepartmentChangeRequest"
ADD CONSTRAINT "DepartmentChangeRequest_submitted_by_user_id_fkey"
FOREIGN KEY ("submitted_by_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DepartmentChangeRequest"
ADD CONSTRAINT "DepartmentChangeRequest_reviewed_by_user_id_fkey"
FOREIGN KEY ("reviewed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResidencyOpening"
ADD CONSTRAINT "ResidencyOpening_reviewed_by_user_id_fkey"
FOREIGN KEY ("reviewed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResidencyOpening"
ADD CONSTRAINT "ResidencyOpening_supersedes_opening_id_fkey"
FOREIGN KEY ("supersedes_opening_id") REFERENCES "ResidencyOpening"("id") ON DELETE SET NULL ON UPDATE CASCADE;
