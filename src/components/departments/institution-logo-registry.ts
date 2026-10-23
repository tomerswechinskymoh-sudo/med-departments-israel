/** Reviewed institution identities and owner-supplied assets, 2026-10-21.
 * Aliases are exact keys, never substring/pattern matches. Names are used only
 * at the import/data boundary; components resolve a stable brandingKey/id/slug.
 * Provenance and selection: docs/final-design-review/asset-register.json.
 */
export type InstitutionLogoRecord = {
  key: string;
  name: string;
  type: "HOSPITAL" | "HMO";
  filename: string | null;
  slugAliases: readonly string[];
  nameAliases: readonly string[];
  note: string;
};

export const INSTITUTION_LOGO_REGISTRY: readonly InstitutionLogoRecord[] = [
  {
    "key": "abrabanel-mental-health",
    "name": "מרכז לבה\"נ אברבנאל",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "abrabanel-mental-health",
      "מרכז-לבהנ-אברבנאל"
    ],
    "nameAliases": [
      "מרכז לבה\"נ אברבנאל"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "adi-negev-nahalat-eden",
    "name": "עדי נגב - נחלת עדן",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "adi-negev-nahalat-eden",
      "עדי-נגב-נחלת-עדן"
    ],
    "nameAliases": [
      "עדי נגב - נחלת עדן"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "asia-community-health-services",
    "name": "אסיא ש.בריאות קהילתיים",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "asia-community-health-services",
      "אסיא-ש-בריאות-קהילתיים"
    ],
    "nameAliases": [
      "אסיא ש.בריאות קהילתיים"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "assuta-ashdod",
    "name": "בית החולים האוניברסיטאי אסותא אשדוד",
    "type": "HOSPITAL",
    "filename": "אסותא אשדוד.jpeg",
    "slugAliases": [
      "assuta-ashdod",
      "אסותא-אשדוד",
      "בית-החולים-האוניברסיטאי-אסותא-אשדוד",
      "ביח-אסותא-אשדוד",
      "ביהח-אסותא-אשדוד"
    ],
    "nameAliases": [
      "אסותא אשדוד",
      "assuta ashdod",
      "בית החולים האוניברסיטאי אסותא אשדוד",
      "בי\"ח אסותא אשדוד",
      "ביה\"ח אסותא אשדוד"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "barzilai",
    "name": "מרכז רפואי ברזילי",
    "type": "HOSPITAL",
    "filename": "ברזילי.jpeg",
    "slugAliases": [
      "barzilai",
      "ברזילי",
      "מרכז-רפואי-ברזילי"
    ],
    "nameAliases": [
      "ברזילי",
      "barzilai",
      "מרכז רפואי ברזילי"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "beer-sheva-mental-health",
    "name": "מרכז לבה\"נ באר שבע",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "beer-sheva-mental-health",
      "מרכז-לבהנ-באר-שבע"
    ],
    "nameAliases": [
      "מרכז לבה\"נ באר שבע"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "beit-balev-rishon-lezion",
    "name": "בית בלב ראשון לציון",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "beit-balev-rishon-lezion",
      "בית-בלב-ראשון-לציון"
    ],
    "nameAliases": [
      "בית בלב ראשון לציון"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "beit-rivka-geriatric",
    "name": "מ.גריאטרי בית רבקה",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "beit-rivka-geriatric",
      "מ-גריאטרי-בית-רבקה"
    ],
    "nameAliases": [
      "מ.גריאטרי בית רבקה"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "bnai-zion",
    "name": "מרכז רפואי בני ציון",
    "type": "HOSPITAL",
    "filename": "בני ציון.jpeg",
    "slugAliases": [
      "bnai-zion",
      "bnei-zion",
      "בני-ציון",
      "bny-zion",
      "מרכז-רפואי-בני-ציון"
    ],
    "nameAliases": [
      "בני ציון",
      "bnei zion",
      "bny zion",
      "מרכז רפואי בני ציון"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "carmel",
    "name": "המרכז הרפואי כרמל",
    "type": "HOSPITAL",
    "filename": "carmel.jpeg",
    "slugAliases": [
      "carmel",
      "כרמל",
      "המרכז-הרפואי-כרמל",
      "מרכז-רפואי-כרמל"
    ],
    "nameAliases": [
      "כרמל",
      "carmel",
      "המרכז הרפואי כרמל",
      "מרכז רפואי כרמל"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "clalit",
    "name": "כללית",
    "type": "HMO",
    "filename": null,
    "slugAliases": [
      "clalit",
      "כללית",
      "שירותי-בריאות-כללית"
    ],
    "nameAliases": [
      "כללית",
      "שירותי בריאות כללית"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "emek",
    "name": "מרכז רפואי העמק",
    "type": "HOSPITAL",
    "filename": "העמק.jpg",
    "slugAliases": [
      "emek",
      "haemek",
      "ha-emek",
      "העמק",
      "עפולה",
      "afula",
      "מרכז-רפואי-העמק"
    ],
    "nameAliases": [
      "העמק",
      "עפולה",
      "haemek",
      "ha-emek",
      "afula",
      "מרכז רפואי העמק"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "fliman-geriatric",
    "name": "מ.גריאטרי פלימן",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "fliman-geriatric",
      "מ-גריאטרי-פלימן"
    ],
    "nameAliases": [
      "מ.גריאטרי פלימן"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "forensic-medicine",
    "name": "מ.לרפואה משפטית",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "forensic-medicine",
      "מ-לרפואה-משפטית"
    ],
    "nameAliases": [
      "מ.לרפואה משפטית"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "galilee",
    "name": "המרכז הרפואי לגליל",
    "type": "HOSPITAL",
    "filename": "לגליל.png",
    "slugAliases": [
      "galilee",
      "nahariya",
      "לגליל",
      "נהריה",
      "המרכז-הרפואי-לגליל"
    ],
    "nameAliases": [
      "לגליל",
      "נהריה",
      "galilee",
      "nahariya",
      "המרכז הרפואי לגליל"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "geha",
    "name": "מרכז לבה\"נ גהה",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "geha",
      "מרכז-לבהנ-גהה"
    ],
    "nameAliases": [
      "מרכז לבה\"נ גהה"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "hadassah",
    "name": "הדסה",
    "type": "HOSPITAL",
    "filename": "הדסה עין כרם.jpg",
    "slugAliases": [
      "hadassah",
      "הדסה"
    ],
    "nameAliases": [
      "הדסה",
      "hadassah"
    ],
    "note": "Generic Hadassah organizational mark. Higher-resolution owner original selected; campus identities remain distinct records."
  },
  {
    "key": "hadassah-ein-kerem",
    "name": "הדסה עין כרם",
    "type": "HOSPITAL",
    "filename": "הדסה עין כרם.jpg",
    "slugAliases": [
      "hadassah-ein-kerem",
      "הדסה-עין-כרם",
      "ein-kerem",
      "ביהח-הדסה-עין-כרם",
      "בית-החולים-הדסה-עין-כרם"
    ],
    "nameAliases": [
      "הדסה עין כרם",
      "hadassah ein kerem",
      "ein kerem",
      "ביה\"ח הדסה עין כרם",
      "בית החולים הדסה עין כרם"
    ],
    "note": "Owner filename identifies Ein Kerem; artwork is the shared Hadassah mark. Never inferred from a generic Hadassah substring."
  },
  {
    "key": "hadassah-mount-scopus",
    "name": "הדסה הר הצופים",
    "type": "HOSPITAL",
    "filename": "הדסה הר צופים.png",
    "slugAliases": [
      "hadassah-mount-scopus",
      "hadassah-har-hatzofim",
      "הדסה-הר-הצופים",
      "הדסה-הר-צופים",
      "mount-scopus",
      "ביהח-הדסה-הר-הצופים",
      "בית-החולים-הדסה-הר-הצופים"
    ],
    "nameAliases": [
      "הדסה הר הצופים",
      "הדסה הר צופים",
      "hadassah mount scopus",
      "mount scopus",
      "ביה\"ח הדסה הר הצופים",
      "בית החולים הדסה הר הצופים"
    ],
    "note": "Owner filename identifies Mount Scopus; artwork is the shared Hadassah mark. Campus remains distinct from Ein Kerem."
  },
  {
    "key": "herzfeld-geriatric",
    "name": "מ.גריאטרי הרצפלד",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "herzfeld-geriatric",
      "מ-גריאטרי-הרצפלד"
    ],
    "nameAliases": [
      "מ.גריאטרי הרצפלד"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "herzog-medical-center",
    "name": "ביה\"ח הרצוג",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "herzog-medical-center",
      "ביהח-הרצוג"
    ],
    "nameAliases": [
      "ביה\"ח הרצוג"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "hillel-yaffe",
    "name": "המרכז הרפואי הלל יפה",
    "type": "HOSPITAL",
    "filename": "הלל יפה.png",
    "slugAliases": [
      "hillel-yaffe",
      "hillel-yafe",
      "הלל-יפה",
      "המרכז-הרפואי-הלל-יפה",
      "מרכז-רפואי-הלל-יפה"
    ],
    "nameAliases": [
      "הלל יפה",
      "hillel yaffe",
      "hillel yafe",
      "המרכז הרפואי הלל יפה",
      "מרכז רפואי הלל יפה"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "holy-family",
    "name": "בית החולים המשפחה הקדושה",
    "type": "HOSPITAL",
    "filename": "המשפחה הקדושה.webp",
    "slugAliases": [
      "holy-family",
      "המשפחה-הקדושה",
      "saint-family",
      "בית-החולים-המשפחה-הקדושה",
      "ביהח-המשפחה-הקדושה"
    ],
    "nameAliases": [
      "המשפחה הקדושה",
      "holy family",
      "saint family",
      "בית החולים המשפחה הקדושה",
      "ביה\"ח המשפחה הקדושה"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "ichilov",
    "name": "המרכז הרפואי תל אביב ע\"ש סוראסקי (איכילוב)",
    "type": "HOSPITAL",
    "filename": "Soraski.svg.png",
    "slugAliases": [
      "ichilov",
      "sourasky",
      "tasmc",
      "סוראסקי",
      "איכילוב",
      "תא-סוראסקי",
      "תל-אביב-סוראסקי",
      "sorasky",
      "soraski",
      "המרכז-הרפואי-תל-אביב-עש-סוראסקי-איכילוב",
      "מרכז-רפואי-תא-סוראסקי",
      "המרכז-הרפואי-תל-אביב-עש-סוראסקי"
    ],
    "nameAliases": [
      "סוראסקי",
      "איכילוב",
      "תא סוראסקי",
      "תל אביב סוראסקי",
      "ichilov",
      "sourasky",
      "sorasky",
      "soraski",
      "tasmc",
      "המרכז הרפואי תל אביב ע\"ש סוראסקי (איכילוב)",
      "מרכז רפואי ת\"א סוראסקי",
      "המרכז הרפואי תל אביב ע\"ש סוראסקי"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "jerusalem-mental-health-kfar-shaul-eitanim",
    "name": "מרכז לבה\"נ ירושלים (כפר שאול ואיתנים)",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "jerusalem-mental-health-kfar-shaul-eitanim",
      "מרכז-לבהנ-ירושלים-כפר-שאול-ואיתנים"
    ],
    "nameAliases": [
      "מרכז לבה\"נ ירושלים (כפר שאול ואיתנים)"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "kaplan",
    "name": "מרכז רפואי קפלן",
    "type": "HOSPITAL",
    "filename": "kaplan.png",
    "slugAliases": [
      "kaplan",
      "קפלן",
      "מרכז-רפואי-קפלן"
    ],
    "nameAliases": [
      "קפלן",
      "kaplan",
      "מרכז רפואי קפלן"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "laniado",
    "name": "לניאדו - מרכז רפואי צאנז",
    "type": "HOSPITAL",
    "filename": "לניאדו.png",
    "slugAliases": [
      "laniado",
      "לניאדו",
      "צאנז",
      "לניאדו-מרכז-רפואי-צאנז",
      "ביהח-לניאדו"
    ],
    "nameAliases": [
      "לניאדו",
      "צאנז",
      "laniado",
      "לניאדו - מרכז רפואי צאנז",
      "ביה\"ח לניאדו"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "leumit",
    "name": "לאומית",
    "type": "HMO",
    "filename": "leumit.ico",
    "slugAliases": [
      "leumit",
      "leumit-health-fund",
      "לאומית",
      "קופח-לאומית",
      "קופת-חולים-לאומית",
      "לאומית-שירותי-בריאות"
    ],
    "nameAliases": [
      "לאומית",
      "leumit",
      "קופ\"ח לאומית",
      "קופת חולים לאומית",
      "לאומית שירותי בריאות"
    ],
    "note": "Existing original health-fund mark. Eligible only for this health-fund identity, never a hospital or sponsorship area."
  },
  {
    "key": "lev-hasharon",
    "name": "מרכז לבה\"נ לב השרון",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "lev-hasharon",
      "מרכז-לבהנ-לב-השרון"
    ],
    "nameAliases": [
      "מרכז לבה\"נ לב השרון"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "loewenstein-rehabilitation",
    "name": "ביה\"ח לוינשטיין",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "loewenstein-rehabilitation",
      "ביהח-לוינשטיין"
    ],
    "nameAliases": [
      "ביה\"ח לוינשטיין"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "maale-hacarmel",
    "name": "מרכז לבה\"נ מעלה הכרמל",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "maale-hacarmel",
      "מרכז-לבהנ-מעלה-הכרמל"
    ],
    "nameAliases": [
      "מרכז לבה\"נ מעלה הכרמל"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "maayanei-hayeshua",
    "name": "מרכז רפואי מעיני הישועה",
    "type": "HOSPITAL",
    "filename": "מעייני הישועה.png",
    "slugAliases": [
      "maayanei-hayeshua",
      "mayanei-hayeshua",
      "מעייני-הישועה",
      "מעיני-הישועה",
      "מרכז-רפואי-מעיני-הישועה",
      "ביהח-מעיני-הישועה"
    ],
    "nameAliases": [
      "מעייני הישועה",
      "מעיני הישועה",
      "mayanei hayeshua",
      "maayanei hayeshua",
      "מרכז רפואי מעיני הישועה",
      "ביה\"ח מעיני הישועה"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "maccabi",
    "name": "מכבי",
    "type": "HMO",
    "filename": null,
    "slugAliases": [
      "maccabi",
      "מכבי",
      "מכבי-שירותי-בריאות"
    ],
    "nameAliases": [
      "מכבי",
      "מכבי שירותי בריאות"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "mazor-mental-health",
    "name": "מרכז לבה\"נ מזור",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "mazor-mental-health",
      "מרכז-לבהנ-מזור"
    ],
    "nameAliases": [
      "מרכז לבה\"נ מזור"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "meir",
    "name": "מרכז רפואי מאיר",
    "type": "HOSPITAL",
    "filename": "Meir.jpeg",
    "slugAliases": [
      "meir",
      "מאיר",
      "מרכז-רפואי-מאיר"
    ],
    "nameAliases": [
      "מאיר",
      "meir",
      "מרכז רפואי מאיר"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "merhavim",
    "name": "מרחבים - המרכז הרפואי לטיפול במוח ובנפש באר יעקב נס ציונה",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "merhavim",
      "מרחבים-המרכז-הרפואי-לטיפול-במוח-ובנפש-באר-יעקב-נס-ציונה"
    ],
    "nameAliases": [
      "מרחבים - המרכז הרפואי לטיפול במוח ובנפש באר יעקב נס ציונה"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "meuhedet",
    "name": "מאוחדת",
    "type": "HMO",
    "filename": "meuhedet.ico",
    "slugAliases": [
      "meuhedet",
      "meuhedet-health-fund",
      "מאוחדת",
      "קופח-מאוחדת",
      "קופת-חולים-מאוחדת"
    ],
    "nameAliases": [
      "מאוחדת",
      "meuhedet",
      "קופ\"ח מאוחדת",
      "קופת חולים מאוחדת"
    ],
    "note": "Existing original health-fund mark. Eligible only for this health-fund identity, never a hospital or sponsorship area."
  },
  {
    "key": "nazareth-english",
    "name": "בית החולים נצרת (האנגלי)",
    "type": "HOSPITAL",
    "filename": "איממס הסקוטי נצרת.png",
    "slugAliases": [
      "nazareth-english",
      "emms",
      "scottish",
      "nazareth-scottish",
      "אי-מ-מ-ס",
      "איממס",
      "הסקוטי",
      "סקוטי",
      "בית-החולים-נצרת-האנגלי",
      "ביהח-אי-מ-מ-ס-הסקוטי"
    ],
    "nameAliases": [
      "אי.מ.מ.ס",
      "איממס",
      "הסקוטי",
      "סקוטי",
      "emms",
      "scottish",
      "nazareth scottish",
      "בית החולים נצרת (האנגלי)",
      "ביה\"ח אי.מ.מ.ס הסקוטי"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "neot-hamoshava-geriatric",
    "name": "מרכז גריאטרי נאות המושבה",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "neot-hamoshava-geriatric",
      "מרכז-גריאטרי-נאות-המושבה"
    ],
    "nameAliases": [
      "מרכז גריאטרי נאות המושבה"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "netanya-geriatric",
    "name": "מ.גריאטרי נתניה",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "netanya-geriatric",
      "מ-גריאטרי-נתניה"
    ],
    "nameAliases": [
      "מ.גריאטרי נתניה"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "poria",
    "name": "המרכז הרפואי צפון - פוריה",
    "type": "HOSPITAL",
    "filename": "צפון.png",
    "slugAliases": [
      "poria",
      "poriya",
      "baruch-padeh",
      "tzafon",
      "צפון",
      "פוריה",
      "ברוך-פדה",
      "המרכז-הרפואי-צפון-פוריה",
      "מרכז-רפואי-ברוך-פדה-פוריה"
    ],
    "nameAliases": [
      "צפון",
      "פוריה",
      "ברוך פדה",
      "baruch padeh",
      "poria",
      "poriya",
      "tzafon",
      "המרכז הרפואי צפון - פוריה",
      "מרכז רפואי ברוך פדה פוריה"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "rabin",
    "name": "מרכז רפואי רבין",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "rabin",
      "מרכז-רפואי-רבין",
      "המרכז-הרפואי-רבין",
      "רבין"
    ],
    "nameAliases": [
      "מרכז רפואי רבין",
      "המרכז הרפואי רבין",
      "רבין"
    ],
    "note": "Combined Rabin center. Available supplied logos specifically label Beilinson or Hasharon; neither is used for a merged medical array."
  },
  {
    "key": "rabin-beilinson",
    "name": "מרכז רפואי רבין - בילינסון",
    "type": "HOSPITAL",
    "filename": "בילינסון רבין.jpg",
    "slugAliases": [
      "rabin-beilinson",
      "beilinson",
      "בילינסון",
      "בלינסון",
      "beylinson",
      "מרכז-רפואי-רבין-בילינסון",
      "ביהח-בילינסון-מרכז-רפואי-רבין",
      "בית-חולים-בילינסון"
    ],
    "nameAliases": [
      "בילינסון",
      "בלינסון",
      "beilinson",
      "beylinson",
      "מרכז רפואי רבין - בילינסון",
      "ביה\"ח בילינסון מרכז רפואי רבין",
      "בית חולים בילינסון"
    ],
    "note": "Artwork explicitly names Beilinson. Not used for the combined Rabin medical center, Hasharon, Geha or Schneider."
  },
  {
    "key": "rabin-hasharon",
    "name": "מרכז רפואי רבין - השרון",
    "type": "HOSPITAL",
    "filename": "השרון רבין.jpeg",
    "slugAliases": [
      "rabin-hasharon",
      "hasharon",
      "השרון",
      "מרכז-רפואי-רבין-השרון",
      "ביהח-השרון-מרכז-רפואי-רבין",
      "בית-חולים-השרון"
    ],
    "nameAliases": [
      "השרון",
      "hasharon",
      "מרכז רפואי רבין - השרון",
      "ביה\"ח השרון מרכז רפואי רבין",
      "בית חולים השרון"
    ],
    "note": "Artwork explicitly names Hasharon. Not used for combined Rabin medical center or Lev Hasharon mental-health center."
  },
  {
    "key": "ramat-chen-brill-mental-health",
    "name": "מרכז בריאות הנפש רמת חן ע\"ש בריל",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "ramat-chen-brill-mental-health",
      "מרכז-בריאות-הנפש-רמת-חן-עש-בריל"
    ],
    "nameAliases": [
      "מרכז בריאות הנפש רמת חן ע\"ש בריל"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "rambam",
    "name": "רמב\"ם - הקריה הרפואית לבריאות האדם",
    "type": "HOSPITAL",
    "filename": "rambam.ico",
    "slugAliases": [
      "rambam",
      "רמבם",
      "רמבם-הקריה-הרפואית-לבריאות-האדם",
      "מרכז-רפואי-רמבם"
    ],
    "nameAliases": [
      "רמבם",
      "רמב״ם",
      "רמב\"ם",
      "rambam",
      "רמב\"ם - הקריה הרפואית לבריאות האדם",
      "מרכז רפואי רמב\"ם"
    ],
    "note": "Only available original is a 48×48 ICO mark. Render at <=48 CSS px; a higher-resolution original remains an owner follow-up."
  },
  {
    "key": "reuth-medical-center",
    "name": "מרכז רפואי רעות",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "reuth-medical-center",
      "מרכז-רפואי-רעות"
    ],
    "nameAliases": [
      "מרכז רפואי רעות"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "saint-vincent",
    "name": "בית החולים סן ונסן דה פול",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "saint-vincent",
      "בית-החולים-סן-ונסן-דה-פול",
      "ביהח-הצרפתי"
    ],
    "nameAliases": [
      "בית החולים סן ונסן דה פול",
      "ביה\"ח הצרפתי"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "schneider",
    "name": "מרכז שניידר לרפואת ילדים בישראל",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "schneider",
      "מרכז-שניידר-לרפואת-ילדים-בישראל",
      "מרכז-שניידר-לילדים"
    ],
    "nameAliases": [
      "מרכז שניידר לרפואת ילדים בישראל",
      "מרכז שניידר לילדים"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "shaar-menashe-mental-health",
    "name": "מרכז לבה\"נ שער מנשה",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "shaar-menashe-mental-health",
      "מרכז-לבהנ-שער-מנשה"
    ],
    "nameAliases": [
      "מרכז לבה\"נ שער מנשה"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "shaare-zedek",
    "name": "המרכז הרפואי שערי צדק",
    "type": "HOSPITAL",
    "filename": "ShaareyTzedek.jpg",
    "slugAliases": [
      "shaare-zedek",
      "shaarey-tzedek",
      "שערי-צדק",
      "המרכז-הרפואי-שערי-צדק",
      "מרכז-רפואי-שערי-צדק"
    ],
    "nameAliases": [
      "שערי צדק",
      "shaare zedek",
      "shaarey tzedek",
      "המרכז הרפואי שערי צדק",
      "מרכז רפואי שערי צדק"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "shalvata",
    "name": "מרכז לבה\"נ שלוותה",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "shalvata",
      "מרכז-לבהנ-שלוותה"
    ],
    "nameAliases": [
      "מרכז לבה\"נ שלוותה"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "shamir",
    "name": "המרכז הרפואי שמיר",
    "type": "HOSPITAL",
    "filename": "שמיר.jpeg",
    "slugAliases": [
      "shamir",
      "assaf-harofeh",
      "יצחק-שמיר",
      "שמיר",
      "אסף-הרופא",
      "המרכז-הרפואי-שמיר",
      "מרכז-רפואי-יצחק-שמיר"
    ],
    "nameAliases": [
      "יצחק שמיר",
      "שמיר",
      "אסף הרופא",
      "shamir",
      "assaf harofeh",
      "המרכז הרפואי שמיר",
      "מרכז רפואי יצחק שמיר"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "sheba",
    "name": "המרכז הרפואי ע\"ש חיים שיבא - תל השומר",
    "type": "HOSPITAL",
    "filename": "ShebaNew.svg.png",
    "slugAliases": [
      "sheba",
      "שיבא",
      "תל-השומר",
      "tel-hashomer",
      "המרכז-הרפואי-עש-חיים-שיבא-תל-השומר",
      "מרכז-רפואי-שיבא"
    ],
    "nameAliases": [
      "שיבא",
      "תל השומר",
      "sheba",
      "tel hashomer",
      "המרכז הרפואי ע\"ש חיים שיבא - תל השומר",
      "מרכז רפואי שיבא"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "shmuel-harofe-geriatric",
    "name": "מ.גריאטרי שמואל הרופא",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "shmuel-harofe-geriatric",
      "מ-גריאטרי-שמואל-הרופא"
    ],
    "nameAliases": [
      "מ.גריאטרי שמואל הרופא"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "shoham-geriatric",
    "name": "מ.גריאטרי שהם",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "shoham-geriatric",
      "מ-גריאטרי-שהם"
    ],
    "nameAliases": [
      "מ.גריאטרי שהם"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "soroka",
    "name": "המרכז הרפואי האוניברסיטאי סורוקה",
    "type": "HOSPITAL",
    "filename": null,
    "slugAliases": [
      "soroka",
      "המרכז-הרפואי-האוניברסיטאי-סורוקה",
      "מרכז-רפואי-סורוקה"
    ],
    "nameAliases": [
      "המרכז הרפואי האוניברסיטאי סורוקה",
      "מרכז רפואי סורוקה"
    ],
    "note": "No institution-specific owner-supplied asset found; use neutral initials."
  },
  {
    "key": "wolfson",
    "name": "המרכז הרפואי ע\"ש אדית וולפסון",
    "type": "HOSPITAL",
    "filename": "וולפסון.svg",
    "slugAliases": [
      "wolfson",
      "וולפסון",
      "המרכז-הרפואי-עש-אדית-וולפסון",
      "מרכז-רפואי-וולפסון"
    ],
    "nameAliases": [
      "וולפסון",
      "wolfson",
      "המרכז הרפואי ע\"ש אדית וולפסון",
      "מרכז רפואי וולפסון"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "yoseftal",
    "name": "המרכז הרפואי יוספטל",
    "type": "HOSPITAL",
    "filename": "יוספטל.jpeg",
    "slugAliases": [
      "yoseftal",
      "יוספטל",
      "yoseftel",
      "המרכז-הרפואי-יוספטל",
      "ביהח-יוספטל"
    ],
    "nameAliases": [
      "יוספטל",
      "yoseftal",
      "yoseftel",
      "המרכז הרפואי יוספטל",
      "ביה\"ח יוספטל"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  },
  {
    "key": "ziv",
    "name": "המרכז הרפואי זיו",
    "type": "HOSPITAL",
    "filename": "זיו .jpg",
    "slugAliases": [
      "ziv",
      "זיו",
      "צפת",
      "zefat",
      "safed",
      "המרכז-הרפואי-זיו",
      "ביהח-זיו-צפת"
    ],
    "nameAliases": [
      "זיו",
      "צפת",
      "ziv",
      "zefat",
      "safed",
      "המרכז הרפואי זיו",
      "ביה\"ח זיו - צפת"
    ],
    "note": "Original owner-supplied logo; institution identification only."
  }
];
