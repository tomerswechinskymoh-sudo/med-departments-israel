import { Prisma, type PrismaClient } from "@prisma/client";
import {
  extractDepartmentScrape,
  scrapeDepartmentUrl,
  ScrapeTextError,
  validateScrapeUrl
} from "@/lib/server/department-scraper";

type DbClient = PrismaClient | Prisma.TransactionClient;

function jsonValue(value: unknown) {
  return value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function withDeterministicEmailFallback<T extends {
  departmentHeadEmail: string | null;
  contactEmail: string | null;
}>(extracted: T, extractedEmails: string[]) {
  const uniqueEmails = Array.from(new Set(extractedEmails));

  if (uniqueEmails.length !== 1) {
    return extracted;
  }

  const [email] = uniqueEmails;

  return {
    ...extracted,
    contactEmail: extracted.contactEmail ?? email
  };
}

export async function createDepartmentWebsiteRefreshSuggestion(
  db: DbClient,
  input: {
    departmentId: string;
    sourceUrl?: string | null;
  }
) {
  const department = await db.department.findUnique({
    where: { id: input.departmentId },
    include: {
      institution: true,
      specialty: true
    }
  });

  if (!department) {
    throw new Error("המחלקה לא נמצאה.");
  }

  const sourceUrl = validateScrapeUrl(input.sourceUrl || department.websiteUrl || department.institution.websiteUrl || "");

  try {
    const scrapeResult = await scrapeDepartmentUrl(sourceUrl);
    const openAiExtraction = await extractDepartmentScrape({
      sourceUrl,
      rawText: scrapeResult.rawText,
      departmentName: department.name,
      institutionName: department.institution.name,
      specialtyName: department.specialty.name
    });
    const extracted = withDeterministicEmailFallback(
      openAiExtraction,
      scrapeResult.diagnostics.extractedEmails
    );
    const suggestedEmails =
      scrapeResult.diagnostics.extractedEmails.length > 0
        ? scrapeResult.diagnostics.extractedEmails
        : null;

    return db.departmentScrapeRevision.create({
      data: {
        departmentId: department.id,
        sourceUrl,
        status: "PENDING_REVIEW",
        confidenceScore: extracted.confidenceScore,
        scrapedAt: new Date(),
        rawText: scrapeResult.rawText,
        extractedJson: jsonValue({
          ...extracted,
          scrapeDiagnostics: scrapeResult.diagnostics
        }),
        extractionWarningsJson: jsonValue(extracted.warnings ?? []),
        suggestedEmailsJson: jsonValue(suggestedEmails),
        proposedDepartmentHeadTitle: extracted.departmentHeadTitle,
        proposedDepartmentHeadName: extracted.departmentHeadName,
        proposedDepartmentHeadEmail: extracted.departmentHeadEmail,
        proposedDepartmentHeadPhone: extracted.departmentHeadPhone,
        proposedContactTitle: extracted.contactTitle,
        proposedContactRole: extracted.contactRole,
        proposedContactName: extracted.contactName,
        proposedContactEmail: extracted.contactEmail,
        proposedContactPhone: extracted.contactPhone,
        proposedDescription: extracted.description,
        proposedSeniorPhysiciansCount: extracted.seniorPhysiciansCount,
        proposedBedsCount: extracted.bedsCount,
        proposedResearchActivity: extracted.researchActivity,
        proposedSubSpecialtiesJson: jsonValue(extracted.subSpecialties),
        proposedApplicationUrl: extracted.applicationUrl
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "הסריקה נכשלה.";
    const diagnostics = error instanceof ScrapeTextError ? error.diagnostics : null;
    const rawText = error instanceof ScrapeTextError ? error.rawText : null;
    const suggestedEmails =
      diagnostics && diagnostics.extractedEmails.length > 0 ? diagnostics.extractedEmails : null;

    const failedRevision = await db.departmentScrapeRevision.create({
      data: {
        departmentId: department.id,
        sourceUrl,
        status: "FAILED",
        scrapedAt: new Date(),
        rawText,
        extractedJson: jsonValue(diagnostics ? { scrapeDiagnostics: diagnostics } : null),
        extractionWarningsJson: jsonValue(
          diagnostics?.fetchError || diagnostics?.playwrightError
            ? [diagnostics.fetchError, diagnostics.playwrightError].filter(Boolean)
            : []
        ),
        suggestedEmailsJson: jsonValue(suggestedEmails),
        adminNotes: message
      }
    });

    return failedRevision;
  }
}
