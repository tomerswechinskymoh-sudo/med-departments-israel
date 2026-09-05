export const metricExplanationRegistry = {
  programsCount: {
    label: "מספר תוכניות",
    defaultExplanation: "מספר התוכניות או המחלקות הפעילות בתחום ההתמחות."
  },
  activeResidents: {
    label: "מספר מתמחים פעילים",
    defaultExplanation: "מספר המתמחים הפעילים בתחום ההתמחות לפי הנתונים הזמינים."
  },
  seniorPhysiciansCount: {
    label: "מספר בכירים",
    defaultExplanation: "מספר הרופאים הבכירים במחלקה לפי הנתונים הזמינים."
  },
  genderDistribution: {
    label: "התפלגות מגדרית",
    defaultExplanation: "התפלגות המתמחים לפי מגדר על בסיס הנתונים הזמינים."
  },
  residencyDuration: {
    label: "משך התמחות",
    defaultExplanation: "משך ההתמחות הרשמי ובהשוואה למשך הממוצע בפועל, כאשר הנתונים זמינים."
  },
  medianWaitingTime: {
    label: "זמן מקבלת רישיון עד תחילת התמחות",
    defaultExplanation: "הזמן החציוני מקבלת רישיון ועד לתחילת התמחות."
  },
  acceptanceDistribution: {
    label: "התפלגות קצב מציאת התמחות",
    defaultExplanation:
      "מספר הרופאים שדיווחו כי החלו התמחות בתחום, לפי משך הזמן שעבר עד תחילת ההתמחות. הדיווח אינו חובה ולכן הנתונים עשויים להיות חלקיים."
  },
  boardPassA: {
    label: "שיעור מעבר שלב א׳",
    defaultExplanation: "שיעור מעבר בחינות שלב א׳ לפי הנתונים הזמינים."
  },
  boardPassB: {
    label: "שיעור מעבר שלב ב׳",
    defaultExplanation: "שיעור מעבר בחינות שלב ב׳ לפי הנתונים הזמינים."
  },
  burnoutIndex: {
    label: "מדד שחיקה",
    defaultExplanation: "מדד שחיקה לפי הנתונים הזמינים. ככל שהערך גבוה יותר, רמת השחיקה גבוהה יותר."
  },
  centerSalary: {
    label: "שכר לא פריפריה",
    defaultExplanation: "שכר במסלול שאינו מסלול פריפריה לפי הנתונים הזמינים."
  },
  peripherySalary: {
    label: "שכר פריפריה",
    defaultExplanation: "שכר במסלול פריפריה לפי הנתונים הזמינים."
  },
  salaryGap: {
    label: "פער שכר פריפריה",
    defaultExplanation: "פער השכר בין מסלול פריפריה למסלול שאינו פריפריה."
  },
  newResidentsTrend: {
    label: "מתמחים חדשים",
    defaultExplanation: "מספר המתמחים החדשים שהחלו את התמחותם בתחום בשנים האחרונות."
  },
  expectedOpenings: {
    label: "צפי משרות",
    defaultExplanation: "צפי המשרות החדשות לפי נתוני הייבוא הזמינים."
  },
  expectedOpenings2026: {
    label: "צפי משרות חדשות",
    defaultExplanation: "צפי משרות המבוסס על הנתונים הזמינים לשנה המוצגת."
  },
  israelVsAbroad: {
    label: "בוגרי ישראל / חו״ל",
    defaultExplanation: "התפלגות מקום הלימודים של המתמחים כאשר הנתונים זמינים."
  },
  dutyLoad: {
    label: "עומס ואיזון חיים",
    defaultExplanation: "הערכת עומס ואיזון חיים המבוססת על חוויות מאושרות."
  },
  researchExposure: {
    label: "חשיפה למחקר",
    defaultExplanation: "הערכת החשיפה למחקר לפי חוויות ונתונים זמינים."
  },
  residentToAttendingRatio: {
    label: "יחס מתמחים לבכירים",
    defaultExplanation: "יחס משוער בין מספר המתמחים הפעילים למספר הרופאים הבכירים."
  },
  userRating: {
    label: "דירוג משתמשים",
    defaultExplanation: "ממוצע ההמלצה הכללית מתוך חוויות משתמשים מאושרות."
  },
  applicationsPerPosition: {
    label: "מועמדויות לכל משרה",
    defaultExplanation: "יחס בין מספר המועמדויות למספר המשרות כאשר הנתונים זמינים."
  },
  duns100PhysiciansCount: {
    label: "מספר רופאים ב-DUNS100",
    defaultExplanation: "רופאים שנספרו מנתוני DUNS100 ומוצגים כאינדיקציה לפעילות או לבולטות מקצועית."
  },
  medianElectiveDemand: {
    label: "מספר אלקטיביסטים חציוני",
    defaultExplanation: "מספר האלקטיביסטים החציוני המשמש אינדיקציה לביקוש למחלקה."
  },
  departmentalPublicationsCount: {
    label: "מספר פרסומים",
    defaultExplanation: "מספר הפרסומים המחלקתי לפי מקור המחקר המוצג."
  },
  hIndexEstimate: {
    label: "h-index",
    defaultExplanation: "אומדן h-index מחלקתי לפי נתוני המחקר הזמינים."
  },
  relativeDemandIndex: {
    label: "מדד ביקוש יחסי",
    defaultExplanation:
      "אחוז הסטאז׳רים המעוניינים במקצוע מתוך כלל הסטאז׳רים, חלקי אחוז המתמחים החדשים במקצוע מתוך כלל המתמחים החדשים בשנתיים האחרונות. ערך 1 מציין התאמה יחסית בין הביקוש לבין היקף הקליטה; ערך גבוה מ־1 מצביע על ביקוש גבוה ביחס להיקף הקליטה למקצוע.",
    format: "decimal-2"
  },
  custom: {
    label: "מדד מותאם",
    defaultExplanation: "מדד מותאם לפי ההגדרה המוצגת באתר."
  }
} as const;

