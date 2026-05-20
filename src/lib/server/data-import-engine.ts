import { Prisma, type PrismaClient } from "@prisma/client";
import { scrapeDepartmentUrl } from "@/lib/server/department-scraper";

type ImportTarget =
  | "DUNS100_PHYSICIANS"
  | "DEPARTMENT_METRICS"
  | "DEPARTMENT_LEADERSHIP"
  | "RESIDENCY_OPENINGS"
  | "CUSTOM";
type SourceType = "DUNS100" | "HOSPITAL_WEBSITE" | "MINISTRY_REPORT" | "MANUAL_PASTE" | "OTHER";

export type DataImportPage = {
  rawText: string;
  rawHtml?: string | null;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  diagnostics?: Prisma.InputJsonValue;
};

type DepartmentMatch = {
  institutionId: string | null;
  specialtyId: string | null;
  departmentId: string | null;
  hospitalName: string;
  specialtyName: string;
  confidence: number;
};

type ParsedImportRecord = {
  sourceType: SourceType;
  target: ImportTarget;
  recordType: string;
  payloadJson: Prisma.InputJsonValue;
  rawText: string;
  sourceSnippet: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
  rankingYear: number | null;
  physicianName: string | null;
  roleTitle: string | null;
  hospitalNameRaw: string | null;
  specialtyRaw: string | null;
  normalizedHospitalId: string | null;
  normalizedSpecialtyId: string | null;
  normalizedDepartmentId: string | null;
  confidenceScore: number;
  dedupeKey: string;
};

export class AssistedImportRequiredError extends Error {
  diagnostics: Prisma.InputJsonValue;

