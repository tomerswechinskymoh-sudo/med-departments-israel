import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getDepartmentPageData, getDirectoryData, getSpecialtyDashboardMetrics } from "@/lib/queries";
import {
  metricRegistryEntryFor,
  resolveImportedMetric,
  type ImportedMetricLike
} from "@/lib/imported-metric-resolver";

type CsvTable = {
  headers: string[];
  rows: string[][];
};

type AuditStatus = "PASS" | "FAIL";

type AuditRow = {
  scope: "SPECIALTY" | "DEPARTMENT";
  subject: string;
  metric: string;
  csvColumn: string | null;
  csvValue: string | null;
  importedMetricKey: string | null;
  dbTable: string;
  dbRowCount: number;
  dbValue: string | number | null;
  queryValue: string | number | null;
  resolverValue: string | number | null;
  renderedValue: string | number | null;
  resolverMetricKey: string | null;
  metricLevel?: "מחלקתי" | "נתון ארצי לתחום" | "מחושב" | "derived";
  status: AuditStatus;
  failure?: string;
};

type DepartmentPageAuditSummary = {
  departmentId: string | null;
  availableDepartmentMetricKeys: string[];
  fields: Array<{
    metric: string;
    queryValue: string | number | null;
    resolverValue: string | number | null;
    renderedValue: string | number | null;
    status: AuditStatus;
  }>;
};

const specialtyNames = ["רפואה פנימית", "רפואת ילדים", "רפואת המשפחה", "פסיכיאטריה"];

const specialtyMetricKeys = [
  "מספר_מתמחים",
  "מספר תוכניות",
  "משך_התמחות_רשמי",
  "משך_ממוצע_בפועל",
  "שכר_לא_פריפריה",
  "שכר_פריפריה",
  "פער_שכר_פריפריה"
];

const departmentMetricKeys = [
  "מספר_מתמחים",
  "מספר_בכירים",
  "זמן_המתנה_חציוני_לתקן",
  "אחוז_נשים",
  "אחוז_גברים",
  "משך_התמחות_רשמי",
  "משך_ממוצע_בפועל",
  "צפי תקנים חדשים ב2026",
  "מספר המתקבלים שדיווחו שמצאו מיד התמחות",
  "מספר המתקבלים שדיווחו שמצאו עד חצי שנה",
  "מספר המתקבלים שדיווחו שמצאו עד שנה",
  "מספר המתקבלים שדיווחו שמצאו עד שנתיים",
  "מספר המתקבלים שדיווחו שמצאו אחרי שנתיים"
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

function hasCsvValue(value: string | null | undefined) {
  const normalized = cleanCell(value);
  return Boolean(normalized && normalized !== "#DIV/0!" && normalized !== "#N/A");
}

function metricHasValue(metric: ImportedMetricLike | null | undefined) {
  return Boolean(
    metric &&
      ((typeof metric.value === "number" && Number.isFinite(metric.value)) ||
        (typeof metric.rawValue === "string" && hasCsvValue(metric.rawValue)))
  );
}

function formatMetricValue(metric: ImportedMetricLike | null | undefined) {
  if (!metric) return null;
  if (hasCsvValue(metric.rawValue)) return cleanCell(metric.rawValue);
  if (typeof metric.value !== "number" || !Number.isFinite(metric.value)) return null;

  const formatted = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 }).format(metric.value);
  if (metric.unit === "%") return `${formatted}%`;
  if (metric.unit === "currency") return `${formatted} ₪`;
  if (metric.unit === "months") return `${formatted} חודשים`;
  if (metric.unit === "years") return `${formatted} שנים`;
  return formatted;
}

