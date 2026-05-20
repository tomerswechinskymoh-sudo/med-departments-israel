import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  extractDepartmentScrape,
  scrapeDepartmentUrl,
  ScrapeTextError,
  validateScrapeUrl
} from "@/lib/server/department-scraper";

const scrapeRequestSchema = z.object({
  sourceUrl: z.string().trim().url("יש להזין כתובת URL תקינה.").max(1000)
});

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const { departmentId } = await params;
  const revisions = await prisma.departmentScrapeRevision.findMany({
    where: { departmentId },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  return NextResponse.json({ revisions });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const { departmentId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = scrapeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    include: {
      institution: true,
      specialty: true
    }
  });

  if (!department) {
    return NextResponse.json({ error: "המחלקה לא נמצאה." }, { status: 404 });
  }

  const sourceUrl = validateScrapeUrl(parsed.data.sourceUrl);

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

    const revision = await prisma.departmentScrapeRevision.create({
      data: {
        departmentId,
        sourceUrl,
        status: "PENDING_REVIEW",
        confidenceScore: extracted.confidenceScore,
        rawText: scrapeResult.rawText,
        extractedJson: jsonValue({
          ...extracted,
          scrapeDiagnostics: scrapeResult.diagnostics
        }),
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
        proposedSubSpecialtiesJson: jsonValue(extracted.subSpecialties),
        proposedApplicationUrl: extracted.applicationUrl
      }
    });

    return NextResponse.json({ revision });
  } catch (error) {
    const message = error instanceof Error ? error.message : "הסריקה נכשלה.";
    const diagnostics = error instanceof ScrapeTextError ? error.diagnostics : null;
    const rawText = error instanceof ScrapeTextError ? error.rawText : null;
    const suggestedEmails =
      diagnostics && diagnostics.extractedEmails.length > 0 ? diagnostics.extractedEmails : null;
    const failedRevision = await prisma.departmentScrapeRevision.create({
      data: {
        departmentId,
        sourceUrl,
        status: "FAILED",
        rawText,
        extractedJson: jsonValue(diagnostics ? { scrapeDiagnostics: diagnostics } : null),
        suggestedEmailsJson: jsonValue(suggestedEmails),
        adminNotes: message
      }
    });

    return NextResponse.json({ error: message, revision: failedRevision }, { status: 500 });
  }
}
