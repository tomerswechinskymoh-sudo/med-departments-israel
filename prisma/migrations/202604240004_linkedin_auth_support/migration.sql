ALTER TABLE "User"
ADD COLUMN "linkedin_id" TEXT,
ADD COLUMN "profile_image_url" TEXT,
ADD COLUMN "linkedin_connected_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_linkedin_id_key" ON "User"("linkedin_id");
