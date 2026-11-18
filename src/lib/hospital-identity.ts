/** Distinguish the psychiatric hospital from Hasharon Hospital (Rabin). */
export function isLevHasharon(value: string | null | undefined) {
  const normalized = (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[\s_\-־–—]+/g, " ")
    .trim();
  return /(?:^|[^א-ת])לב השרון(?:$|[^א-ת])/.test(normalized) ||
    /\blev ha ?sharon\b/.test(normalized);
}

export const LEV_HASHARON = "לב השרון";