function parseNumeric(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = cleanCell(value)
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function numericTokens(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? [value] : [];
  return Array.from(cleanCell(value).matchAll(/\d+(?:[,.]\d+)?/g))
    .map((match) => Number(match[0].replace(/,/g, "")))
    .filter((numeric) => Number.isFinite(numeric));
}

function normalizedText(value: string | number | null | undefined) {
  return cleanCell(String(value ?? ""))
    .replace(/[,\s₪%]/g, "")
    .trim();
}

function valueMatches(expected: string | number | null | undefined, actual: string | number | null | undefined) {
  if (!hasCsvValue(String(expected ?? ""))) return true;
  if (actual === null || actual === undefined || !hasCsvValue(String(actual))) return false;

  const expectedText = normalizedText(expected);
  const actualText = normalizedText(actual);
  if (actualText === expectedText || actualText.includes(expectedText)) return true;

  const expectedNumber = parseNumeric(expected);
  const actualNumber = parseNumeric(actual);
  const actualNumbers = numericTokens(actual);
  if (
    expectedNumber !== null &&
    actualNumbers.some((numeric) => Math.abs(numeric - expectedNumber) < 0.02)
  ) {
    return true;
  }
  if (expectedNumber !== null && actualNumber !== null) {
    return Math.abs(expectedNumber - actualNumber) < 0.02;
  }

  return false;
}

function specialtyCandidates(name: string) {
  const candidates = new Set([name]);
  if (name === "רפואת המשפחה") candidates.add("רפואת משפחה");
  if (name === "רפואת משפחה") candidates.add("רפואת המשפחה");
  if (name === "רפואה פנימית") candidates.add("פנימית");
  if (name === "פנימית") candidates.add("רפואה פנימית");
  return Array.from(candidates);
}

function findColumn(table: CsvTable, candidates: string[]) {
  return candidates.find((candidate) => table.headers.includes(candidate)) ?? null;
}

function csvValueFor(table: CsvTable, row: string[], fieldOrKey: string) {
  if (fieldOrKey === "מספר תוכניות") return { column: "Master_Dept rows", value: null };

  const registry = metricRegistryEntryFor(fieldOrKey);
  const candidates = registry?.importedKeys ?? [fieldOrKey];
  const column = findColumn(table, candidates);
  return {
    column,
    value: column ? rowObject(table, row)[column] ?? null : null
  };
}

function findSpecialtyCsvRow(table: CsvTable, specialtyName: string) {
  const candidates = specialtyCandidates(specialtyName);
  return (
    table.rows.find((row) => {
      const record = rowObject(table, row);
      return candidates.includes(cleanCell(record["תחום_התמחות"]));
    }) ?? null
  );
}

function masterDeptRowsForSpecialty(table: CsvTable, specialtyName: string) {
  const candidates = specialtyCandidates(specialtyName);
  return table.rows.filter((row) => {
    const record = rowObject(table, row);
    return candidates.includes(cleanCell(record["תחום התמחות"])) && cleanCell(record["שם_מרכז_רפואי"]) !== "";
  });
}

function findAssutaInternalMedicineCsvRow(table: CsvTable) {
  const rows = masterDeptRowsForSpecialty(table, "רפואה פנימית").filter((row) =>
    cleanCell(rowObject(table, row)["שם_מרכז_רפואי"]).includes("אסותא אשדוד")
  );

  return rows.find((row) => hasCsvValue(rowObject(table, row)["תת מחלקה"])) ?? rows[0] ?? null;
}

function statusFor(input: {
  csvValue: string | null;
  dbValue: string | number | null;
  resolverValue: string | number | null;
  renderedValue: string | number | null;
  dbMustExist?: boolean;
}) {
  if (!hasCsvValue(input.csvValue)) return { status: "PASS" as const };
  if (input.dbMustExist && !hasCsvValue(String(input.dbValue ?? ""))) {
    return { status: "FAIL" as const, failure: "CSV value exists; DB value missing" };
  }
  if (!hasCsvValue(String(input.resolverValue ?? ""))) {
    return { status: "FAIL" as const, failure: "DB/query value exists; resolver returned missing" };
  }
  if (!hasCsvValue(String(input.renderedValue ?? ""))) {
    return { status: "FAIL" as const, failure: "resolver value exists; rendered value missing" };
  }
  if (!valueMatches(input.csvValue, input.renderedValue)) {
    return { status: "FAIL" as const, failure: "rendered value differs from CSV/imported value" };
  }
  return { status: "PASS" as const };
}

function specialtyRenderedValue(
  metricKey: string,
  dashboard: Awaited<ReturnType<typeof getSpecialtyDashboardMetrics>>
) {
  if (metricKey === "מספר תוכניות") return null;
  if (metricKey === "מספר_מתמחים") return dashboard.metrics.find((metric) => metric.key === "activeResidents")?.value ?? null;
  if (metricKey === "משך_התמחות_רשמי" || metricKey === "משך_ממוצע_בפועל") {
    return dashboard.metrics.find((metric) => metric.key === "residencyDuration")?.value ?? null;
  }
  if (metricKey === "שכר_לא_פריפריה") {
    return dashboard.metrics.find((metric) => metric.key === "salaryGap")?.comparisonValues?.centerSalary ?? null;
  }
  if (metricKey === "שכר_פריפריה") {
    return dashboard.metrics.find((metric) => metric.key === "salaryGap")?.comparisonValues?.peripherySalary ?? null;
  }
  if (metricKey === "פער_שכר_פריפריה") {
    return dashboard.metrics.find((metric) => metric.key === "salaryGap")?.value ?? null;
  }
  return null;
}

async function auditSpecialtyMetric(input: {
  specialtyName: string;
  metricKey: string;
  masterSpec: CsvTable;
  masterDept: CsvTable;
}) {
  const subjectCandidates = specialtyCandidates(input.specialtyName);
  const specialty = await prisma.specialty.findFirst({
    where: { name: { in: subjectCandidates } },
    include: { metrics: true }
  });
  if (!specialty) {
    return {
      scope: "SPECIALTY",
      subject: input.specialtyName,
      metric: input.metricKey,
      csvColumn: null,
      csvValue: null,
      importedMetricKey: null,
      dbTable: "Specialty",
      dbRowCount: 0,
      dbValue: null,
      queryValue: null,
      resolverValue: null,
      renderedValue: null,
      resolverMetricKey: null,
      status: "FAIL",
      failure: "specialty not found"
    } satisfies AuditRow;
  }

  const dashboard = await getSpecialtyDashboardMetrics(specialty.id);
  const specRow = findSpecialtyCsvRow(input.masterSpec, input.specialtyName);

  if (input.metricKey === "מספר תוכניות") {
    const csvRows = masterDeptRowsForSpecialty(input.masterDept, input.specialtyName);
    const [dbCount, directory] = await Promise.all([
      prisma.department.count({ where: { specialtyId: specialty.id, importStableKey: { not: null } } }),
      getDirectoryData({ specialties: [specialty.id] })
    ]);
    const csvCount = String(csvRows.length);
    const rendered = String(directory.length);
    const result = statusFor({
      csvValue: csvCount,
      dbValue: dbCount,
      resolverValue: dbCount,
      renderedValue: rendered,
      dbMustExist: true
    });

    return {
      scope: "SPECIALTY",
      subject: specialty.name,
      metric: input.metricKey,
      csvColumn: "Master_Dept row count",
      csvValue: csvCount,
      importedMetricKey: "importStableKey",
      dbTable: "Department",
      dbRowCount: dbCount,
      dbValue: dbCount,
      queryValue: directory.length,
      resolverValue: dbCount,
      renderedValue: rendered,
      resolverMetricKey: "derived",
      metricLevel: "derived",
      ...result
    } satisfies AuditRow;
  }

  if (!specRow) {
    return {
      scope: "SPECIALTY",
      subject: input.specialtyName,
      metric: input.metricKey,
      csvColumn: null,
      csvValue: null,
      importedMetricKey: null,
      dbTable: "SpecialtyMetric",
      dbRowCount: 0,
      dbValue: null,
      queryValue: null,
      resolverValue: null,
      renderedValue: null,
      resolverMetricKey: null,
      status: "FAIL",
      failure: "MASTER_Spec row not found"
    } satisfies AuditRow;
  }

  const registry = metricRegistryEntryFor(input.metricKey);
  const csv = csvValueFor(input.masterSpec, specRow, input.metricKey);
  const dbMetric = registry
    ? specialty.metrics.find((metric) => registry.importedKeys.includes(metric.metricKey))
    : null;
  const resolverMetric = resolveImportedMetric(specialty.metrics, input.metricKey);
  const [dbRowCount] = await Promise.all([
    prisma.specialtyMetric.count({
      where: {
        specialtyId: specialty.id,
        metricKey: { in: registry?.importedKeys ?? [input.metricKey] }
      }
    })
  ]);
  const rendered = specialtyRenderedValue(input.metricKey, dashboard);
  const dbValue = formatMetricValue(dbMetric);
  const resolverValue = formatMetricValue(resolverMetric);
  const result = statusFor({
    csvValue: csv.value,
    dbValue,
    resolverValue,
    renderedValue: rendered,
    dbMustExist: true
  });

  return {
    scope: "SPECIALTY",
    subject: specialty.name,
    metric: input.metricKey,
    csvColumn: csv.column,
    csvValue: csv.value,
    importedMetricKey: csv.column,
    dbTable: "SpecialtyMetric",
    dbRowCount,
    dbValue,
    queryValue: rendered,
    resolverValue,
    renderedValue: rendered,
    resolverMetricKey: resolverMetric?.metricKey ?? null,
    metricLevel: "נתון ארצי לתחום",
    ...result
  } satisfies AuditRow;
}

async function findAssutaInternalMedicineDepartment(csvRow: Record<string, string>) {
  const subDepartment = cleanCell(csvRow["תת מחלקה"]);
  const departments = await prisma.department.findMany({
    where: {
      importStableKey: { not: null },
      institution: { name: { contains: "אסותא אשדוד" } },
      specialty: { name: { in: specialtyCandidates("רפואה פנימית") } }
    },
    include: {
      institution: true,
      specialty: true,
      metrics: true
    },
    orderBy: [{ name: "asc" }]
  });

  return (
    departments.find((department) => subDepartment && department.name.includes(subDepartment)) ??
    departments.find((department) => department.metrics.length > 0) ??
    departments[0] ??
    null
  );
}

function availableMetricKeys(metrics: ImportedMetricLike[]) {
  return metrics
    .filter(metricHasValue)
    .map((metric) => metric.metricKey)
    .sort((left, right) => left.localeCompare(right, "he"));
}

async function auditDepartmentMetric(input: {
  metricKey: string;
  masterDept: CsvTable;
  masterSpec: CsvTable;
}) {
  const csvRow = findAssutaInternalMedicineCsvRow(input.masterDept);
  if (!csvRow) {
    return {
      scope: "DEPARTMENT",
      subject: "אסותא אשדוד → רפואה פנימית",
      metric: input.metricKey,
      csvColumn: null,
      csvValue: null,
      importedMetricKey: null,
      dbTable: "DepartmentMetric",
      dbRowCount: 0,
      dbValue: null,
      queryValue: null,
      resolverValue: null,
      renderedValue: null,
      resolverMetricKey: null,
      status: "FAIL",
      failure: "Master_Dept target row not found"
    } satisfies AuditRow;
  }

  const record = rowObject(input.masterDept, csvRow);
  const department = await findAssutaInternalMedicineDepartment(record);
  if (!department) {
    return {
      scope: "DEPARTMENT",
      subject: "אסותא אשדוד → רפואה פנימית",
      metric: input.metricKey,
      csvColumn: null,
      csvValue: null,
      importedMetricKey: null,
      dbTable: "DepartmentMetric",
      dbRowCount: 0,
      dbValue: null,
      queryValue: null,
      resolverValue: null,
      renderedValue: null,
      resolverMetricKey: null,
      status: "FAIL",
      failure: "department not found"
    } satisfies AuditRow;
  }

  const detail = await getDepartmentPageData(department.slug, undefined, department.id);
  const registry = metricRegistryEntryFor(input.metricKey);
  const csv = csvValueFor(input.masterDept, csvRow, input.metricKey);
  const dbMetric = registry
    ? department.metrics.find((metric) => registry.importedKeys.includes(metric.metricKey))
    : null;
  const queryDepartmentMetric = detail ? resolveImportedMetric(detail.metrics, input.metricKey) : null;
  const querySpecialtyMetric = detail ? resolveImportedMetric(detail.specialty.metrics, input.metricKey) : null;
  const resolverMetric = queryDepartmentMetric ?? querySpecialtyMetric;
  const resolverLevel = queryDepartmentMetric ? "מחלקתי" : querySpecialtyMetric ? "נתון ארצי לתחום" : undefined;
  const dbRowCount = await prisma.departmentMetric.count({
    where: {
      department: {
        institution: { name: { contains: "אסותא אשדוד" } },
        specialty: { name: { in: specialtyCandidates("רפואה פנימית") } }
      },
      metricKey: { in: registry?.importedKeys ?? [input.metricKey] }
    }
  });
  const dbValue = formatMetricValue(dbMetric);
  const queryValue = formatMetricValue(queryDepartmentMetric) ?? formatMetricValue(querySpecialtyMetric);
  const resolverValue = formatMetricValue(resolverMetric);
  const renderedValue = resolverValue;
  const result = statusFor({
    csvValue: csv.value,
    dbValue,
    resolverValue,
    renderedValue,
    dbMustExist: true
  });
  const departmentValueFailure =
    metricHasValue(dbMetric) && !queryDepartmentMetric
      ? {
          status: "FAIL" as const,
          failure: "DepartmentMetric exists; resolver used fallback/missing"
        }
      : null;

  return {
    scope: "DEPARTMENT",
    subject: `${department.institution.name} → ${department.specialty.name} → ${department.name}`,
    metric: input.metricKey,
    csvColumn: csv.column,
    csvValue: csv.value,
    importedMetricKey: csv.column,
    dbTable: "DepartmentMetric",
    dbRowCount,
    dbValue,
    queryValue,
    resolverValue,
    renderedValue,
    resolverMetricKey: resolverMetric?.metricKey ?? null,
    metricLevel: resolverLevel,
    ...(departmentValueFailure ?? result)
  } satisfies AuditRow;
}

export async function runMetricEndToEndAudit() {
  const [masterSpec, masterDept] = await Promise.all([
    readCsv("MASTER_Spec.csv"),
    readCsv("Master_Dept.csv")
  ]);

  const specialtyRows: AuditRow[] = [];
  for (const specialtyName of specialtyNames) {
    for (const metricKey of specialtyMetricKeys) {
      specialtyRows.push(await auditSpecialtyMetric({ specialtyName, metricKey, masterSpec, masterDept }));
    }
  }

  const departmentRows: AuditRow[] = [];
  for (const metricKey of departmentMetricKeys) {
    departmentRows.push(await auditDepartmentMetric({ metricKey, masterDept, masterSpec }));
  }

  const departmentCsvRow = findAssutaInternalMedicineCsvRow(masterDept);
  const departmentRecord = departmentCsvRow ? rowObject(masterDept, departmentCsvRow) : null;
  const auditedDepartment = departmentRecord ? await findAssutaInternalMedicineDepartment(departmentRecord) : null;
  const departmentPageAudit: DepartmentPageAuditSummary = {
    departmentId: auditedDepartment?.id ?? null,
    availableDepartmentMetricKeys: auditedDepartment ? availableMetricKeys(auditedDepartment.metrics) : [],
    fields: departmentRows.map((row) => ({
      metric: row.metric,
      queryValue: row.queryValue,
      resolverValue: row.resolverValue,
      renderedValue: row.renderedValue,
      status: row.status
    }))
  };

  const checks = [...specialtyRows, ...departmentRows];
  const failedChecks = checks
    .filter((row) => row.status === "FAIL")
    .map((row) => `${row.scope}:${row.subject}:${row.metric}:${row.failure ?? "failed"}`);

  return {
    status: failedChecks.length > 0 ? "FAIL" as const : "PASS" as const,
    counts: {
      checks: checks.length,
      specialtyChecks: specialtyRows.length,
      departmentChecks: departmentRows.length,
      failed: failedChecks.length
    },
    checks,
    departmentPageAudit,
    failedChecks
  };
}

async function main() {
  const audit = await runMetricEndToEndAudit();
  console.log(JSON.stringify(audit, null, 2));
  if (audit.failedChecks.length > 0) {
    throw new Error(`Metric end-to-end audit failed: ${audit.failedChecks.join(", ")}`);
  }
}

if (process.argv[1]?.endsWith("audit-metric-end-to-end.ts")) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