export type MetricExplanationKey = keyof typeof metricExplanationRegistry;
export type MetricExplanationScope = "GLOBAL" | "SPECIALTY" | "DEPARTMENT";
export type MetricExplanationSource = MetricExplanationScope | "DEFAULT";

export type MetricExplanationOverrideRecord = {
  id: string;
  metricKey: string;
  scopeType: MetricExplanationScope;
  scopeKey: string;
  specialtyId: string | null;
  departmentId: string | null;
  text: string;
};

export type MetricExplanationContext = {
  specialtyId?: string | null;
  departmentId?: string | null;
};

export type ResolvedMetricExplanation = {
  metricKey: MetricExplanationKey;
  label: string;
  text: string;
  source: MetricExplanationSource;
  overrideId: string | null;
};

export const metricExplanationScopeLabels: Record<MetricExplanationScope, string> = {
  GLOBAL: "כל האתר",
  SPECIALTY: "רק תחום ההתמחות הזה",
  DEPARTMENT: "רק המחלקה/המערך הזה"
};

export const metricExplanationSourceLabels: Record<MetricExplanationSource, string> = {
  DEFAULT: "ברירת מחדל",
  GLOBAL: "כל האתר",
  SPECIALTY: "תחום ההתמחות",
  DEPARTMENT: "מחלקה/מערך"
};

export function isMetricExplanationKey(value: unknown): value is MetricExplanationKey {
  return typeof value === "string" && value in metricExplanationRegistry;
}

export function metricExplanationScopeKey(
  scopeType: MetricExplanationScope,
  context: MetricExplanationContext
) {
  if (scopeType === "GLOBAL") return "GLOBAL";
  if (scopeType === "SPECIALTY") return context.specialtyId ?? null;
  return context.departmentId ?? null;
}

export function findMetricExplanationOverride(
  metricKey: MetricExplanationKey,
  scopeType: MetricExplanationScope,
  context: MetricExplanationContext,
  overrides: MetricExplanationOverrideRecord[]
) {
  const scopeKey = metricExplanationScopeKey(scopeType, context);
  if (!scopeKey) return null;

  return overrides.find(
    (override) =>
      override.metricKey === metricKey &&
      override.scopeType === scopeType &&
      override.scopeKey === scopeKey
  ) ?? null;
}

export function resolveMetricExplanation(
  metricKey: MetricExplanationKey,
  context: MetricExplanationContext,
  overrides: MetricExplanationOverrideRecord[],
  defaultText?: string | null
): ResolvedMetricExplanation {
  const definition = metricExplanationRegistry[metricKey];
  const priorities: MetricExplanationScope[] = ["DEPARTMENT", "SPECIALTY", "GLOBAL"];

  for (const scopeType of priorities) {
    const override = findMetricExplanationOverride(metricKey, scopeType, context, overrides);
    if (override?.text.trim()) {
      return {
        metricKey,
        label: definition.label,
        text: override.text.trim(),
        source: scopeType,
        overrideId: override.id
      };
    }
  }

  return {
    metricKey,
    label: definition.label,
    text: defaultText?.trim() || definition.defaultExplanation,
    source: "DEFAULT",
    overrideId: null
  };
}

export function canManageMetricExplanations(session: { role?: string | null } | null | undefined) {
  return session?.role === "admin";
}
