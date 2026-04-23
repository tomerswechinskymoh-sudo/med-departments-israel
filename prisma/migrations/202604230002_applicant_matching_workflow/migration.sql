ALTER TABLE "ResidencyOpening"
ADD COLUMN "top_applicants_to_email" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "top_matches_delivered_at" TIMESTAMP(3),
ADD COLUMN "top_matches_last_error" TEXT;

ALTER TABLE "OpeningAcceptanceCriteria"
ADD COLUMN "department_internship_importance" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "recommendations_importance" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "what_we_are_looking_for" TEXT;

ALTER TABLE "OpeningApplication"
ADD COLUMN "medical_school" TEXT,
ADD COLUMN "recommendation_details" TEXT,
ADD COLUMN "department_familiarity_details" TEXT,
ADD COLUMN "match_score" INTEGER,
ADD COLUMN "match_short_summary" TEXT,
ADD COLUMN "match_strengths" JSONB,
ADD COLUMN "match_concerns" JSONB,
ADD COLUMN "match_engine" TEXT,
ADD COLUMN "match_evaluated_at" TIMESTAMP(3),
ADD COLUMN "match_evaluation_error" TEXT,
ADD COLUMN "is_top_match" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "ResidencyOpening_top_matches_delivered_at_idx"
ON "ResidencyOpening"("top_matches_delivered_at");

CREATE INDEX "OpeningApplication_opening_id_is_top_match_idx"
ON "OpeningApplication"("opening_id", "is_top_match");

CREATE INDEX "OpeningApplication_opening_id_match_score_idx"
ON "OpeningApplication"("opening_id", "match_score");
