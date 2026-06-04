import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ShebaEntCrawlerResult, ShebaEntPhysicianResult } from "@/lib/server/shebaEntCrawler";

const IMPORT_INSTRUCTION = "Sheba ENT fellowship POC export upload";
const RECORD_TYPE = "sheba_ent_fellowship_physician";

const detectedFellowshipSchema = z
  .object({
    fellowshipId: z.string(),
    canonicalNameHe: z.string().optional(),
    canonicalNameEn: z.string().optional(),
    totalScore: z.number().optional(),
    confidence: z.string().optional(),
    evidenceSnippets: z.array(z.string()).optional()
  })
  .passthrough();

const physicianSchema = z
  .object({
    physicianName: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    hospital: z.literal("שיבא"),
    sourceUrl: z.string(),
    bioText: z.string().optional(),
    bioTextLength: z.number().optional(),
    fellowshipText: z.string().nullable().optional(),
    fellowshipInstitution: z.string().nullable().optional(),
    fellowshipYears: z.string().nullable().optional(),
    extractedTraining: z.unknown().optional(),
    trainingDiagnostics: z.unknown().optional(),
    detectedFellowships: z.array(detectedFellowshipSchema).default([]),
    needsExternalSearch: z.boolean().optional(),
    reason: z.string().optional()
  })
  .passthrough();

export const shebaEntFellowshipExportSchema = z
  .object({
    hospital: z.literal("שיבא"),
    department: z.literal("אא״ג"),
    sourceUrl: z.string().url(),
    crawledAt: z.string(),
    physicians: z.array(physicianSchema)
  })
  .passthrough();

export type ShebaEntFellowshipExport = z.infer<typeof shebaEntFellowshipExportSchema>;

export type ShebaEntFellowshipUploadSummary = {
  batchId: string;
  uploadedAt: string;
  physicians: number;
  seniorPhysicians: number;
  trainingDetected: number;
};

function jsonValue(value: unknown) {
  return value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function topConfidenceScore(physician: z.infer<typeof physicianSchema>) {
  const top = physician.detectedFellowships?.[0];
  return typeof top?.totalScore === "number" ? top.totalScore : null;
}

function trainingDetected(physician: z.infer<typeof physicianSchema>) {
  const extracted = physician.extractedTraining as { fellowships?: unknown } | undefined;
  const fellowships = Array.isArray(extracted?.fellowships) ? extracted.fellowships : [];
  return fellowships.length > 0 || Boolean(physician.fellowshipText) || physician.detectedFellowships.length > 0;
}

function exportSummary(exportPayload: ShebaEntFellowshipExport) {
  return {
    physicians: exportPayload.physicians.length,
    seniorPhysicians: exportPayload.physicians.length,
    trainingDetected: exportPayload.physicians.filter(trainingDetected).length
  };
}

export function createShebaEntFellowshipExport(
  result: ShebaEntCrawlerResult,
  sourceUrl = result.departmentUrl
): ShebaEntFellowshipExport {
  return {
    hospital: "שיבא",
    department: "אא״ג",
    sourceUrl,
    crawledAt: new Date().toISOString(),
    physicians: result.results
  };
}

export async function saveShebaEntFellowshipExport(input: unknown, userId?: string | null) {
  const exportPayload = shebaEntFellowshipExportSchema.parse(input);
  const summary = exportSummary(exportPayload);

  const batch = await prisma.$transaction(async (tx) => {
    await tx.dataImportBatch.updateMany({
      where: {
        sourceType: "OTHER",
        target: "CUSTOM",
        extractionInstruction: IMPORT_INSTRUCTION,
        status: "APPROVED"
      },
      data: {
        status: "REJECTED",
        reviewedById: userId ?? undefined,
        reviewedAt: new Date()
      }
    });

    return tx.dataImportBatch.create({
      data: {
        sourceType: "OTHER",
        target: "CUSTOM",
        sourceUrl: exportPayload.sourceUrl,
        extractionInstruction: IMPORT_INSTRUCTION,
        rawText: null,
        rawHtml: null,
        parsedJson: jsonValue({
          ...exportPayload,
          summary
        }),
        status: "APPROVED",
        createdById: userId ?? undefined,
        reviewedById: userId ?? undefined,
        reviewedAt: new Date(),
        records: {
          create: exportPayload.physicians.map((physician, index) => ({
            sourceType: "OTHER" as const,
            target: "CUSTOM" as const,
            status: "APPROVED" as const,
            recordType: RECORD_TYPE,
            payloadJson: jsonValue(physician),
            rawText: typeof physician.bioText === "string" ? physician.bioText : null,
            sourceSnippet: physician.fellowshipText ?? null,
            sourceUrl: physician.sourceUrl,
            sourceLabel: "Sheba ENT fellowship export",
            physicianName: physician.physicianName ?? null,
            roleTitle: physician.role ?? null,
            hospitalNameRaw: exportPayload.hospital,
            specialtyRaw: exportPayload.department,
            confidenceScore: topConfidenceScore(physician),
            dedupeKey: `sheba-ent-fellowship:${Date.now()}:${index}`
          }))
        }
      }
    });
  });

  return {
    batchId: batch.id,
    uploadedAt: batch.createdAt.toISOString(),
    ...summary
  } satisfies ShebaEntFellowshipUploadSummary;
}

export async function getLatestShebaEntFellowshipUpload() {
  const batch = await prisma.dataImportBatch.findFirst({
    where: {
      sourceType: "OTHER",
      target: "CUSTOM",
      extractionInstruction: IMPORT_INSTRUCTION,
      status: "APPROVED"
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      records: {
        where: {
          recordType: RECORD_TYPE,
          status: "APPROVED"
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!batch) return null;

  const parsed = batch.parsedJson && typeof batch.parsedJson === "object" && !Array.isArray(batch.parsedJson)
    ? (batch.parsedJson as Record<string, unknown>)
    : {};
  const summary = parsed.summary && typeof parsed.summary === "object" && !Array.isArray(parsed.summary)
    ? (parsed.summary as Partial<ShebaEntFellowshipUploadSummary>)
    : {};
  const results = batch.records.map((record) => record.payloadJson as unknown as ShebaEntPhysicianResult);

  return {
    ok: true as const,
    startUrl: "uploaded:sheba-ent-fellowship",
    departmentUrl: batch.sourceUrl ?? "uploaded:sheba-ent-fellowship",
    physiciansProcessed: results.length,
    results,
    warnings: [] as string[],
    uploaded: {
      batchId: batch.id,
      uploadedAt: batch.createdAt.toISOString(),
      physicians: summary.physicians ?? results.length,
      seniorPhysicians: summary.seniorPhysicians ?? results.length,
      trainingDetected: summary.trainingDetected ?? results.filter((result) => trainingDetected(result)).length
    }
  };
}
