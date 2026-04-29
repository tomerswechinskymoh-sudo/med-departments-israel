import { InstitutionType, Prisma, PrismaClient } from "@prisma/client";
import { formatDepartmentDisplayName } from "@/lib/utils";

type DbClient = PrismaClient | Prisma.TransactionClient;

type InstitutionCatalogItem = {
  slug: string;
  name: string;
  type: InstitutionType;
  city: string | null;
  summary: string;
};

type SpecialtyCatalogItem = {
  slug: string;
  name: string;
  description: string;
};

export const INSTITUTION_CATALOG: InstitutionCatalogItem[] = [
  {
    slug: "sheba",
    name: "המרכז הרפואי ע\"ש חיים שיבא - תל השומר",
    type: InstitutionType.HOSPITAL,
    city: "רמת גן",
    summary: "מרכז רפואי גדול עם פעילות שלישונית, הוראה ומחקר."
  },
  {
    slug: "ichilov",
    name: "המרכז הרפואי תל אביב ע\"ש סוראסקי (איכילוב)",
    type: InstitutionType.HOSPITAL,
    city: "תל אביב-יפו",
    summary: "מרכז עירוני גדול עם עומס קליני, מרפאות ותשתית אקדמית."
  },
  {
    slug: "wolfson",
    name: "המרכז הרפואי ע\"ש אדית וולפסון",
    type: InstitutionType.HOSPITAL,
    city: "חולון",
    summary: "בית חולים אזורי עם חשיפה טובה לעבודה יומיומית וממשק קהילתי."
  },
  {
    slug: "hillel-yaffe",
    name: "המרכז הרפואי הלל יפה",
    type: InstitutionType.HOSPITAL,
    city: "חדרה",
    summary: "מרכז רפואי אזורי עם קצב עבודה טוב ולמידה hands-on."
  },
  {
    slug: "rambam",
    name: "רמב\"ם - הקריה הרפואית לבריאות האדם",
    type: InstitutionType.HOSPITAL,
    city: "חיפה",
    summary: "מרכז רפואי מוביל בצפון עם מחקר, הוראה ורפואה מורכבת."
  },
  {
    slug: "bnai-zion",
    name: "מרכז רפואי בני ציון",
    type: InstitutionType.HOSPITAL,
    city: "חיפה",
    summary: "בית חולים עירוני עם מחלקות מגוונות ותחושת צוות קרובה."
  },
  {
    slug: "galilee",
    name: "המרכז הרפואי לגליל",
    type: InstitutionType.HOSPITAL,
    city: "נהריה",
    summary: "מרכז רפואי צפוני עם אחריות אזורית רחבה."
  },
  {
    slug: "ziv",
    name: "המרכז הרפואי זיו",
    type: InstitutionType.HOSPITAL,
    city: "צפת",
    summary: "בית חולים אזורי עם חשיפה לעבודה מגוונת בצפון."
  },
  {
    slug: "poria",
    name: "המרכז הרפואי צפון - פוריה",
    type: InstitutionType.HOSPITAL,
    city: "טבריה",
    summary: "מרכז רפואי בצפון-מזרח עם סבבים מגוונים ואחריות אזורית."
  },
  {
    slug: "barzilai",
    name: "מרכז רפואי ברזילי",
    type: InstitutionType.HOSPITAL,
    city: "אשקלון",
    summary: "מרכז רפואי דרומי עם עומס קליני וחשיפה רחבה לרפואה דחופה."
  },
  {
    slug: "shamir",
    name: "המרכז הרפואי שמיר",
    type: InstitutionType.HOSPITAL,
    city: "באר יעקב",
    summary: "בית חולים גדול במרכז עם מגוון מחלקות ופעילות אקדמית."
  },
  {
    slug: "soroka",
    name: "המרכז הרפואי האוניברסיטאי סורוקה",
    type: InstitutionType.HOSPITAL,
    city: "באר שבע",
    summary: "מרכז רפואי אוניברסיטאי גדול עם אחריות קלינית רחבה."
  },
  {
    slug: "rabin-beilinson",
    name: "מרכז רפואי רבין - בילינסון",
    type: InstitutionType.HOSPITAL,
    city: "פתח תקווה",
    summary: "מרכז שלישוני מרכזי עם מחלקות חזקות ותשתית הוראה מפותחת."
  },
  {
    slug: "rabin-hasharon",
    name: "מרכז רפואי רבין - השרון",
    type: InstitutionType.HOSPITAL,
    city: "פתח תקווה",
    summary: "בית חולים עם מחלקות אשפוז ופעילות אזורית במרכז."
  },
  {
    slug: "schneider",
    name: "מרכז שניידר לרפואת ילדים בישראל",
    type: InstitutionType.HOSPITAL,
    city: "פתח תקווה",
    summary: "מרכז על-אזורי לילדים עם פעילות קלינית ייחודית."
  },
  {
    slug: "carmel",
    name: "המרכז הרפואי כרמל",
    type: InstitutionType.HOSPITAL,
    city: "חיפה",
    summary: "בית חולים עירוני-אקדמי עם דגש על הוראה ולמידה מסודרת."
  },
  {
    slug: "emek",
    name: "מרכז רפואי העמק",
    type: InstitutionType.HOSPITAL,
    city: "עפולה",
    summary: "מרכז רפואי אזורי עם חשיפה למקרים מגוונים בצפון."
  },
  {
    slug: "meir",
    name: "מרכז רפואי מאיר",
    type: InstitutionType.HOSPITAL,
    city: "כפר סבא",
    summary: "מרכז רפואי עם שילוב בין אשפוז, קהילה והוראה."
  },
  {
    slug: "kaplan",
    name: "מרכז רפואי קפלן",
    type: InstitutionType.HOSPITAL,
    city: "רחובות",
    summary: "מרכז רפואי אזורי עם חשיפה טובה לפנימית, נשים ודחופה."
  },
  {
    slug: "yoseftal",
    name: "המרכז הרפואי יוספטל",
    type: InstitutionType.HOSPITAL,
    city: "אילת",
    summary: "בית חולים אזורי בדרום עם סביבה קומפקטית ואחריות רחבה."
  },
  {
    slug: "hadassah-ein-kerem",
    name: "הדסה עין כרם",
    type: InstitutionType.HOSPITAL,
    city: "ירושלים",
    summary: "בית חולים אוניברסיטאי עם פעילות רב-תחומית והכשרה קלינית רחבה."
  },
  {
    slug: "hadassah-mount-scopus",
    name: "הדסה הר הצופים",
    type: InstitutionType.HOSPITAL,
    city: "ירושלים",
    summary: "מרכז רפואי ירושלמי עם סבבים ממוקדים וסביבה רב-תחומית."
  },
  {
    slug: "shaare-zedek",
    name: "המרכז הרפואי שערי צדק",
    type: InstitutionType.HOSPITAL,
    city: "ירושלים",
    summary: "בית חולים גדול עם הוראה, עומס עבודה ותרבות צוות מגובשת."
  },
  {
    slug: "laniado",
    name: "לניאדו - מרכז רפואי צאנז",
    type: InstitutionType.HOSPITAL,
    city: "נתניה",
    summary: "בית חולים אזורי עם תחושת צוות ולמידה צמודה."
  },
  {
    slug: "assuta-ashdod",
    name: "בית החולים האוניברסיטאי אסותא אשדוד",
    type: InstitutionType.HOSPITAL,
    city: "אשדוד",
    summary: "מרכז רפואי חדש יחסית עם שילוב בין דחופה, אשפוז ורפואה רב-תחומית."
  },
  {
    slug: "maayanei-hayeshua",
    name: "מרכז רפואי מעיני הישועה",
    type: InstitutionType.HOSPITAL,
    city: "בני ברק",
    summary: "מרכז רפואי אזורי עם אווירה קהילתית ואוכלוסייה מגוונת."
  },
  {
    slug: "nazareth-english",
    name: "בית החולים נצרת (האנגלי)",
    type: InstitutionType.HOSPITAL,
    city: "נצרת",
    summary: "בית חולים אזורי בצפון עם פעילות אשפוז ורפואה פנימית."
  },
  {
    slug: "holy-family",
    name: "בית החולים המשפחה הקדושה",
    type: InstitutionType.HOSPITAL,
    city: "נצרת",
    summary: "בית חולים אזורי עם סביבה אינטימית ועבודה קלינית מגוונת."
  },
  {
    slug: "saint-vincent",
    name: "בית החולים סן ונסן דה פול",
    type: InstitutionType.HOSPITAL,
    city: "נצרת",
    summary: "מרכז רפואי בצפון עם פעילות קהילתית ואשפוזית."
  },
  {
    slug: "clalit",
    name: "כללית",
    type: InstitutionType.HMO,
    city: "ארצי",
    summary: "מערך קהילה רחב עם דגש על רפואת משפחה ורצף טיפולי."
  },
  {
    slug: "maccabi",
    name: "מכבי",
    type: InstitutionType.HMO,
    city: "ארצי",
    summary: "קופת חולים עם מסגרות קהילה ורפואת משפחה."
  },
  {
    slug: "meuhedet",
    name: "מאוחדת",
    type: InstitutionType.HMO,
    city: "ארצי",
    summary: "מערך קהילה עם דגש על רפואת משפחה ושירותי המשך."
  },
  {
    slug: "leumit",
    name: "לאומית",
    type: InstitutionType.HMO,
    city: "ארצי",
    summary: "מסגרות קהילה עם חיבור טוב לרפואת משפחה."
  }
];

