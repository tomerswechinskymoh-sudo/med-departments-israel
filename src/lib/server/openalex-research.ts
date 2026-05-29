import { Prisma, type PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

type AliasSet = {
  aliases: string[];
  keywords?: string[];
};

type RefreshInput = {
  departmentId: string;
  years: number[];
};

const OPENALEX_WORKS_URL = "https://api.openalex.org/works";
const DEFAULT_YEAR_WINDOW = 5;
const OPENALEX_PER_PAGE = 50;

const INSTITUTION_ALIASES: Record<string, string[]> = {
  "המרכז הרפואי ע\"ש חיים שיבא - תל השומר": ["Sheba Medical Center", "Chaim Sheba Medical Center", "Tel Hashomer"],
  "המרכז הרפואי תל אביב ע\"ש סוראסקי (איכילוב)": ["Tel Aviv Sourasky Medical Center", "Ichilov Hospital"],
  "רמב\"ם - הקריה הרפואית לבריאות האדם": ["Rambam Health Care Campus", "Rambam Medical Center"],
  "המרכז הרפואי האוניברסיטאי סורוקה": ["Soroka University Medical Center", "Soroka Medical Center"],
  "מרכז רפואי רבין - בילינסון": ["Rabin Medical Center", "Beilinson Hospital"],
  "מרכז רפואי רבין - השרון": ["Rabin Medical Center", "Hasharon Hospital"],
  "מרכז שניידר לרפואת ילדים בישראל": ["Schneider Children's Medical Center of Israel", "Schneider Children's Medical Center"],
  "הדסה עין כרם": ["Hadassah Ein Kerem", "Hadassah Medical Center"],
  "הדסה הר הצופים": ["Hadassah Mount Scopus", "Hadassah Medical Center"],
  "המרכז הרפואי שערי צדק": ["Shaare Zedek Medical Center"],
  "המרכז הרפואי שמיר": ["Shamir Medical Center", "Assaf Harofeh Medical Center"],
  "מרכז רפואי ברזילי": ["Barzilai Medical Center"],
  "בית החולים האוניברסיטאי אסותא אשדוד": ["Assuta Ashdod University Hospital", "Assuta Ashdod"],
  "המרכז הרפואי הלל יפה": ["Hillel Yaffe Medical Center"],
  "המרכז הרפואי לגליל": ["Galilee Medical Center"],
  "המרכז הרפואי זיו": ["Ziv Medical Center"],
  "המרכז הרפואי צפון - פוריה": ["Poriya Medical Center", "Baruch Padeh Medical Center"],
  "מרכז רפואי בני ציון": ["Bnai Zion Medical Center"],
  "המרכז הרפואי כרמל": ["Carmel Medical Center"],
  "מרכז רפואי העמק": ["Emek Medical Center"],
  "מרכז רפואי מאיר": ["Meir Medical Center"],
  "מרכז רפואי קפלן": ["Kaplan Medical Center"],
  "לניאדו - מרכז רפואי צאנז": ["Laniado Hospital", "Sanz Medical Center"],
  "מרכז רפואי מעיני הישועה": ["Mayanei Hayeshua Medical Center"],
  "בית החולים נצרת (האנגלי)": ["Nazareth Hospital EMMS", "English Hospital Nazareth"],
  "בית החולים המשפחה הקדושה": ["Holy Family Hospital Nazareth"],
  "בית החולים סן ונסן דה פול": ["Saint Vincent de Paul Hospital Nazareth"],
  "כללית": ["Clalit Health Services"],
  "שירותי בריאות כללית": ["Clalit Health Services"],
  "מכבי": ["Maccabi Healthcare Services"],
  "מכבי שירותי בריאות": ["Maccabi Healthcare Services"],
  "מאוחדת": ["Meuhedet Health Services"],
  "לאומית": ["Leumit Health Services"]
};

const SPECIALTY_ALIASES: Record<string, AliasSet> = {
  "אונקולוגיה": { aliases: ["oncology", "medical oncology", "radiation oncology"] },
  "הרדמה": { aliases: ["anesthesiology", "anaesthesia", "anesthesia"] },
  "יילוד וגינקולוגיה": { aliases: ["obstetrics", "gynecology", "obstetrics and gynecology"] },
  "כירורגיה אורולוגית": { aliases: ["urology", "urologic surgery"] },
  "כירורגיה אורתופדית": { aliases: ["orthopedics", "orthopaedics", "orthopedic surgery"] },
  "כירורגיה כללית": { aliases: ["general surgery", "surgery"] },
  "כירורגיה פלסטית ואסתטית": { aliases: ["plastic surgery", "reconstructive surgery"] },
  "מחלות א.א.ג וכירורגיה של ראש וצוואר": { aliases: ["otolaryngology", "head and neck surgery", "ENT"] },
  "מחלות עור ומין": { aliases: ["dermatology"] },
  "מחלות עיניים": { aliases: ["ophthalmology"] },
  "נוירולוגיה": { aliases: ["neurology"] },
  "פתולוגיה אבחנתית": { aliases: ["pathology", "diagnostic pathology"] },
  "רדיולוגיה אבחנתית": { aliases: ["radiology", "diagnostic imaging", "medical imaging"] },
  "רפואה דחופה": { aliases: ["emergency medicine"] },
  "רפואה פנימית": { aliases: ["internal medicine"] },
  "רפואת ילדים": { aliases: ["pediatrics", "paediatrics"] },
  "רפואת משפחה": { aliases: ["family medicine", "primary care"] },
  "פסיכיאטריה": { aliases: ["psychiatry"] },
  "פסיכיאטריה של הילד ומתבגר": { aliases: ["child psychiatry", "adolescent psychiatry", "child and adolescent psychiatry"] },
  "נוירוכירורגיה": { aliases: ["neurosurgery"] },
  "כירורגיה של בית החזה": { aliases: ["thoracic surgery", "cardiothoracic surgery"] },
  "כירורגית ילדים": { aliases: ["pediatric surgery", "paediatric surgery"] },
  "כירורגית כלי-דם": { aliases: ["vascular surgery"] },
  "גריאטריה": { aliases: ["geriatrics", "geriatric medicine"] },
  "קרדיולוגיה": { aliases: ["cardiology"] },
  "רפואה פיזיקלית ושיקום": { aliases: ["physical medicine", "rehabilitation medicine", "physiatry"] },
  "רפואה גרעינית": { aliases: ["nuclear medicine"] },
  "בריאות הציבור": { aliases: ["public health"] }
};

const INSTITUTION_ALIAS_RULES: Array<{ match: string[]; aliases: string[] }> = [
  { match: ["שיבא", "תל השומר"], aliases: ["Sheba Medical Center", "Chaim Sheba Medical Center", "Tel Hashomer"] },
  { match: ["איכילוב", "סוראסקי", "תא סוראסקי"], aliases: ["Tel Aviv Sourasky Medical Center", "Ichilov Hospital"] },
  { match: ["רמבם", "רמב\"ם"], aliases: ["Rambam Health Care Campus", "Rambam Medical Center"] },
  { match: ["סורוקה"], aliases: ["Soroka University Medical Center", "Soroka Medical Center"] },
  { match: ["רבין", "בילינסון", "השרון"], aliases: ["Rabin Medical Center", "Beilinson Hospital", "Hasharon Hospital"] },
  { match: ["שניידר"], aliases: ["Schneider Children's Medical Center of Israel", "Schneider Children's Medical Center"] },
  { match: ["הדסה", "עין כרם", "הר הצופים"], aliases: ["Hadassah Medical Center", "Hadassah Ein Kerem", "Hadassah Mount Scopus"] },
  { match: ["שערי צדק"], aliases: ["Shaare Zedek Medical Center"] },
  { match: ["שמיר", "אסף הרופא"], aliases: ["Shamir Medical Center", "Assaf Harofeh Medical Center"] },
  { match: ["ברזילי"], aliases: ["Barzilai Medical Center"] },
  { match: ["אסותא אשדוד"], aliases: ["Assuta Ashdod University Hospital", "Assuta Ashdod"] },
  { match: ["הלל יפה"], aliases: ["Hillel Yaffe Medical Center"] },
  { match: ["לגליל", "גליל"], aliases: ["Galilee Medical Center"] },
  { match: ["זיו", "צפת"], aliases: ["Ziv Medical Center"] },
  { match: ["פוריה", "ברוך פדה"], aliases: ["Poriya Medical Center", "Baruch Padeh Medical Center"] },
  { match: ["בני ציון"], aliases: ["Bnai Zion Medical Center"] },
  { match: ["כרמל"], aliases: ["Carmel Medical Center"] },
  { match: ["העמק"], aliases: ["Emek Medical Center"] },
  { match: ["מאיר"], aliases: ["Meir Medical Center"] },
  { match: ["קפלן"], aliases: ["Kaplan Medical Center"] },
  { match: ["לניאדו"], aliases: ["Laniado Hospital", "Sanz Medical Center"] },
  { match: ["מעיני הישועה"], aliases: ["Mayanei Hayeshua Medical Center"] },
  { match: ["וולפסון"], aliases: ["Wolfson Medical Center"] },
  { match: ["יוספטל"], aliases: ["Yoseftal Medical Center"] },
  { match: ["נצרת", "סקוטי", "אנגלי"], aliases: ["Nazareth Hospital EMMS", "English Hospital Nazareth"] },
  { match: ["משפחה הקדושה"], aliases: ["Holy Family Hospital Nazareth"] },
  { match: ["צרפתי", "סן ונסן"], aliases: ["Saint Vincent de Paul Hospital Nazareth", "French Hospital Nazareth"] },
  { match: ["כללית"], aliases: ["Clalit Health Services"] },
  { match: ["מכבי"], aliases: ["Maccabi Healthcare Services"] },
  { match: ["מאוחדת"], aliases: ["Meuhedet Health Services"] },
  { match: ["לאומית"], aliases: ["Leumit Health Services"] }
];

const SPECIALTY_ALIAS_RULES: Array<{ match: string[]; aliases: string[] }> = [
  { match: ["מינהל רפואי"], aliases: ["health administration", "hospital administration", "healthcare management"] },
  { match: ["אונקולוג"], aliases: ["oncology", "medical oncology", "radiation oncology"] },
  { match: ["הרדמה"], aliases: ["anesthesiology", "anaesthesia", "anesthesia"] },
  { match: ["גינקולוג", "יילוד"], aliases: ["obstetrics", "gynecology", "obstetrics and gynecology"] },
  { match: ["אורולוג"], aliases: ["urology", "urologic surgery"] },
  { match: ["אורתופד"], aliases: ["orthopedics", "orthopaedics", "orthopedic surgery"] },
  { match: ["כירורגיה כללית"], aliases: ["general surgery", "surgery"] },
  { match: ["פלסטית"], aliases: ["plastic surgery", "reconstructive surgery"] },
  { match: ["א.א.ג", "ראש וצוואר"], aliases: ["otolaryngology", "head and neck surgery", "ENT"] },
  { match: ["עור"], aliases: ["dermatology"] },
  { match: ["עיניים"], aliases: ["ophthalmology"] },
  { match: ["נוירולוג"], aliases: ["neurology"] },
  { match: ["נוירוכירורג"], aliases: ["neurosurgery"] },
  { match: ["פתולוג"], aliases: ["pathology", "diagnostic pathology"] },
  { match: ["רדיולוג"], aliases: ["radiology", "diagnostic imaging", "medical imaging"] },
  { match: ["דחופה"], aliases: ["emergency medicine"] },
  { match: ["פנימית"], aliases: ["internal medicine"] },
  { match: ["ילדים"], aliases: ["pediatrics", "paediatrics"] },
  { match: ["משפחה"], aliases: ["family medicine", "primary care"] },
  { match: ["פסיכיאטריה של הילד", "מתבגר"], aliases: ["child psychiatry", "adolescent psychiatry", "child and adolescent psychiatry"] },
  { match: ["פסיכיאטר"], aliases: ["psychiatry"] },
  { match: ["בית החזה"], aliases: ["thoracic surgery", "cardiothoracic surgery"] },
  { match: ["כלי-דם", "כלי דם"], aliases: ["vascular surgery"] },
  { match: ["גריאטר"], aliases: ["geriatrics", "geriatric medicine"] },
  { match: ["קרדיולוג"], aliases: ["cardiology"] },
  { match: ["שיקום", "פיזיקלית"], aliases: ["physical medicine", "rehabilitation medicine", "physiatry"] },
  { match: ["גרעינית"], aliases: ["nuclear medicine"] },
  { match: ["בריאות הציבור"], aliases: ["public health"] }
];

function jsonValue(value: unknown) {
  return value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function stringArrayFromJson(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeAliasKey(value: string) {
  return value
    .toLocaleLowerCase("he")
    .replace(/[״"׳']/g, "")
    .replace(/[-–—()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ruleAliases(
  value: string,
  rules: Array<{ match: string[]; aliases: string[] }>
) {
  const normalized = normalizeAliasKey(value);

  return rules.flatMap((rule) =>
    rule.match.some((token) => normalized.includes(normalizeAliasKey(token))) ? rule.aliases : []
  );
}

function dictionaryAliases(value: string, dictionary: Record<string, string[]>) {
  const normalized = normalizeAliasKey(value);
  const direct = dictionary[value] ?? dictionary[normalized];
  if (direct) return direct;

  const match = Object.entries(dictionary).find(([key]) => {
    const normalizedKey = normalizeAliasKey(key);
    return normalized === normalizedKey || normalized.includes(normalizedKey) || normalizedKey.includes(normalized);
  });

  return match?.[1] ?? [];
}

function specialtyDictionaryAliases(value: string) {
  const normalized = normalizeAliasKey(value);
  const direct = SPECIALTY_ALIASES[value] ?? SPECIALTY_ALIASES[normalized];
  if (direct) return direct;

  const match = Object.entries(SPECIALTY_ALIASES).find(([key]) => {
    const normalizedKey = normalizeAliasKey(key);
    return normalized === normalizedKey || normalized.includes(normalizedKey) || normalizedKey.includes(normalized);
  });

  return match?.[1] ?? null;
}

function defaultYears() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: DEFAULT_YEAR_WINDOW }, (_, index) => currentYear - index).sort();
}

async function dbMapping(db: DbClient, entityType: "INSTITUTION" | "SPECIALTY", hebrewName: string) {
  const mapping = await db.openAlexAliasMapping.findUnique({
    where: {
      entityType_hebrewName: {
        entityType,
        hebrewName
      }
    }
  });

  if (!mapping) return null;

  return {
    aliases: stringArrayFromJson(mapping.aliasesJson),
    keywords: stringArrayFromJson(mapping.keywordsJson)
  };
}

export async function resolveOpenAlexAliases(
  db: DbClient,
  input: {
    institutionName: string;
    specialtyName: string;
  }
) {
  const [institutionDb, specialtyDb] = await Promise.all([
    dbMapping(db, "INSTITUTION", input.institutionName),
    dbMapping(db, "SPECIALTY", input.specialtyName)
  ]);
  const institutionAliases = uniqueStrings([
    ...(institutionDb?.aliases ?? []),
    ...dictionaryAliases(input.institutionName, INSTITUTION_ALIASES),
    ...ruleAliases(input.institutionName, INSTITUTION_ALIAS_RULES)
  ]);
  const specialtyDefaults = specialtyDictionaryAliases(input.specialtyName);
  const specialtyAliases = uniqueStrings([
    ...(specialtyDb?.aliases ?? []),
    ...(specialtyDb?.keywords ?? []),
    ...(specialtyDefaults?.aliases ?? []),
    ...(specialtyDefaults?.keywords ?? []),
    ...ruleAliases(input.specialtyName, SPECIALTY_ALIAS_RULES)
  ]);

  return {
    institutionAliases,
    specialtyAliases,
    needsMapping: institutionAliases.length === 0 || specialtyAliases.length === 0
  };
}

async function queryOpenAlex(input: {
  hospitalAlias: string;
  specialtyAlias: string;
  year: number;
}) {
  const query = `${input.hospitalAlias} ${input.specialtyAlias}`;
  const url = new URL(OPENALEX_WORKS_URL);
  url.searchParams.set(
    "filter",
    `from_publication_date:${input.year}-01-01,to_publication_date:${input.year}-12-31`
  );
  url.searchParams.set("search", query);
  url.searchParams.set("per_page", String(OPENALEX_PER_PAGE));
  url.searchParams.set("sort", "cited_by_count:desc");
  if (process.env.OPENALEX_MAILTO) {
    url.searchParams.set("mailto", process.env.OPENALEX_MAILTO);
  }

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "med-departments-israel/1.0 (OpenAlex research metrics)"
    }
  });

  if (!response.ok) {
    throw new Error(`OpenAlex request failed (${response.status}).`);
  }

  const payload = (await response.json()) as {
    meta?: { count?: number };
    results?: Array<{
      id?: string;
      display_name?: string;
      publication_year?: number;
      cited_by_count?: number;
    }>;
  };
  const citedByCounts = (payload.results ?? [])
    .map((work) => (typeof work.cited_by_count === "number" ? work.cited_by_count : 0))
    .sort((left, right) => right - left);
  const hIndexEstimate = citedByCounts.reduce(
    (hIndex, citations, index) => (citations >= index + 1 ? index + 1 : hIndex),
    0
  );

  return {
    query,
    count: typeof payload.meta?.count === "number" ? payload.meta.count : 0,
    hIndexEstimate,
    raw: {
      meta: payload.meta,
      hIndexEstimate,
      sampleSize: citedByCounts.length,
      topWorks: (payload.results ?? []).slice(0, 10).map((work) => ({
        id: work.id,
        title: work.display_name,
        year: work.publication_year,
        citedByCount: work.cited_by_count ?? 0
      }))
    }
  };
}

function confidenceForCount(count: number, aliases: { institutionAliases: string[]; specialtyAliases: string[] }) {
  if (aliases.institutionAliases.length === 0 || aliases.specialtyAliases.length === 0) return 0.1;
  if (count === 0) return 0.45;
  if (count > 400) return 0.35;
  if (count > 180) return 0.5;
  return 0.72;
}

async function upsertNeedsMapping(db: DbClient, departmentId: string, year: number, warnings: string[]) {
  return db.departmentResearchMetric.upsert({
    where: {
      departmentId_year_source: {
        departmentId,
        year,
        source: "OpenAlex"
      }
    },
    create: {
      departmentId,
      year,
      source: "OpenAlex",
      publicationsCount: null,
      queryUsed: null,
      confidenceScore: 0.1,
      needsMapping: true,
      warningsJson: jsonValue(warnings)
    },
    update: {
      publicationsCount: null,
      queryUsed: null,
      confidenceScore: 0.1,
      needsMapping: true,
      isAmbiguous: false,
      warningsJson: jsonValue(warnings)
    }
  });
}

export async function refreshOpenAlexDepartmentMetrics(
  db: DbClient,
  input: Partial<RefreshInput> & { departmentId: string }
) {
  const years = input.years?.length ? input.years : defaultYears();
  const department = await db.department.findUnique({
    where: { id: input.departmentId },
    include: {
      institution: true,
      specialty: true
    }
  });

  if (!department) {
    throw new Error("המחלקה לא נמצאה.");
  }

  const aliases = await resolveOpenAlexAliases(db, {
    institutionName: department.institution.name,
    specialtyName: department.specialty.name
  });
  const warnings: string[] = [];

  if (aliases.institutionAliases.length === 0) {
    warnings.push(`חסר מיפוי OpenAlex למוסד: ${department.institution.name}`);
  }
  if (aliases.specialtyAliases.length === 0) {
    warnings.push(`חסר מיפוי OpenAlex לתחום: ${department.specialty.name}`);
  }

  if (aliases.needsMapping) {
    const metrics = [];
    for (const year of years) {
      metrics.push(await upsertNeedsMapping(db, department.id, year, warnings));
    }
    return { departmentId: department.id, metrics, needsMapping: true };
  }

  const hospitalAlias = aliases.institutionAliases[0];
  const specialtyAlias = aliases.specialtyAliases[0];
  const metrics = [];

  for (const year of years) {
    const result = await queryOpenAlex({
      hospitalAlias,
      specialtyAlias,
      year
    });
    const confidenceScore = confidenceForCount(result.count, aliases);
    const isAmbiguous = confidenceScore < 0.55 && result.count > 0;
    const queryUsed = JSON.stringify({
      query: result.query,
      year,
      count: result.count,
      hIndexEstimate: result.hIndexEstimate,
      institutionAliases: aliases.institutionAliases,
      specialtyAliases: aliases.specialtyAliases
    });

    metrics.push(await db.departmentResearchMetric.upsert({
      where: {
        departmentId_year_source: {
          departmentId: department.id,
          year,
          source: "OpenAlex"
        }
      },
      create: {
        departmentId: department.id,
        year,
        publicationsCount: result.count,
        source: "OpenAlex",
        queryUsed,
        confidenceScore,
        needsMapping: false,
        isAmbiguous,
        rawResponseJson: jsonValue(result.raw),
        warningsJson: jsonValue(isAmbiguous ? ["התוצאה רחבה או עמומה, יש להתייחס כפעילות מחקרית משוערת בלבד."] : [])
      },
      update: {
        publicationsCount: result.count,
        queryUsed,
        confidenceScore,
        needsMapping: false,
        isAmbiguous,
        rawResponseJson: jsonValue(result.raw),
        warningsJson: jsonValue(isAmbiguous ? ["התוצאה רחבה או עמומה, יש להתייחס כפעילות מחקרית משוערת בלבד."] : [])
      }
    }));
  }

  return { departmentId: department.id, metrics, needsMapping: false };
}

export async function getOpenAlexMappingStatus(db: DbClient, limit = 24) {
  const departments = await db.department.findMany({
    where: {
      importStableKey: {
        not: null
      }
    },
    include: {
      institution: true,
      specialty: true,
      researchMetrics: {
        where: {
          source: "OpenAlex"
        },
        orderBy: {
          lastUpdated: "desc"
        },
        take: 1
      }
    },
    orderBy: [{ institution: { name: "asc" } }, { name: "asc" }],
    take: limit
  });

  const rows = [];

  for (const department of departments) {
    const aliases = await resolveOpenAlexAliases(db, {
      institutionName: department.institution.name,
      specialtyName: department.specialty.name
    });
    const latestMetric = department.researchMetrics[0] ?? null;

    rows.push({
      departmentId: department.id,
      departmentName: department.name,
      institutionName: department.institution.name,
      specialtyName: department.specialty.name,
      needsMapping: aliases.needsMapping,
      lowConfidence:
        typeof latestMetric?.confidenceScore === "number" &&
        latestMetric.confidenceScore < 0.55,
      latestMetric
    });
  }

  return rows;
}
