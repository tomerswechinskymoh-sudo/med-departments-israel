type InstitutionBrandingInput = {
  name?: string | null;
  slug?: string | null;
  coverImageUrl?: string | null;
};

const LOCAL_LOGOS = [
  {
    src: "/logos/hospitals/assuta-ashdod-logo.png",
    match: ["assuta-ashdod", "אסותא אשדוד"]
  },
  {
    src: "/logos/hospitals/sheba.ico",
    match: ["sheba", "שיבא", "תל השומר"]
  },
  {
    src: "/logos/hospitals/ichilov.ico",
    match: ["ichilov", "tasmc", "sourasky", "איכילוב", "סוראסקי"]
  },
  {
    src: "/logos/hospitals/hadassah.ico",
    match: ["hadassah", "הדסה"]
  },
  {
    src: "/logos/hospitals/rambam.ico",
    match: ["rambam", "רמבם", "רמב\"ם"]
  },
  {
    src: "/logos/hospitals/shaare-zedek.ico",
    match: ["shaare-zedek", "שערי צדק"]
  },
  {
    src: "/logos/hospitals/shamir.ico",
    match: ["shamir", "יצחק שמיר", "שמיר", "אסף הרופא"]
  },
  {
    src: "/logos/hospitals/laniado.ico",
    match: ["laniado", "לניאדו", "צאנז"]
  },
  {
    src: "/logos/hospitals/ziv.ico",
    match: ["ziv", "זיו", "צפת"]
  },
  {
    src: "/logos/hospitals/meuhedet.ico",
    match: ["meuhedet", "מאוחדת"]
  },
  {
    src: "/logos/hospitals/leumit.ico",
    match: ["leumit", "לאומית"]
  }
];

function normalizeBrandText(value?: string | null) {
  return (value ?? "")
    .toLocaleLowerCase("he")
    .replace(/[״"׳']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getInstitutionLogo(institution: InstitutionBrandingInput) {
  const haystack = normalizeBrandText(`${institution.slug ?? ""} ${institution.name ?? ""}`);
  const localLogo = LOCAL_LOGOS.find((logo) =>
    logo.match.some((token) => haystack.includes(normalizeBrandText(token)))
  );

  if (localLogo) {
    return localLogo.src;
  }

  return institution.coverImageUrl ?? null;
}

export function getInstitutionInitials(name?: string | null) {
  const cleaned = normalizeBrandText(name)
    .replace(/^(?:בית החולים|ביהח|ביח|המרכז הרפואי|מרכז רפואי|קופת חולים|קופח)\s+/, "")
    .trim();
  const words = cleaned.split(" ").filter((word) => word.length > 0);
  const initials = words.slice(0, 2).map((word) => word[0]).join("");

  return initials || "מ";
}
