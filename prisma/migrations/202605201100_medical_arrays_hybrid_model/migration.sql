ALTER TABLE "Specialty" ADD COLUMN IF NOT EXISTS "group_as_array" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "medical_array_id" TEXT;
ALTER TABLE "DepartmentExternalMetric" ADD COLUMN IF NOT EXISTS "medical_array_id" TEXT;
ALTER TABLE "DepartmentExternalPerson" ADD COLUMN IF NOT EXISTS "medical_array_id" TEXT;
ALTER TABLE "DepartmentExternalMetric" ALTER COLUMN "department_id" DROP NOT NULL;
ALTER TABLE "DepartmentExternalPerson" ALTER COLUMN "department_id" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "MedicalArray" (
  "id" TEXT NOT NULL,
  "hospital_id" TEXT NOT NULL,
  "specialty_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "recruited_residents_by_year" JSONB,
  "total_publications_count" INTEGER,
  "resident_publications_count" INTEGER,
  "publication_years" JSONB,
  "publication_source_url" TEXT,
  "specialists_count" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicalArray_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicalArray_hospital_id_specialty_id_key" UNIQUE ("hospital_id", "specialty_id"),
  CONSTRAINT "MedicalArray_slug_key" UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS "SalaryAssumption" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "center_monthly_salary" DOUBLE PRECISION NOT NULL,
  "periphery_monthly_salary" DOUBLE PRECISION NOT NULL,
  "seniority_increment" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "assumptions_json" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalaryAssumption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalaryAssumption_key_key" UNIQUE ("key")
);

UPDATE "Specialty"
SET "group_as_array" = true
WHERE "name" IN (
  'רפואה פנימית',
  'פנימית',
  'כירורגיה כללית',
  'רפואת ילדים',
  'ילדים'
);

INSERT INTO "MedicalArray" (
  "id",
  "hospital_id",
  "specialty_id",
  "name",
  "slug",
  "description",
  "recruited_residents_by_year",
  "total_publications_count",
  "resident_publications_count",
  "publication_years",
  "publication_source_url",
  "specialists_count",
  "updated_at"
)
SELECT
  'ma_' || md5(d."institution_id" || ':' || d."specialty_id") AS "id",
  d."institution_id",
  d."specialty_id",
  'מערך ' || s."name" || ' · ' || i."name" AS "name",
  'array-' || left(md5(d."institution_id" || ':' || d."specialty_id"), 24) AS "slug",
  'מערך ' || s."name" || ' בבית החולים ' || i."name" AS "description",
  NULL::jsonb,
  NULL::integer,
  NULL::integer,
  NULL::jsonb,
  NULL::text,
  NULL::integer,
  CURRENT_TIMESTAMP
FROM "Department" d
JOIN "Specialty" s ON s."id" = d."specialty_id"
JOIN "Institution" i ON i."id" = d."institution_id"
WHERE s."group_as_array" = true
GROUP BY d."institution_id", d."specialty_id", s."name", i."name"
ON CONFLICT ("hospital_id", "specialty_id") DO NOTHING;

UPDATE "Department" d
SET "medical_array_id" = ma."id"
FROM "MedicalArray" ma
WHERE ma."hospital_id" = d."institution_id"
  AND ma."specialty_id" = d."specialty_id";

CREATE UNIQUE INDEX IF NOT EXISTS "MedicalArray_hospital_id_specialty_id_key" ON "MedicalArray"("hospital_id", "specialty_id");
CREATE UNIQUE INDEX IF NOT EXISTS "MedicalArray_slug_key" ON "MedicalArray"("slug");
CREATE INDEX IF NOT EXISTS "MedicalArray_specialty_id_idx" ON "MedicalArray"("specialty_id");
CREATE UNIQUE INDEX IF NOT EXISTS "SalaryAssumption_key_key" ON "SalaryAssumption"("key");
CREATE INDEX IF NOT EXISTS "Department_medical_array_id_idx" ON "Department"("medical_array_id");
CREATE INDEX IF NOT EXISTS "DepartmentExternalMetric_medical_array_id_source_name_idx" ON "DepartmentExternalMetric"("medical_array_id", "source_name");
CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentExternalMetric_medical_array_id_metric_key_source_key" ON "DepartmentExternalMetric"("medical_array_id", "metric_key", "source_name");
CREATE INDEX IF NOT EXISTS "DepartmentExternalPerson_medical_array_id_source_name_appro_idx" ON "DepartmentExternalPerson"("medical_array_id", "source_name", "approved");
CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentExternalPerson_medical_array_id_source_name_perso_key" ON "DepartmentExternalPerson"("medical_array_id", "source_name", "person_name", "ranking_year");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicalArray_hospital_id_fkey') THEN
    ALTER TABLE "MedicalArray" ADD CONSTRAINT "MedicalArray_hospital_id_fkey"
      FOREIGN KEY ("hospital_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicalArray_specialty_id_fkey') THEN
    ALTER TABLE "MedicalArray" ADD CONSTRAINT "MedicalArray_specialty_id_fkey"
      FOREIGN KEY ("specialty_id") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Department_medical_array_id_fkey') THEN
    ALTER TABLE "Department" ADD CONSTRAINT "Department_medical_array_id_fkey"
      FOREIGN KEY ("medical_array_id") REFERENCES "MedicalArray"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DepartmentExternalMetric_medical_array_id_fkey') THEN
    ALTER TABLE "DepartmentExternalMetric" ADD CONSTRAINT "DepartmentExternalMetric_medical_array_id_fkey"
      FOREIGN KEY ("medical_array_id") REFERENCES "MedicalArray"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DepartmentExternalPerson_medical_array_id_fkey') THEN
    ALTER TABLE "DepartmentExternalPerson" ADD CONSTRAINT "DepartmentExternalPerson_medical_array_id_fkey"
      FOREIGN KEY ("medical_array_id") REFERENCES "MedicalArray"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