export const SPECIALTY_CATALOG: SpecialtyCatalogItem[] = [
  { slug: "oncology", name: "אונקולוגיה", description: "מחלקה עם טיפול אונקולוגי, אשפוז ומרפאות." },
  { slug: "anesthesiology", name: "הרדמה", description: "חדרי ניתוח, בטיחות מטופל וטיפול פרוצדורלי." },
  { slug: "obgyn", name: "יילוד וגינקולוגיה", description: "חדרי לידה, גינקולוגיה ואשפוז נשים." },
  { slug: "urologic-surgery", name: "כירורגיה אורולוגית", description: "ניתוחים, מרפאות ופרוצדורות אורולוגיות." },
  { slug: "orthopedic-surgery", name: "כירורגיה אורתופדית", description: "טראומה, חדרי ניתוח ומחלקת אשפוז אורתופדית." },
  { slug: "general-surgery", name: "כירורגיה כללית", description: "אשפוז כירורגי, חדרי ניתוח וייעוצים." },
  {
    slug: "plastic-surgery",
    name: "כירורגיה פלסטית ואסתטית",
    description: "שחזורים, פרוצדורות וטיפול ניתוחי ממוקד."
  },
  {
    slug: "ent-head-neck",
    name: "מחלות א.א.ג וכירורגיה של ראש וצוואר",
    description: "מרפאות, ניתוחים ופרוצדורות א.א.ג."
  },
  { slug: "dermatology", name: "מחלות עור ומין", description: "מרפאות, אבחון וטיפול דרמטולוגי." },
  { slug: "ophthalmology", name: "מחלות עיניים", description: "מרפאות, חדרי ניתוח ופרוצדורות עיניים." },
  { slug: "neurology", name: "נוירולוגיה", description: "אשפוז, מרפאות וייעוצים נוירולוגיים." },
  {
    slug: "diagnostic-pathology",
    name: "פתולוגיה אבחנתית",
    description: "אבחון רקמות, מעבדות וחשיבה מערכתית."
  },
  {
    slug: "diagnostic-radiology",
    name: "רדיולוגיה אבחנתית",
    description: "פענוח הדמיה, CT, MRI ועבודה רב-תחומית."
  },
  { slug: "emergency-medicine", name: "רפואה דחופה", description: "מיון, triage וקבלת החלטות מהירה." },
  { slug: "internal-medicine", name: "רפואה פנימית", description: "אשפוז, קבלות וחשיבה קלינית פנימית." },
  { slug: "pediatrics", name: "רפואת ילדים", description: "ילדים, משפחות ואשפוז ילדים." },
  { slug: "family-medicine", name: "רפואת משפחה", description: "רפואת קהילה, מניעה והמשכיות טיפול." },
  { slug: "psychiatry", name: "פסיכיאטריה", description: "בריאות הנפש, אשפוז, מרפאות ועבודה רב-מקצועית." },
  {
    slug: "child-psychiatry",
    name: "פסיכיאטריה של הילד ומתבגר",
    description: "טיפול נפשי בילדים ובני נוער במסגרת רב-תחומית."
  },
  { slug: "neurosurgery", name: "נוירוכירורגיה", description: "ניתוחים נוירוכירורגיים וטיפול בחולים מורכבים." },
  { slug: "thoracic-surgery", name: "כירורגיה של בית החזה", description: "ניתוחי חזה, ריאות ועבודה פרוצדורלית." },
  { slug: "pediatric-surgery", name: "כירורגית ילדים", description: "ניתוחים בילדים ועבודה עם יחידות ילדים." },
  { slug: "vascular-surgery", name: "כירורגית כלי-דם", description: "ניתוחי כלי דם, ייעוצים ופעילות אנדוסקולרית." },
  { slug: "geriatrics", name: "גריאטריה", description: "רפואה למבוגרים, שיקום ומורכבות תפקודית." }
];

