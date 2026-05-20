import type { PrismaClient } from "@prisma/client";
import {
  approveDataImportBatch,
  getDataImportText,
  parseDataImportRecords
} from "@/lib/server/data-import-engine";

export async function getDunsImportText(input: { sourceUrl?: string | null; pastedContent?: string | null }) {
  return getDataImportText(input);
}

export async function parseDunsPhysicians(prisma: PrismaClient, rawText: string, sourceUrl?: string | null) {
  return parseDataImportRecords(prisma, {
    rawText,
    sourceUrl,
    sourceType: "DUNS100",
    target: "DUNS100_PHYSICIANS",
    extractionInstruction: "Extract DUNS100 physicians and match them to departments"
  });
}

export async function approveDunsBatch(prisma: PrismaClient, batchId: string) {
  return approveDataImportBatch(prisma, batchId);
}
