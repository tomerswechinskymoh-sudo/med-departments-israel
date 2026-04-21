export const REVIEW_GUIDELINES = [
  "כתבו מנקודת המבט האישית שלכם, בצורה ברורה, עניינית ומכבדת.",
  "התמקדו במה שבאמת פוגשים ביום־יום: למידה, צוות, עומס, קצב, מחקר וטיפים שימושיים.",
  "אל תכניסו פרטים מזהים של מטופלים, אנשי צוות או סיטואציות רגישות.",
  "השיתוף יעלה רק אחרי בדיקה, כדי לשמור על תוכן אמין ונעים לקריאה."
];

export const EXPERIENCE_PHONE_TRUST_COPY =
  "הטלפון נשמר רק כדי לוודא שמדובר באדם אמיתי. אם בחרת בעילום שם, שום פרט מזהה לא יופיע באתר.";

export const EXPERIENCE_PRIVACY_COPY =
  "נתוני האימות נשמרים בפרטיות ונגישים רק לצוות שמאמת את ההגשות.";

export const APPLICATION_PRIVACY_COPY =
  "קורות חיים, תמונת פרופיל ושאר חומרי המועמדות נשמרים בפרטיות. רק נציגים מורשים של המחלקה ואדמינים יכולים לראות אותם.";

export const VERIFICATION_RETENTION_NOTE =
  "TODO: להחיל מדיניות מחיקה אוטומטית למסמכים פרטיים ולחומרי מועמדות לפי דרישות פרטיות, ציות ושימור.";

export const OPENING_ACCEPTANCE_CRITERIA_LABELS = [
  { key: "researchImportance", label: "כמה חשוב מחקר" },
  { key: "departmentElectiveImportance", label: "כמה חשוב אלקטיב במחלקה" },
  { key: "residentSelectionInfluence", label: "כמה משפיעה בחירת המתמחים" },
  { key: "specialistSelectionInfluence", label: "כמה משפיעה בחירת המומחים" },
  { key: "departmentHeadInfluence", label: "כמה משפיע מנהל המחלקה" },
  { key: "medicalSchoolInfluence", label: "כמה משפיע מוסד הלימוד" },
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
  OTHER: "פתיחה אחרת"
} as const;

export const APPLICATION_STATUS_LABELS = {
  SUBMITTED: "הוגש",
  UNDER_REVIEW: "בבדיקה",
  CONTACTED: "נוצר קשר",
  ARCHIVED: "בארכיון"
} as const;
