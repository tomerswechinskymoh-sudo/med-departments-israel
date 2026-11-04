// Browser-side feedback only. The signup API remains authoritative for validation.
export const VERIFICATION_PROOF_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

export function verificationProofError(file: Pick<File, "name" | "type" | "size">, maxUploadMb: number) {
  if (file.size === 0) return "הקובץ ריק. יש לבחור קובץ PDF, JPG או PNG תקין.";
  if (file.size > Math.min(5, maxUploadMb) * 1024 * 1024) {
    return `הקובץ גדול מדי. אפשר לבחור קובץ עד ${Math.min(5, maxUploadMb)}MB.`;
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type) &&
      !["pdf", "jpg", "jpeg", "png"].includes(extension)) {
    return "סוג הקובץ אינו נתמך. יש לבחור PDF, JPG או PNG. לתמונת HEIC יש לשמור עותק כ־JPG או PNG.";
  }
  return null;
}
