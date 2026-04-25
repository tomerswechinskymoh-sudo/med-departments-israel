import fs from "fs/promises";
import path from "path";
import { InstitutionType, PrismaClient } from "@prisma/client";
import {
  ensureDepartmentPage,
  ensureInstitution,
  ensureSpecialty,
  INSTITUTION_CATALOG,
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
};

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

function parseTable(content: string) {
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
  const requiredHeaders = ["בית חולים", "תחום", "מחלקה", "תפקיד", "תואר", "שם מלא"];

  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new Error(`חסרה עמודה נדרשת: ${header}`);
    }
  }

  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter);
    const row = {} as Record<string, string>;

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row as ImportRow;
  });
}

function normalizeInstitutionType(name: string) {
  const catalogInstitution = INSTITUTION_CATALOG.find((institution) => institution.name === name.trim());
  return catalogInstitution?.type ?? InstitutionType.HOSPITAL;
}

function isCommunitySpecialty(name: string) {
  return name.includes("משפחה") || name.includes("קהילה");
}

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    throw new Error("יש להעביר נתיב לקובץ CSV או TSV. לדוגמה: npm run import:department-heads -- ./data/heads.csv");
  }

  const resolvedPath = path.resolve(process.cwd(), filePath);
  const extension = path.extname(resolvedPath).toLowerCase();

  if (extension === ".xlsx" || extension === ".xls") {
    throw new Error("כרגע הסקריפט תומך ב-CSV/TSV שמיוצאים מאקסל. שמרו את הקובץ כ-CSV UTF-8 ונסו שוב.");
  }

  const content = await fs.readFile(resolvedPath, "utf8");
  const rows = parseTable(content);

  let importedHeads = 0;
  let createdDepartments = 0;
  let skippedRows = 0;

  for (const row of rows) {
    const institutionName = row["בית חולים"]?.trim();
    const specialtyName = row["תחום"]?.trim();
    const subDepartmentName = row["מחלקה"]?.trim();
    const role = row["תפקיד"]?.trim();
    const title = row["תואר"]?.trim();
    const fullName = row["שם מלא"]?.trim();

    if (!institutionName || !specialtyName || !role || !fullName) {
      skippedRows += 1;
      continue;
    }

    const institutionType = normalizeInstitutionType(institutionName);

    if (institutionType === InstitutionType.HMO && specialtyName !== "רפואת משפחה") {
      skippedRows += 1;
      continue;
    }

    if (institutionType === InstitutionType.HOSPITAL && isCommunitySpecialty(specialtyName)) {
      skippedRows += 1;
      continue;
    }

    const institution = await ensureInstitution(prisma, {
      name: institutionName,
      type: institutionType
    });
    const specialty = await ensureSpecialty(prisma, {
      name: specialtyName
    });
    const desiredDepartmentName = subDepartmentName || specialty.name;
    const existingDepartment = await prisma.department.findFirst({
      where: {
        institutionId: institution.id,
        specialtyId: specialty.id,
        name: desiredDepartmentName
      },
      select: {
        id: true
      }
    });
    const department = await ensureDepartmentPage(prisma, {
      institutionId: institution.id,
      institutionSlug: institution.slug || slugifyValue(institution.name),
      institutionName: institution.name,
      institutionType: institution.type,
      specialtyId: specialty.id,
      specialtySlug: specialty.slug || slugifyValue(specialty.name),
      specialtyName: specialty.name,
      departmentName: desiredDepartmentName
    });
    if (!existingDepartment) {
      createdDepartments += 1;
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
    importedHeads,
    createdDepartments,
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
