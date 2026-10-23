import { INSTITUTION_LOGO_REGISTRY } from "./institution-logo-registry";

export type HospitalLogoInput = {
  id?: string | null;
  /** Set at the data boundary after resolving the effective institution. Null means fallback. */
  brandingKey?: string | null;
  name?: string | null;
  slug?: string | null;
  type?: string | null;
  /** Kept for caller compatibility; arbitrary cover images are not institutional marks. */
  coverImageUrl?: string | null;
};

export type HospitalLogoDefinition = {
  filename: string;
  aliases: readonly string[];
  slugAliases?: readonly string[];
};

function publicLogoPath(filename: string) {
  return `/logos/hospitals/${filename.split("/").map(encodeURIComponent).join("/")}`;
}

/** Exact reviewed alias normalization. Do not strip institutional descriptors or match substrings. */
export function normalizeHospitalLogoKey(value?: string | null) {
  return (value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("he")
    .replace(/^\ufeff/, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[״“”]/g, '"')
    .replace(/[׳’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const recordsByKey = new Map(INSTITUTION_LOGO_REGISTRY.map((record) => [record.key, record]));
const keysBySlug = new Map(
  INSTITUTION_LOGO_REGISTRY.flatMap((record) =>
    record.slugAliases.map((slug) => [normalizeHospitalLogoKey(slug), record.key] as const)
  )
);
const keysByName = new Map(
  INSTITUTION_LOGO_REGISTRY.flatMap((record) =>
    record.nameAliases.map((name) => [normalizeHospitalLogoKey(name), record.key] as const)
  )
);
const keysByEffectiveId = new Map<string, string>(
  INSTITUTION_LOGO_REGISTRY.flatMap((record) =>
    record.nameAliases.map((name) => [`effective:${normalizeHospitalLogoKey(name)}`, record.key] as const)
  )
);

export const HOSPITAL_LOGO_DEFINITIONS: HospitalLogoDefinition[] = INSTITUTION_LOGO_REGISTRY.flatMap(
  (record) => record.filename ? [{
    filename: record.filename,
    aliases: record.nameAliases,
    slugAliases: record.slugAliases
  }] : []
);

export const HOSPITAL_LOGO_PATHS = [...new Set(
  HOSPITAL_LOGO_DEFINITIONS.map((definition) => publicLogoPath(definition.filename))
)];

/** For migration/import/query boundaries only. Renderers must use a stable identity. */
export function getReviewedInstitutionKeyByName(name?: string | null) {
  return keysByName.get(normalizeHospitalLogoKey(name)) ?? null;
}

function logoForKey(key: string | null, type?: HospitalLogoInput["type"]) {
  const record = key ? recordsByKey.get(key) : null;
  if (!record?.filename || (type && record.type !== type)) return null;
  return publicLogoPath(record.filename);
}

/** Compatibility helper for import verification; uses exact reviewed names only. */
export function getHospitalLogoByName(name?: string | null) {
  return logoForKey(getReviewedInstitutionKeyByName(name));
}

export function getHospitalLogoBySlug(slug?: string | null) {
  return logoForKey(keysBySlug.get(normalizeHospitalLogoKey(slug)) ?? null);
}

export function getInstitutionBrandingKey(institution: HospitalLogoInput) {
  if (institution.brandingKey !== undefined) {
    return institution.brandingKey && recordsByKey.has(institution.brandingKey)
      ? institution.brandingKey : null;
  }
  const id = normalizeHospitalLogoKey(institution.id);
  // Effective IDs outrank inherited campus slugs, including unknown effective IDs.
  if (id.startsWith("effective:")) return keysByEffectiveId.get(id) ?? null;
  if (recordsByKey.has(id)) return id;
  return keysBySlug.get(normalizeHospitalLogoKey(institution.slug)) ?? null;
}

/**
 * Call once when shaping public data. A reviewed effective name wins over a
 * source record's inherited campus slug. Unknown effective names remain neutral.
 */
export function getEffectiveInstitutionBrandingKey(
  institution: HospitalLogoInput,
  effectiveHospitalName?: string | null
) {
  if (effectiveHospitalName) return getReviewedInstitutionKeyByName(effectiveHospitalName);
  return getInstitutionBrandingKey(institution);
}

export function getHospitalLogo(institution: HospitalLogoInput) {
  return logoForKey(getInstitutionBrandingKey(institution), institution.type);
}

export function getHospitalInitials(name?: string | null) {
  const words = normalizeHospitalLogoKey(name)
    .replace(/^(?:בית החולים|בית חולים|ביה"ח|בי"ח|המרכז הרפואי|מרכז רפואי|קופת חולים|קופ"ח)\s+/, "")
    .split(" ").filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join("") || "מ";
}
