import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getDepartmentPageData, getDirectoryData, getSpecialtyDashboardMetrics } from "@/lib/queries";
import { getDepartmentHref } from "@/lib/utils";
import {
  normalizeDepartmentNameSubDepartment,
  normalizeDepartmentSubDepartment
} from "@/lib/department-normalization";
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
  globalCoverage?: DepartmentCoverageAudit;
  strictSamples?: StrictDepartmentSample[];
};

type DepartmentCoverageAudit = {
  totalImportedDepartments: number;
  departmentsWithDepartmentMetricRows: number;
  staleImportedDepartments: number;
  duplicateSlugDepartments: number;
  perMetric: Array<{
    metric: string;
    type: "DepartmentMetric" | "DepartmentYearlyMetric";
    csvWithValue: number;
    csvBlank: number;
    csvInvalid: number;
    dbWithValue: number;
    coveragePct: number | null;
    importFailure: number;
    wrongKey: number;
    dbMissing: number;
  }>;
  topMissingDepartments: Array<{
    departmentId: string | null;
    institution: string;
    specialty: string;
    department: string;
    missingCount: number;
    causes: string[];
  }>;
  duplicateNormalizedActiveGroups: Array<{
    institution: string;
    specialty: string;
    normalizedSubDepartment: string;
    departmentIds: string[];
    names: string[];
  }>;
  staleAliasChecks: Array<{
    staleDepartmentId: string;
    canonicalDepartmentId: string | null;
    slug: string;
    status: "PASS" | "FAIL";
  }>;
  causeSummary: {
    csvBlank: number;
    csvInvalid: number;
    importFailure: number;
    wrongKey: number;
    dbMissing: number;
    wrongDepartmentId: number;
    queryResolverIssue: number;
    staleRow: number;
    duplicateSlug: number;
  };
};

