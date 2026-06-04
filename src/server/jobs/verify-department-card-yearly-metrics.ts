import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getDirectoryData } from "@/lib/queries";

const YEARS = [2020, 2021, 2022, 2023, 2024] as const;

const TARGETS = [
  {
    label: "Assuta Ashdod ENT",
    hospitalIncludes: "אסותא אשדוד",
    expected: [1, 0, 1, 3, 2]
  },
  {
    label: "Beilinson ENT",
    hospitalIncludes: "בילינסון",
    expected: [1, 2, 2, 6, 2]
  },
  {
    label: "Hadassah Ein Kerem ENT",
    hospitalIncludes: "הדסה עין כרם",
    expected: [1, 2, 1, 2, 2]
  }
] as const;

type CsvTable = {
  headers: string[];
  rows: string[][];
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

function getAll(table: CsvTable, row: string[], header: string) {
  return table.headers
    .map((candidate, index) => (candidate === header ? cleanCell(row[index]) : ""))
    .filter(Boolean);
}

function getLast(table: CsvTable, row: string[], header: string) {
  const values = getAll(table, row, header);
  return values[values.length - 1] ?? "";
}

function parseNumber(value: string) {
  const normalized = cleanCell(value).replace(/,/g, "");
  if (!normalized || normalized === "#DIV/0!" || normalized === "#N/A") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function valuesString(values: Array<number | null | undefined>) {
  return YEARS.map((year, index) => `${year}:${values[index] ?? "missing"}`).join(",");
}

function assertEqualValues(label: string, actual: Array<number | null | undefined>, expected: readonly number[]) {
  const failures = expected
    .map((value, index) => ({ expected: value, actual: actual[index], year: YEARS[index] }))
    .filter((item) => item.actual !== item.expected);

  if (failures.length > 0) {
    throw new Error(`${label} mismatch. expected=${valuesString([...expected])} actual=${valuesString(actual)}`);
  }
}

async function main() {
  const csv = await readCsv("Master_Dept.csv");
  const specialty = await prisma.specialty.findFirst({
    where: {
      OR: [{ name: "אף אוזן גרון" }, { name: { contains: "אוזן" } }]
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!specialty) {
    throw new Error("ENT specialty not found in DB");
  }

  const cards = await getDirectoryData({ specialties: [specialty.id] });
  const output: Array<{
    label: string;
    departmentName: string;
    departmentId: string;
    csvValues: string;
    dbValues: string;
    chartPropValues: string;
  }> = [];

  for (const target of TARGETS) {
    const csvRow = csv.rows.find(
      (row) =>
        getLast(csv, row, "תחום התמחות") === "אף אוזן גרון" &&
        getLast(csv, row, "שם_מרכז_רפואי").includes(target.hospitalIncludes)
    );

    if (!csvRow) {
      throw new Error(`${target.label}: Master_Dept.csv row not found`);
    }

    const csvValues = YEARS.map((year) =>
      parseNumber(getLast(csv, csvRow, `מספר מתמחים חדשים ${year}`))
    );
    assertEqualValues(`${target.label} CSV`, csvValues, target.expected);

    const card = cards.find((department) => department.institutionName.includes(target.hospitalIncludes));
    if (!card) {
      throw new Error(`${target.label}: DepartmentCard query result not found`);
    }

    const dbRows = await prisma.departmentYearlyMetric.findMany({
      where: {
        departmentId: card.id,
        metricKey: "newResidents",
        year: {
          in: [...YEARS]
        }
      },
      select: {
        year: true,
        value: true
      },
      orderBy: {
        year: "asc"
      }
    });

    const dbValues = YEARS.map(
      (year) => dbRows.find((row) => row.year === year)?.value ?? null
    );
    assertEqualValues(`${target.label} DepartmentYearlyMetric`, dbValues, target.expected);

    const propValues = YEARS.map(
      (year) =>
        card.departmentNewResidentsYearly?.find((row) => row.year === year)?.value ?? null
    );
    assertEqualValues(`${target.label} DepartmentCard prop`, propValues, target.expected);

    output.push({
      label: target.label,
      departmentName: card.name,
      departmentId: card.id,
      csvValues: valuesString(csvValues),
      dbValues: valuesString(dbValues),
      chartPropValues: valuesString(propValues)
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        specialty,
        auditedPath:
          "Master_Dept.csv -> DepartmentYearlyMetric -> getDirectoryData -> DepartmentCard.departmentNewResidentsYearly",
        rows: output
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
