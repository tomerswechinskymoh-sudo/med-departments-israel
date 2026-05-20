-- Historical Prisma-generated index rename migration.
-- DepartmentExternalPerson is created later by 202605200900_data_import_engine,
-- so this must be a guarded no-op on a fresh shadow database.
DO $$
BEGIN
  IF to_regclass('"DepartmentExternalPerson"') IS NOT NULL
     AND to_regclass('"DepartmentExternalPerson_department_id_source_name_person_name_"') IS NOT NULL
     AND to_regclass('"DepartmentExternalPerson_department_id_source_name_person_n_key"') IS NULL THEN
    ALTER INDEX "DepartmentExternalPerson_department_id_source_name_person_name_"
      RENAME TO "DepartmentExternalPerson_department_id_source_name_person_n_key";
  END IF;
END $$;