type StrictDepartmentSample = {
  departmentId: string;
  url: string;
  subject: string;
  checks: Array<{
    metric: string;
    csvValue: string | null;
    dbValue: string | number | null;
    queryValue: string | number | null;
    resolverValue: string | number | null;
    renderedValue: string | number | null;
    status: AuditStatus;
    failure?: string;
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

const yearlyResidentMetricKeys = [2020, 2021, 2022, 2023, 2024].map((year) => `מספר מתמחים חדשים ${year}`);

const strictDepartmentMetricKeys = [
  "מספר_מתמחים",
  "זמן_המתנה_חציוני_לתקן",
  "משך_התמחות_רשמי",
  "משך_ממוצע_בפועל",
  "מספר המתקבלים שדיווחו שמצאו מיד התמחות",
  "מספר המתקבלים שדיווחו שמצאו עד חצי שנה",
  "מספר המתקבלים שדיווחו שמצאו עד שנה",
  "מספר המתקבלים שדיווחו שמצאו עד שנתיים",
  "מספר המתקבלים שדיווחו שמצאו אחרי שנתיים"
];

const departmentSpecialtyAliases: Record<string, string> = {
  "רפואת המשפחה": "רפואת משפחה",
  "פנימית": "רפואה פנימית",
  "אורתופדיה": "כירורגיה אורתופדית",
  "אף אוזן גרון": "מחלות א.א.ג וכירורגיה של ראש וצוואר",
  "רדיולוגיה (דימות)": "רדיולוגיה אבחנתית",
  "פתולוגיה": "פתולוגיה אבחנתית",
  "רפואת עור": "מחלות עור ומין",
  "פסיכיאטריה של הילד והמתבגר": "פסיכיאטריה של הילד ומתבגר",
  "כירורגית כלי דם": "כירורגית כלי-דם"
};

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

function isInvalidCsvValue(value: string | null | undefined) {
  const normalized = cleanCell(value);
  return Boolean(normalized && /^#(?:DIV\/0!|N\/A|VALUE!|REF!|NUM!)/i.test(normalized));
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

function canonicalDepartmentSpecialtyName(name: string) {
  const cleaned = cleanCell(name);
  return departmentSpecialtyAliases[cleaned] ?? cleaned;
}

function normalizeStablePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/["'׳״]/g, "")
    .replace(/[()]/g, "")
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[׳’`]/g, "'")
    .trim();
}

function departmentStableKey(input: {
  institutionName: string;
  specialtyName: string;
  subDepartment: string;
}) {
  const specialtyName = canonicalDepartmentSpecialtyName(input.specialtyName);
  const subDepartment = normalizeDepartmentSubDepartment(input.subDepartment) || specialtyName;

  return crypto
    .createHash("sha1")
    .update([input.institutionName, specialtyName, subDepartment].map(normalizeStablePart).join("|"))
    .digest("hex");
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
    value: column ? csvValueForColumn(table, row, column) : null
  };
}

function csvValueForColumn(table: CsvTable, row: string[], column: string) {
  const values = table.headers
    .map((header, index) => (header === column ? cleanCell(row[index]) : null))
    .filter((value): value is string => value !== null);
  const nonEmptyValues = values.filter(Boolean);
  return nonEmptyValues[nonEmptyValues.length - 1] ?? values[values.length - 1] ?? null;
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

function departmentMetricEntry(fieldOrKey: string) {
  const registry = metricRegistryEntryFor(fieldOrKey);
  return {
    importedKeys: registry?.importedKeys ?? [fieldOrKey],
    aliases: registry ? [...registry.dbKeys, ...(registry.legacyKeys ?? [])] : []
  };
}

function exactDepartmentMetric(metrics: ImportedMetricLike[], fieldOrKey: string) {
  const entry = departmentMetricEntry(fieldOrKey);
  return metrics.find((metric) => entry.importedKeys.includes(metric.metricKey) && metricHasValue(metric)) ?? null;
}

function aliasDepartmentMetric(metrics: ImportedMetricLike[], fieldOrKey: string) {
  const entry = departmentMetricEntry(fieldOrKey);
  return metrics.find((metric) => entry.aliases.includes(metric.metricKey) && metricHasValue(metric)) ?? null;
}

function metricValueForCoverage(input: {
  department: DepartmentForCoverage | null;
  fieldOrKey: string;
}) {
  if (!input.department) return null;
  return exactDepartmentMetric(input.department.metrics, input.fieldOrKey);
}

type DepartmentForCoverage = {
  id: string;
  institutionId: string;
  specialtyId: string;
  slug: string;
  name: string;
  importStableKey: string | null;
  institution: { name: string };
  specialty: { name: string };
  metrics: ImportedMetricLike[];
  yearlyMetrics: Array<ImportedMetricLike & { year: number }>;
};

type CsvDepartmentRow = {
  stableKey: string;
  row: string[];
  institutionName: string;
  specialtyName: string;
  subDepartment: string;
};

function csvDepartmentRows(table: CsvTable): CsvDepartmentRow[] {
  return table.rows
    .map((row) => {
      const record = rowObject(table, row);
      const institutionName = cleanCell(record["שם_מרכז_רפואי"]);
      const specialtyName = canonicalDepartmentSpecialtyName(record["תחום התמחות"]);
      const subDepartment = normalizeDepartmentSubDepartment(record["תת מחלקה"]);

      if (!institutionName || !specialtyName) return null;

      return {
        stableKey: departmentStableKey({ institutionName, specialtyName, subDepartment }),
        row,
        institutionName,
        specialtyName,
        subDepartment
      };
    })
    .filter((row): row is CsvDepartmentRow => Boolean(row));
}

function percentage(numerator: number, denominator: number) {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function yearlyMetricHasValue(
  department: DepartmentForCoverage | null,
  year: number
) {
  return Boolean(
    department?.yearlyMetrics.some((metric) => metric.metricKey === "newResidents" && metric.year === year && metricHasValue(metric))
  );
}

function yearlyMetricValue(
  department: DepartmentForCoverage | null,
  year: number
) {
  const metric = department?.yearlyMetrics.find(
    (row) => row.metricKey === "newResidents" && row.year === year && metricHasValue(row)
  );
  return formatMetricValue(metric);
}

function coverageMetricValue(input: {
  table: CsvTable;
  csvRow: string[];
  department: DepartmentForCoverage | null;
  metricKey: string;
}) {
  const yearlyMatch = input.metricKey.match(/^מספר מתמחים חדשים (\d{4})$/);
  if (yearlyMatch) {
    const year = Number(yearlyMatch[1]);
    const csvValue = csvValueForColumn(input.table, input.csvRow, input.metricKey);
    return {
      csvColumn: input.metricKey,
      csvValue,
      dbValue: yearlyMetricValue(input.department, year),
      hasDbValue: yearlyMetricHasValue(input.department, year),
      hasWrongKeyValue: false
    };
  }

  const csv = csvValueFor(input.table, input.csvRow, input.metricKey);
  const exactMetric = metricValueForCoverage({ department: input.department, fieldOrKey: input.metricKey });
  const aliasMetric = input.department ? aliasDepartmentMetric(input.department.metrics, input.metricKey) : null;

  return {
    csvColumn: csv.column,
    csvValue: csv.value,
    dbValue: formatMetricValue(exactMetric),
    hasDbValue: Boolean(exactMetric),
    hasWrongKeyValue: Boolean(aliasMetric),
    wrongKey: aliasMetric?.metricKey ?? null
  };
}

async function buildDepartmentCoverageAudit(masterDept: CsvTable) {
  const csvRows = csvDepartmentRows(masterDept);
  const dbDepartments = await prisma.department.findMany({
    where: { importStableKey: { not: null } },
    select: {
      id: true,
      institutionId: true,
      specialtyId: true,
      slug: true,
      name: true,
      importStableKey: true,
      institution: { select: { name: true } },
      specialty: { select: { name: true } },
      metrics: {
        select: {
          metricKey: true,
          label: true,
          value: true,
          rawValue: true,
          unit: true,
          sourceNotes: true,
          lastUpdated: true
        }
      },
      yearlyMetrics: {
        select: {
          metricKey: true,
          year: true,
          value: true,
          rawValue: true,
          unit: true,
          sourceNotes: true,
          lastUpdated: true
        }
      }
    }
  });
  const departmentByStableKey = new Map(dbDepartments.map((department) => [department.importStableKey, department]));
  const csvStableKeys = new Set(csvRows.map((row) => row.stableKey));
  const duplicateSlugDepartments = dbDepartments.length - new Set(dbDepartments.map((department) => department.slug)).size;
  const departmentsWithDepartmentMetricRows = dbDepartments.filter((department) =>
    department.metrics.some(metricHasValue)
  ).length;
  const auditedMetricKeys = [...departmentMetricKeys, ...yearlyResidentMetricKeys];
  const causeSummary = {
    csvBlank: 0,
    csvInvalid: 0,
    importFailure: 0,
    wrongKey: 0,
    dbMissing: 0,
    wrongDepartmentId: 0,
    queryResolverIssue: 0,
    staleRow: dbDepartments.filter((department) => department.importStableKey && !csvStableKeys.has(department.importStableKey)).length,
    duplicateSlug: duplicateSlugDepartments
  };
  const missingByDepartment = new Map<string, {
    departmentId: string | null;
    institution: string;
    specialty: string;
    department: string;
    causes: string[];
  }>();

  const perMetric = auditedMetricKeys.map((metricKey) => {
    let csvWithValue = 0;
    let csvBlank = 0;
    let csvInvalid = 0;
    let dbWithValue = 0;
    let importFailure = 0;
    let wrongKey = 0;
    let dbMissing = 0;

    for (const csvRow of csvRows) {
      const department = departmentByStableKey.get(csvRow.stableKey) ?? null;
      const value = coverageMetricValue({
        table: masterDept,
        csvRow: csvRow.row,
        department,
        metricKey
      });
      const invalidCsv = isInvalidCsvValue(value.csvValue);
      const validCsv = hasCsvValue(value.csvValue);

      if (invalidCsv) {
        csvInvalid += 1;
        causeSummary.csvInvalid += 1;
        continue;
      }

      if (!validCsv) {
        csvBlank += 1;
        causeSummary.csvBlank += 1;
        continue;
      }

      csvWithValue += 1;
      if (!department) {
        importFailure += 1;
        causeSummary.importFailure += 1;
      } else if (value.hasDbValue) {
        dbWithValue += 1;
      } else if (value.hasWrongKeyValue) {
        wrongKey += 1;
        causeSummary.wrongKey += 1;
      } else {
        dbMissing += 1;
        causeSummary.dbMissing += 1;
      }

      if (validCsv && (!department || !value.hasDbValue)) {
        const id = department?.id ?? csvRow.stableKey;
        const existing = missingByDepartment.get(id) ?? {
          departmentId: department?.id ?? null,
          institution: department?.institution.name ?? csvRow.institutionName,
          specialty: department?.specialty.name ?? csvRow.specialtyName,
          department: department?.name ?? (csvRow.subDepartment || csvRow.specialtyName),
          causes: []
        };
        const cause = !department
          ? `${metricKey}:import failure`
          : value.hasWrongKeyValue
            ? `${metricKey}:wrong key`
            : `${metricKey}:db missing`;
        existing.causes.push(cause);
        missingByDepartment.set(id, existing);
      }
    }

    return {
      metric: metricKey,
      type: metricKey.startsWith("מספר מתמחים חדשים") ? "DepartmentYearlyMetric" as const : "DepartmentMetric" as const,
      csvWithValue,
      csvBlank,
      csvInvalid,
      dbWithValue,
      coveragePct: percentage(dbWithValue, csvWithValue),
      importFailure,
      wrongKey,
      dbMissing
    };
  });

  const topMissingDepartments = Array.from(missingByDepartment.values())
    .map((department) => ({
      ...department,
      missingCount: department.causes.length,
      causes: department.causes.slice(0, 8)
    }))
    .sort((left, right) => right.missingCount - left.missingCount)
    .slice(0, 20);

  const activeGroups = new Map<string, DepartmentForCoverage[]>();
  for (const department of dbDepartments) {
    const normalizedSubDepartment = normalizeDepartmentNameSubDepartment(department.name, department.specialty.name);
    const key = [department.institution.name, department.specialty.name, normalizedSubDepartment || "__base__"].join("|");
    const rows = activeGroups.get(key) ?? [];
    rows.push(department);
    activeGroups.set(key, rows);
  }
  const duplicateNormalizedActiveGroups = Array.from(activeGroups.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => {
      const [institution, specialty, normalizedSubDepartment] = key.split("|");
      return {
        institution,
        specialty,
        normalizedSubDepartment: normalizedSubDepartment === "__base__" ? "" : normalizedSubDepartment,
        departmentIds: rows.map((row) => row.id),
        names: rows.map((row) => row.name)
      };
    });
  const staleAliasChecks = await buildStaleAliasChecks();

  return {
    audit: {
      totalImportedDepartments: dbDepartments.length,
      departmentsWithDepartmentMetricRows,
      staleImportedDepartments: causeSummary.staleRow,
      duplicateSlugDepartments,
      perMetric,
      topMissingDepartments,
      duplicateNormalizedActiveGroups,
      staleAliasChecks,
      causeSummary
    } satisfies DepartmentCoverageAudit,
    csvRows,
    departmentByStableKey
  };
}

async function buildStaleAliasChecks() {
  const hiddenDepartments = await prisma.department.findMany({
    where: {
      importStableKey: null
    },
    select: {
      id: true,
      institutionId: true,
      specialtyId: true,
      slug: true,
      name: true,
      institution: { select: { name: true } },
      specialty: { select: { name: true } },
      _count: { select: { metrics: true } }
    }
  });
  const checks: DepartmentCoverageAudit["staleAliasChecks"] = [];

  for (const hidden of hiddenDepartments) {
    const normalizedSubDepartment = normalizeDepartmentNameSubDepartment(hidden.name, hidden.specialty.name);
    const canonicalCandidates = await prisma.department.findMany({
      where: {
        institutionId: hidden.institutionId,
        specialtyId: hidden.specialtyId,
        importStableKey: { not: null }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        metrics: { select: { id: true }, take: 2 },
        specialty: { select: { name: true } }
      }
    });
    const canonical = canonicalCandidates.find((candidate) =>
      normalizeDepartmentNameSubDepartment(candidate.name, candidate.specialty.name) === normalizedSubDepartment
    );

    if (!canonical) continue;

    const detail = await getDepartmentPageData(hidden.slug, undefined, hidden.id);
    checks.push({
      staleDepartmentId: hidden.id,
      canonicalDepartmentId: detail?.id ?? null,
      slug: hidden.slug,
      status: detail?.id === canonical.id && detail.metrics.length > 1 ? "PASS" : "FAIL"
    });
  }

  return checks.slice(0, 50);
}

async function buildStrictDepartmentSamples(input: {
  masterDept: CsvTable;
  csvRows: CsvDepartmentRow[];
  departmentByStableKey: Map<string | null, DepartmentForCoverage>;
}) {
  const candidates = input.csvRows
    .map((csvRow) => {
      const department = input.departmentByStableKey.get(csvRow.stableKey) ?? null;
      if (!department) return null;
      const hasAllStrictCsvValues = strictDepartmentMetricKeys.every((metricKey) =>
        hasCsvValue(coverageMetricValue({
          table: input.masterDept,
          csvRow: csvRow.row,
          department,
          metricKey
        }).csvValue)
      );

      return hasAllStrictCsvValues ? { csvRow, department } : null;
    })
    .filter((item): item is { csvRow: CsvDepartmentRow; department: DepartmentForCoverage } => Boolean(item));
  const samples: typeof candidates = [];
  const usedInstitutions = new Set<string>();
  const usedSpecialties = new Set<string>();

  for (const candidate of candidates) {
    const institutionKey = candidate.department.institution.name;
    const specialtyKey = candidate.department.specialty.name;
    if (usedInstitutions.has(institutionKey) && usedSpecialties.has(specialtyKey)) continue;
    samples.push(candidate);
    usedInstitutions.add(institutionKey);
    usedSpecialties.add(specialtyKey);
    if (samples.length >= 10) break;
  }
  for (const candidate of candidates) {
    if (samples.length >= 10) break;
    if (samples.some((sample) => sample.department.id === candidate.department.id)) continue;
    samples.push(candidate);
  }

  const strictSamples: StrictDepartmentSample[] = [];
  for (const sample of samples.slice(0, 10)) {
    const url = getDepartmentHref({ slug: sample.department.slug, id: sample.department.id });
    const parsedUrl = new URL(url, "https://hitmachut.org");
    const routeSlug = decodeURIComponent(parsedUrl.pathname.split("/").pop() ?? sample.department.slug);
    const routeDepartmentId = parsedUrl.searchParams.get("departmentId");
    const detail = await getDepartmentPageData(routeSlug, undefined, routeDepartmentId);
    const checks = strictDepartmentMetricKeys.map((metricKey) => {
      const coverage = coverageMetricValue({
        table: input.masterDept,
        csvRow: sample.csvRow.row,
        department: sample.department,
        metricKey
      });
      const dbMetric = exactDepartmentMetric(sample.department.metrics, metricKey);
      const queryMetric = detail ? resolveImportedMetric(detail.metrics, metricKey) : null;
      const specialtyFallbackMetric = detail ? resolveImportedMetric(detail.specialty.metrics, metricKey) : null;
      const resolverMetric = queryMetric ?? specialtyFallbackMetric;
      const dbValue = coverage.dbValue;
      const queryValue = formatMetricValue(queryMetric);
      const resolverValue = formatMetricValue(resolverMetric);
      const renderedValue = queryValue ?? resolverValue;
      const baseResult = statusFor({
        csvValue: coverage.csvValue,
        dbValue,
        resolverValue,
        renderedValue,
        dbMustExist: true
      });
      const status =
        detail?.id !== sample.department.id
          ? { status: "FAIL" as const, failure: "wrong departmentId returned" }
          : metricHasValue(dbMetric) && !queryMetric
            ? { status: "FAIL" as const, failure: "DepartmentMetric exists; query/resolver missing by departmentId" }
            : baseResult;

      return {
        metric: metricKey,
        csvValue: coverage.csvValue,
        dbValue,
        queryValue,
        resolverValue,
        renderedValue,
        ...status
      };
    });

    strictSamples.push({
      departmentId: sample.department.id,
      url,
      subject: `${sample.department.institution.name} → ${sample.department.specialty.name} → ${sample.department.name}`,
      checks
    });
  }

  return strictSamples;
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
  const coverage = await buildDepartmentCoverageAudit(masterDept);

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
    })),
    globalCoverage: coverage.audit,
    strictSamples: await buildStrictDepartmentSamples({
      masterDept,
      csvRows: coverage.csvRows,
      departmentByStableKey: coverage.departmentByStableKey
    })
  };

  const checks = [...specialtyRows, ...departmentRows];
  const strictSampleFailures = departmentPageAudit.strictSamples
    ?.flatMap((sample) =>
      sample.checks
        .filter((check) => check.status === "FAIL")
        .map((check) => `STRICT:${sample.subject}:${check.metric}:${check.failure ?? "failed"}`)
    ) ?? [];
  const coverageFailures = coverage.audit.perMetric
    .filter((metric) => metric.csvWithValue > 0 && metric.coveragePct !== 100)
    .map((metric) => `COVERAGE:${metric.metric}:${metric.coveragePct ?? 0}%`);
  const duplicateNormalizedFailures = coverage.audit.duplicateNormalizedActiveGroups.map((group) =>
    `DUPLICATE_NORMALIZED:${group.institution}:${group.specialty}:${group.normalizedSubDepartment}:${group.departmentIds.join(",")}`
  );
  const staleAliasFailures = coverage.audit.staleAliasChecks
    .filter((check) => check.status === "FAIL")
    .map((check) => `STALE_ALIAS:${check.staleDepartmentId}:${check.slug}`);
  const failedChecks = checks
    .filter((row) => row.status === "FAIL")
    .map((row) => `${row.scope}:${row.subject}:${row.metric}:${row.failure ?? "failed"}`)
    .concat(strictSampleFailures, coverageFailures, duplicateNormalizedFailures, staleAliasFailures);

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
