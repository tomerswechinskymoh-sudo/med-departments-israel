import { normalizeWhitespace } from "@/crawler/clalit/utils";

export type HospitalAlias = {
  slug: string;
  labels: string[];
  patterns: RegExp[];
  notes?: string;
};

export const hospitalAliasRegistry: HospitalAlias[] = [
  { slug: "ichilov", labels: ["איכילוב", "המרכז הרפואי תל אביב", "Tel Aviv Sourasky"], patterns: [/איכילוב/i, /סוראסקי/i, /תל אביב/i, /sourasky|ichilov|tasmc/i] },
  { slug: "hadassah", labels: ["הדסה", "Hadassah"], patterns: [/הדסה/i, /hadassah/i] },
  { slug: "rabin", labels: ["רבין", "בילינסון", "השרון", "Rabin", "Beilinson"], patterns: [/רבין|בילינסון|השרון/i, /rabin|beilinson/i] },
  { slug: "carmel", labels: ["כרמל", "Carmel"], patterns: [/כרמל/i, /carmel/i] },
  { slug: "soroka", labels: ["סורוקה", "Soroka"], patterns: [/סורוקה/i, /soroka/i] },
  { slug: "sheba", labels: ["שיבא", "תל השומר", "Sheba"], patterns: [/שיבא|תל השומר/i, /sheba/i] },
  { slug: "meir", labels: ["מאיר", "Meir"], patterns: [/מאיר/i, /meir/i] },
  { slug: "emek", labels: ["העמק", "Emek"], patterns: [/העמק/i, /emek/i] },
  { slug: "kaplan", labels: ["קפלן", "Kaplan"], patterns: [/קפלן/i, /kaplan/i] },
  { slug: "wolfson", labels: ["וולפסון", "Wolfson"], patterns: [/וולפסון/i, /wolfson/i] },
  { slug: "shaare-zedek", labels: ["שערי צדק", "Shaare Zedek"], patterns: [/שערי צדק/i, /shaare.?zedek|szmc/i] },
  { slug: "rambam", labels: ["רמב\"ם", "רמבם", "Rambam"], patterns: [/רמב.?ם/i, /rambam/i] },
  { slug: "yoseftal", labels: ["יוספטל", "Yoseftal"], patterns: [/יוספטל/i, /yoseftal|joseftal/i] },
  { slug: "beer-sheva-mental-health", labels: ["מרכז לבה\"נ באר שבע", "Beer Sheva Mental Health"], patterns: [/באר שבע.*(נפש|לב.?ה.?נ)|לב.?ה.?נ.*באר שבע/i, /beer.?sheva.*mental/i] },
  { slug: "bnei-zion", labels: ["בני ציון", "Bnei Zion"], patterns: [/בני ציון/i, /bnei.?zion/i] },
  { slug: "ziv", labels: ["זיו", "Ziv"], patterns: [/זיו/i, /ziv/i] },
  { slug: "assuta-ashdod", labels: ["אסותא אשדוד", "Assuta Ashdod"], patterns: [/אסותא אשדוד/i, /assuta.*ashdod/i] },
  { slug: "hillel-yaffe", labels: ["הלל יפה", "Hillel Yaffe"], patterns: [/הלל יפה/i, /hillel.?yaffe/i] },
  { slug: "barzilai", labels: ["ברזילי", "Barzilai"], patterns: [/ברזילי/i, /barzilai/i] },
  { slug: "poria", labels: ["פוריה", "פדה", "Poriya"], patterns: [/פוריה|פדה/i, /poria|poriya|padeh/i] },
  { slug: "nazareth-scottish", labels: ["הסקוטי", "Nazareth Scottish"], patterns: [/הסקוטי/i, /nazareth.*scottish/i] },
  { slug: "holy-family", labels: ["משפחה הקדושה", "Holy Family"], patterns: [/משפחה הקדושה/i, /holy.?family/i] },
  { slug: "saint-vincent", labels: ["סן ונסן", "הצרפתי", "Saint Vincent"], patterns: [/צרפתי|סן ונסן/i, /saint.?vincent/i] },
  { slug: "shamir", labels: ["שמיר", "אסף הרופא", "Shamir"], patterns: [/שמיר|אסף הרופא/i, /shamir/i] },
  { slug: "maayanei-hayeshua", labels: ["מעיני הישועה", "Maayanei Hayeshua"], patterns: [/מעיני הישועה/i, /maayanei|mayanei/i] },
  { slug: "galilee", labels: ["המרכז הרפואי לגליל", "Galilee"], patterns: [/לגליל/i, /galilee/i] },
  { slug: "laniado", labels: ["לניאדו", "Laniado"], patterns: [/לניאדו/i, /laniado/i] },
  { slug: "schneider", labels: ["שניידר", "Schneider"], patterns: [/שניידר/i, /schneider/i] },
  { slug: "geha", labels: ["גהה", "Geha"], patterns: [/גהה/i, /geha/i] },
  { slug: "shalvata", labels: ["שלוותה", "Shalvata"], patterns: [/שלוותה/i, /shalvata/i] },
  { slug: "maale-hacarmel", labels: ["מעלה הכרמל", "Maale Hacarmel"], patterns: [/מעלה הכרמל/i, /maale.?hacarmel/i] },
  { slug: "lev-hasharon", labels: ["לב השרון", "Lev Hasharon"], patterns: [/לב השרון/i, /lev.?hasharon/i] },
  { slug: "merhavim", labels: ["מרחבים", "Merhavim"], patterns: [/מרחבים/i, /merhavim/i] },
  { slug: "clalit-community", labels: ["שירותי בריאות כללית", "Clalit Community"], patterns: [/שירותי בריאות כללית|קופ.?ח כללית/i, /clalit/i] },
  { slug: "maccabi-health-services", labels: ["מכבי שירותי בריאות"], patterns: [/מכבי שירותי בריאות|קופ.?ח מכבי/i, /maccabi/i] },
  { slug: "leumit-health-fund", labels: ["קופ\"ח לאומית"], patterns: [/קופ.?ח לאומית|לאומית/i, /leumit/i] },
  { slug: "meuhedet-health-fund", labels: ["קופ\"ח מאוחדת"], patterns: [/קופ.?ח מאוחדת|מאוחדת/i, /meuhedet/i] },
  { slug: "asia-community-health-services", labels: ["אסיא שירותי בריאות קהילתיים"], patterns: [/אסיא.*בריאות קהילתיים/i] },
  { slug: "jerusalem-mental-health-kfar-shaul-eitanim", labels: ["כפר שאול ואיתנים"], patterns: [/כפר שאול|איתנים/i] },
  { slug: "abrabanel-mental-health", labels: ["אברבנאל"], patterns: [/אברבנאל/i] },
  { slug: "mazor-mental-health", labels: ["מזור"], patterns: [/מזור/i] },
  { slug: "shaar-menashe-mental-health", labels: ["שער מנשה"], patterns: [/שער מנשה/i] },
  { slug: "ramat-chen-brill-mental-health", labels: ["רמת חן ע\"ש בריל"], patterns: [/רמת חן|בריל/i] },
  { slug: "reuth-medical-center", labels: ["רעות"], patterns: [/רעות/i] },
  { slug: "herzog-medical-center", labels: ["הרצוג"], patterns: [/הרצוג/i] },
  { slug: "fliman-geriatric", labels: ["פלימן"], patterns: [/פלימן/i] },
  { slug: "beit-rivka-geriatric", labels: ["בית רבקה"], patterns: [/בית רבקה/i] },
  { slug: "shmuel-harofe-geriatric", labels: ["שמואל הרופא"], patterns: [/שמואל הרופא/i] },
  { slug: "neot-hamoshava-geriatric", labels: ["נאות המושבה"], patterns: [/נאות המושבה/i] },
  { slug: "herzfeld-geriatric", labels: ["הרצפלד"], patterns: [/הרצפלד/i] },
  { slug: "beit-balev-rishon-lezion", labels: ["בית בלב ראשון לציון"], patterns: [/בית בלב.*ראשון/i] },
  { slug: "netanya-geriatric", labels: ["גריאטרי נתניה"], patterns: [/גריאטרי נתניה/i] },
  { slug: "adi-negev-nahalat-eden", labels: ["עדי נגב - נחלת עדן"], patterns: [/עדי נגב|נחלת עדן/i] },
  { slug: "loewenstein-rehabilitation", labels: ["לוינשטיין"], patterns: [/לוינשטיין/i] },
  { slug: "forensic-medicine", labels: ["רפואה משפטית"], patterns: [/רפואה משפטית/i] },
  { slug: "shoham-geriatric", labels: ["גריאטרי שהם"], patterns: [/גריאטרי שהם|מ.?גריאטרי שהם/i] }
];

export function normalizeHospitalAliasInput(value: string) {
  return normalizeWhitespace(value)
    .replace(/[׳'״"]/g, "")
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/\b(המרכז|מרכז|הרפואי|בית|חולים|בי\"ח|ביהח|ע\"ש|עש)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveHospitalAlias(value: string) {
  const raw = value ?? "";
  const normalized = normalizeHospitalAliasInput(raw);
  const haystack = `${raw} ${normalized}`;
  return hospitalAliasRegistry.find((alias) => alias.patterns.some((pattern) => pattern.test(haystack))) ?? null;
}

export function slugForHospitalAlias(value: string) {
  return resolveHospitalAlias(value)?.slug ?? null;
}
