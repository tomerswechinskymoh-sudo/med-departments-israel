import { Prisma, PrismaClient, UploadedFileCategory } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

function getMaxUploadBytes() {
  const maxUploadMb = Number(process.env.MAX_UPLOAD_MB ?? "4");
  return Number.isFinite(maxUploadMb) && maxUploadMb > 0
    ? maxUploadMb * 1024 * 1024
    : 4 * 1024 * 1024;
}

export function getMaxUploadMbLabel() {
  return Math.round(getMaxUploadBytes() / (1024 * 1024));
}

export function readOptionalFormFile(value: FormDataEntryValue | null) {
  if (!value || typeof value === "string") {
    return null;
  }

  if (value.size <= 0) {
    return null;
  }

  return value;
}

export async function storeUploadedFile(
  prisma: PrismaLike,
  input: {
    file: File;
    category: UploadedFileCategory;
    departmentId?: string | null;
    openingId?: string | null;
    openingApplicationId?: string | null;
    reviewSubmissionId?: string | null;
    uploadedByUserId?: string | null;
    isPublic?: boolean;
  }
) {
  if (input.file.size > getMaxUploadBytes()) {
    throw new Error(`הקובץ גדול מדי. אפשר להעלות עד ${getMaxUploadMbLabel()}MB לקובץ.`);
  }

  const arrayBuffer = await input.file.arrayBuffer();

  return prisma.uploadedFile.create({
    data: {
      departmentId: input.departmentId ?? null,
      openingId: input.openingId ?? null,
      openingApplicationId: input.openingApplicationId ?? null,
      reviewSubmissionId: input.reviewSubmissionId ?? null,
      uploadedByUserId: input.uploadedByUserId ?? null,
      category: input.category,
      isPublic: input.isPublic ?? false,
      originalName: input.file.name || "uploaded-file",
      mimeType: input.file.type || "application/octet-stream",
      sizeBytes: input.file.size,
      bytes: Buffer.from(arrayBuffer)
    }
  });
}
