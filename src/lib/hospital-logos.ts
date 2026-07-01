export type HospitalLogoInput = {
  name?: string | null;
  slug?: string | null;
  coverImageUrl?: string | null;
};

export type HospitalLogoDefinition = {
  filename: string;
  aliases: string[];
  slugAliases?: string[];
};

function publicLogoPath(filename: string) {
  return `/logos/hospitals/${filename.split("/").map(encodeURIComponent).join("/")}`;
}

export const HOSPITAL_LOGO_DEFINITIONS: HospitalLogoDefinition[] = [
  {
    filename: "אסותא אשדוד.jpeg",
    aliases: ["אסותא אשדוד", "assuta ashdod"],
    slugAliases: ["assuta-ashdod"]
  },
  {
    filename: "ShebaNew.svg.png",
    aliases: ["שיבא", "תל השומר", "sheba", "tel hashomer"],
    slugAliases: ["sheba"]
  },
  {
    filename: "Soraski.svg.png",
    aliases: ["סוראסקי", "איכילוב", "תא סוראסקי", "תל אביב סוראסקי", "ichilov", "sourasky", "sorasky", "soraski", "tasmc"],
    slugAliases: ["ichilov", "sourasky", "tasmc"]
  },
  {
    filename: "ShaareyTzedek.jpg",
    aliases: ["שערי צדק", "shaare zedek", "shaarey tzedek"],
    slugAliases: ["shaare-zedek", "shaarey-tzedek"]
  },
  {
    filename: "הדסה עין כרם.jpg",
    aliases: ["הדסה עין כרם", "hadassah ein kerem", "ein kerem"],
    slugAliases: ["hadassah-ein-kerem"]
  },
  {
    filename: "הדסה הר צופים.png",
    aliases: ["הדסה הר הצופים", "הדסה הר צופים", "hadassah mount scopus", "mount scopus"],
    slugAliases: ["hadassah-har-hatzofim", "hadassah-mount-scopus"]
  },
  {
    filename: "rambam.ico",
    aliases: ["רמבם", "רמב״ם", "רמב\"ם", "rambam"],
    slugAliases: ["rambam"]
  },
  {
    filename: "שמיר.jpeg",
    aliases: ["יצחק שמיר", "שמיר", "אסף הרופא", "shamir", "assaf harofeh"],
    slugAliases: ["shamir", "assaf-harofeh"]
  },
  {
    filename: "kaplan.png",
    aliases: ["קפלן", "kaplan"],
    slugAliases: ["kaplan"]
  },
  {
    filename: "Meir.jpeg",
    aliases: ["מאיר", "meir"],
    slugAliases: ["meir"]
  },
  {
    filename: "carmel.jpeg",
    aliases: ["כרמל", "carmel"],
    slugAliases: ["carmel"]
  },
  {
    filename: "בני ציון.jpeg",
    aliases: ["בני ציון", "bnei zion", "bny zion"],
    slugAliases: ["bnei-zion"]
  },
  {
    filename: "הלל יפה.png",
    aliases: ["הלל יפה", "hillel yaffe", "hillel yafe"],
    slugAliases: ["hillel-yaffe", "hillel-yafe"]
  },
  {
    filename: "ברזילי.jpeg",
    aliases: ["ברזילי", "barzilai"],
    slugAliases: ["barzilai"]
  },
  {
    filename: "לגליל.png",
    aliases: ["לגליל", "נהריה", "galilee", "nahariya"],
    slugAliases: ["galilee", "nahariya"]
  },
  {
    filename: "העמק.jpg",
    aliases: ["העמק", "עפולה", "haemek", "ha-emek", "afula"],
    slugAliases: ["haemek", "ha-emek"]
  },
  {
    filename: "צפון.png",
    aliases: ["צפון", "פוריה", "ברוך פדה", "baruch padeh", "poria", "poriya", "tzafon"],
    slugAliases: ["poria", "poriya", "baruch-padeh", "tzafon"]
  },
  {
    filename: "זיו .jpg",
    aliases: ["זיו", "צפת", "ziv", "zefat", "safed"],
    slugAliases: ["ziv"]
  },
  {
    filename: "לניאדו.png",
    aliases: ["לניאדו", "צאנז", "laniado"],
    slugAliases: ["laniado"]
  },
  {
    filename: "יוספטל.jpeg",
    aliases: ["יוספטל", "yoseftal", "yoseftel"],
    slugAliases: ["yoseftal"]
  },
  {
    filename: "איממס הסקוטי נצרת.png",
    aliases: ["אי.מ.מ.ס", "איממס", "הסקוטי", "סקוטי", "emms", "scottish", "nazareth scottish"],
    slugAliases: ["emms", "scottish"]
  },
  {
    filename: "המשפחה הקדושה.webp",
    aliases: ["המשפחה הקדושה", "holy family", "saint family"],
    slugAliases: ["holy-family"]
  },
  {
    filename: "וולפסון.svg",
    aliases: ["וולפסון", "wolfson"],
    slugAliases: ["wolfson"]
  },
  {
    filename: "מעייני הישועה.png",
    aliases: ["מעייני הישועה", "מעיני הישועה", "mayanei hayeshua", "maayanei hayeshua"],
    slugAliases: ["mayanei-hayeshua", "maayanei-hayeshua"]
  },
  {
    filename: "בילינסון רבין.jpg",
    aliases: ["בילינסון", "בלינסון", "beilinson", "beylinson"],
    slugAliases: ["beilinson", "rabin-beilinson"]
  },
  {
    filename: "השרון רבין.jpeg",
    aliases: ["השרון", "hasharon"],
    slugAliases: ["hasharon", "rabin-hasharon"]
  },
  {
    filename: "sheba.ico",
    aliases: ["sheba old"],
    slugAliases: ["sheba-old"]
  },
  {
    filename: "hadassah.ico",
    aliases: ["הדסה", "hadassah"],
    slugAliases: ["hadassah"]
  },
  {
    filename: "meuhedet.ico",
    aliases: ["מאוחדת", "meuhedet"],
    slugAliases: ["meuhedet"]
  },
  {
    filename: "leumit.ico",
    aliases: ["לאומית", "leumit"],
    slugAliases: ["leumit"]
  }
];

