import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { InstitutionType, Prisma, type PrismaClient } from "@prisma/client";
import {
  buildMetricDisplayMetadata,
  canonicalSheet,
  criterionCandidatesForMetric,
  findMetricDisplayMetadata,
  normalizeCriterion,
  type MetricDisplayMetadata
} from "@/lib/metric-display";
import {
  departmentDisplayNameFromSubDepartment,
  normalizeDepartmentSubDepartment
} from "@/lib/department-normalization";
import {
  ensureDepartmentPage,
  ensureInstitution,
  ensureSpecialty,
  normalizeCatalogLookupValue,
  slugifyValue
} from "@/server/department-catalog";
import {
  isSpreadsheetErrorValue,
  normalizeSpreadsheetCell,
  nullIfSpreadsheetError
} from "@/lib/spreadsheet-errors";

type DbClient = PrismaClient | Prisma.TransactionClient;

type ParsedCell = {
  value: number | null;
  rawValue: string | null;
  warning?: string;
};

type MetricInput = {
  key: string;
  label: string;
  header: string;
  headers?: string[];
  legacyKeys?: string[];
  unit?: string;
  occurrence?: number;
};

type TextMetricInput = {
  key: string;
  label: string;
  header: string;
  headers?: string[];
  legacyKeys?: string[];
  occurrence?: number;
};

type CsvRow = {
  rowNumber: number;
  values: string[];
  get: (header: string, occurrence?: number) => string;
  getAll: (header: string) => string[];
  asObject: () => Record<string, string | string[]>;
};

type CsvTable = {
  rawHeaders: string[];
  headers: string[];
  rows: CsvRow[];
  sourceNotes: CsvRow | null;
};

type ImportOnlyMode = "all" | "data-exp" | "spec" | "dept";
export type MasterCsvUploadKind = "spec" | "dept";

const MASTER_SPEC_FILE = "MASTER_Spec.csv";
const MASTER_DEPT_FILE = "Master_Dept.csv";
const DATA_EXP_FILE = "Data_Exp.csv";
const OPENING_YEAR = 2026;

