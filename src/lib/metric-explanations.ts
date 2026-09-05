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
      "אחוז הסטאז׳רים המעוניינים במקצוע מתוך כלל הסטאז׳רים, חלקי אחוז המתמחים במקצוע מתוך כלל המתמחים. ערך 1 מציין התאמה יחסית בין הביקוש לבין גודל המקצוע; ככל שהערך גבוה מ־1, הביקוש היחסי למקצוע גבוה יותר.",
    defaultSourceLabel: "נתוני MASTER_Spec",
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
  text: string | null;
  title: string | null;
  explanation: string | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
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

export type MetricContentField = "title" | "explanation" | "sourceLabel" | "sourceUrl";

export type MetricContentProvenance = {
  source: MetricExplanationSource;
  overrideId: string | null;
};

export type ResolvedMetricContent = {
  metricKey: MetricExplanationKey;
  title: string;
  explanation: string;
  sourceLabel: string | null;
  sourceUrl: string | null;
  provenance: Record<MetricContentField, MetricContentProvenance>;
};

export type MetricContentDefaults = {
  title?: string | null;
  explanation?: string | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
};

export type MetricRichTextSegment = {
  text: string;
  bold: boolean;
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

function trimmedOrNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function overrideFieldValue(
  override: MetricExplanationOverrideRecord,
  field: MetricContentField
) {
  if (field === "explanation") {
    return override.explanation ?? override.text;
  }
  return override[field];
}

export function resolveMetricContent(
  metricKey: MetricExplanationKey,
  context: MetricExplanationContext,
  overrides: MetricExplanationOverrideRecord[],
  defaults: MetricContentDefaults = {}
): ResolvedMetricContent {
  const definition = metricExplanationRegistry[metricKey];
  const definitionWithSources = definition as typeof definition & {
    defaultSourceLabel?: string;
    defaultSourceUrl?: string;
  };
  const registrySourceLabel = definitionWithSources.defaultSourceLabel ?? null;
  const registrySourceUrl = definitionWithSources.defaultSourceUrl ?? null;
  const content: Pick<ResolvedMetricContent, MetricContentField> = {
    title: trimmedOrNull(defaults.title) ?? definition.label,
    explanation: trimmedOrNull(defaults.explanation) ?? definition.defaultExplanation,
    sourceLabel: trimmedOrNull(defaults.sourceLabel) ?? registrySourceLabel,
    sourceUrl: defaults.sourceUrl === ""
      ? null
      : trimmedOrNull(defaults.sourceUrl) ?? registrySourceUrl
  };
  const provenance = Object.fromEntries(
    (["title", "explanation", "sourceLabel", "sourceUrl"] as MetricContentField[]).map(
      (field) => [field, { source: "DEFAULT", overrideId: null }]
    )
  ) as Record<MetricContentField, MetricContentProvenance>;

  for (const scopeType of ["GLOBAL", "SPECIALTY", "DEPARTMENT"] as MetricExplanationScope[]) {
    const override = findMetricExplanationOverride(metricKey, scopeType, context, overrides);
    if (!override) continue;

    for (const field of ["title", "explanation", "sourceLabel", "sourceUrl"] as MetricContentField[]) {
      const rawValue = overrideFieldValue(override, field);
      if (rawValue === null || rawValue === undefined) continue;

      if (field === "sourceUrl" && rawValue.trim() === "") {
        content.sourceUrl = null;
      } else {
        const value = trimmedOrNull(rawValue);
        if (!value) continue;
        content[field] = value;
      }
      provenance[field] = { source: scopeType, overrideId: override.id };
    }
  }

  return { metricKey, ...content, provenance };
}

export function resolveMetricExplanation(
  metricKey: MetricExplanationKey,
  context: MetricExplanationContext,
  overrides: MetricExplanationOverrideRecord[],
  defaultText?: string | null
): ResolvedMetricExplanation {
  const resolution = resolveMetricContent(metricKey, context, overrides, {
    explanation: defaultText
  });
  return {
    metricKey,
    label: resolution.title,
    text: resolution.explanation,
    source: resolution.provenance.explanation.source,
    overrideId: resolution.provenance.explanation.overrideId
  };
}

export function parseMetricRichText(value: string): MetricRichTextSegment[] {
  const delimiterCount = value.match(/\*\*/g)?.length ?? 0;
  if (delimiterCount % 2 !== 0) {
    return [{ text: value, bold: false }];
  }

  const segments: MetricRichTextSegment[] = [];
  let cursor = 0;
  let bold = false;

  while (cursor < value.length) {
    const delimiterIndex = value.indexOf("**", cursor);
    if (delimiterIndex === -1) {
      if (cursor < value.length) segments.push({ text: value.slice(cursor), bold });
      break;
    }
    if (delimiterIndex > cursor) {
      segments.push({ text: value.slice(cursor, delimiterIndex), bold });
    }
    bold = !bold;
    cursor = delimiterIndex + 2;
  }

  return segments;
}

export function metricRichTextToPlainText(value: string) {
  return parseMetricRichText(value).map((segment) => segment.text).join("");
}

export function toggleMetricBoldMarkup(value: string, selectionStart: number, selectionEnd: number) {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const hasWrappingMarkers =
    start >= 2 && value.slice(start - 2, start) === "**" && value.slice(end, end + 2) === "**";

  if (hasWrappingMarkers) {
    return {
      value: `${value.slice(0, start - 2)}${value.slice(start, end)}${value.slice(end + 2)}`,
      selectionStart: start - 2,
      selectionEnd: end - 2
    };
  }

  return {
    value: `${value.slice(0, start)}**${value.slice(start, end)}**${value.slice(end)}`,
    selectionStart: start + 2,
    selectionEnd: end + 2
  };
}

export function isValidMetricSourceUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return true;

  try {
    const url = new URL(trimmed);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function canManageMetricExplanations(session: { role?: string | null } | null | undefined) {
  return session?.role === "admin";
}
