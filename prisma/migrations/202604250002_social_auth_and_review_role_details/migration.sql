ALTER TABLE "User"
ADD COLUMN "google_id" TEXT,
ADD COLUMN "facebook_id" TEXT;

ALTER TABLE "ReviewSubmission"
ADD COLUMN "role_details" JSONB;

CREATE UNIQUE INDEX "User_google_id_key" ON "User"("google_id");
CREATE UNIQUE INDEX "User_facebook_id_key" ON "User"("facebook_id");
