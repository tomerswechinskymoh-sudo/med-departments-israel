-- Historical Prisma-generated index rename migration.
-- Keep it safe for fresh shadow databases: the canonical indexes are already
-- created with IF NOT EXISTS in 202605080001_duns_import_external_metrics.
DO $$
BEGIN
  IF to_regclass('"DepartmentExternalMetric_department_id_metric_key_source_name_k"') IS NOT NULL
     AND to_regclass('"DepartmentExternalMetric_department_id_metric_key_source_na_key"') IS NULL THEN
    ALTER INDEX "DepartmentExternalMetric_department_id_metric_key_source_name_k"
      RENAME TO "DepartmentExternalMetric_department_id_metric_key_source_na_key";
  END IF;

  IF to_regclass('"DunsPhysicianRecord_normalized_hospital_id_normalized_specialty"') IS NOT NULL
     AND to_regclass('"DunsPhysicianRecord_normalized_hospital_id_normalized_speci_idx"') IS NULL THEN
    ALTER INDEX "DunsPhysicianRecord_normalized_hospital_id_normalized_specialty"
      RENAME TO "DunsPhysicianRecord_normalized_hospital_id_normalized_speci_idx";
  END IF;
END $$;
