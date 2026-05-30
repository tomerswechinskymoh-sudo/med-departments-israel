import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getDepartmentPageData, getSpecialtyDashboardMetrics } from "@/lib/queries";
import {
  metricRegistryEntryFor,
  resolveImportedMetric,
  resolveMetricDisplayMetadata,
  type ImportedMetricLike
} from "@/lib/imported-metric-resolver";
import { getDataExplanations } from "@/lib/queries";

type CsvTable = {
  headers: string[];
  rows: string[][];
};

type AuditMetric = {
  inputKey: string;
  specialtyDashboardKey: string;
};

const auditMetrics: AuditMetric[] = [
  { inputKey: "שכר_לא_פריפריה", specialtyDashboardKey: "centerSalary" },
  { inputKey: "שכר_פריפריה", specialtyDashboardKey: "peripherySalary" },
  { inputKey: "פער_שכר_פריפריה", specialtyDashboardKey: "salaryGap" },
  { inputKey: "מספר_מתמחים", specialtyDashboardKey: "activeResidents" },
  { inputKey: "זמן_המתנה_חציוני_לתקן", specialtyDashboardKey: "medianWaitingTime" },
  { inputKey: "משך_התמחות_רשמי", specialtyDashboardKey: "residencyDuration" },
  { inputKey: "משך_ממוצע_בפועל", specialtyDashboardKey: "residencyDuration" }
];

function cleanCell(value: string | null | undefined) {
  return (value ?? "")
    .replace(/^\ufeff/, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .trim();
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows
    .map((csvRow) => csvRow.map(cleanCell))
    .filter((csvRow) => csvRow.some((cell) => cell.length > 0));
}

async function readCsv(fileName: string): Promise<CsvTable> {
  const rows = parseCsv(await fs.readFile(path.join(process.cwd(), fileName), "utf8"));
  return {
    headers: rows[0] ?? [],
    rows: rows.slice(1)
  };
}

function rowObject(table: CsvTable, row: string[]) {
  return Object.fromEntries(table.headers.map((header, index) => [header, row[index] ?? ""]));
}

function findColumn(table: CsvTable, candidates: string[]) {
  return candidates.find((candidate) => table.headers.includes(candidate)) ?? null;
}

function findMasterDeptRow(table: CsvTable) {
  return table.rows.find((row) => {
    const record = rowObject(table, row);
    return (
      String(record["שם_מרכז_רפואי"] ?? "").includes("אסיא") &&
      String(record["תחום התמחות"] ?? "").includes("רפואת")
    );
  }) ?? null;
}

function findMasterSpecRow(table: CsvTable) {
  return table.rows.find((row) => {
    const record = rowObject(table, row);
    return String(record["תחום_התמחות"] ?? "").includes("רפואת המשפחה");
  }) ?? null;
}

function findDataExpRow(table: CsvTable, sheet: "MASTER_Spec" | "Master_Dept", candidates: string[]) {
  return table.rows.find((row) => {
    const record = rowObject(table, row);
    return record["גליון"] === sheet && candidates.includes(String(record["קרטריון"] ?? ""));
  }) ?? null;
}

function metricHasValue(metric: ImportedMetricLike | null | undefined) {
  return Boolean(
    metric &&
      ((typeof metric.value === "number" && Number.isFinite(metric.value)) ||
        (typeof metric.rawValue === "string" && metric.rawValue.trim().length > 0))
  );
}

function formatImportedMetricValue(metric: ImportedMetricLike | null | undefined) {
  if (!metric) return null;
  if (metric.rawValue?.trim()) return metric.rawValue.trim();
  if (typeof metric.value !== "number" || !Number.isFinite(metric.value)) return null;

  const formatted = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 }).format(metric.value);
  if (metric.unit === "%") return `${formatted}%`;
  if (metric.unit === "currency") return `${formatted} ₪`;
  if (metric.unit === "months") return `${formatted} חודשים`;
  if (metric.unit === "years") return `${formatted} שנים`;
  return formatted;
}

function comparableDisplayValue(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/[,\s₪%]/g, "")
    .trim();
}

