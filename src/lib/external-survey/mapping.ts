import { clean } from "./parse";
export type CatalogItem = { id: string; name: string; slug: string; type?: string };
export type Catalog = { specialties: CatalogItem[]; institutions: CatalogItem[] };
export type Mapping = { kind: "SPECIALTY" | "INSTITUTION"; rawValue: string; targetId: string | null; category: string; confidence: number; matchStatus: "MATCHED" | "MISSING" | "AMBIGUOUS" | "UNMATCHED" | "MANUALLY_MATCHED"; rationale: string };
const key = (v: string) => clean(v).replace(/[״"׳']/g, "");
const specialtySlugs: Record<string, string> = {
  "אונקולוגיה": "oncology", "אורולוגיה": "urologic-surgery", "אורתופדיה": "orthopedic-surgery",
  "אף אוזן גרון": "ent-head-neck", "בריאות הציבור": "בריאות-הציבור", "גינקולוגיה": "obgyn",
  "גריאטריה": "geriatrics", "הרדמה": "anesthesiology", "ילדים": "pediatrics", "כירורגיה כללית": "general-surgery",
  "כירורגיית ילדים": "pediatric-surgery", "כירורגיית כלי דם": "vascular-surgery", "משפחה": "family-medicine",
  "נוירוכירורגיה": "neurosurgery", "נוירולוגיה": "neurology", "עור ומין": "dermatology", "עיניים": "ophthalmology",
  "פלסטיקה": "plastic-surgery", "פנימית": "internal-medicine", "פסיכיאטריה ילד ומתבגר": "child-psychiatry",
  "פסיכיאטריה של המבוגר": "psychiatry", "פתולוגיה": "diagnostic-pathology", "רדיולוגיה": "diagnostic-radiology",
  "רפואה דחופה": "emergency-medicine", "רפואה משפטית": "forensic-medicine", "רפואה תעסוקתית": "occupational-medicine",
  "שיקום": "רפואה-פיזיקלית-ושיקום", "כירורגיית בית חזה": "thoracic-surgery",
};
const institutionAliases: Array<[string, string[]]> = [
  ["sheba", ["שיבא", "תל השומר", "שיבא תל השומר", "שיבא/ספרא"]],
  ["rabin-beilinson", ["בילינסון", "בלינסון", "בילינסון (דוידוף)"]],
  ["rambam", ["רמבם", "ביהח עש הרמבם"]],
  ["galilee", ["נהריה", "גליל מערבי נהריה", "המרכז הרפואי לגליל"]],
  ["shamir", ["שמיר", "אסף הרופא", "אסף הרופא שמיר"]],
  ["ichilov", ["איכילוב"]], ["shaare-zedek", ["שערי צדק", "שעצ"]],
  ["meir", ["מאיר", "מאיר/כללית"]], ["kaplan", ["קפלן"]], ["carmel", ["כרמל"]],
  ["soroka", ["סורוקה", "סורוקה-כללית"]], ["emek", ["העמק", "העמק כללית", "בית חולים העמק"]],
  ["wolfson", ["וולפסון"]], ["ziv", ["זיו"]], ["bnai-zion", ["בני ציון"]],
  ["maayanei-hayeshua", ["מעייני הישועה", "מעיני הישועה"]],
  ["hillel-yaffe", ["הלל יפה", "הילל יפה"]], ["laniado", ["לניאדו"]], ["schneider", ["שניידר"]],
  ["poria", ["פוריה", "מרכז רפואי צפון (פוריה)"]], ["barzilai", ["ברזילי"]],
  ["assuta-ashdod", ["אסותא אשדוד"]], ["hadassah-ein-kerem", ["הדסה עין כרם"]],
  ["hadassah-mount-scopus", ["הדסה הר הצופים"]], ["nazareth-english", ["בית חולים אנגלי-נצרת"]],
  ["clalit", ["כללית", "כללית, מרכז"]], ["maccabi", ["מכבי"]], ["meuhedet", ["מאוחדת"]], ["leumit", ["לאומית"]],
  ["מרכז-לבהנ-גהה", ["גהה"]], ["מרכז-לבהנ-שלוותה", ["שלוותה"]],
  ["מרכז-לבהנ-אברבנאל", ["אברבנאל"]], ["מרכז-לבהנ-מעלה-הכרמל", ["מעלה הכרמל"]],
  ["מרכז-לבהנ-לב-השרון", ["לב השרון"]], ["מרכז-לבהנ-מזור", ["בית חולים מזור"]],
  ["מרחבים-המרכז-הרפואי-לטיפול-במוח-ובנפש-באר-יעקב-נס-ציונה", ["מרחבים באר יעקב נס ציונה"]],
  ["ביהח-לוינשטיין", ["לוינשטיין"]],
];
const aliasSlugs = new Map(institutionAliases.flatMap(([slug, aliases]) => aliases.map(alias => [key(alias), slug] as const)));
const ambiguous = new Set(["הדסה", "אסותא", "רבין", "ירושלים", "חיפה", "באר שבע", "צפון", "צרפתי", "אסף", "איתנים", "כפר שאול"]);
const generic = new Set(["כללית", "בית חולים של כללית", "בביח של הכללית", "ביחד גדול של הכללית", "ממשלתי", "ציבורי", "משרד הבריאות", "בית חולים ציבורי פריפרי", "בית חולים שלישוני במרכז"]);
export function mapValue(kind: Mapping["kind"], rawValue: string, catalog: Catalog): Mapping {
  const text = key(rawValue);
  const base: Mapping = { kind, rawValue, targetId: null, category: kind === "SPECIALTY" ? "SPECIALTY" : "UNKNOWN", confidence: 0, matchStatus: text ? "UNMATCHED" : "MISSING", rationale: "No unambiguous canonical identifier" };
  if (!text) return base;
  const items = kind === "SPECIALTY" ? catalog.specialties : catalog.institutions;
  const slug = kind === "SPECIALTY" ? specialtySlugs[text] : aliasSlugs.get(text);
  // Resolve explicit aliases to an existing ID; never create a canonical entity.
  const target = slug ? items.find(item => item.slug === slug) : undefined;
  if (target) return { ...base, targetId: target.id, category: target.type ?? "SPECIALTY", confidence: 0.99, matchStatus: "MATCHED", rationale: `Explicit alias to canonical slug ${target.slug}` };
  if (kind === "INSTITUTION" && (ambiguous.has(text) || generic.has(text))) return { ...base, category: text === "אסותא" || text === "רבין" || text === "הדסה" ? "NETWORK" : "UNSPECIFIED", matchStatus: "AMBIGUOUS", rationale: "Campus, hospital or institution cannot be determined" };
  const exact = items.filter(item => key(item.name) === text);
  if (exact.length === 1 && !slug) return { ...base, targetId: exact[0].id, category: exact[0].type ?? "SPECIALTY", confidence: 1, matchStatus: "MATCHED", rationale: "Unique exact canonical name" };
  return base;
}
export function resolveSpecialtyAliasId(id: string, catalog: Catalog): string {
  const item = catalog.specialties.find(s => s.id === id);
  const aliases: Record<string, string> = { "כירורגיה-פלסטית": "plastic-surgery", "פתולוגיה": "diagnostic-pathology", "פסיכיאטריה-של-הילד-והמתבגר": "child-psychiatry" };
  const slug = item && aliases[item.slug];
  return slug ? catalog.specialties.find(s => s.slug === slug)?.id ?? id : id;
}