export const HOSPITAL_LOGO_PATHS = HOSPITAL_LOGO_DEFINITIONS.map((definition) =>
  publicLogoPath(definition.filename)
);

export function normalizeHospitalLogoKey(value?: string | null) {
  return (value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("he")
    .replace(/^\ufeff/, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[״"׳'`]/g, "")
    .replace(/(?:בית החולים|ביהח|ביח|המרכז הרפואי|מרכז רפואי|מרכז לבריאות הנפש|מרכז לבהנ|קופת חולים|קופח)/g, " ")
    .replace(/[().,:"'׳״/\\_\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSlug(value?: string | null) {
  return (value ?? "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9א-ת]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function logoMatchesText(definition: HospitalLogoDefinition, value?: string | null) {
  const normalized = normalizeHospitalLogoKey(value);
  if (!normalized) return false;

  return definition.aliases.some((alias) => {
    const normalizedAlias = normalizeHospitalLogoKey(alias);
    return normalizedAlias.length > 0 && normalized.includes(normalizedAlias);
  });
}

export function getHospitalLogoByName(name?: string | null) {
  const logo = HOSPITAL_LOGO_DEFINITIONS.find((definition) => logoMatchesText(definition, name));
  return logo ? publicLogoPath(logo.filename) : null;
}

export function getHospitalLogoBySlug(slug?: string | null) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return null;

  const logo = HOSPITAL_LOGO_DEFINITIONS.find((definition) =>
    (definition.slugAliases ?? []).some((alias) => normalizedSlug.includes(normalizeSlug(alias)))
  );

  return logo ? publicLogoPath(logo.filename) : null;
}

export function getHospitalLogo(institution: HospitalLogoInput) {
  return (
    getHospitalLogoBySlug(institution.slug) ??
    getHospitalLogoByName(institution.name) ??
    institution.coverImageUrl ??
    null
  );
}

export function getHospitalInitials(name?: string | null) {
  const words = normalizeHospitalLogoKey(name).split(" ").filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]).join("");

  return initials || "מ";
}