  constructor(message: string, diagnostics: Prisma.InputJsonValue) {
    super(message);
    this.name = "AssistedImportRequiredError";
    this.diagnostics = diagnostics;
  }
}

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[״"]/g, "")
    .replace(/[׳']/g, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("he");
}

function normalizeKey(value: string) {
  return normalize(value).replace(/[^\p{L}\p{N}@.:/-]+/gu, "-").replace(/-+/g, "-");
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function splitBlocks(rawText: string) {
  const byParagraph = rawText
    .split(/\n{2,}|(?:^|\n)\s*(?=\d+\.\s)|•|\u2022/g)
    .map((block) => block.trim())
    .filter((block) => block.length >= 8);

  if (byParagraph.length >= 2) return byParagraph;

  return rawText
    .split(/\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length >= 8);
}

function splitInputLines(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return (value ?? "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitPastedPages(value: string | null | undefined, attributionUrls: string[]) {
  const content = value?.trim();
  if (!content) return [];
  const chunks = content
    .split(/\n\s*-{3,}\s*(?:עמוד|page|url)?.*?\n/gi)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks.map((chunk, index): DataImportPage => ({
    rawText: chunk.slice(0, 60000),
    rawHtml: null,
    sourceUrl: attributionUrls[index] ?? attributionUrls[0] ?? null,
    sourceLabel: chunks.length > 1 ? `תוכן מודבק ${index + 1}` : "תוכן מודבק",
    diagnostics: { inputMode: "paste", index }
  }));
}

function isAssistedScrapeFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /403|timeout|timed out|bot|blocked|forbidden|חסם|גישה/i.test(message);
}

function inferRankingYear(text: string) {
  const explicit = text.match(/(?:20)\d{2}/);
  if (!explicit?.[0]) return null;
  const year = Number(explicit[0]);
  return year >= 2000 && year <= 2100 ? year : null;
}

function inferPhysicianName(block: string) {
  const titleMatch = block.match(/(?:פרופ(?:׳|')?|פרופסור|ד"ר|דר)\s+([\u0590-\u05ffA-Za-z][\u0590-\u05ffA-Za-z\s.'-]{2,55})/);
  if (titleMatch?.[0]) {
    return titleMatch[0].replace(/\s+/g, " ").trim();
  }

  const firstLine = block.split(/\n|[|•]/)[0]?.trim() ?? "";
  const words = firstLine
    .replace(/DUNS100|דאנס100|רופאים|מומחים|כירורגיה|רפואה/gi, " ")
    .split(/\s+/)
    .filter(Boolean);

  return words.slice(0, 3).join(" ").trim();
}

function inferRoleTitle(block: string, physicianName: string) {
  const normalizedBlock = block.replace(physicianName, " ").replace(/\s+/g, " ").trim();
  const roleMatch = normalizedBlock.match(/(?:מנהל(?:ת)?|ראש|יו"ר|סגן|רופא(?:ה)? בכיר(?:ה)?|מומחה(?:ית)?)[^.;\n]{0,100}/);
  return roleMatch?.[0]?.trim() ?? normalizedBlock.slice(0, 180);
}

function nameAliases(name: string) {
  const normalizedName = normalize(name);
  const aliases = new Set([normalizedName]);
  for (const token of normalizedName.split(" ")) {
    if (token.length >= 4 && !["המרכז", "הרפואי", "מרכז", "בית", "חולים"].includes(token)) {
      aliases.add(token);
    }
  }
  return Array.from(aliases);
}

async function getMatchingContext(prisma: PrismaClient) {
  const [institutions, specialties, departments] = await Promise.all([
    prisma.institution.findMany({ select: { id: true, name: true } }),
    prisma.specialty.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({
      select: {
        id: true,
        name: true,
        institutionId: true,
        specialtyId: true,
        institution: { select: { name: true } },
        specialty: { select: { name: true } }
      }
    })
  ]);

  return { institutions, specialties, departments };
}

function matchDepartments(
  block: string,
  context: Awaited<ReturnType<typeof getMatchingContext>>
): DepartmentMatch[] {
  const normalizedBlock = normalize(block);
  const institutions = context.institutions.filter((institution) =>
    nameAliases(institution.name).some((alias) => alias.length >= 4 && normalizedBlock.includes(alias))
  );
  const specialties = context.specialties.filter((specialty) =>
    nameAliases(specialty.name).some((alias) => alias.length >= 4 && normalizedBlock.includes(alias))
  );
  const inferredInstitutions = institutions.length > 0 ? institutions : [null];
  const inferredSpecialties = specialties.length > 0 ? specialties : [null];
  const matches: DepartmentMatch[] = [];

  for (const institution of inferredInstitutions) {
    for (const specialty of inferredSpecialties) {
      const candidateDepartments = context.departments.filter((department) => {
        if (institution && department.institutionId !== institution.id) return false;
        if (specialty && department.specialtyId !== specialty.id) return false;
        return true;
      });
      const departmentByName = candidateDepartments.find((department) =>
        nameAliases(department.name).some((alias) => alias.length >= 2 && normalizedBlock.includes(alias))
      );
      const department = departmentByName ?? (candidateDepartments.length === 1 ? candidateDepartments[0] : null);

      if (!institution && !specialty && !department) continue;

      matches.push({
        institutionId: institution?.id ?? department?.institutionId ?? null,
        specialtyId: specialty?.id ?? department?.specialtyId ?? null,
        departmentId: department?.id ?? null,
        hospitalName: institution?.name ?? department?.institution.name ?? "לא זוהה",
        specialtyName: specialty?.name ?? department?.specialty.name ?? "לא זוהה",
        confidence: department ? 0.88 : institution && specialty ? 0.72 : 0.42
      });
    }
  }

  return uniqueBy(matches, (match) =>
    `${match.institutionId ?? "none"}:${match.specialtyId ?? "none"}:${match.departmentId ?? "none"}`
  );
}

function parseDunsPhysicianRecords(
  page: DataImportPage,
  sourceType: SourceType,
  target: ImportTarget,
  context: Awaited<ReturnType<typeof getMatchingContext>>
) {
  const rawText = page.rawText;
  const sourceUrl = page.sourceUrl ?? null;
  const sourceLabel = page.sourceLabel ?? sourceUrl ?? "מקור לא ידוע";
  const rankingYear = inferRankingYear(rawText);
  const records: ParsedImportRecord[] = [];

  for (const block of splitBlocks(rawText)) {
    const physicianName = inferPhysicianName(block);
    if (!physicianName || physicianName.length < 3) continue;

    const matches = matchDepartments(block, context);
    const roleTitle = inferRoleTitle(block, physicianName);
    const effectiveMatches = matches.length > 0 ? matches : [{
      institutionId: null,
      specialtyId: null,
      departmentId: null,
      hospitalName: "לא זוהה",
      specialtyName: "לא זוהה",
      confidence: 0.25
    }];

    for (const match of effectiveMatches) {
      const dedupeKey = normalizeKey(
        `${target}:${rankingYear ?? "unknown"}:${physicianName}:${match.hospitalName}:${match.specialtyName}:${sourceUrl ?? sourceLabel}`
      );

      records.push({
        sourceType,
        target,
        recordType: "DUNS100_PHYSICIAN",
        payloadJson: {
          physicianName,
          roleTitle,
          workplaces: [match.hospitalName].filter((item) => item !== "לא זוהה"),
          specialty: match.specialtyName !== "לא זוהה" ? match.specialtyName : null,
          rankingYear,
          sourceUrl,
          sourceLabel
        },
        rawText: block.slice(0, 4000),
        sourceSnippet: block.slice(0, 420),
        sourceUrl,
        sourceLabel,
        rankingYear,
        physicianName,
        roleTitle,
        hospitalNameRaw: match.hospitalName,
        specialtyRaw: match.specialtyName,
        normalizedHospitalId: match.institutionId,
        normalizedSpecialtyId: match.specialtyId,
        normalizedDepartmentId: match.departmentId,
        confidenceScore: match.confidence,
        dedupeKey
      });
    }
  }

  return uniqueBy(records, (record) => record.dedupeKey);
}

function parseGenericRecords(
  page: DataImportPage,
  sourceType: SourceType,
  target: ImportTarget,
  instruction: string,
  context: Awaited<ReturnType<typeof getMatchingContext>>
) {
  const rawText = page.rawText;
  const sourceUrl = page.sourceUrl ?? null;
  const sourceLabel = page.sourceLabel ?? sourceUrl ?? "מקור לא ידוע";

  return splitBlocks(rawText).slice(0, 80).map((block, index): ParsedImportRecord => {
    const [match] = matchDepartments(block, context);
    const dedupeKey = normalizeKey(`${target}:${sourceUrl ?? sourceLabel}:${index}:${block.slice(0, 80)}`);
    return {
      sourceType,
      target,
      recordType: "GENERIC_EXTRACTED_RECORD",
      payloadJson: {
        instruction,
        text: block.slice(0, 1500),
        sourceLabel
      },
      rawText: block.slice(0, 4000),
      sourceSnippet: block.slice(0, 420),
      sourceUrl,
      sourceLabel,
      rankingYear: inferRankingYear(block),
      physicianName: null,
      roleTitle: null,
      hospitalNameRaw: match?.hospitalName ?? null,
      specialtyRaw: match?.specialtyName ?? null,
      normalizedHospitalId: match?.institutionId ?? null,
      normalizedSpecialtyId: match?.specialtyId ?? null,
      normalizedDepartmentId: match?.departmentId ?? null,
      confidenceScore: match?.confidence ?? 0.25,
      dedupeKey
    };
  });
}

export async function getDataImportPages(input: {
  sourceUrl?: string | null;
  additionalSourceUrls?: string | string[] | null;
  pastedContent?: string | null;
  uploadedFiles?: Array<{ fileName: string; content: string }> | null;
}) {
  const attributionUrls = [input.sourceUrl?.trim(), ...splitInputLines(input.additionalSourceUrls)].filter(
    (item): item is string => Boolean(item)
  );
  const pages: DataImportPage[] = [
    ...splitPastedPages(input.pastedContent, attributionUrls),
    ...((input.uploadedFiles ?? [])
      .filter((file) => file.content?.trim())
      .map((file, index): DataImportPage => ({
        rawText: file.content.slice(0, 60000),
        rawHtml: file.content.slice(0, 320000),
        sourceUrl: attributionUrls[index] ?? attributionUrls[0] ?? null,
        sourceLabel: file.fileName,
        diagnostics: { inputMode: "file", fileName: file.fileName }
      })))
  ];
  const scrapeFailures: Array<{ sourceUrl: string; message: string; assisted: boolean }> = [];

  for (const sourceUrl of attributionUrls.slice(0, 8)) {
    try {
      const scraped = await scrapeDepartmentUrl(sourceUrl);
      pages.push({
        rawText: scraped.rawText,
        rawHtml: null,
        sourceUrl: scraped.diagnostics.finalUrl || sourceUrl,
        sourceLabel: sourceUrl,
        diagnostics: scraped.diagnostics
      });
    } catch (error) {
      scrapeFailures.push({
        sourceUrl,
        message: error instanceof Error ? error.message : "סריקה נכשלה.",
        assisted: isAssistedScrapeFailure(error)
      });
    }
  }

  if (pages.length === 0 && scrapeFailures.length > 0) {
    throw new AssistedImportRequiredError("האתר חסם סריקה אוטומטית", {
      scrapeFailures,
      fallbackMessage: "ניתן להעלות קובצי HTML או להדביק תוכן מכמה עמודים"
    });
  }

  if (pages.length === 0) {
    throw new Error("יש להזין URL, להדביק תוכן או להעלות קובץ.");
  }

  return {
    pages,
    rawText: pages.map((page) => page.rawText).join("\n\n--- page ---\n\n").slice(0, 120000),
    rawHtml: pages.map((page) => page.rawHtml).filter(Boolean).join("\n\n").slice(0, 320000) || null,
    sourceUrl: attributionUrls[0] ?? pages[0]?.sourceUrl ?? null,
    diagnostics: {
      pagesProcessed: pages.length,
      scrapeFailures
    }
  };
}

export async function getDataImportText(input: { sourceUrl?: string | null; pastedContent?: string | null }) {
  const result = await getDataImportPages(input);
  return {
    rawText: result.rawText,
    rawHtml: result.rawHtml,
    sourceUrl: result.sourceUrl,
    diagnostics: result.diagnostics
  };
}

export async function parseDataImportRecords(
  prisma: PrismaClient,
  input: {
    rawText: string;
    pages?: DataImportPage[];
    sourceUrl?: string | null;
    sourceType: SourceType;
    target: ImportTarget;
    extractionInstruction: string;
  }
) {
  const context = await getMatchingContext(prisma);
  const isDuns =
    input.target === "DUNS100_PHYSICIANS" ||
    input.sourceType === "DUNS100" ||
    /duns|דאנס|רופאי.*duns/i.test(input.extractionInstruction);
  const pages = input.pages?.length
    ? input.pages
    : [{ rawText: input.rawText, sourceUrl: input.sourceUrl ?? null, sourceLabel: input.sourceUrl ?? "מקור יחיד" }];
  const records = pages.flatMap((page) =>
    isDuns
      ? parseDunsPhysicianRecords(page, input.sourceType, "DUNS100_PHYSICIANS", context)
      : parseGenericRecords(page, input.sourceType, input.target, input.extractionInstruction, context)
  );
  const uniqueRecords = uniqueBy(records, (record) => record.dedupeKey);
  const summary = uniqueRecords.reduce<Array<{ hospitalName: string; specialtyName: string; count: number }>>((items, record) => {
    const hospitalName = record.hospitalNameRaw ?? "לא זוהה";
    const specialtyName = record.specialtyRaw ?? "לא זוהה";
    const current = items.find((item) => item.hospitalName === hospitalName && item.specialtyName === specialtyName);
    if (current) current.count += 1;
    else items.push({ hospitalName, specialtyName, count: 1 });
    return items;
  }, []);

  return {
    records: uniqueRecords,
    summary: summary.sort((left, right) => right.count - left.count),
    unmatchedCount: uniqueRecords.filter((record) => !record.normalizedDepartmentId).length
  };
}

export async function approveDataImportBatch(prisma: PrismaClient, batchId: string) {
  const batch = await prisma.dataImportBatch.findUnique({
    where: { id: batchId },
    include: {
      records: {
        where: {
          status: "PENDING_REVIEW",
          normalizedDepartmentId: { not: null }
        }
      }
    }
  });

  if (!batch) {
    throw new Error("ייבוא לא נמצא.");
  }

  const affectedDepartmentIds = new Set<string>();

  for (const record of batch.records) {
    if (!record.normalizedDepartmentId) continue;

    if (record.target === "DUNS100_PHYSICIANS" && record.physicianName) {
      await prisma.departmentExternalPerson.upsert({
        where: {
          departmentId_sourceName_personName_rankingYear: {
            departmentId: record.normalizedDepartmentId,
            sourceName: "DUNS100",
            personName: record.physicianName,
            rankingYear: record.rankingYear ?? 0
          }
        },
        create: {
          departmentId: record.normalizedDepartmentId,
          sourceName: "DUNS100",
          personName: record.physicianName,
          roleTitle: record.roleTitle,
          description: record.sourceSnippet,
          sourceUrl: record.sourceUrl,
          rankingYear: record.rankingYear ?? 0,
          sourceRecordId: record.id,
          approved: true
        },
        update: {
          roleTitle: record.roleTitle,
          description: record.sourceSnippet,
          sourceUrl: record.sourceUrl,
          sourceRecordId: record.id,
          approved: true
        }
      });
    }

    affectedDepartmentIds.add(record.normalizedDepartmentId);
  }

  await prisma.dataImportRecord.updateMany({
    where: {
      batchId,
      normalizedDepartmentId: { not: null }
    },
    data: {
      status: "APPROVED"
    }
  });

  for (const departmentId of affectedDepartmentIds) {
    const count = await prisma.departmentExternalPerson.count({
      where: {
        departmentId,
        sourceName: "DUNS100",
        approved: true
      }
    });

    await prisma.departmentExternalMetric.upsert({
      where: {
        departmentId_metricKey_sourceName: {
          departmentId,
          metricKey: "duns100PhysiciansCount",
          sourceName: "DUNS100"
        }
      },
      create: {
        departmentId,
        metricKey: "duns100PhysiciansCount",
        value: count,
        sourceName: "DUNS100",
        confidenceScore: 0.8,
        approved: true
      },
      update: {
        value: count,
        confidenceScore: 0.8,
        approved: true
      }
    });
  }

  return Array.from(affectedDepartmentIds);
}
