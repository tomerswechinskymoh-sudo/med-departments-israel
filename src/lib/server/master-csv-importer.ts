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
  ensureDepartmentPage,
  ensureInstitution,
  ensureSpecialty,
  normalizeCatalogLookupValue,
  slugifyValue
} from "@/server/department-catalog";

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
  headers: string[];
  rows: CsvRow[];
  sourceNotes: CsvRow | null;
};

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
  { key: "acceptedImmediatelyReports", label: "דיווחי מציאת התמחות מיד", header: "מספר המתקבלים שדיווחו שמצאו מיד התמחות", unit: "count" },
  { key: "acceptedWithinSixMonthsReports", label: "דיווחי מציאת התמחות עד חצי שנה", header: "מספר המתקבלים שדיווחו שמצאו עד חצי שנה", unit: "count" },
  { key: "acceptedWithinOneYearReports", label: "דיווחי מציאת התמחות עד שנה", header: "מספר המתקבלים שדיווחו שמצאו עד שנה", unit: "count" },
  { key: "acceptedWithinTwoYearsReports", label: "דיווחי מציאת התמחות עד שנתיים", header: "מספר המתקבלים שדיווחו שמצאו עד שנתיים", unit: "count" },
  { key: "acceptedAfterTwoYearsReports", label: "דיווחי מציאת התמחות אחרי שנתיים", header: "מספר המתקבלים שדיווחו שמצאו אחרי שנתיים", unit: "count" },
  { key: "שכר_לא_פריפריה", label: "שכר לא פריפריה", header: "שכר_לא_פריפריה", legacyKeys: ["centerSalary"], unit: "currency" },
  { key: "שכר_פריפריה 1", label: "שכר פריפריה", header: "שכר_פריפריה 1", headers: ["שכר_פריפריה"], legacyKeys: ["peripherySalary"], unit: "currency" },
  { key: "פער_שכר_פריפריה", label: "פער שכר פריפריה", header: "פער_שכר_פריפריה", legacyKeys: ["peripherySalaryGap"], unit: "currency" },
  { key: "מספר_מתמחים", label: "מספר מתמחים", header: "מספר_מתמחים", legacyKeys: ["residentsCount", "activeResidentsCount"], unit: "count" },
  { key: "womenCount", label: "מספר נשים", header: "מספר נשים", unit: "count" },
  { key: "womenPercent", label: "אחוז נשים", header: "אחוז_נשים", unit: "%" },
  { key: "menCount", label: "מספר גברים", header: "מספר גברים", unit: "count" },
  { key: "menPercent", label: "אחוז גברים", header: "אחוז_גברים", unit: "%" },
  { key: "boardStageAPassRate", label: "מעבר שלב א", header: "מעבר_שלב_א", unit: "%" },
  { key: "boardStageBPassRate", label: "מעבר שלב ב", header: "מעבר_שלב_ב", unit: "%" },
  { key: "burnoutIndex", label: "מדד שחיקה", header: "מדד_שחיקה", unit: "score" },
  { key: "expectedNationalOpenings", label: "מספר תקנים צפויים להיפתח ארצי", header: "מספר_תקנים_שצפויים להיפתח_ארצי", unit: "count" }
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
  { key: "acceptedImmediatelyReports", label: "דיווחי מציאת התמחות מיד", header: "מספר המתקבלים שדיווחו שמצאו מיד התמחות", unit: "count" },
  { key: "acceptedWithinSixMonthsReports", label: "דיווחי מציאת התמחות עד חצי שנה", header: "מספר המתקבלים שדיווחו שמצאו עד חצי שנה", unit: "count" },
  { key: "acceptedWithinOneYearReports", label: "דיווחי מציאת התמחות עד שנה", header: "מספר המתקבלים שדיווחו שמצאו עד שנה", unit: "count" },
  { key: "acceptedWithinTwoYearsReports", label: "דיווחי מציאת התמחות עד שנתיים", header: "מספר המתקבלים שדיווחו שמצאו עד שנתיים", unit: "count" },
  { key: "acceptedAfterTwoYearsReports", label: "דיווחי מציאת התמחות אחרי שנתיים", header: "מספר המתקבלים שדיווחו שמצאו אחרי שנתיים", unit: "count" },
  { key: "שכר_לא_פריפריה", label: "שכר לא פריפריה", header: "שכר_לא_פריפריה", legacyKeys: ["centerSalary"], unit: "currency" },
  { key: "שכר_פריפריה", label: "שכר פריפריה", header: "שכר_פריפריה", legacyKeys: ["peripherySalary"], unit: "currency" },
  { key: "פער_שכר_פריפריה", label: "פער שכר פריפריה", header: "פער_שכר_פריפריה", legacyKeys: ["peripherySalaryGap"], unit: "currency" },
  { key: "מספר_מתמחים", label: "מספר מתמחים", header: "מספר_מתמחים", legacyKeys: ["residentsCount", "activeResidentsCount"], unit: "count" },
  { key: "womenCount", label: "מספר נשים", header: "מספר נשים", unit: "count" },
  { key: "womenPercent", label: "אחוז נשים", header: "אחוז_נשים", unit: "%" },
  { key: "menCount", label: "מספר גברים", header: "מספר גברים", unit: "count" },
  { key: "menPercent", label: "אחוז גברים", header: "אחוז_גברים", unit: "%" },
  { key: "boardStageAPassRate", label: "מעבר שלב א", header: "מעבר_שלב_א", unit: "%" },
  { key: "boardStageBPassRate", label: "מעבר שלב ב", header: "מעבר_שלב_ב", unit: "%" },
  { key: "burnoutIndex", label: "מדד שחיקה", header: "מדד_שחיקה", unit: "score" },
  { key: "seniorPhysiciansCount", label: "מספר בכירים", header: "מספר_בכירים", unit: "count" },
  { key: "duns100PhysiciansCount", label: "מספר רופאים ב-DUNS100", header: "DUNS100", unit: "count" },
  { key: "departmentalPublicationsCount", label: "מספר פרסומים מחלקתי", header: "מספר פרסומים מחלקתי", unit: "count" },
  { key: "expectedOpenings2026", label: "צפי תקנים חדשים ב-2026", header: "צפי תקנים חדשים ב2026", unit: "count" },
  { key: "medianElectiveDemand", label: "מספר אלקטיביסטים חציוני", header: "מספר אלקטיביסטים חציוני", unit: "count" }
];

