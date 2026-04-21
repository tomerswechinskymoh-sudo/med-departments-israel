export const REVIEW_GUIDELINES = [
  "כתבו על החוויה האישית שלכם בצורה עניינית, פרקטית ומכבדת.",
  "אל תכללו פרטים מזהים של מטופלים, אנשי צוות או סיטואציות רגישות.",
  "התמקדו בלמידה, אווירה, עומס, נגישות הצוות, מחקר וטיפים שימושיים.",
  "כל חוויה נבדקת לפני פרסום, ותוכן בעייתי או לא מבוסס לא יעלה לאתר."
];

export const EXPERIENCE_PHONE_TRUST_COPY =
  "מספר הטלפון נאסף רק כדי לוודא שמדובר באדם אמיתי ושזו חוויה אותנטית. אם תבחרו בפרסום אנונימי, השם והטלפון לא יופיעו לציבור בשום שלב.";

export const EXPERIENCE_PRIVACY_COPY =
  "נתוני האימות נשמרים באופן פרטי ונגישים רק למנהלי המערכת לצורך בדיקה ואבטחת אמינות התוכן.";

export const APPLICATION_PRIVACY_COPY =
  "קורות חיים, תמונת פרופיל ושאר חומרי המועמדות הם פרטיים. הם אינם מפורסמים לציבור ונגישים רק לנציגים מורשים של המחלקה ולאדמינים.";

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
