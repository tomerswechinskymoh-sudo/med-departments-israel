export const REVIEW_GUIDELINES = [
  "כתבו מנקודת המבט האישית שלכם, בצורה ברורה, עניינית ומכבדת.",
  "התמקדו במה שבאמת פוגשים ביום־יום: למידה, צוות, עומס, קצב, מחקר וטיפים שימושיים.",
  "אל תכניסו פרטים מזהים של מטופלים, אנשי צוות או סיטואציות רגישות.",
  "השיתוף יעלה רק אחרי בדיקה, כדי לשמור על תוכן אמין ונעים לקריאה."
];

export const EXPERIENCE_LEGAL_WARNING = [
  "אין לציין שמות אישיים של אנשי צוות או מטופלים בהקשר שלילי",
  "אין לכלול מידע מזהה על מטופלים",
  "כתבו על החוויה האישית שלכם באופן ענייני ומכבד",
  "טענות עובדתיות חמורות או פוגעניות לא יפורסמו ללא בדיקה"
] as const;

export const EXPERIENCE_RATING_HELPER_TEXT =
  "דרגו מ־1 עד 5, כאשר 1 = חלש מאוד ו־5 = מצוין.";

export const EXPERIENCE_PHONE_TRUST_COPY =
  "אפשר להשאיר טלפון לאימות ידני. אם בחרת בעילום שם, שום פרט מזהה לא יופיע באתר.";

export const EXPERIENCE_PRIVACY_COPY =
  "טלפון או מסמך הוכחה נשמרים בפרטיות ונגישים רק לאדמין שמאמת את ההגשות.";

export const APPLICATION_PRIVACY_COPY =
  "קורות חיים, תמונת פרופיל ושאר חומרי המועמדות נשמרים בפרטיות. רק נציגים מורשים של המחלקה ואדמינים יכולים לראות אותם.";

export const VERIFICATION_RETENTION_NOTE =
  "TODO: להחיל מדיניות מחיקה אוטומטית למסמכים פרטיים ולחומרי מועמדות לפי דרישות פרטיות, ציות ושימור.";

export const OPENING_ACCEPTANCE_CRITERIA_LABELS = [
  { key: "researchImportance", label: "כמה חשוב מחקר" },
  { key: "departmentElectiveImportance", label: "כמה חשוב אלקטיב במחלקה" },
  { key: "departmentInternshipImportance", label: "כמה חשוב סטאז' / סבב במחלקה" },
  { key: "residentSelectionInfluence", label: "כמה משפיעה בחירת המתמחים" },
  { key: "specialistSelectionInfluence", label: "כמה משפיעה בחירת המומחים" },
  { key: "departmentHeadInfluence", label: "כמה משפיע מנהל המחלקה" },
  { key: "medicalSchoolInfluence", label: "כמה משפיע מוסד הלימוד" },
  { key: "recommendationsImportance", label: "כמה חשובות המלצות" },
  { key: "personalFitImportance", label: "כמה חשוב רושם אישי / התאמה אישית" },
  {
    key: "previousDepartmentExperienceImportance",
    label: "כמה חשוב ניסיון קודם במחלקה"
  }
] as const;

export const OPENING_TYPE_LABELS = {
  RESIDENCY: "תקן התמחות",
  FELLOWSHIP: "פלו / מסלול המשך",
  ACADEMIC_TRACK: "מסלול משולב מחקר / אקדמיה",
  COMMUNITY_TRACK: "מסלול קהילה",
  OTHER: "מסלול אחר"
} as const;

export const APPLICATION_STATUS_LABELS = {
  SUBMITTED: "הוגש",
  UNDER_REVIEW: "בבדיקה",
  CONTACTED: "נוצר קשר",
  ARCHIVED: "בארכיון"
} as const;

export const MEDICAL_FACULTY_OPTIONS = [
  "אוניברסיטת תל אביב",
  "האוניברסיטה העברית",
  "הטכניון",
  "אוניברסיטת בן-גוריון",
  "אוניברסיטת בר-אילן",
  "אוניברסיטת אריאל",
  "אוניברסיטת רייכמן",
  "חו״ל מוכר על ידי משרד הבריאות"
] as const;

export const MAINLY_TAUGHT_BY_OPTIONS = [
  { value: "RESIDENTS", label: "מתמחים" },
  { value: "SENIORS", label: "בכירים" },
  { value: "MIXED", label: "שילוב" }
] as const;
