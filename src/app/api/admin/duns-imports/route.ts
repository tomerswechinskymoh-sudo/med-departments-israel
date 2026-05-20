import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hasValidSameOrigin } from "@/lib/security";
import {
  AssistedImportRequiredError,
  getDataImportPages,
  parseDataImportRecords
} from "@/lib/server/data-import-engine";

const dunsImportSchema = z.object({
  sourceType: z
    .enum(["DUNS100", "HOSPITAL_WEBSITE", "MINISTRY_REPORT", "MANUAL_PASTE", "OTHER"])
    .default("DUNS100"),
  target: z
    .enum(["DUNS100_PHYSICIANS", "DEPARTMENT_METRICS", "DEPARTMENT_LEADERSHIP", "RESIDENCY_OPENINGS", "CUSTOM"])
    .default("DUNS100_PHYSICIANS"),
  extractionInstruction: z.string().trim().min(3).max(1000).default("Extract DUNS100 physicians and match them to departments"),
  sourceUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  additionalSourceUrls: z.string().trim().max(5000).optional().or(z.literal("")),
  pastedContent: z.string().trim().max(240000).optional().or(z.literal("")),
  uploadedFiles: z
    .array(z.object({
      fileName: z.string().trim().max(240),
      content: z.string().max(240000)
    }))
    .max(12)
    .optional()
});

function jsonValue(value: unknown) {
  return value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }
  const rateLimit = checkRateLimit(request, "admin:data-imports", {
    limit: 12,
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const body = await request.json().catch(() => null);
  const parsed = dunsImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "יש להזין URL תקין או תוכן מודבק." }, { status: 400 });
  }
  if (parsed.data.sourceType === "DUNS100" || parsed.data.target === "DUNS100_PHYSICIANS") {
    return NextResponse.json(
      { error: "ייבוא DUNS100 מתבצע דרך סורק אוטומטי בלבד, ללא הדבקה או העלאת קבצים." },
      { status: 400 }
    );
  }

  try {
    const importText = await getDataImportPages(parsed.data);
    const parsedResult = await parseDataImportRecords(prisma, {
      rawText: importText.rawText,
      pages: importText.pages,
      sourceUrl: importText.sourceUrl,
      sourceType: parsed.data.sourceType,
      target: parsed.data.target,
      extractionInstruction: parsed.data.extractionInstruction
    });
    const batch = await prisma.dataImportBatch.create({
      data: {
        sourceType: parsed.data.sourceType,
        target: parsed.data.target,
        sourceUrl: importText.sourceUrl,
        extractionInstruction: parsed.data.extractionInstruction,
        rawText: importText.rawText,
        rawHtml: importText.rawHtml,
        parsedJson: jsonValue({
          summary: parsedResult.summary,
          unmatchedCount: parsedResult.unmatchedCount,
          diagnostics: importText.diagnostics,
          processingSummary: {
            pagesProcessed: importText.pages.length,
            recordsExtracted: parsedResult.records.length,
            matchedRecords: parsedResult.records.length - parsedResult.unmatchedCount,
            unmatchedRecords: parsedResult.unmatchedCount
          }
        }),
        status: "PENDING_REVIEW",
        createdById: session.userId,
        sources: {
          createMany: {
            data: importText.pages.map((page) => ({
              sourceUrl: page.sourceUrl ?? null,
              sourceLabel: page.sourceLabel ?? null,
              finalUrl: page.sourceUrl ?? null,
              rawText: page.rawText,
              rawHtml: page.rawHtml ?? null,
              diagnostics: jsonValue(page.diagnostics ?? {})
            }))
          }
        },
        records: {
          createMany: {
            skipDuplicates: true,
            data: parsedResult.records.map((record) => ({
              sourceType: record.sourceType,
              target: record.target,
              recordType: record.recordType,
              payloadJson: record.payloadJson,
              rawText: record.rawText,
              sourceSnippet: record.sourceSnippet,
              sourceUrl: record.sourceUrl,
              sourceLabel: record.sourceLabel,
              rankingYear: record.rankingYear,
              physicianName: record.physicianName,
              roleTitle: record.roleTitle,
              hospitalNameRaw: record.hospitalNameRaw,
              specialtyRaw: record.specialtyRaw,
              normalizedHospitalId: record.normalizedHospitalId,
              normalizedSpecialtyId: record.normalizedSpecialtyId,
              normalizedDepartmentId: record.normalizedDepartmentId,
              confidenceScore: record.confidenceScore,
              dedupeKey: record.dedupeKey
            }))
          }
        }
      },
      include: {
        records: true
      }
    });

    await createAuditLog({
      actorUserId: session.userId,
      action: "data_import.batch_created",
      entityType: "DataImportBatch",
      entityId: batch.id,
      metadata: {
        sourceType: parsed.data.sourceType,
        target: parsed.data.target,
        records: parsedResult.records.length
      }
    });

    return NextResponse.json({
      message: `המערכת חילצה ${parsedResult.records.length} רשומות, מתוכן ${parsedResult.records.length - parsedResult.unmatchedCount} שויכו אוטומטית.`,
      batch
    });
  } catch (error) {
    const needsAssistedImport = error instanceof AssistedImportRequiredError;
    const message = needsAssistedImport
      ? "האתר חסם סריקה אוטומטית. ניתן להעלות קובצי HTML או להדביק תוכן מכמה עמודים."
      : error instanceof Error
        ? error.message
        : "ייבוא נתונים נכשל.";
    const batch = await prisma.dataImportBatch.create({
      data: {
        sourceType: parsed.data.sourceType,
        target: parsed.data.target,
        sourceUrl: parsed.data.sourceUrl || null,
        extractionInstruction: parsed.data.extractionInstruction,
        rawText: parsed.data.pastedContent || null,
        parsedJson: jsonValue({
          error: message,
          diagnostics: needsAssistedImport ? error.diagnostics : null,
          fallbackOptions: [
            "ניתן להעלות קובצי HTML או TXT",
            "ניתן להדביק תוכן מכמה עמודים",
            "ניתן לצרף כתובות מקור לצורך ייחוס"
          ]
        }),
        createdById: session.userId,
        status: needsAssistedImport ? "FAILED_NEEDS_ASSISTED_IMPORT" : "FAILED"
      }
    });

    await createAuditLog({
      actorUserId: session.userId,
      action: "data_import.batch_failed",
      entityType: "DataImportBatch",
      entityId: batch.id,
      metadata: {
        sourceType: parsed.data.sourceType,
        target: parsed.data.target,
        assistedImportSuggested: needsAssistedImport
      }
    });

    return NextResponse.json({ error: message, batch }, { status: needsAssistedImport ? 409 : 500 });
  }
}
