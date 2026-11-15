CREATE TABLE "SiteFeature" (
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteFeature_pkey" PRIMARY KEY ("key")
);

INSERT INTO "SiteFeature" ("key", "enabled") VALUES ('career_fit', false);