const SPECIALTY_NAME_ALIASES: Record<string, string> = {
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

const SPECIALTY_NUMERIC_METRICS: MetricInput[] = [
  {
    key: "משך_התמחות_רשמי (שנים)",
    label: "משך התמחות רשמי",
    header: "משך_התמחות_רשמי (שנים)",
    headers: ["משך_התמחות_רשמי (חודשים)", "משך_התמחות_רשמי"],
    legacyKeys: ["officialResidencyDuration"],
    unit: "years"
  },
  { key: "משך_ממוצע_בפועל", label: "משך ממוצע בפועל", header: "משך_ממוצע_בפועל", legacyKeys: ["actualAverageDuration", "medianResidencyDurationMonths"], unit: "years" },
  { key: "זמן_המתנה_חציוני_לתקן", label: "זמן המתנה חציוני לתקן", header: "זמן_המתנה_חציוני_לתקן", legacyKeys: ["medianWaitingTime"], unit: "months" },
  { key: "מספר המתקבלים שדיווחו שמצאו מיד התמחות", label: "דיווחי מציאת התמחות מיד", header: "מספר המתקבלים שדיווחו שמצאו מיד התמחות", legacyKeys: ["acceptedImmediatelyReports"], unit: "count" },
  { key: "מספר המתקבלים שדיווחו שמצאו עד חצי שנה", label: "דיווחי מציאת התמחות עד חצי שנה", header: "מספר המתקבלים שדיווחו שמצאו עד חצי שנה", legacyKeys: ["acceptedWithinSixMonthsReports"], unit: "count" },
  { key: "מספר המתקבלים שדיווחו שמצאו עד שנה", label: "דיווחי מציאת התמחות עד שנה", header: "מספר המתקבלים שדיווחו שמצאו עד שנה", legacyKeys: ["acceptedWithinOneYearReports"], unit: "count" },
  { key: "מספר המתקבלים שדיווחו שמצאו עד שנתיים", label: "דיווחי מציאת התמחות עד שנתיים", header: "מספר המתקבלים שדיווחו שמצאו עד שנתיים", legacyKeys: ["acceptedWithinTwoYearsReports"], unit: "count" },
  { key: "מספר המתקבלים שדיווחו שמצאו אחרי שנתיים", label: "דיווחי מציאת התמחות אחרי שנתיים", header: "מספר המתקבלים שדיווחו שמצאו אחרי שנתיים", legacyKeys: ["acceptedAfterTwoYearsReports"], unit: "count" },
  { key: "שכר_לא_פריפריה", label: "שכר לא פריפריה", header: "שכר_לא_פריפריה", legacyKeys: ["centerSalary"], unit: "currency" },
  { key: "שכר_פריפריה 1", label: "שכר פריפריה", header: "שכר_פריפריה 1", headers: ["שכר_פריפריה"], legacyKeys: ["peripherySalary"], unit: "currency" },
  { key: "פער_שכר_פריפריה", label: "פער שכר פריפריה", header: "פער_שכר_פריפריה", legacyKeys: ["peripherySalaryGap"], unit: "currency" },
  { key: "מספר_מתמחים", label: "מספר מתמחים", header: "מספר_מתמחים", legacyKeys: ["residentsCount", "activeResidentsCount"], unit: "count" },
  { key: "מספר נשים", label: "מספר נשים", header: "מספר נשים", legacyKeys: ["womenCount"], unit: "count" },
  { key: "אחוז_נשים", label: "אחוז נשים", header: "אחוז_נשים", legacyKeys: ["womenPercent"], unit: "%" },
  { key: "מספר גברים", label: "מספר גברים", header: "מספר גברים", legacyKeys: ["menCount"], unit: "count" },
  { key: "אחוז_גברים", label: "אחוז גברים", header: "אחוז_גברים", legacyKeys: ["menPercent"], unit: "%" },
  { key: "מעבר_שלב_א", label: "מעבר שלב א", header: "מעבר_שלב_א", legacyKeys: ["boardStageAPassRate"], unit: "%" },
  { key: "מעבר_שלב_ב", label: "מעבר שלב ב", header: "מעבר_שלב_ב", legacyKeys: ["boardStageBPassRate"], unit: "%" },
  { key: "מדד_שחיקה", label: "מדד שחיקה", header: "מדד_שחיקה", legacyKeys: ["burnoutIndex"], unit: "score" },
  { key: "מספר_תקנים_שצפויים להיפתח_ארצי", label: "מספר תקנים צפויים להיפתח ארצי", header: "מספר_תקנים_שצפויים להיפתח_ארצי", legacyKeys: ["expectedNationalOpenings"], unit: "count" }
];

const SPECIALTY_TEXT_METRICS: TextMetricInput[] = [
  { key: "specialtyType", label: "סוג מקצוע", header: "סוג מקצוע" },
  { key: "imaSyllabusText", label: "הסבר על ההתמחות לפי הר״י", header: "הסבר על ההתמחות ע׳׳פ הרי" },
  { key: "imaSyllabusUrl", label: "אתר הר״י על ההתמחות", header: "אתר של הר׳׳י על ההתמחות" }
];

const DEPARTMENT_NUMERIC_METRICS: MetricInput[] = [
  { key: "משך_התמחות_רשמי", label: "משך התמחות רשמי", header: "משך_התמחות_רשמי", legacyKeys: ["officialResidencyDuration"], unit: "years" },
  { key: "משך_ממוצע_בפועל", label: "משך ממוצע בפועל", header: "משך_ממוצע_בפועל", legacyKeys: ["actualAverageDuration", "medianResidencyDurationMonths"], unit: "years" },
  { key: "זמן_המתנה_חציוני_לתקן", label: "זמן המתנה חציוני לתקן", header: "זמן_המתנה_חציוני_לתקן", legacyKeys: ["medianWaitingTime"], unit: "months" },
  { key: "מספר המתקבלים שדיווחו שמצאו מיד התמחות", label: "דיווחי מציאת התמחות מיד", header: "מספר המתקבלים שדיווחו שמצאו מיד התמחות", legacyKeys: ["acceptedImmediatelyReports"], unit: "count" },
  { key: "מספר המתקבלים שדיווחו שמצאו עד חצי שנה", label: "דיווחי מציאת התמחות עד חצי שנה", header: "מספר המתקבלים שדיווחו שמצאו עד חצי שנה", legacyKeys: ["acceptedWithinSixMonthsReports"], unit: "count" },
  { key: "מספר המתקבלים שדיווחו שמצאו עד שנה", label: "דיווחי מציאת התמחות עד שנה", header: "מספר המתקבלים שדיווחו שמצאו עד שנה", legacyKeys: ["acceptedWithinOneYearReports"], unit: "count" },
  { key: "מספר המתקבלים שדיווחו שמצאו עד שנתיים", label: "דיווחי מציאת התמחות עד שנתיים", header: "מספר המתקבלים שדיווחו שמצאו עד שנתיים", legacyKeys: ["acceptedWithinTwoYearsReports"], unit: "count" },
  { key: "מספר המתקבלים שדיווחו שמצאו אחרי שנתיים", label: "דיווחי מציאת התמחות אחרי שנתיים", header: "מספר המתקבלים שדיווחו שמצאו אחרי שנתיים", legacyKeys: ["acceptedAfterTwoYearsReports"], unit: "count" },
  { key: "שכר_לא_פריפריה", label: "שכר לא פריפריה", header: "שכר_לא_פריפריה", legacyKeys: ["centerSalary"], unit: "currency" },
  { key: "שכר_פריפריה", label: "שכר פריפריה", header: "שכר_פריפריה", legacyKeys: ["peripherySalary"], unit: "currency" },
  { key: "פער_שכר_פריפריה", label: "פער שכר פריפריה", header: "פער_שכר_פריפריה", legacyKeys: ["peripherySalaryGap"], unit: "currency" },
  { key: "מספר_מתמחים", label: "מספר מתמחים", header: "מספר_מתמחים", legacyKeys: ["residentsCount", "activeResidentsCount"], unit: "count" },
  { key: "מספר נשים", label: "מספר נשים", header: "מספר נשים", legacyKeys: ["womenCount"], unit: "count" },
  { key: "אחוז_נשים", label: "אחוז נשים", header: "אחוז_נשים", legacyKeys: ["womenPercent"], unit: "%" },
  { key: "מספר גברים", label: "מספר גברים", header: "מספר גברים", legacyKeys: ["menCount"], unit: "count" },
  { key: "אחוז_גברים", label: "אחוז גברים", header: "אחוז_גברים", legacyKeys: ["menPercent"], unit: "%" },
  { key: "מעבר_שלב_א", label: "מעבר שלב א", header: "מעבר_שלב_א", legacyKeys: ["boardStageAPassRate"], unit: "%" },
  { key: "מעבר_שלב_ב", label: "מעבר שלב ב", header: "מעבר_שלב_ב", legacyKeys: ["boardStageBPassRate"], unit: "%" },
  { key: "מדד_שחיקה", label: "מדד שחיקה", header: "מדד_שחיקה", legacyKeys: ["burnoutIndex"], unit: "score" },
  { key: "מספר_בכירים", label: "מספר בכירים", header: "מספר_בכירים", legacyKeys: ["seniorPhysiciansCount"], unit: "count" },
  { key: "DUNS100", label: "מספר רופאים ב-DUNS100", header: "DUNS100", legacyKeys: ["duns100PhysiciansCount"], unit: "count" },
  { key: "מספר פרסומים מחלקתי", label: "מספר פרסומים מחלקתי", header: "מספר פרסומים מחלקתי", legacyKeys: ["departmentalPublicationsCount"], unit: "count" },
  { key: "צפי תקנים חדשים ב2026", label: "צפי תקנים חדשים ב-2026", header: "צפי תקנים חדשים ב2026", legacyKeys: ["expectedOpenings2026"], unit: "count" },
  { key: "מספר אלקטיביסטים חציוני", label: "מספר אלקטיביסטים חציוני", header: "מספר אלקטיביסטים חציוני", legacyKeys: ["medianElectiveDemand"], unit: "count" }
];

function cleanCell(value: string | null | undefined) {
  return normalizeSpreadsheetCell(value);
}

function cleanTextImportCell(value: string | null | undefined) {
  return nullIfSpreadsheetError(value);
}

function normalizeCsvHeader(value: string | null | undefined) {
  return cleanCell(value)
    .normalize("NFKC")
    .replace(/\ufeff/g, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHebrewKey(value: string) {
  return normalizeCatalogLookupValue(value)
    .replace(/[׳’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stableKey(parts: string[]) {
  return crypto
    .createHash("sha1")
    .update(parts.map((part) => normalizeHebrewKey(part)).join("|"))
    .digest("hex");
}

function jsonValue(value: unknown) {
  return value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
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
      if (char === "\r" && next === "\n") {
        index += 1;
      }
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

  return rows.filter((csvRow) => csvRow.some((cell) => cleanCell(cell).length > 0));
}

function createCsvTable(text: string, options: { hasSourceNotesRow?: boolean } = {}): CsvTable {
  const parsedRows = parseCsv(text);
  const rawHeaders = (parsedRows[0] ?? []).map(cleanCell);
  const headers = rawHeaders.map(normalizeCsvHeader);
  const indexByHeader = headers.reduce<Map<string, number[]>>((map, header, index) => {
    const key = normalizeCsvHeader(header);
    const indexes = map.get(key) ?? [];
    indexes.push(index);
    map.set(key, indexes);
    return map;
  }, new Map());

  function makeRow(values: string[], rowNumber: number): CsvRow {
    return {
      rowNumber,
      values,
      get(header, occurrence = 0) {
        const index = indexByHeader.get(normalizeCsvHeader(header))?.[occurrence];
        return index === undefined ? "" : cleanCell(values[index]);
      },
      getAll(header) {
        return (indexByHeader.get(normalizeCsvHeader(header)) ?? []).map((index) => cleanCell(values[index]));
      },
      asObject() {
        const result: Record<string, string | string[]> = {};
        headers.forEach((header, index) => {
          const key = header || `column_${index + 1}`;
          const value = cleanCell(values[index]);
          const current = result[key];
          if (current === undefined) {
            result[key] = value;
          } else if (Array.isArray(current)) {
            current.push(value);
          } else {
            result[key] = [current, value];
          }
        });
        return result;
      }
    };
  }

  const dataRows = parsedRows.slice(1).map((values, index) => makeRow(values, index + 2));
  const hasSourceNotesRow = options.hasSourceNotesRow ?? true;

  return {
    rawHeaders,
    headers,
    sourceNotes: hasSourceNotesRow ? dataRows[0] ?? null : null,
    rows: hasSourceNotesRow ? dataRows.slice(1) : dataRows
  };
}

function parseNumberCell(raw: string): ParsedCell {
  const rawValue = cleanCell(raw);

  if (!rawValue) {
    return { value: null, rawValue: null };
  }

  if (isSpreadsheetErrorValue(rawValue)) {
    return {
      value: null,
      rawValue: null,
      warning: `ערך שגיאה מגיליון טופל כחסר: ${rawValue}`
    };
  }

  if (/^\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?$/.test(rawValue)) {
    return {
      value: null,
      rawValue,
      warning: `טווח נשמר כטקסט ללא המרה: ${rawValue}`
    };
  }

  const normalized = rawValue
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/[₪$]/g, "")
    .trim();
  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return {
      value: null,
      rawValue,
      warning: `לא ניתן להמיר מספר: ${rawValue}`
    };
  }

  return { value, rawValue };
}

function parseDateCell(raw: string) {
  const value = cleanCell(raw);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseInstitutionType(value: string) {
  return value.includes("קופ") ? InstitutionType.HMO : InstitutionType.HOSPITAL;
}

function canonicalSpecialtyName(name: string) {
  const cleaned = cleanCell(name);
  return SPECIALTY_NAME_ALIASES[cleaned] ?? cleaned;
}

function sourceNoteFor(table: CsvTable, header: string, occurrence = 0) {
  return table.sourceNotes?.get(header, occurrence) || null;
}

function metricHeaders(metric: MetricInput | TextMetricInput) {
  return [metric.header, ...(metric.headers ?? [])];
}

function rowMetricValue(row: CsvRow, metric: MetricInput | TextMetricInput) {
  for (const header of metricHeaders(metric)) {
    const value = row.get(header, metric.occurrence);
    if (value) return value;
  }

  return row.get(metric.header, metric.occurrence);
}

function rowTextMetricValue(row: CsvRow, metric: TextMetricInput) {
  return nullIfSpreadsheetError(rowMetricValue(row, metric));
}

function sourceNoteForMetric(table: CsvTable, metric: MetricInput | TextMetricInput) {
  for (const header of metricHeaders(metric)) {
    const value = sourceNoteFor(table, header, metric.occurrence);
    if (value) return value;
  }

  return null;
}

function metadataForMetric(
  dataExplanations: MetricDisplayMetadata[],
  sheet: "MASTER_Spec" | "Master_Dept",
  metric: MetricInput | TextMetricInput
) {
  return findMetricDisplayMetadata(
    dataExplanations,
    sheet,
    metric.key,
    ...metricHeaders(metric),
    ...criterionCandidatesForMetric(metric.key)
  );
}

function labelForMetric(metric: MetricInput | TextMetricInput, metadata?: MetricDisplayMetadata | null) {
  return metadata?.readableLabel || metric.label;
}

function sourceForMetric(
  table: CsvTable,
  metric: MetricInput | TextMetricInput,
  metadata?: MetricDisplayMetadata | null
) {
  return metadata?.sourceLabel || sourceNoteForMetric(table, metric);
}

function nonEmptyValues(values: Array<string | null | undefined>) {
  return values.map((value) => cleanCell(value)).filter(Boolean);
}

function departmentDisplayName(specialtyName: string, subDepartment: string) {
  return departmentDisplayNameFromSubDepartment(canonicalSpecialtyName(specialtyName), subDepartment);
}

async function upsertSpecialtyMetric(
  db: DbClient,
  input: {
    specialtyId: string;
    metric: MetricInput | TextMetricInput;
    value?: number | null;
    rawValue: string | null;
    unit?: string;
    sourceNotes?: string | null;
    lastUpdated?: Date | null;
    displayMetadata?: MetricDisplayMetadata | null;
  }
) {
  if (input.value === null && !input.rawValue) return;

  if (input.metric.legacyKeys?.length) {
    const existingTarget = await db.specialtyMetric.findUnique({
      where: {
        specialtyId_metricKey: {
          specialtyId: input.specialtyId,
          metricKey: input.metric.key
        }
      }
    });

    if (existingTarget) {
      await db.specialtyMetric.deleteMany({
        where: {
          specialtyId: input.specialtyId,
          metricKey: {
            in: input.metric.legacyKeys
          }
        }
      });
    } else {
      const legacyMetric = await db.specialtyMetric.findFirst({
        where: {
          specialtyId: input.specialtyId,
          metricKey: {
            in: input.metric.legacyKeys
          }
        },
        orderBy: {
          updatedAt: "desc"
        }
      });

      if (legacyMetric) {
        await db.specialtyMetric.update({
          where: {
            id: legacyMetric.id
          },
          data: {
            metricKey: input.metric.key
          }
        });
      }
    }
  }

  await db.specialtyMetric.upsert({
    where: {
      specialtyId_metricKey: {
        specialtyId: input.specialtyId,
        metricKey: input.metric.key
      }
    },
    create: {
      specialtyId: input.specialtyId,
      metricKey: input.metric.key,
      label: labelForMetric(input.metric, input.displayMetadata),
      value: input.value ?? null,
      rawValue: input.rawValue,
      unit: input.unit ?? ("unit" in input.metric ? input.metric.unit : null),
      sourceNotes: input.sourceNotes,
      lastUpdated: input.lastUpdated
    },
    update: {
      label: labelForMetric(input.metric, input.displayMetadata),
      value: input.value ?? null,
      rawValue: input.rawValue,
      unit: input.unit ?? ("unit" in input.metric ? input.metric.unit : null),
      sourceNotes: input.sourceNotes,
      lastUpdated: input.lastUpdated
    }
  });
}

async function upsertSpecialtyYearlyMetric(
  db: DbClient,
  input: {
    specialtyId: string;
    year: number;
    value: number | null;
    rawValue: string | null;
    sourceNotes?: string | null;
    lastUpdated?: Date | null;
    displayMetadata?: MetricDisplayMetadata | null;
  }
) {
  if (input.value === null && !input.rawValue) return;

  await db.specialtyYearlyMetric.upsert({
    where: {
      specialtyId_metricKey_year: {
        specialtyId: input.specialtyId,
        metricKey: "newResidents",
        year: input.year
      }
    },
    create: {
      specialtyId: input.specialtyId,
      metricKey: "newResidents",
      year: input.year,
      value: input.value,
      rawValue: input.rawValue,
      unit: "count",
      sourceNotes: input.sourceNotes,
      lastUpdated: input.lastUpdated
    },
    update: {
      value: input.value,
      rawValue: input.rawValue,
      sourceNotes: input.sourceNotes,
      lastUpdated: input.lastUpdated
    }
  });
}

async function upsertDepartmentMetric(
  db: DbClient,
  input: {
    departmentId: string;
    metric: MetricInput;
    value: number | null;
    rawValue: string | null;
    sourceNotes?: string | null;
    lastUpdated?: Date | null;
    displayMetadata?: MetricDisplayMetadata | null;
  }
) {
  if (input.value === null && !input.rawValue) return;

  if (input.metric.legacyKeys?.length) {
    const existingTarget = await db.departmentMetric.findUnique({
      where: {
        departmentId_metricKey: {
          departmentId: input.departmentId,
          metricKey: input.metric.key
        }
      }
    });

    if (existingTarget) {
      await db.departmentMetric.deleteMany({
        where: {
          departmentId: input.departmentId,
          metricKey: {
            in: input.metric.legacyKeys
          }
        }
      });
    } else {
      const legacyMetric = await db.departmentMetric.findFirst({
        where: {
          departmentId: input.departmentId,
          metricKey: {
            in: input.metric.legacyKeys
          }
        },
        orderBy: {
          updatedAt: "desc"
        }
      });

      if (legacyMetric) {
        await db.departmentMetric.update({
          where: {
            id: legacyMetric.id
          },
          data: {
            metricKey: input.metric.key
          }
        });
      }
    }
  }

  await db.departmentMetric.upsert({
    where: {
      departmentId_metricKey: {
        departmentId: input.departmentId,
        metricKey: input.metric.key
      }
    },
    create: {
      departmentId: input.departmentId,
      metricKey: input.metric.key,
      label: labelForMetric(input.metric, input.displayMetadata),
      value: input.value,
      rawValue: input.rawValue,
      unit: input.metric.unit,
      sourceNotes: input.sourceNotes,
      lastUpdated: input.lastUpdated
    },
    update: {
      label: labelForMetric(input.metric, input.displayMetadata),
      value: input.value,
      rawValue: input.rawValue,
      unit: input.metric.unit,
      sourceNotes: input.sourceNotes,
      lastUpdated: input.lastUpdated
    }
  });
}

async function upsertDepartmentYearlyMetric(
  db: DbClient,
  input: {
    departmentId: string;
    year: number;
    value: number | null;
    rawValue: string | null;
    sourceNotes?: string | null;
    lastUpdated?: Date | null;
  }
) {
  if (input.value === null && !input.rawValue) return;

  await db.departmentYearlyMetric.upsert({
    where: {
      departmentId_metricKey_year: {
        departmentId: input.departmentId,
        metricKey: "newResidents",
        year: input.year
      }
    },
    create: {
      departmentId: input.departmentId,
      metricKey: "newResidents",
      year: input.year,
      value: input.value,
      rawValue: input.rawValue,
      unit: "count",
      sourceNotes: input.sourceNotes,
      lastUpdated: input.lastUpdated
    },
    update: {
      value: input.value,
      rawValue: input.rawValue,
      sourceNotes: input.sourceNotes,
      lastUpdated: input.lastUpdated
    }
  });
}

function buildDepartmentMetricRows(input: {
  departmentId: string;
  row: CsvRow;
  table: CsvTable;
  dataExplanations: MetricDisplayMetadata[];
  warnings: string[];
}) {
  const rows: Prisma.DepartmentMetricCreateManyInput[] = [];
  const subDepartment = normalizeDepartmentSubDepartment(input.row.get("תת מחלקה"));

  if (subDepartment) {
    rows.push({
      departmentId: input.departmentId,
      metricKey: "תת מחלקה",
      label: "תת מחלקה",
      value: null,
      rawValue: subDepartment,
      sourceNotes: sourceNoteFor(input.table, "תת מחלקה")
    });
  }

  for (const metric of DEPARTMENT_NUMERIC_METRICS) {
    const metadata = metadataForMetric(input.dataExplanations, "Master_Dept", metric);
    const parsed = parseNumberCell(rowMetricValue(input.row, metric));
    if (parsed.warning) input.warnings.push(`${metric.label}: ${parsed.warning}`);
    if (parsed.value === null && !parsed.rawValue) continue;

    rows.push({
      departmentId: input.departmentId,
      metricKey: metric.key,
      label: labelForMetric(metric, metadata),
      value: parsed.value,
      rawValue: parsed.rawValue,
      unit: metric.unit,
      sourceNotes: sourceForMetric(input.table, metric, metadata)
    });
  }

  return rows;
}

function buildDepartmentYearlyMetricRows(input: {
  departmentId: string;
  row: CsvRow;
  table: CsvTable;
  dataExplanations: MetricDisplayMetadata[];
  warnings: string[];
}) {
  const rows: Prisma.DepartmentYearlyMetricCreateManyInput[] = [];

  for (const year of [2020, 2021, 2022, 2023, 2024]) {
    const header = `מספר מתמחים חדשים ${year}`;
    const values = input.row.getAll(header).filter(Boolean);
    if (values.length > 1) {
      input.warnings.push(`${header}: קיימות ${values.length} עמודות, נשמר הערך האחרון שאינו ריק`);
    }
    const parsed = parseNumberCell(values[values.length - 1] ?? "");
    if (parsed.warning) input.warnings.push(`${header}: ${parsed.warning}`);
    if (parsed.value !== null || parsed.rawValue) {
      rows.push({
        departmentId: input.departmentId,
        metricKey: "newResidents",
        year,
        value: parsed.value,
        rawValue: parsed.rawValue,
        unit: "count",
        sourceNotes:
          findMetricDisplayMetadata(input.dataExplanations, "Master_Dept", header, "newResidents")?.sourceLabel ??
          sourceNoteFor(input.table, header, Math.max(values.length - 1, 0))
      });
    }
  }

  const expectedOpeningsRaw = input.row.get("צפי תקנים חדשים ב2026");
  if (expectedOpeningsRaw) {
    const parsed = parseNumberCell(expectedOpeningsRaw);
    if (parsed.warning) input.warnings.push(`צפי תקנים חדשים ב2026: ${parsed.warning}`);
    rows.push({
      departmentId: input.departmentId,
      metricKey: "newResidents",
      year: OPENING_YEAR,
      value: parsed.value,
      rawValue: parsed.rawValue,
      unit: "count",
      sourceNotes:
        findMetricDisplayMetadata(input.dataExplanations, "Master_Dept", "expectedOpenings2026")?.sourceLabel ??
        sourceNoteFor(input.table, "צפי תקנים חדשים ב2026")
    });
  }

  return rows;
}

async function createBatch(db: DbClient, input: { sourceFile: string; rawText: string; targetLabel: string }) {
  return db.dataImportBatch.create({
    data: {
      sourceType: "OTHER",
      target: "CUSTOM",
      sourceUrl: input.sourceFile,
      extractionInstruction: input.targetLabel,
      rawText: input.rawText.slice(0, 120000),
      parsedJson: jsonValue({
        sourceFile: path.basename(input.sourceFile),
        importer: "master-csv-importer"
      }),
      status: "APPROVED"
    }
  });
}

async function logRow(
  db: DbClient,
  input: {
    batchId: string;
    sourceFile: string;
    target: string;
    row: CsvRow;
    stableKey?: string | null;
    status: string;
    warnings: string[];
    errors: string[];
    normalizedSpecialtyId?: string | null;
    normalizedDepartmentId?: string | null;
  }
) {
  await db.dataImportRowLog.create({
    data: {
      batchId: input.batchId,
      sourceFile: path.basename(input.sourceFile),
      target: input.target,
      rowNumber: input.row.rowNumber,
      stableKey: input.stableKey ?? null,
      status: input.status,
      warningsJson: jsonValue(input.warnings),
      errorsJson: jsonValue(input.errors),
      payloadJson: jsonValue(input.row.asObject()),
      normalizedSpecialtyId: input.normalizedSpecialtyId ?? null,
      normalizedDepartmentId: input.normalizedDepartmentId ?? null
    }
  });
}

function isKnownSource(value: string) {
  const normalized = normalizeCriterion(value);
  return (
    normalized.includes("משרד הבריאות") ||
    normalized.includes("הריי") ||
    normalized.includes("הרי") ||
    normalized.includes("openalex") ||
    normalized.includes("duns100") ||
    normalized.includes("אתר") ||
    normalized.includes("סימולטור")
  );
}

function normalizedDataExpCells(row: CsvRow) {
  const sheet = canonicalSheet(row.get("גליון"));
  let criterion = row.get("קרטריון");
  let explanation = row.get("הסבר");
  let sourceLabel = row.get("מקור");
  let sourceLinkPolicy = row.get("קישור(כן/לא)");
  let displayAction = row.get("פעולות עבור מידע זה");

  if (!sheet) return null;

  if (
    sheet === "Master_Dept" &&
    criterion === "Master_Dept" &&
    /בכירים|רופאים בכירים/.test(`${explanation} ${sourceLabel}`)
  ) {
    criterion = "מספר_בכירים";
    explanation = explanation || sourceLabel;
    sourceLabel = sourceLabel && sourceLabel !== explanation ? sourceLabel : sourceLinkPolicy;
    sourceLinkPolicy = sourceLabel === sourceLinkPolicy ? displayAction : sourceLinkPolicy;
    displayAction = "";
  }

  if (!explanation && sourceLabel && sourceLabel.length > 20 && isKnownSource(sourceLinkPolicy)) {
    explanation = sourceLabel;
    sourceLabel = sourceLinkPolicy;
    sourceLinkPolicy = "";
  }

  return {
    sheet,
    criterion,
    explanation,
    sourceLabel,
    sourceLinkPolicy,
    displayAction
  };
}

async function importDataExpCsv(db: DbClient, filePath: string) {
  const rawText = await fs.readFile(filePath, "utf8");
  const table = createCsvTable(rawText, { hasSourceNotesRow: false });
  const batch = await createBatch(db, {
    sourceFile: filePath,
    rawText,
    targetLabel: "Import Data_Exp.csv into display metadata"
  });
  let imported = 0;
  let failed = 0;
  let skipped = 0;
  let staleRemoved = 0;
  const currentKeys = new Set<string>();

  for (const row of table.rows) {
    const warnings: string[] = [];
    const errors: string[] = [];
    const normalized = normalizedDataExpCells(row);

    if (!normalized?.criterion) {
      skipped += 1;
      await logRow(db, {
        batchId: batch.id,
        sourceFile: filePath,
        target: "DATA_EXPLANATION",
        row,
        stableKey: null,
        status: "skipped",
        warnings: ["שורה ללא גליון או קריטריון"],
        errors
      });
      continue;
    }

    try {
      const metadata = buildMetricDisplayMetadata(normalized);

      await db.dataExplanation.upsert({
        where: {
          sheet_normalizedCriterion: {
            sheet: metadata.sheet,
            normalizedCriterion: metadata.normalizedCriterion
          }
        },
        create: metadata,
        update: {
          criterion: metadata.criterion,
          metricKey: metadata.metricKey,
          readableLabel: metadata.readableLabel,
          explanation: metadata.explanation,
          sourceLabel: metadata.sourceLabel,
          sourceLinkPolicy: metadata.sourceLinkPolicy,
          sourceUrl: metadata.sourceUrl,
          displayAction: metadata.displayAction,
          displayMode: metadata.displayMode,
          visualType: metadata.visualType,
          isHidden: metadata.isHidden,
          isHighlighted: metadata.isHighlighted,
          isNationalMetric: metadata.isNationalMetric
        }
      });

      currentKeys.add(`${metadata.sheet}:${metadata.normalizedCriterion}`);
      imported += 1;
      await logRow(db, {
        batchId: batch.id,
        sourceFile: filePath,
        target: "DATA_EXPLANATION",
        row,
        stableKey: `${metadata.sheet}:${metadata.normalizedCriterion}`,
        status: "imported",
        warnings,
        errors
      });
    } catch (error) {
      failed += 1;
      errors.push(error instanceof Error ? error.message : "Unknown Data_Exp import error");
      await logRow(db, {
        batchId: batch.id,
        sourceFile: filePath,
        target: "DATA_EXPLANATION",
        row,
        stableKey: null,
        status: "failed",
        warnings,
        errors
      });
    }
  }

  if (failed === 0 && currentKeys.size > 0) {
    const staleResult = await db.dataExplanation.deleteMany({
      where: {
        NOT: {
          OR: Array.from(currentKeys).map((key) => {
            const [sheet, ...normalizedParts] = key.split(":");
            return {
              sheet,
              normalizedCriterion: normalizedParts.join(":")
            };
          })
        }
      }
    });
    staleRemoved = staleResult.count;
  }

  await db.dataImportBatch.update({
    where: { id: batch.id },
    data: {
      parsedJson: jsonValue({
        sourceFile: path.basename(filePath),
        imported,
        failed,
        skipped,
        staleRemoved,
        rowLogs: table.rows.length
      }),
      status: failed > 0 ? "PENDING_REVIEW" : "APPROVED"
    }
  });

  return { batchId: batch.id, imported, failed, skipped, staleRemoved, rows: table.rows.length };
}

async function loadDataExplanations(db: DbClient) {
  const rows = await db.dataExplanation.findMany();
  return rows.map((row) => ({
    sheet: row.sheet as "MASTER_Spec" | "Master_Dept",
    criterion: row.criterion,
    normalizedCriterion: row.normalizedCriterion,
    metricKey: row.metricKey,
    readableLabel: row.readableLabel,
    explanation: row.explanation,
    sourceLabel: row.sourceLabel,
    sourceLinkPolicy: row.sourceLinkPolicy,
    sourceUrl: row.sourceUrl,
    displayAction: row.displayAction,
    displayMode: row.displayMode,
    visualType: row.visualType as MetricDisplayMetadata["visualType"],
    isHidden: row.isHidden,
    isHighlighted: row.isHighlighted,
    isNationalMetric: row.isNationalMetric
  }));
}

async function importSpecialtyCsv(db: DbClient, filePath: string, dataExplanations: MetricDisplayMetadata[]) {
  const rawText = await fs.readFile(filePath, "utf8");
  const table = createCsvTable(rawText);
  const batch = await createBatch(db, {
    sourceFile: filePath,
    rawText,
    targetLabel: "Import MASTER_Spec.csv into Specialty metrics"
  });
  let imported = 0;
  let failed = 0;

  for (const row of table.rows) {
    const warnings: string[] = [];
    const errors: string[] = [];
    const specialtyNameRaw = row.get("תחום_התמחות");
    const specialtyName = canonicalSpecialtyName(specialtyNameRaw);
    const rowKey = specialtyName ? stableKey([specialtyName]) : null;

    if (!specialtyName || row.get("קרטריון").includes("מקור")) {
      await logRow(db, {
        batchId: batch.id,
        sourceFile: filePath,
        target: "SPECIALTY",
        row,
        stableKey: rowKey,
        status: "skipped",
        warnings: ["שורה ללא שם תחום התמחות"],
        errors
      });
      continue;
    }

    try {
      const syllabusText = cleanTextImportCell(row.get("הסבר על ההתמחות ע׳׳פ הרי"));
      const lastUpdated = parseDateCell(row.get("עודכן_אחרון"));
      const specialty = await ensureSpecialty(db, {
        name: specialtyName,
        description: syllabusText || undefined
      });
      const sourceNotes = nonEmptyValues(table.headers.map((header, index) => table.sourceNotes?.values[index]));

      await db.specialty.update({
        where: { id: specialty.id },
        data: {
          description: syllabusText || specialty.description,
          dataSourceNotes: sourceNotes.length > 0 ? sourceNotes.join(" | ") : specialty.dataSourceNotes,
          dataLastUpdated: lastUpdated ?? specialty.dataLastUpdated
        }
      });

      for (const metric of SPECIALTY_TEXT_METRICS) {
        const metadata = metadataForMetric(dataExplanations, "MASTER_Spec", metric);
        const rawValue = rowTextMetricValue(row, metric);
        await upsertSpecialtyMetric(db, {
          specialtyId: specialty.id,
          metric,
          value: null,
          rawValue,
          sourceNotes: sourceForMetric(table, metric, metadata),
          lastUpdated,
          displayMetadata: metadata
        });
      }

      for (const metric of SPECIALTY_NUMERIC_METRICS) {
        const metadata = metadataForMetric(dataExplanations, "MASTER_Spec", metric);
        const parsed = parseNumberCell(rowMetricValue(row, metric));
        if (parsed.warning) warnings.push(`${metric.label}: ${parsed.warning}`);
        await upsertSpecialtyMetric(db, {
          specialtyId: specialty.id,
          metric,
          value: parsed.value,
          rawValue: parsed.rawValue,
          sourceNotes: sourceForMetric(table, metric, metadata),
          lastUpdated,
          displayMetadata: metadata
        });
      }

      for (const year of [2020, 2021, 2022, 2023, 2024]) {
        const header = `מספר מתמחים חדשים ${year}`;
        const parsed = parseNumberCell(row.get(header));
        if (parsed.warning) warnings.push(`${header}: ${parsed.warning}`);
        await upsertSpecialtyYearlyMetric(db, {
          specialtyId: specialty.id,
          year,
          value: parsed.value,
          rawValue: parsed.rawValue,
          sourceNotes:
            findMetricDisplayMetadata(dataExplanations, "MASTER_Spec", header, "newResidents")?.sourceLabel ??
            sourceNoteFor(table, header),
          lastUpdated
        });
      }

      imported += 1;
      await logRow(db, {
        batchId: batch.id,
        sourceFile: filePath,
        target: "SPECIALTY",
        row,
        stableKey: rowKey,
        status: warnings.length > 0 ? "imported_with_warnings" : "imported",
        warnings,
        errors,
        normalizedSpecialtyId: specialty.id
      });
    } catch (error) {
      failed += 1;
      errors.push(error instanceof Error ? error.message : "Unknown specialty import error");
      await logRow(db, {
        batchId: batch.id,
        sourceFile: filePath,
        target: "SPECIALTY",
        row,
        stableKey: rowKey,
        status: "failed",
        warnings,
        errors
      });
    }
  }

  await db.dataImportBatch.update({
    where: { id: batch.id },
    data: {
      parsedJson: jsonValue({
        sourceFile: path.basename(filePath),
        imported,
        failed,
        rowLogs: table.rows.length
      }),
      status: failed > 0 ? "PENDING_REVIEW" : "APPROVED"
    }
  });

  return { batchId: batch.id, imported, failed, rows: table.rows.length };
}

async function ensureDepartmentFromCsv(
  db: DbClient,
  input: {
    institutionName: string;
    institutionType: InstitutionType;
    specialtyName: string;
    subDepartment: string;
    stableKey: string;
  }
) {
  const institution = await ensureInstitution(db, {
    name: input.institutionName,
    type: input.institutionType
  });
  const specialty = await ensureSpecialty(db, {
    name: input.specialtyName
  });
  const departmentName = departmentDisplayName(input.specialtyName, input.subDepartment);
  const existingByStableKey = await db.department.findUnique({
    where: {
      importStableKey: input.stableKey
    }
  });

  if (existingByStableKey) {
    return { institution, specialty, department: existingByStableKey };
  }

  const existing = await db.department.findFirst({
    where: {
      institutionId: institution.id,
      specialtyId: specialty.id,
      name: departmentName
    }
  });

  if (existing) {
    const department = await db.department.update({
      where: { id: existing.id },
      data: {
        importStableKey: input.stableKey
      }
    });
    return { institution, specialty, department };
  }

  const uniqueNameConflict = await db.department.findFirst({
    where: {
      institutionId: institution.id,
      name: departmentName
    }
  });
  const safeDepartmentName = uniqueNameConflict
    ? `${departmentName} (${input.specialtyName})`
    : departmentName;
  const department = await ensureDepartmentPage(db, {
    institutionId: institution.id,
    institutionSlug: institution.slug,
    institutionName: institution.name,
    institutionType: institution.type,
    specialtyId: specialty.id,
    specialtySlug: specialty.slug || slugifyValue(input.specialtyName),
    specialtyName: specialty.name,
    departmentName: safeDepartmentName
  });

  const updated = await db.department.update({
    where: { id: department.id },
    data: {
      importStableKey: input.stableKey
    }
  });

  return { institution, specialty, department: updated };
}

async function hideDepartmentsAbsentFromLatestMasterDept(
  db: PrismaClient,
  input: {
    batchId: string;
    sourceFile: string;
    importedStableKeys: string[];
  }
) {
  if (input.importedStableKeys.length === 0) return 0;

  const staleDepartments = await db.department.findMany({
    where: {
      importStableKey: {
        not: null,
        notIn: input.importedStableKeys
      },
      NOT: {
        OR: [
          { residentsCount: 0 },
          {
            metrics: {
              some: {
                metricKey: "מספר_מתמחים",
                value: 0
              }
            }
          }
        ]
      }
    },
    select: {
      id: true,
      importStableKey: true,
      slug: true
    }
  });

  for (let index = 0; index < staleDepartments.length; index += 50) {
    const chunk = staleDepartments.slice(index, index + 50);
    const ids = chunk.map((department) => department.id);

    await db.department.updateMany({
      where: {
        id: {
          in: ids
        }
      },
      data: {
        residentsCount: 0
      }
    });
    await db.departmentMetric.deleteMany({
      where: {
        departmentId: {
          in: ids
        },
        metricKey: {
          in: ["מספר_מתמחים", "residentsCount", "activeResidentsCount"]
        }
      }
    });
    await db.departmentMetric.createMany({
      data: ids.map((departmentId) => ({
        departmentId,
        metricKey: "מספר_מתמחים",
        label: "מספר מתמחים",
        value: 0,
        rawValue: "0",
        unit: "count",
        sourceNotes: "לא הופיע בייבוא MASTER_Dept.csv האחרון; מוסתר מעמודים ציבוריים."
      }))
    });

    console.log(
      `[import:master-csv] hidden stale Master_Dept rows ${Math.min(index + chunk.length, staleDepartments.length)}/${staleDepartments.length}`
    );
  }

  return staleDepartments.length;
}

async function importDepartmentCsv(
  db: PrismaClient,
  filePath: string,
  dataExplanations: MetricDisplayMetadata[],
  options: { limit?: number; fromRow?: number } = {}
) {
  const rawText = await fs.readFile(filePath, "utf8");
  const table = createCsvTable(rawText);
  const batch = await createBatch(db, {
    sourceFile: filePath,
    rawText,
    targetLabel: "Import Master_Dept.csv into Department metrics"
  });
  let imported = 0;
  let failed = 0;
  let staleHidden = 0;
  const startedAt = Date.now();
  const importedStableKeys = new Set<string>();
  const selectedRows = table.rows
    .filter((row) => options.fromRow === undefined || row.rowNumber >= options.fromRow)
    .slice(0, options.limit);
  const isFullDepartmentImport = options.fromRow === undefined && options.limit === undefined;

  console.log(
    `[import:master-csv] Master_Dept rows: selected=${selectedRows.length}/${table.rows.length}` +
    `${options.fromRow !== undefined ? ` fromRow=${options.fromRow}` : ""}` +
    `${options.limit !== undefined ? ` limit=${options.limit}` : ""}`
  );

  for (const [index, row] of selectedRows.entries()) {
    const warnings: string[] = [];
    const errors: string[] = [];
    const institutionName = row.get("שם_מרכז_רפואי");
    const specialtyNameRaw = row.get("תחום התמחות");
    const specialtyName = canonicalSpecialtyName(specialtyNameRaw);
    const subDepartment = normalizeDepartmentSubDepartment(row.get("תת מחלקה"));
    const rowKey = institutionName && specialtyName
      ? stableKey([institutionName, specialtyName, subDepartment || specialtyName])
      : null;
    if (rowKey) {
      importedStableKeys.add(rowKey);
    }

    if (!institutionName || !specialtyName) {
      await logRow(db, {
        batchId: batch.id,
        sourceFile: filePath,
        target: "DEPARTMENT",
        row,
        stableKey: rowKey,
        status: "skipped",
        warnings: ["שורה ללא שם מוסד או תחום התמחות"],
        errors
      });
      continue;
    }

    try {
      await db.$transaction(async (tx) => {
        const { department, specialty } = await ensureDepartmentFromCsv(tx, {
          institutionName,
          institutionType: parseInstitutionType(row.get("סוג_מוסד")),
          specialtyName,
          subDepartment,
          stableKey: rowKey ?? stableKey([institutionName, specialtyName, subDepartment || specialtyName])
        });
        const websiteUrl = cleanTextImportCell(row.get("אתר_מחלקה"));
        const applicationUrl = cleanTextImportCell(row.get("לינק להגשת מועמדות"));
        const description = cleanTextImportCell(row.get("כמה מילים על המערך"));
        const headTitle = cleanTextImportCell(row.get("תואר (ד׳׳ר/פרופסור) מנהל המחלקה"));
        const headName = cleanTextImportCell(row.get("שם מנהל/ת המערך/מחלקה"));
        const headEmail = cleanTextImportCell(row.get("מייל מנהל/ת המערך/מחלקה"));
        const headPhone = cleanTextImportCell(row.get("מספר טלפון מנהל/ת המערך/מחלקה"));
        const contactName = cleanTextImportCell(row.get("שם איש קשר")) || headName || null;
        const contactEmail = cleanTextImportCell(row.get("מייל איש קשר")) || headEmail || null;
        const contactPhone = cleanTextImportCell(row.get("מספר טלפון איש קשר")) || headPhone || null;
        const seniorPhysicians = parseNumberCell(row.get("מספר_בכירים"));
        const residentsCount = parseNumberCell(row.get("מספר_מתמחים"));
        const newResidents2024Values = row.getAll("מספר מתמחים חדשים 2024").filter(Boolean);
        const newResidents2024 = parseNumberCell(newResidents2024Values[newResidents2024Values.length - 1] ?? "");
        const stageA = parseNumberCell(row.get("מעבר_שלב_א"));
        const stageB = parseNumberCell(row.get("מעבר_שלב_ב"));

        for (const parsed of [seniorPhysicians, residentsCount, newResidents2024, stageA, stageB]) {
          if (parsed.warning) warnings.push(parsed.warning);
        }

        await tx.department.update({
          where: { id: department.id },
          data: {
            websiteUrl: websiteUrl ?? department.websiteUrl,
            applicationUrl: applicationUrl ?? department.applicationUrl,
            about: description ?? department.about,
            shortSummary: description ? description.slice(0, 220) : department.shortSummary,
            publicContactEmail: contactEmail ?? department.publicContactEmail,
            publicContactPhone: contactPhone ?? department.publicContactPhone,
            contactName: contactName ?? department.contactName,
            residentsCount: residentsCount.value !== null ? Math.round(residentsCount.value) : department.residentsCount,
            newResidentsThisYear:
              newResidents2024.value !== null ? Math.round(newResidents2024.value) : department.newResidentsThisYear,
            shlavAlephPassRate: stageA.value ?? department.shlavAlephPassRate,
            shlavBetPassRate: stageB.value ?? department.shlavBetPassRate,
            dataSourceNotes: nonEmptyValues(table.headers.map((header, index) => table.sourceNotes?.values[index])).join(" | ") || department.dataSourceNotes
          }
        });

        if (headName) {
          const existingHead = await tx.departmentHead.findFirst({
            where: {
              departmentId: department.id,
              name: headName
            }
          });
          const headData = {
            title: headTitle ?? "ד״ר",
            role: "מנהל/ת מחלקה",
            bio: `${headTitle ? `${headTitle} ` : ""}${headName} משמש/ת כמנהל/ת מחלקה.`
          };

          if (existingHead) {
            await tx.departmentHead.update({
              where: { id: existingHead.id },
              data: headData
            });
          } else {
            await tx.departmentHead.create({
              data: {
                departmentId: department.id,
                name: headName,
                ...headData
              }
            });
          }
        }

        const metricRows = buildDepartmentMetricRows({
          departmentId: department.id,
          row,
          table,
          dataExplanations,
          warnings
        });
        const yearlyRows = buildDepartmentYearlyMetricRows({
          departmentId: department.id,
          row,
          table,
          dataExplanations,
          warnings
        });

        await tx.departmentMetric.deleteMany({ where: { departmentId: department.id } });
        if (metricRows.length > 0) {
          await tx.departmentMetric.createMany({ data: metricRows });
        }
        await tx.departmentYearlyMetric.deleteMany({ where: { departmentId: department.id } });
        if (yearlyRows.length > 0) {
          await tx.departmentYearlyMetric.createMany({ data: yearlyRows });
        }

        imported += 1;
        await logRow(tx, {
          batchId: batch.id,
          sourceFile: filePath,
          target: "DEPARTMENT",
          row,
          stableKey: rowKey,
          status: warnings.length > 0 ? "imported_with_warnings" : "imported",
          warnings,
          errors,
          normalizedSpecialtyId: specialty.id,
          normalizedDepartmentId: department.id
        });
      }, { timeout: 15000 });
    } catch (error) {
      failed += 1;
      errors.push(error instanceof Error ? error.message : "Unknown department import error");
      await logRow(db, {
        batchId: batch.id,
        sourceFile: filePath,
        target: "DEPARTMENT",
        row,
        stableKey: rowKey,
        status: "failed",
        warnings,
        errors
      });
    }

    const processed = index + 1;
    if (processed === 1 || processed % 25 === 0 || processed === selectedRows.length) {
      console.log(
        `[import:master-csv] Master_Dept row ${processed}/${selectedRows.length}` +
        ` csvRow=${row.rowNumber}` +
        ` hospital="${institutionName}" specialty="${specialtyName}" subDepartment="${subDepartment || "-"}"` +
        ` elapsed=${Date.now() - startedAt}ms`
      );
    }
  }

  if (isFullDepartmentImport) {
    staleHidden = await hideDepartmentsAbsentFromLatestMasterDept(db, {
      batchId: batch.id,
      sourceFile: filePath,
      importedStableKeys: Array.from(importedStableKeys)
    });
    console.log(
      `[import:master-csv] Master_Dept stale public rows hidden=${staleHidden}` +
      ` elapsed=${Date.now() - startedAt}ms`
    );
  } else {
    console.log("[import:master-csv] Master_Dept stale public-row hide skipped for partial import");
  }

  await db.dataImportBatch.update({
    where: { id: batch.id },
    data: {
      parsedJson: jsonValue({
        sourceFile: path.basename(filePath),
        imported,
        failed,
        staleHidden,
        rowLogs: selectedRows.length,
        fromRow: options.fromRow ?? null,
        limit: options.limit ?? null
      }),
      status: failed > 0 ? "PENDING_REVIEW" : "APPROVED"
    }
  });

  return { batchId: batch.id, imported, failed, staleHidden, rows: selectedRows.length, totalRows: table.rows.length };
}

function sourcePathForUploadKind(kind: MasterCsvUploadKind) {
  return path.join(process.cwd(), kind === "spec" ? MASTER_SPEC_FILE : MASTER_DEPT_FILE);
}

function tableForUploadKind(csvText: string, kind: MasterCsvUploadKind) {
  return createCsvTable(csvText, { hasSourceNotesRow: true });
}

function countCsvEntities(table: CsvTable, kind: MasterCsvUploadKind) {
  if (kind === "spec") {
    return new Set(
      table.rows
        .map((row) => canonicalSpecialtyName(row.get("תחום_התמחות")))
        .filter((value) => value && !rowLooksLikeSourceNote(value))
    ).size;
  }

  return table.rows.filter((row) => row.get("שם_מרכז_רפואי") && row.get("תחום התמחות")).length;
}

function rowLooksLikeSourceNote(value: string) {
  return value.includes("מקור") || value.includes("הסבר");
}

function scanSpreadsheetErrors(table: CsvTable) {
  const findings: Array<{ rowNumber: number; header: string; value: string }> = [];

  for (const row of table.rows) {
    table.headers.forEach((header, index) => {
      const value = cleanCell(row.values[index]);
      if (!isSpreadsheetErrorValue(value)) return;

      findings.push({
        rowNumber: row.rowNumber,
        header: header || `column_${index + 1}`,
        value
      });
    });
  }

  return findings;
}

function scanZeroResidentDepartments(table: CsvTable, kind: MasterCsvUploadKind) {
  if (kind !== "dept") return [];

  const findings: Array<{
    rowNumber: number;
    institutionName: string;
    specialtyName: string;
    subDepartment: string;
    value: string;
  }> = [];

  for (const row of table.rows) {
    const rawValue = row.get("מספר_מתמחים");
    const parsed = parseNumberCell(rawValue);
    if (parsed.value !== 0) continue;

    findings.push({
      rowNumber: row.rowNumber,
      institutionName: row.get("שם_מרכז_רפואי"),
      specialtyName: row.get("תחום התמחות"),
      subDepartment: row.get("תת מחלקה"),
      value: rawValue
    });
  }

  return findings;
}

function headerCountMap(headers: string[]) {
  return headers.reduce<Map<string, { count: number; headers: string[]; indexes: number[] }>>((map, header, index) => {
    const normalizedHeader = normalizeCsvHeader(header);
    if (!normalizedHeader) return map;

    const current = map.get(normalizedHeader) ?? { count: 0, headers: [], indexes: [] };
    current.count += 1;
    current.headers.push(header);
    current.indexes.push(index + 1);
    map.set(normalizedHeader, current);
    return map;
  }, new Map());
}

function firstHeaderLabel(
  counts: Map<string, { count: number; headers: string[]; indexes: number[] }>,
  normalizedHeader: string
) {
  return counts.get(normalizedHeader)?.headers.find(Boolean) ?? normalizedHeader;
}

function diffHeaders(uploaded: CsvTable, reference: CsvTable) {
  const uploadedCounts = headerCountMap(uploaded.rawHeaders);
  const referenceCounts = headerCountMap(reference.rawHeaders);
  const missingHeaders: string[] = [];
  const extraHeaders: string[] = [];
  const duplicateHeaders: Array<{
    header: string;
    receivedCount: number;
    expectedCount: number;
    columns: number[];
  }> = [];
  const allowedDuplicateHeaders: Array<{
    header: string;
    count: number;
    columns: number[];
  }> = [];
  const suspiciousChangedHeaders: Array<{
    column: number;
    expected: string;
    received: string;
    normalized: string;
  }> = [];

  for (const [normalizedHeader, referenceValue] of referenceCounts) {
    const uploadedCount = uploadedCounts.get(normalizedHeader)?.count ?? 0;
    if (uploadedCount === 0) {
      missingHeaders.push(firstHeaderLabel(referenceCounts, normalizedHeader));
    }
  }

  for (const [normalizedHeader, uploadedValue] of uploadedCounts) {
    const expectedCount = referenceCounts.get(normalizedHeader)?.count ?? 0;

    if (uploadedValue.count > 1 && expectedCount <= 1) {
      duplicateHeaders.push({
        header: firstHeaderLabel(uploadedCounts, normalizedHeader),
        receivedCount: uploadedValue.count,
        expectedCount,
        columns: uploadedValue.indexes
      });
      continue;
    }

    if (uploadedValue.count > 1 && expectedCount > 1) {
      allowedDuplicateHeaders.push({
        header: firstHeaderLabel(uploadedCounts, normalizedHeader),
        count: uploadedValue.count,
        columns: uploadedValue.indexes
      });
    }

    if (expectedCount === 0) {
      extraHeaders.push(firstHeaderLabel(uploadedCounts, normalizedHeader));
    }
  }

  const comparableColumns = Math.min(uploaded.rawHeaders.length, reference.rawHeaders.length);
  for (let index = 0; index < comparableColumns; index += 1) {
    const expected = reference.rawHeaders[index] ?? "";
    const received = uploaded.rawHeaders[index] ?? "";
    const normalizedExpected = normalizeCsvHeader(expected);
    const normalizedReceived = normalizeCsvHeader(received);

    if (expected !== received && normalizedExpected && normalizedExpected === normalizedReceived) {
      suspiciousChangedHeaders.push({
        column: index + 1,
        expected,
        received,
        normalized: normalizedExpected
      });
    }
  }

  return {
    matches: missingHeaders.length === 0 && duplicateHeaders.length === 0,
    expected: reference.rawHeaders,
    received: uploaded.rawHeaders,
    normalizedExpected: reference.headers,
    normalizedReceived: uploaded.headers,
    missingHeaders,
    extraHeaders,
    duplicateHeaders,
    allowedDuplicateHeaders,
    suspiciousChangedHeaders
  };
}

function compareTables(uploaded: CsvTable, reference: CsvTable) {
  let changedCellsCount = 0;
  const changedRows: Array<{
    rowNumber: number;
    field: string;
    oldValue: string;
    newValue: string;
  }> = [];
  const maxRows = Math.max(uploaded.rows.length, reference.rows.length);
  const maxColumns = Math.max(uploaded.headers.length, reference.headers.length);

  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    const uploadedRow = uploaded.rows[rowIndex];
    const referenceRow = reference.rows[rowIndex];

    for (let columnIndex = 0; columnIndex < maxColumns; columnIndex += 1) {
      const field =
        uploaded.headers[columnIndex] ||
        reference.headers[columnIndex] ||
        `column_${columnIndex + 1}`;
      const newValue = cleanCell(uploadedRow?.values[columnIndex]);
      const oldValue = cleanCell(referenceRow?.values[columnIndex]);

      if (newValue === oldValue) continue;

      changedCellsCount += 1;
      if (changedRows.length < 80) {
        changedRows.push({
          rowNumber: uploadedRow?.rowNumber ?? referenceRow?.rowNumber ?? rowIndex + 2,
          field,
          oldValue,
          newValue
        });
      }
    }
  }

  return { changedCellsCount, changedRows };
}

export async function previewMasterCsvUpload(input: {
  kind: MasterCsvUploadKind;
  csvText: string;
  fileName?: string;
  referenceCsvText?: string;
}) {
  const uploaded = tableForUploadKind(input.csvText, input.kind);
  const referenceText = input.referenceCsvText ?? await fs.readFile(sourcePathForUploadKind(input.kind), "utf8");
  const reference = tableForUploadKind(referenceText, input.kind);
  const headerDiffs = diffHeaders(uploaded, reference);
  const rowCount = uploaded.rows.length;
  const referenceRowCount = reference.rows.length;
  const entityCount = countCsvEntities(uploaded, input.kind);
  const referenceEntityCount = countCsvEntities(reference, input.kind);
  const spreadsheetErrors = scanSpreadsheetErrors(uploaded);
  const zeroResidentDepartments = scanZeroResidentDepartments(uploaded, input.kind);
  const { changedCellsCount, changedRows } = compareTables(uploaded, reference);
  const warnings = [
    headerDiffs.missingHeaders.length > 0
      ? `חסרות ${headerDiffs.missingHeaders.length} כותרות חובה.`
      : null,
    headerDiffs.duplicateHeaders.length > 0
      ? `נמצאו ${headerDiffs.duplicateHeaders.length} כותרות כפולות שאינן קיימות כך בקובץ המקור.`
      : null,
    headerDiffs.extraHeaders.length > 0
      ? `נמצאו ${headerDiffs.extraHeaders.length} כותרות נוספות; הייבוא יתעלם מהן.`
      : null,
    headerDiffs.suspiciousChangedHeaders.length > 0
      ? `נמצאו ${headerDiffs.suspiciousChangedHeaders.length} כותרות עם הבדלי רווחים/קידוד בלבד; הן יטופלו כתואמות.`
      : null,
    spreadsheetErrors.length > 0 ? `נמצאו ${spreadsheetErrors.length} ערכי שגיאה מגיליון; הם יטופלו כחסר.` : null,
    zeroResidentDepartments.length > 0
      ? `${zeroResidentDepartments.length} מחלקות עם מספר_מתמחים = 0 יוסתרו מעמודים ציבוריים.`
      : null
  ].filter((warning): warning is string => Boolean(warning));

  return {
    kind: input.kind,
    fileName: input.fileName ?? null,
    headerMatches: headerDiffs.matches,
    expectedHeaders: headerDiffs.expected,
    receivedHeaders: headerDiffs.received,
    normalizedExpectedHeaders: headerDiffs.normalizedExpected,
    normalizedReceivedHeaders: headerDiffs.normalizedReceived,
    missingHeaders: headerDiffs.missingHeaders,
    extraHeaders: headerDiffs.extraHeaders,
    duplicateHeaders: headerDiffs.duplicateHeaders,
    allowedDuplicateHeaders: headerDiffs.allowedDuplicateHeaders,
    suspiciousChangedHeaders: headerDiffs.suspiciousChangedHeaders,
    rowCount,
    referenceRowCount,
    specialtyCount: input.kind === "spec" ? entityCount : null,
    referenceSpecialtyCount: input.kind === "spec" ? referenceEntityCount : null,
    departmentCount: input.kind === "dept" ? entityCount : null,
    referenceDepartmentCount: input.kind === "dept" ? referenceEntityCount : null,
    changedCellsCount,
    changedRows,
    spreadsheetErrorsCount: spreadsheetErrors.length,
    spreadsheetErrors: spreadsheetErrors.slice(0, 80),
    zeroResidentDepartmentsCount: zeroResidentDepartments.length,
    zeroResidentDepartments: zeroResidentDepartments.slice(0, 40),
    warnings
  };
}

export async function importMasterCsvFiles(
  prisma: PrismaClient,
  input: {
    specialtyCsvPath?: string;
    departmentCsvPath?: string;
    dataExpCsvPath?: string;
    only?: ImportOnlyMode;
    departmentLimit?: number;
    departmentFromRow?: number;
  } = {}
) {
  const cwd = process.cwd();
  const dataExpCsvPath = input.dataExpCsvPath ?? path.join(cwd, DATA_EXP_FILE);
  const specialtyCsvPath = input.specialtyCsvPath ?? path.join(cwd, MASTER_SPEC_FILE);
  const departmentCsvPath = input.departmentCsvPath ?? path.join(cwd, MASTER_DEPT_FILE);
  const only = input.only ?? "all";

  const runPhase = async <Result>(label: string, run: () => Promise<Result>) => {
    const startedAt = Date.now();
    console.log(`[import:master-csv] ${label}: start`);
    const result = await run();
    console.log(`[import:master-csv] ${label}: done in ${Date.now() - startedAt}ms`);
    return result;
  };
  const skipped = (label: string) => {
    console.log(`[import:master-csv] ${label}: skipped`);
    return { skipped: true };
  };

  const dataExp = only === "all" || only === "data-exp"
    ? await runPhase("Data_Exp", () => importDataExpCsv(prisma, dataExpCsvPath))
    : skipped("Data_Exp");
  const dataExplanations = await runPhase("Data_Exp metadata", () => loadDataExplanations(prisma));
  const specialty = only === "all" || only === "spec"
    ? await runPhase("MASTER_Spec", () => importSpecialtyCsv(prisma, specialtyCsvPath, dataExplanations))
    : skipped("MASTER_Spec");
  const department = only === "all" || only === "dept"
    ? await runPhase("Master_Dept", () => importDepartmentCsv(prisma, departmentCsvPath, dataExplanations, {
      limit: input.departmentLimit,
      fromRow: input.departmentFromRow
    }))
    : skipped("Master_Dept");
  console.log("[import:master-csv] stale repair: skipped (run npm run repair:stale-departments)");

  return { dataExp, specialty, department, staleDepartmentRepair: { skipped: true } };
}