function cleanCell(value: string | null | undefined) {
  return (value ?? "")
    .replace(/^\ufeff/, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
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
  const headers = (parsedRows[0] ?? []).map(cleanCell);
  const indexByHeader = headers.reduce<Map<string, number[]>>((map, header, index) => {
    const key = cleanCell(header);
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
        const index = indexByHeader.get(header)?.[occurrence];
        return index === undefined ? "" : cleanCell(values[index]);
      },
      getAll(header) {
        return (indexByHeader.get(header) ?? []).map((index) => cleanCell(values[index]));
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

  if (/^#(?:DIV\/0!|N\/A|VALUE!|REF!|NUM!)/i.test(rawValue)) {
    return {
      value: null,
      rawValue,
      warning: `ערך לא מספרי נשמר כטקסט: ${rawValue}`
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
  const specialty = canonicalSpecialtyName(specialtyName);
  const sub = cleanCell(subDepartment);

  if (!sub) return specialty;
  if (normalizeHebrewKey(sub).includes(normalizeHebrewKey(specialty))) return sub;

  return `${specialty} ${sub}`.trim();
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
      const syllabusText = row.get("הסבר על ההתמחות ע׳׳פ הרי");
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
        const rawValue = rowMetricValue(row, metric);
        await upsertSpecialtyMetric(db, {
          specialtyId: specialty.id,
          metric,
          value: null,
          rawValue: rawValue || null,
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

async function importDepartmentCsv(db: DbClient, filePath: string, dataExplanations: MetricDisplayMetadata[]) {
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
  const currentStableKeys = new Set<string>();

  for (const row of table.rows) {
    const warnings: string[] = [];
    const errors: string[] = [];
    const institutionName = row.get("שם_מרכז_רפואי");
    const specialtyNameRaw = row.get("תחום התמחות");
    const specialtyName = canonicalSpecialtyName(specialtyNameRaw);
    const subDepartment = row.get("תת מחלקה");
    const rowKey = institutionName && specialtyName
      ? stableKey([institutionName, specialtyName, subDepartment || specialtyName])
      : null;

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
      const { department, specialty } = await ensureDepartmentFromCsv(db, {
        institutionName,
        institutionType: parseInstitutionType(row.get("סוג_מוסד")),
        specialtyName,
        subDepartment,
        stableKey: rowKey ?? stableKey([institutionName, specialtyName, subDepartment || specialtyName])
      });
      const websiteUrl = row.get("אתר_מחלקה") || null;
      const applicationUrl = row.get("לינק להגשת מועמדות") || null;
      const description = row.get("כמה מילים על המערך") || null;
      const headTitle = row.get("תואר (ד׳׳ר/פרופסור) מנהל המחלקה") || null;
      const headName = row.get("שם מנהל/ת המערך/מחלקה") || null;
      const headEmail = row.get("מייל מנהל/ת המערך/מחלקה") || null;
      const headPhone = row.get("מספר טלפון מנהל/ת המערך/מחלקה") || null;
      const contactName = row.get("שם איש קשר") || headName || null;
      const contactEmail = row.get("מייל איש קשר") || headEmail || null;
      const contactPhone = row.get("מספר טלפון איש קשר") || headPhone || null;
      const seniorPhysicians = parseNumberCell(row.get("מספר_בכירים"));
      const residentsCount = parseNumberCell(row.get("מספר_מתמחים"));
      const newResidents2024Values = row.getAll("מספר מתמחים חדשים 2024").filter(Boolean);
      const newResidents2024 = parseNumberCell(newResidents2024Values[newResidents2024Values.length - 1] ?? "");
      const stageA = parseNumberCell(row.get("מעבר_שלב_א"));
      const stageB = parseNumberCell(row.get("מעבר_שלב_ב"));

      for (const parsed of [seniorPhysicians, residentsCount, newResidents2024, stageA, stageB]) {
        if (parsed.warning) warnings.push(parsed.warning);
      }

      await db.department.update({
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
        const existingHead = await db.departmentHead.findFirst({
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
          await db.departmentHead.update({
            where: { id: existingHead.id },
            data: headData
          });
        } else {
          await db.departmentHead.create({
            data: {
              departmentId: department.id,
              name: headName,
              ...headData
            }
          });
        }
      }

      for (const metric of DEPARTMENT_NUMERIC_METRICS) {
        const metadata = metadataForMetric(dataExplanations, "Master_Dept", metric);
        const parsed = parseNumberCell(rowMetricValue(row, metric));
        if (parsed.warning) warnings.push(`${metric.label}: ${parsed.warning}`);
        await upsertDepartmentMetric(db, {
          departmentId: department.id,
          metric,
          value: parsed.value,
          rawValue: parsed.rawValue,
          sourceNotes: sourceForMetric(table, metric, metadata),
          displayMetadata: metadata
        });
      }

      for (const year of [2020, 2021, 2022, 2023, 2024]) {
        const header = `מספר מתמחים חדשים ${year}`;
        const values = row.getAll(header).filter(Boolean);
        if (values.length > 1) {
          warnings.push(`${header}: קיימות ${values.length} עמודות, נשמר הערך האחרון שאינו ריק`);
        }
        const parsed = parseNumberCell(values[values.length - 1] ?? "");
        if (parsed.warning) warnings.push(`${header}: ${parsed.warning}`);
        await upsertDepartmentYearlyMetric(db, {
          departmentId: department.id,
          year,
          value: parsed.value,
          rawValue: parsed.rawValue,
          sourceNotes:
            findMetricDisplayMetadata(dataExplanations, "Master_Dept", header, "newResidents")?.sourceLabel ??
            sourceNoteFor(table, header, Math.max(values.length - 1, 0))
        });
      }

      const expectedOpeningsRaw = row.get("צפי תקנים חדשים ב2026");
      if (expectedOpeningsRaw) {
        const parsed = parseNumberCell(expectedOpeningsRaw);
        await upsertDepartmentYearlyMetric(db, {
          departmentId: department.id,
          year: OPENING_YEAR,
          value: parsed.value,
          rawValue: parsed.rawValue,
          sourceNotes:
            findMetricDisplayMetadata(dataExplanations, "Master_Dept", "expectedOpenings2026")?.sourceLabel ??
            sourceNoteFor(table, "צפי תקנים חדשים ב2026")
        });
      }

      imported += 1;
      currentStableKeys.add(rowKey ?? stableKey([institutionName, specialtyName, subDepartment || specialtyName]));
      await logRow(db, {
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
  }

  if (failed === 0 && currentStableKeys.size > 0) {
    const staleResult = await db.department.updateMany({
      where: {
        AND: [
          {
            importStableKey: {
              not: null
            }
          },
          {
            importStableKey: {
              notIn: Array.from(currentStableKeys)
            }
          }
        ]
      },
      data: {
        importStableKey: null
      }
    });
    staleHidden = staleResult.count;
  }

  await db.dataImportBatch.update({
    where: { id: batch.id },
    data: {
      parsedJson: jsonValue({
        sourceFile: path.basename(filePath),
        imported,
        failed,
        staleHidden,
        rowLogs: table.rows.length
      }),
      status: failed > 0 ? "PENDING_REVIEW" : "APPROVED"
    }
  });

  return { batchId: batch.id, imported, failed, staleHidden, rows: table.rows.length };
}

export async function importMasterCsvFiles(
  prisma: PrismaClient,
  input: {
    specialtyCsvPath?: string;
    departmentCsvPath?: string;
    dataExpCsvPath?: string;
  } = {}
) {
  const cwd = process.cwd();
  const dataExpCsvPath = input.dataExpCsvPath ?? path.join(cwd, DATA_EXP_FILE);
  const specialtyCsvPath = input.specialtyCsvPath ?? path.join(cwd, MASTER_SPEC_FILE);
  const departmentCsvPath = input.departmentCsvPath ?? path.join(cwd, MASTER_DEPT_FILE);
  const dataExp = await importDataExpCsv(prisma, dataExpCsvPath);
  const dataExplanations = await loadDataExplanations(prisma);
  const specialty = await importSpecialtyCsv(prisma, specialtyCsvPath, dataExplanations);
  const department = await importDepartmentCsv(prisma, departmentCsvPath, dataExplanations);

  return { dataExp, specialty, department };
}