function assertStage(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function exactResolverMatch(metric: ImportedMetricLike | null, expectedKeys: string[]) {
  return Boolean(metric && expectedKeys.includes(metric.metricKey));
}

async function auditMetric(input: AuditMetric) {
  const registry = metricRegistryEntryFor(input.inputKey);
  if (!registry) {
    throw new Error(`No metric registry entry for ${input.inputKey}`);
  }

  const [dataExpCsv, masterDeptCsv, masterSpecCsv, dataExplanations] = await Promise.all([
    readCsv("Data_Exp.csv"),
    readCsv("Master_Dept.csv"),
    readCsv("MASTER_Spec.csv"),
    getDataExplanations()
  ]);

  const masterDeptRow = findMasterDeptRow(masterDeptCsv);
  const masterSpecRow = findMasterSpecRow(masterSpecCsv);
  if (!masterDeptRow) {
    throw new Error("Target Master_Dept row not found for אסיא - רפואת המשפחה");
  }
  if (!masterSpecRow) {
    throw new Error("Target MASTER_Spec row not found for רפואת המשפחה");
  }

  const departmentCsvColumn = findColumn(masterDeptCsv, registry.importedKeys);
  const specialtyCsvColumn = findColumn(masterSpecCsv, registry.importedKeys);
  if (!departmentCsvColumn) {
    throw new Error(`Master_Dept column not found for ${input.inputKey}`);
  }
  if (!specialtyCsvColumn) {
    throw new Error(`MASTER_Spec column not found for ${input.inputKey}`);
  }

  const departmentCsvValue = rowObject(masterDeptCsv, masterDeptRow)[departmentCsvColumn];
  const specialtyCsvValue = rowObject(masterSpecCsv, masterSpecRow)[specialtyCsvColumn];
  assertStage(departmentCsvValue, `Master_Dept value is empty for ${departmentCsvColumn}`);
  assertStage(specialtyCsvValue, `MASTER_Spec value is empty for ${specialtyCsvColumn}`);

  const department = await prisma.department.findFirst({
    where: {
      institution: {
        name: {
          contains: "אסיא"
        }
      },
      specialty: {
        name: "רפואת משפחה"
      },
      importStableKey: {
        not: null
      }
    },
    include: {
      institution: true,
      specialty: true,
      metrics: true
    }
  });
  assertStage(department, "Department not found in DB for אסיא - רפואת המשפחה");

  const specialty = await prisma.specialty.findUnique({
    where: {
      id: department!.specialtyId
    },
    include: {
      metrics: true
    }
  });
  assertStage(specialty, "Specialty not found in DB for רפואת משפחה");

  const departmentMetric = department!.metrics.find((metric) => metric.metricKey === departmentCsvColumn);
  const specialtyMetric = specialty!.metrics.find((metric) => metric.metricKey === specialtyCsvColumn);
  assertStage(metricHasValue(departmentMetric), `DepartmentMetric missing/null for exact key ${departmentCsvColumn}`);
  assertStage(metricHasValue(specialtyMetric), `SpecialtyMetric missing/null for exact key ${specialtyCsvColumn}`);

  const [departmentRowCount, specialtyRowCount] = await Promise.all([
    prisma.departmentMetric.count({
      where: {
        metricKey: departmentCsvColumn!
      }
    }),
    prisma.specialtyMetric.count({
      where: {
        metricKey: specialtyCsvColumn!
      }
    })
  ]);

  const departmentPageData = await getDepartmentPageData(department!.slug, undefined, department!.id);
  assertStage(departmentPageData, "getDepartmentPageData returned null");
  const departmentQueryMetric = departmentPageData!.metrics.find((metric) => metric.metricKey === departmentCsvColumn);
  assertStage(metricHasValue(departmentQueryMetric), `Department page query did not return exact key ${departmentCsvColumn}`);

  const specialtyDashboard = await getSpecialtyDashboardMetrics(department!.specialtyId);
  const specialtyDashboardMetric = specialtyDashboard.metrics.find((metric) => metric.key === input.specialtyDashboardKey);
  assertStage(specialtyDashboardMetric, `Specialty dashboard metric ${input.specialtyDashboardKey} not returned`);
  assertStage(!specialtyDashboardMetric!.isPlaceholder, `Specialty dashboard metric ${input.specialtyDashboardKey} is placeholder`);

  const departmentResolverMetric = resolveImportedMetric(departmentPageData!.metrics, input.inputKey);
  const specialtyResolverMetric = resolveImportedMetric(specialty!.metrics, input.inputKey);
  assertStage(exactResolverMatch(departmentResolverMetric, registry.importedKeys), `Department resolver used alias/key transform for ${input.inputKey}: ${departmentResolverMetric?.metricKey ?? "null"}`);
  assertStage(exactResolverMatch(specialtyResolverMetric, registry.importedKeys), `Specialty resolver used alias/key transform for ${input.inputKey}: ${specialtyResolverMetric?.metricKey ?? "null"}`);

  const departmentRenderedValue = formatImportedMetricValue(departmentResolverMetric);
  const specialtyExpectedValue = formatImportedMetricValue(specialtyResolverMetric);
  const specialtyRenderedValue = specialtyDashboardMetric!.value;
  assertStage(departmentRenderedValue, `Department rendered value is null for ${input.inputKey}`);
  assertStage(specialtyRenderedValue, `Specialty rendered value is null for ${input.inputKey}`);
  assertStage(
    specialtyExpectedValue &&
      comparableDisplayValue(specialtyRenderedValue).includes(comparableDisplayValue(specialtyExpectedValue)),
    `Specialty dashboard value "${specialtyRenderedValue}" does not include resolved value "${specialtyExpectedValue}" for ${input.inputKey}`
  );

  const dataExpDepartmentRow = findDataExpRow(dataExpCsv, "Master_Dept", registry.importedKeys);
  const dataExpSpecialtyRow = findDataExpRow(dataExpCsv, "MASTER_Spec", registry.importedKeys);
  const departmentMetadata = resolveMetricDisplayMetadata(dataExplanations, "Master_Dept", input.inputKey);
  const specialtyMetadata = resolveMetricDisplayMetadata(dataExplanations, "MASTER_Spec", input.inputKey);

  return {
    metric: input.inputKey,
    dataExp: {
      masterDeptCriterion: dataExpDepartmentRow ? rowObject(dataExpCsv, dataExpDepartmentRow)["קרטריון"] : null,
      masterDeptSource: dataExpDepartmentRow ? rowObject(dataExpCsv, dataExpDepartmentRow)["מקור"] : null,
      masterSpecCriterion: dataExpSpecialtyRow ? rowObject(dataExpCsv, dataExpSpecialtyRow)["קרטריון"] : null,
      masterSpecSource: dataExpSpecialtyRow ? rowObject(dataExpCsv, dataExpSpecialtyRow)["מקור"] : null
    },
    csv: {
      masterDeptColumn: departmentCsvColumn,
      masterDeptValue: departmentCsvValue,
      masterSpecColumn: specialtyCsvColumn,
      masterSpecValue: specialtyCsvValue
    },
    importer: {
      importedDepartmentMetricKey: departmentCsvColumn,
      importedSpecialtyMetricKey: specialtyCsvColumn
    },
    database: {
      departmentTable: "DepartmentMetric",
      departmentStoredMetricKey: departmentMetric!.metricKey,
      departmentRowCount,
      specialtyTable: "SpecialtyMetric",
      specialtyStoredMetricKey: specialtyMetric!.metricKey,
      specialtyRowCount,
      targetDepartment: `${department!.institution.name} - ${department!.specialty.name}`,
      targetDepartmentStoredValue: departmentMetric!.rawValue ?? departmentMetric!.value
    },
    queryResultReturnedToUi: {
      departmentMetricKey: departmentQueryMetric!.metricKey,
      departmentRawValue: departmentQueryMetric!.rawValue,
      departmentValue: departmentQueryMetric!.value,
      specialtyDashboardKey: specialtyDashboardMetric!.key,
      specialtyDashboardValue: specialtyDashboardMetric!.value
    },
    resolverOutput: {
      departmentMetricKey: departmentResolverMetric!.metricKey,
      departmentRawValue: departmentResolverMetric!.rawValue,
      departmentValue: departmentResolverMetric!.value,
      specialtyMetricKey: specialtyResolverMetric!.metricKey,
      specialtyRawValue: specialtyResolverMetric!.rawValue,
      specialtyValue: specialtyResolverMetric!.value,
      dataExpDepartmentMatched: Boolean(departmentMetadata),
      dataExpSpecialtyMatched: Boolean(specialtyMetadata)
    },
    finalRenderedValue: {
      departmentPage: departmentRenderedValue,
      specialtyDashboard: specialtyRenderedValue
    }
  };
}

async function main() {
  const results = [];

  for (const metric of auditMetrics) {
    results.push(await auditMetric(metric));
  }

  console.log(JSON.stringify({ status: "PASS", results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
