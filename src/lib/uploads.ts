import { Prisma, PrismaClient, UploadedFileCategory } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

function getMaxUploadBytes() {
  const maxUploadMb = Number(process.env.MAX_UPLOAD_MB ?? "4");
  return Number.isFinite(maxUploadMb) && maxUploadMb > 0
    ? maxUploadMb * 1024 * 1024
    : 4 * 1024 * 1024;
}

const allowedUploadMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "text/plain"
]);

const allowedUploadExtensions = new Set(["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "odt", "txt"]);

export function assertUserVerificationProofFile(file: File) {
  const maxBytes = Math.min(5 * 1024 * 1024, getMaxUploadBytes());
  const mimeType = file.type || "application/octet-stream";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isAllowed =
    ["application/pdf", "image/jpeg", "image/png"].includes(mimeType) ||
    ["pdf", "jpg", "jpeg", "png"].includes(extension);

  if (file.size > maxBytes) {
    throw new Error(`הקובץ גדול מדי. אפשר להעלות עד ${Math.round(maxBytes / (1024 * 1024))}MB.`);
  }

  if (!isAllowed) {
    throw new Error("אפשר להעלות רק PDF, JPG או PNG לצורך אימות.");
  }
}

function assertAllowedUploadType(file: File) {
  const mimeType = file.type || "application/octet-stream";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (allowedUploadMimeTypes.has(mimeType) || allowedUploadExtensions.has(extension)) {
    return;
  }

  throw new Error("סוג הקובץ אינו נתמך. ניתן להעלות PDF, תמונה או מסמך Word.");
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
  assertAllowedUploadType(input.file);

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
