-- Expand hospital-level array grouping for selected specialties without deleting departments.
UPDATE "Specialty"
SET "group_as_array" = true
WHERE "name" IN (
  'רפואה פנימית',
  'רפואת ילדים',
  'יילוד וגינקולוגיה',
  'כירורגיה כללית',
  'כירורגיה אורתופדית'
);

WITH grouped_arrays AS (
  SELECT
    'ma_' || md5(inst."id" || ':' || spec."id") AS "id",
    inst."id" AS "hospital_id",
    spec."id" AS "specialty_id",
    'מערך ' || spec."name" || ' · ' || inst."name" AS "name",
    'array-' || inst."slug" || '-' || spec."slug" AS "slug",
    'מערך ' || spec."name" || ' בבית החולים ' || inst."name" AS "description"
  FROM "Department" dept
  JOIN "Institution" inst ON inst."id" = dept."institution_id"
  JOIN "Specialty" spec ON spec."id" = dept."specialty_id"
  WHERE spec."group_as_array" = true
  GROUP BY inst."id", inst."slug", inst."name", spec."id", spec."slug", spec."name"
)
INSERT INTO "MedicalArray" (
  "id",
  "hospital_id",
  "specialty_id",
  "name",
  "slug",
  "description",
  "created_at",
  "updated_at"
)
SELECT
  grouped_arrays."id",
  grouped_arrays."hospital_id",
  grouped_arrays."specialty_id",
  grouped_arrays."name",
  grouped_arrays."slug",
  grouped_arrays."description",
  NOW(),
  NOW()
FROM grouped_arrays
ON CONFLICT ("hospital_id", "specialty_id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "slug" = EXCLUDED."slug",
  "description" = EXCLUDED."description",
  "updated_at" = NOW();

UPDATE "Department" AS dept
SET "medical_array_id" = medical_array."id"
FROM "MedicalArray" AS medical_array
JOIN "Specialty" AS spec ON spec."id" = medical_array."specialty_id"
WHERE dept."institution_id" = medical_array."hospital_id"
  AND dept."specialty_id" = medical_array."specialty_id"
  AND spec."group_as_array" = true
  AND dept."medical_array_id" IS DISTINCT FROM medical_array."id";