export const DEFAULT_HOSPITAL_SPECIALTY_SLUGS = [
  "oncology",
  "anesthesiology",
  "obgyn",
  "urologic-surgery",
  "orthopedic-surgery",
  "general-surgery",
  "plastic-surgery",
  "ent-head-neck",
  "dermatology",
  "ophthalmology",
  "neurology",
  "diagnostic-pathology",
  "diagnostic-radiology",
  "emergency-medicine",
  "internal-medicine",
  "pediatrics"
] as const;

const OPTIONAL_HOSPITAL_SPECIALTY_SLUGS_BY_INSTITUTION: Record<string, string[]> = {
  sheba: ["psychiatry", "child-psychiatry", "neurosurgery", "thoracic-surgery", "vascular-surgery", "geriatrics"],
  ichilov: ["psychiatry", "child-psychiatry", "neurosurgery", "thoracic-surgery", "vascular-surgery"],
  rambam: ["psychiatry", "child-psychiatry", "neurosurgery", "thoracic-surgery", "vascular-surgery"],
  "hadassah-ein-kerem": ["psychiatry", "child-psychiatry", "neurosurgery", "vascular-surgery", "pediatric-surgery"],
  soroka: ["psychiatry", "child-psychiatry", "neurosurgery", "thoracic-surgery", "vascular-surgery", "geriatrics"],
  "rabin-beilinson": ["psychiatry", "neurosurgery", "thoracic-surgery", "vascular-surgery", "geriatrics"],
  "shaare-zedek": ["psychiatry", "child-psychiatry", "vascular-surgery"],
  schneider: ["pediatric-surgery"],
  meir: ["geriatrics"],
  carmel: ["geriatrics"],
  emek: ["geriatrics"],
  kaplan: ["geriatrics"],
  galilee: ["psychiatry", "geriatrics"],
  barzilai: ["psychiatry"],
  shamir: ["neurosurgery", "vascular-surgery", "geriatrics"]
};

