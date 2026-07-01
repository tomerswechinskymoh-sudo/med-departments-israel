export const CANONICAL_PUBLIC_REGIONS = ["מרכז", "צפון", "דרום", "ירושלים", "חיפה"] as const;

export type CanonicalPublicRegion = (typeof CANONICAL_PUBLIC_REGIONS)[number];

function normalizeRegionText(value?: string | null) {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/^\ufeff/, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[״"׳'`]/g, "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function compactRegionText(value?: string | null) {
  return normalizeRegionText(value).replace(/[\s./\\_\-–—]/g, "");
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function normalizePublicRegion(region?: string | null): CanonicalPublicRegion | null {
  const normalized = normalizeRegionText(region);
  if (!normalized) return null;

  if (normalized.includes("שרון") || normalized.includes("שפלה")) {
    return "מרכז";
  }

  return CANONICAL_PUBLIC_REGIONS.find((canonical) => normalized.includes(canonical)) ?? null;
}

export function inferRegionFromCity(city?: string | null): CanonicalPublicRegion {
  const normalized = normalizeRegionText(city);

  if (includesAny(normalized, ["חיפה"])) {
    return "חיפה";
  }

  if (includesAny(normalized, ["ירושלים"])) {
    return "ירושלים";
  }

  if (includesAny(normalized, ["באר שבע", "אשקלון", "אילת", "אשדוד"])) {
    return "דרום";
  }

  if (includesAny(normalized, ["נהריה", "צפת", "טבריה", "עפולה", "נצרת"])) {
    return "צפון";
  }

  return "מרכז";
}

export function inferRegionFromInstitutionName(name?: string | null): CanonicalPublicRegion | null {
  const normalized = normalizeRegionText(name);
  const compact = compactRegionText(name);

  if (!normalized) {
    return null;
  }

  if (includesAny(compact, ["איממס", "סקוטי", "המשפחההקדושה"])) {
    return "צפון";
  }

  if (includesAny(compact, ["מאיר", "קפלן"])) {
    return "מרכז";
  }

  if (includesAny(normalized, ["אסותא אשדוד", "אשדוד", "סורוקה", "ברזילי", "יוספטל", "באר שבע", "אשקלון", "אילת", "עדי נגב"])) {
    return "דרום";
  }

  if (includesAny(normalized, ["רמב", "כרמל", "בני ציון", "פלימן", "מעלה הכרמל"])) {
    return "חיפה";
  }

  if (includesAny(normalized, ["הדסה", "שערי צדק", "ירושלים", "הרצוג", "כפר שאול", "איתנים"])) {
    return "ירושלים";
  }

  if (includesAny(normalized, ["זיו", "גליל", "פוריה", "נצרת", "העמק", "עפולה", "מזור"])) {
    return "צפון";
  }

  return null;
}

export function resolveCanonicalInstitutionRegion(institution: {
  name?: string | null;
  city?: string | null;
  region?: string | null;
}): CanonicalPublicRegion {
  return (
    inferRegionFromInstitutionName(institution.name) ??
    normalizePublicRegion(institution.region) ??
    inferRegionFromCity(institution.city)
  );
}
