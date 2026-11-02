export type ParseStatus = "MISSING" | "EXACT" | "RANGE" | "PARTIAL_EQUIVALENT" | "AMBIGUOUS" | "INVALID";
export type NumericParse = {
  rawValue: string | null;
  min: number | null;
  max: number | null;
  estimate: number | null;
  parseStatus: ParseStatus;
  calculated: boolean;
};
export const clean = (value: string) => value.normalize("NFKC").replace(/[\u200e\u200f\u202a-\u202e]/g, "").replace(/[–—−־]/g, "-").replace(/\s+/g, " ").trim();
const missing = (v: unknown) => v == null || String(v).trim() === "";
export function empty(raw: unknown, parseStatus: ParseStatus = missing(raw) ? "MISSING" : "AMBIGUOUS"): NumericParse {
  return { rawValue: missing(raw) ? null : String(raw), min: null, max: null, estimate: null, parseStatus, calculated: false };
}
function result(raw: unknown, min: number, max = min, status: ParseStatus = min === max ? "EXACT" : "RANGE"): NumericParse {
  return { rawValue: String(raw), min, max, estimate: (min + max) / 2, parseStatus: status, calculated: status !== "EXACT" };
}
export function parseShifts(raw: unknown): NumericParse {
  if (missing(raw)) return empty(raw);
  let text = clean(String(raw));
  if (["אין", "שש"].includes(text)) return result(raw, text === "אין" ? 0 : 6);
  const partial = text.match(/^(\d+) מלאות\s*\+\s*(\d+) חצי$/);
  if (partial) {
    const full = Number(partial[1]), half = Number(partial[2]);
    if (full + half > 31) return empty(raw, "INVALID");
    return { ...result(raw, full, full + half, "PARTIAL_EQUIVALENT"), estimate: full + half / 2 };
  }
  text = text.replace(/^(?:בממוצע|בערך)\s*/, "").replace(/\s*(?:בממוצע|ממוצע|~)$/, "");
  const match = text.match(/^(\d+(?:\.\d+)?)(?:\s*(?:-|עד)\s*(\d+(?:\.\d+)?))?$/);
  if (!match) return empty(raw);
  const min = Number(match[1]), max = Number(match[2] ?? match[1]);
  if (min > max || max > 31) return empty(raw, "INVALID");
  return result(raw, min, max);
}
export type HoursParse = NumericParse & { startMinutes: number | null; endMinutes: number | null };
function clock(text: string): number | null {
  const m = text.match(/^(\d{1,2})(?:[:.](\d{2}))?$/) ?? text.match(/^(\d{1,2})(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2] ?? 0);
  return h < 24 && min < 60 ? h * 60 + min : null;
}
export function parseHours(raw: unknown): HoursParse {
  const none = { ...empty(raw), startMinutes: null, endMinutes: null };
  if (missing(raw)) return none;
  const m = clean(String(raw)).match(/^(\d{1,4}(?:[:.]\d{2})?)\s*(?:-|עד)\s*(\d{1,4}(?:[:.]\d{2})?)$/);
  if (!m) return none;
  const startMinutes = clock(m[1]), endMinutes = clock(m[2]);
  if (startMinutes === null || endMinutes === null) return { ...none, parseStatus: "INVALID" };
  // Do not silently turn "8 עד 4" into a measured eight-hour day.
  if (endMinutes <= startMinutes) return { ...none, startMinutes };
  const hours = (endMinutes - startMinutes) / 60;
  if (startMinutes < 5 * 60 || startMinutes > 11 * 60 || hours < 3 || hours > 16) return { ...none, parseStatus: "INVALID" };
  return { ...result(raw, hours), calculated: true, startMinutes, endMinutes };
}
export type SalaryParse = NumericParse & { basis: "GROSS" | "NET" | "UNKNOWN"; currency: "ILS" | null; reportYear: number | null; basisSource: "COLUMN_HEADER" | "EXPLICIT" | "UNKNOWN" };
export function parseSalary(raw: unknown, reportYear: number | null): SalaryParse {
  const value = clean(String(raw ?? ""));
  const net = /נטו/.test(value), gross = /ברוטו/.test(value);
  const basis = net && gross ? "UNKNOWN" : net ? "NET" : value ? "GROSS" : "UNKNOWN";
  const base = { basis, currency: null, reportYear, basisSource: net || gross ? "EXPLICIT" : value ? "COLUMN_HEADER" : "UNKNOWN" } as const;
  if (missing(raw)) return { ...empty(raw), ...base };
  if (net && gross || /\$|דולר|יורו/.test(value)) return { ...empty(raw), ...base, basis: "UNKNOWN", basisSource: "UNKNOWN" };
  // Bare "18" and "23-24" have no explicit unit: retain as ambiguous.
  const numeric = value.replace(/ברוטו|נטו|ש[״"]ח|שקלים|₪/g, "").trim();
  const m = numeric.match(/^(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|אלף)?(?:\s*-\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|אלף)?)?$/i);
  if (!m) return { ...empty(raw), ...base };
  const unit = m[2] || m[4];
  const min = Number(m[1].replace(/,/g, "")) * (unit ? 1000 : 1);
  const max = m[3] ? Number(m[3].replace(/,/g, "")) * (unit ? 1000 : 1) : min;
  if (!unit && (min < 1000 || max < 1000)) return { ...empty(raw), ...base };
  if (min < 1000 || max > 100000 || min > max) return { ...empty(raw, "INVALID"), ...base };
  return { ...result(raw, min, max), ...base, currency: "ILS" };
}
export function parseLikert(raw: unknown): NumericParse {
  if (missing(raw)) return empty(raw);
  const match = clean(String(raw)).match(/^([1-5])(?:\s*-\s*(?:זוועה|חלום))?$/);
  if (!match) return empty(raw, "INVALID");
  return result(raw, Number(match[1]));
}
export const LIKERT_SCALE = {
  min: 1, max: 5, direction: "HIGHER_IS_BETTER",
  calm: ["נטחנים", "ישנים"], peers: ["מרפקים", "משפחה"], seniors: ["רודנים", "טיצ׳ינג חלומי"], family: ["מה זה בית", "באלאנס מושלם"],
} as const;
export const METRICS = {
  shifts: { label: "תורנויות בחודש", method: "MEDIAN", unit: "תורנויות" },
  calm: { label: "רוגע בתורנויות", method: "MEAN", unit: "מתוך 5" },
  peers: { label: "יחס בין המתמחים", method: "MEAN", unit: "מתוך 5" },
  seniors: { label: "יחס הבכירים", method: "MEAN", unit: "מתוך 5" },
  family: { label: "איזון עבודה־משפחה", method: "MEAN", unit: "מתוך 5" },
  hours: { label: "משך יום ללא תורנות", method: "MEDIAN", unit: "שעות" },
} as const;
export type MetricKey = keyof typeof METRICS;
export type Normalized = Record<MetricKey, NumericParse> & { salary: SalaryParse; scale: typeof LIKERT_SCALE };
export function tipRiskFlags(tip: string) {
  if (!tip.trim()) return [];
  const flags = ["HUMAN_REVIEW_REQUIRED"];
  if (/@|(?:\+?972|0[2-9])[\d\s-]{7,}|https?:\/\//i.test(tip)) flags.push("CONTACT_OR_LINK");
  if (/ד[״"׳']?ר|פרופ|מנהל|מנהלת|בכיר|בכירה/.test(tip)) flags.push("POSSIBLE_PERSON_REFERENCE");
  if (/מטופל|חולה|מקרה|אבחנ/.test(tip)) flags.push("POSSIBLE_PATIENT_INFORMATION");
  if (/הריון|בהריון|ילד|ילדה|יחיד|יחידה|בשנה|שנה ראשונה/.test(tip)) flags.push("POSSIBLE_SELF_IDENTIFICATION");
  if (/הטרד|השפל|אלימ|גזענ|רשלנ|התעמר/.test(tip)) flags.push("POSSIBLE_PERSONAL_ALLEGATION");
  return flags;
}
