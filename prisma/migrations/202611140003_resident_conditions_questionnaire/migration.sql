-- Unanswered optional ratings remain NULL. Existing answers are unchanged.
ALTER TABLE "ReviewSubmission"
  ALTER COLUMN "teaching_quality" DROP NOT NULL,
  ALTER COLUMN "work_atmosphere" DROP NOT NULL,
  ALTER COLUMN "seniors_approachability" DROP NOT NULL,
  ALTER COLUMN "research_exposure" DROP NOT NULL,
  ALTER COLUMN "lifestyle_balance" DROP NOT NULL;
ALTER TABLE "Review"
  ALTER COLUMN "teaching_quality" DROP NOT NULL,
  ALTER COLUMN "work_atmosphere" DROP NOT NULL,
  ALTER COLUMN "seniors_approachability" DROP NOT NULL,
  ALTER COLUMN "research_exposure" DROP NOT NULL,
  ALTER COLUMN "lifestyle_balance" DROP NOT NULL;
