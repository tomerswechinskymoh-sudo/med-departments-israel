import fs from "fs/promises";
import path from "path";
import { execFileSync } from "child_process";
import { InstitutionType, PrismaClient } from "@prisma/client";
import {
  ensureDepartmentPage,
  ensureInstitution,
  ensureSpecialty,
  getInstitutionByName,
  getSpecialtyByName,
  INSTITUTION_CATALOG,
  normalizeCatalogLookupValue,
  resolveCanonicalDepartmentSlug,
  slugifyValue
} from "../department-catalog";

const prisma = new PrismaClient();

type ImportRow = {
  "בית חולים": string;
  "תחום": string;
  "מחלקה": string;
  "תפקיד": string;
  "תואר": string;
  "שם מלא": string;
  "מייל 1": string;
  "מייל 2": string;
  "מספר פלאפון": string;
};

const REQUIRED_HEADERS = ["בית חולים", "תחום", "מחלקה", "תפקיד", "תואר", "שם מלא"] as const;
const OPTIONAL_HEADERS = ["מייל 1", "מייל 2", "מספר פלאפון"] as const;
const SUPPORTED_DEFAULT_FILENAMES = [
  "Departments.xlsx",
  "Departments.csv",
  "Departments.tsv"
] as const;

function parseDelimitedLine(line: string, delimiter: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  result.push(current.trim());
  return result;
}

function validateHeaders(headers: string[]) {
  for (const header of REQUIRED_HEADERS) {
    if (!headers.includes(header)) {
      throw new Error(`חסרה עמודה נדרשת: ${header}`);
    }
  }
}

function parseDelimitedTable(content: string) {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("הקובץ צריך לכלול שורת כותרות ולפחות שורת נתונים אחת.");
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = parseDelimitedLine(lines[0], delimiter);
  validateHeaders(headers);

  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter);
    const row = {} as Record<string, string>;

    [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS].forEach((header) => {
      row[header] = "";
    });

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row as ImportRow;
  });
}

function parseXlsxTable(filePath: string) {
  const pythonScript = `
import json
import sys
from openpyxl import load_workbook

required_headers = ["בית חולים", "תחום", "מחלקה", "תפקיד", "תואר", "שם מלא"]
optional_headers = ["מייל 1", "מייל 2", "מספר פלאפון"]
wb = load_workbook(filename=sys.argv[1], data_only=True, read_only=True)
sheet = wb[wb.sheetnames[0]]
rows = list(sheet.iter_rows(values_only=True))
if len(rows) < 2:
    raise SystemExit("הקובץ צריך לכלול שורת כותרות ולפחות שורת נתונים אחת.")

headers = [str(cell).strip() if cell is not None else "" for cell in rows[0]]
for header in required_headers:
    if header not in headers:
        raise SystemExit(f"חסרה עמודה נדרשת: {header}")

output = []
for row in rows[1:]:
    if row is None:
        continue
    entry = {header: "" for header in required_headers + optional_headers}
    is_empty = True
    for index, header in enumerate(headers):
        value = row[index] if index < len(row) else ""
        if value is None:
            value = ""
        value = str(value).strip()
        if value:
            is_empty = False
        entry[header] = value
    if not is_empty:
        output.append(entry)

print(json.dumps(output, ensure_ascii=False))
`;

  const stdout = execFileSync("python3", ["-c", pythonScript, filePath], {
    encoding: "utf8"
  });

  return JSON.parse(stdout) as ImportRow[];
}