const INSTITUTION_SPECIALTY_OVERRIDES: Record<string, string[]> = {
  schneider: ["pediatrics", "pediatric-surgery", "anesthesiology", "diagnostic-radiology"]
};

export function slugifyValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/["'׳״]/g, "")
    .replace(/[()]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export function normalizeCatalogLookupValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/["'׳״]/g, "")
    .replace(/[()]/g, "")
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ");
}

export function buildDepartmentSlug(input: {
  institutionSlug: string;
  specialtySlug: string;
  departmentName: string;
}) {
  const normalizedDepartmentName = slugifyValue(input.departmentName);
  const normalizedSpecialtyName = slugifyValue(input.specialtySlug);

  if (normalizedDepartmentName === normalizedSpecialtyName || normalizedDepartmentName === "") {
    return `${input.institutionSlug}-${input.specialtySlug}`;
  }

  return `${input.institutionSlug}-${input.specialtySlug}-${normalizedDepartmentName}`;
}

export function resolveCanonicalDepartmentSlug(input: {
  institutionSlug: string;
  specialtySlug: string;
  departmentName: string;
}) {
  return buildDepartmentSlug(input);
}

export function buildDepartmentCopy(input: {
  institutionName: string;
  specialtyName: string;
  departmentName: string;
  institutionType: InstitutionType;
}) {
  const baseName = formatDepartmentDisplayName(input.departmentName, input.specialtyName);

  if (input.institutionType === InstitutionType.HMO) {
    return {
      shortSummary: `${baseName} בקהילה עם דגש על רצף טיפולי, היכרות עם מרפאה וסביבת עבודה אמבולטורית.`,
      about: `עמוד בסיסי עבור ${baseName} ב${input.institutionName}. אפשר לפרסם כאן בהמשך תוכן רשמי, חוויות מהשטח, עדכונים ופרטי קשר של המסלול הקהילתי.`,
      practicalInfo: `זהו עמוד מחלקה בסיסי שנוצר כדי לאפשר חיפוש, השוואה ושיתוף חוויות גם לפני שהוזן תוכן רשמי. במסלולי קהילה מוצגים כאן בעיקר תחומי רפואת משפחה ורפואת קהילה.`
    };
  }

  return {
    shortSummary: `${baseName} ב${input.institutionName} עם עמוד בסיסי שמוכן לעדכונים, חוויות ותוכן רשמי.`,
    about: `עמוד בסיסי עבור ${baseName} ב${input.institutionName}. גם בלי תוכן רשמי של נציג/ת מחלקה, אפשר כבר לפרסם כאן חוויות, להשוות מחלקות ולשמור את הדף כנקודת פתיחה לתוכן עתידי.`,
    practicalInfo: `זהו עמוד מחלקה בסיסי שנוצר כדי לאפשר כיסוי מלא של מוסדות ותחומים. בהמשך אפשר להוסיף ראשי מחלקה, מידע פרקטי, הזדמנויות מחקר, תקנים פתוחים ופרטי קשר ציבוריים.`
  };
}

export function getInstitutionBySlug(slug: string) {
  return INSTITUTION_CATALOG.find((institution) => institution.slug === slug) ?? null;
}

export function getSpecialtyBySlug(slug: string) {
  return SPECIALTY_CATALOG.find((specialty) => specialty.slug === slug) ?? null;
}

export function getInstitutionByName(name: string) {
  const normalizedName = normalizeCatalogLookupValue(name);
  return (
    INSTITUTION_CATALOG.find(
      (institution) => normalizeCatalogLookupValue(institution.name) === normalizedName
    ) ?? null
  );
}

export function getSpecialtyByName(name: string) {
  const normalizedName = normalizeCatalogLookupValue(name);
  return (
    SPECIALTY_CATALOG.find(
      (specialty) => normalizeCatalogLookupValue(specialty.name) === normalizedName
    ) ?? null
  );
}

export function getInstitutionSpecialtySlugs(institution: InstitutionCatalogItem) {
  if (institution.type === InstitutionType.HMO) {
    return ["family-medicine"];
  }

  const override = INSTITUTION_SPECIALTY_OVERRIDES[institution.slug];

  if (override) {
    return override;
  }

  return [
    ...DEFAULT_HOSPITAL_SPECIALTY_SLUGS,
    ...(OPTIONAL_HOSPITAL_SPECIALTY_SLUGS_BY_INSTITUTION[institution.slug] ?? [])
  ];
}

export function buildCatalogDepartmentBlueprints() {
  return INSTITUTION_CATALOG.flatMap((institution) =>
    getInstitutionSpecialtySlugs(institution).map((specialtySlug) => {
      const specialty = getSpecialtyBySlug(specialtySlug);

      if (!specialty) {
        throw new Error(`Unknown specialty slug: ${specialtySlug}`);
      }

      const departmentName =
        institution.type === InstitutionType.HMO ? "רפואת משפחה" : specialty.name;

      return {
        institutionSlug: institution.slug,
        specialtySlug,
        departmentName
      };
    })
  );
}

export async function ensureInstitution(
  db: DbClient,
  input: {
    name: string;
    type?: InstitutionType;
    city?: string | null;
    summary?: string;
  }
) {
  const normalizedName = input.name.trim();
  const existing = await db.institution.findFirst({
    where: {
      OR: [{ name: normalizedName }, { slug: slugifyValue(normalizedName) }]
    }
  });

  if (existing) {
    return existing;
  }

  const catalogMatch = getInstitutionByName(normalizedName);

  return db.institution.create({
    data: {
      slug: catalogMatch?.slug ?? slugifyValue(normalizedName),
      name: normalizedName,
      type: input.type ?? catalogMatch?.type ?? InstitutionType.HOSPITAL,
      city: input.city ?? catalogMatch?.city ?? null,
      summary:
        input.summary ??
        catalogMatch?.summary ??
        "עמוד מוסד בסיסי שנוצר כדי לאפשר שיוך מחלקות, חיפוש וקליטת תוכן עתידי."
    }
  });
}

export async function ensureSpecialty(
  db: DbClient,
  input: {
    name: string;
    description?: string;
  }
) {
  const normalizedName = input.name.trim();
  const existing = await db.specialty.findFirst({
    where: {
      OR: [{ name: normalizedName }, { slug: slugifyValue(normalizedName) }]
    }
  });

  if (existing) {
    return existing;
  }

  const catalogMatch = getSpecialtyByName(normalizedName);

  return db.specialty.create({
    data: {
      slug: catalogMatch?.slug ?? slugifyValue(normalizedName),
      name: normalizedName,
      description:
        input.description ??
        catalogMatch?.description ??
        "תחום שנוצר כדי לאפשר עמוד מחלקה, שיוכים וקליטת תוכן עתידי."
    }
  });
}

export async function ensureDepartmentPage(
  db: DbClient,
  input: {
    institutionId: string;
    institutionSlug: string;
    institutionName: string;
    institutionType: InstitutionType;
    specialtyId: string;
    specialtySlug: string;
    specialtyName: string;
    departmentName?: string | null;
  }
) {
  const departmentName = input.departmentName?.trim() || input.specialtyName;
  const exactExisting = await db.department.findFirst({
    where: {
      institutionId: input.institutionId,
      specialtyId: input.specialtyId,
      name: departmentName
    }
  });

  const existingByNormalizedName =
    exactExisting ??
    (
      await db.department.findMany({
        where: {
          institutionId: input.institutionId
        }
      })
    ).find(
      (department) =>
        normalizeCatalogLookupValue(department.name) ===
        normalizeCatalogLookupValue(departmentName)
    );

  if (existingByNormalizedName) {
    const existingSpecialty = await db.specialty.findUnique({
      where: {
        id: existingByNormalizedName.specialtyId
      },
      select: {
        slug: true
      }
    });
    const canonicalSlug = resolveCanonicalDepartmentSlug({
      institutionSlug: input.institutionSlug,
      specialtySlug: existingSpecialty?.slug ?? input.specialtySlug,
      departmentName: existingByNormalizedName.name
    });

    if (existingByNormalizedName.slug !== canonicalSlug) {
      return db.department.update({
        where: {
          id: existingByNormalizedName.id
        },
        data: {
          slug: canonicalSlug
        }
      });
    }

    return existingByNormalizedName;
  }

  const copy = buildDepartmentCopy({
    institutionName: input.institutionName,
    specialtyName: input.specialtyName,
    departmentName,
    institutionType: input.institutionType
  });

  return db.department.create({
    data: {
      institutionId: input.institutionId,
      specialtyId: input.specialtyId,
      slug: resolveCanonicalDepartmentSlug({
        institutionSlug: input.institutionSlug,
        specialtySlug: input.specialtySlug,
        departmentName
      }),
      name: departmentName,
      shortSummary: copy.shortSummary,
      about: copy.about,
      practicalInfo: copy.practicalInfo
    }
  });
}
