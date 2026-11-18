-- Preserve every original value, query and response. Only invalidate enrichment
-- whose recorded query explicitly borrowed the other hospital's identity.
-- Safe to rerun; scoped to the established Lev Hasharon institution slug.
UPDATE "DepartmentResearchMetric" AS m
SET needs_mapping = true,
    warnings_json = COALESCE(m.warnings_json, '[]'::jsonb) ||
      '["שיוך שגוי: החיפוש המקורי בוצע עבור רבין ולא לב השרון. הנתונים נשמרו לביקורת ונדרש מיפוי מחדש."]'::jsonb
FROM "Department" d JOIN "Institution" i ON i.id = d.institution_id
WHERE m.department_id = d.id
  AND i.slug = 'מרכז-לבהנ-לב-השרון'
  AND m.source = 'OpenAlex'
  AND m.query_used LIKE '%Rabin Medical Center%'
  AND NOT m.needs_mapping;

UPDATE "DepartmentExternalMetric" AS m
SET approved = false
FROM "Department" d JOIN "Institution" i ON i.id = d.institution_id
WHERE m.department_id = d.id
  AND i.slug = 'מרכז-לבהנ-לב-השרון'
  AND m.source_name = 'DUNS100'
  AND m.query_used LIKE '%מרכז רפואי רבין%'
  AND m.approved;