async function resolveImportPath(argumentPath?: string) {
  if (argumentPath) {
    return path.resolve(process.cwd(), argumentPath);
  }

  for (const filename of SUPPORTED_DEFAULT_FILENAMES) {
    const candidate = path.resolve(process.cwd(), filename);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(
    "לא נמצא קובץ import. אפשר להעביר נתיב ידני, או לשמור ליד שורש הפרויקט קובץ בשם Departments.xlsx או Departments.csv."
  );
}

function normalizeInstitutionType(name: string) {
  const catalogInstitution =
    getInstitutionByName(name.trim()) ??
    INSTITUTION_CATALOG.find(
      (institution) => normalizeCatalogLookupValue(institution.name) === normalizeCatalogLookupValue(name)
    );

  return catalogInstitution?.type ?? InstitutionType.HOSPITAL;
}

function isCommunitySpecialty(name: string) {
  const normalized = normalizeCatalogLookupValue(name);
  return normalized.includes("משפחה") || normalized.includes("קהילה");
}

function cleanEmail(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function cleanPhone(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mergeEmails(existingValue: string | null | undefined, incoming: string[]) {
  const existing = (existingValue ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set([...existing, ...incoming])).join("\n");
}

async function parseImportFile(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".xlsx") {
    return parseXlsxTable(filePath);
  }

  if (extension === ".csv" || extension === ".tsv") {
    const content = await fs.readFile(filePath, "utf8");
    return parseDelimitedTable(content);
  }

  throw new Error("כרגע נתמכים רק קבצי Departments.xlsx, Departments.csv או Departments.tsv.");
}

async function findExistingDepartmentByNormalizedName(input: {
  institutionId: string;
  departmentName: string;
}) {
  const departments = await prisma.department.findMany({
    where: {
      institutionId: input.institutionId
    },
    include: {
      specialty: {
        select: {
          slug: true
        }
      }
    }
  });

  const normalizedTarget = normalizeCatalogLookupValue(input.departmentName);
  return (
    departments.find(
      (department) => normalizeCatalogLookupValue(department.name) === normalizedTarget
    ) ?? null
  );
}

async function main() {
  const resolvedPath = await resolveImportPath(process.argv[2]);
  const rows = await parseImportFile(resolvedPath);

  let importedHeads = 0;
  let updatedHeads = 0;
  let createdDepartments = 0;
  let updatedContacts = 0;
  let skippedRows = 0;

  for (const row of rows) {
    const institutionName = row["בית חולים"]?.trim();
    const specialtyName = row["תחום"]?.trim();
    const subDepartmentName = row["מחלקה"]?.trim();
    const role = row["תפקיד"]?.trim();
    const title = row["תואר"]?.trim();
    const fullName = row["שם מלא"]?.trim();
    const emails = [cleanEmail(row["מייל 1"] ?? ""), cleanEmail(row["מייל 2"] ?? "")]
      .filter((value): value is string => Boolean(value));
    const phone = cleanPhone(row["מספר פלאפון"] ?? "");

    if (!institutionName || !specialtyName || !role || !fullName) {
      skippedRows += 1;
      continue;
    }

    const normalizedSpecialtyName =
      getSpecialtyByName(specialtyName)?.name ?? specialtyName;
    const institutionType = normalizeInstitutionType(institutionName);

    if (institutionType === InstitutionType.HMO && normalizedSpecialtyName !== "רפואת משפחה") {
      skippedRows += 1;
      continue;
    }

    if (institutionType === InstitutionType.HOSPITAL && isCommunitySpecialty(normalizedSpecialtyName)) {
      skippedRows += 1;
      continue;
    }

    const institution = await ensureInstitution(prisma, {
      name: getInstitutionByName(institutionName)?.name ?? institutionName,
      type: institutionType
    });
    const specialty = await ensureSpecialty(prisma, {
      name: normalizedSpecialtyName
    });
    const desiredDepartmentName = subDepartmentName || specialty.name;
    const normalizedDepartmentMatch = await findExistingDepartmentByNormalizedName({
      institutionId: institution.id,
      departmentName: desiredDepartmentName
    });

    const department =
      normalizedDepartmentMatch
      ? await prisma.department.update({
          where: {
            id: normalizedDepartmentMatch.id
          },
          data: {
            slug: resolveCanonicalDepartmentSlug({
              institutionSlug: institution.slug || slugifyValue(institution.name),
              specialtySlug:
                normalizedDepartmentMatch.specialty.slug ||
                specialty.slug ||
                slugifyValue(specialty.name),
              departmentName: normalizedDepartmentMatch.name
            })
          }
        })
      : await ensureDepartmentPage(prisma, {
        institutionId: institution.id,
        institutionSlug: institution.slug || slugifyValue(institution.name),
        institutionName: institution.name,
        institutionType: institution.type,
        specialtyId: specialty.id,
        specialtySlug: specialty.slug || slugifyValue(specialty.name),
        specialtyName: specialty.name,
        departmentName: desiredDepartmentName
      });

    if (!normalizedDepartmentMatch) {
      createdDepartments += 1;
    }

    const mergedEmails = emails.length
      ? mergeEmails(department.publicContactEmail, emails)
      : department.publicContactEmail ?? "";
    const nextPhone = phone ?? department.publicContactPhone ?? null;

    if (
      mergedEmails !== (department.publicContactEmail ?? "") ||
      nextPhone !== (department.publicContactPhone ?? null)
    ) {
      await prisma.department.update({
        where: {
          id: department.id
        },
        data: {
          publicContactEmail: mergedEmails || null,
          publicContactPhone: nextPhone
        }
      });
      updatedContacts += 1;
    }

    const existingHeadsCount = await prisma.departmentHead.count({
      where: {
        departmentId: department.id
      }
    });

    const existingHead = await prisma.departmentHead.findFirst({
      where: {
        departmentId: department.id,
        name: fullName,
        title: title || "ד\"ר",
        role
      }
    });

    if (existingHead) {
      await prisma.departmentHead.update({
        where: {
          id: existingHead.id
        },
        data: {
          bio:
            existingHead.bio ||
            `${title ? `${title} ` : ""}${fullName} משמש/ת כ${role} ב${department.name}.`
        }
      });
      updatedHeads += 1;
      continue;
    }

    await prisma.departmentHead.create({
      data: {
        departmentId: department.id,
        name: fullName,
        title: title || "ד\"ר",
        role,
        bio: `${title ? `${title} ` : ""}${fullName} משמש/ת כ${role} ב${department.name}.`,
        displayOrder: existingHeadsCount
      }
    });

    importedHeads += 1;
  }

  console.log({
    source: path.basename(resolvedPath),
    importedHeads,
    updatedHeads,
    createdDepartments,
    updatedContacts,
    skippedRows
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
