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
  'ma_' || md5(institution."id" || ':' || specialty."id") AS "id",
  institution."id" AS "hospital_id",
  specialty."id" AS "specialty_id",
  'מערך ' || specialty."name" || ' · ' || institution."name" AS "name",
  'array-' || institution."slug" || '-' || specialty."slug" AS "slug",
  'מערך ' || specialty."name" || ' בבית החולים ' || institution."name" AS "description",
  NOW() AS "created_at",
  NOW() AS "updated_at"
FROM "Department" department
JOIN "Institution" institution ON institution."id" = department."institution_id"
JOIN "Specialty" specialty ON specialty."id" = department."specialty_id"
WHERE specialty."group_as_array" = true
GROUP BY institution."id", institution."slug", institution."name", specialty."id", specialty."slug", specialty."name"
ON CONFLICT ("hospital_id", "specialty_id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "updated_at" = NOW();

UPDATE "Department" department
SET "medical_array_id" = array."id"
FROM "MedicalArray" array
JOIN "Specialty" specialty ON specialty."id" = array."specialty_id"
WHERE department."institution_id" = array."hospital_id"
  AND department."specialty_id" = array."specialty_id"
  AND specialty."group_as_array" = true
  AND department."medical_array_id" IS DISTINCT FROM array."id";
