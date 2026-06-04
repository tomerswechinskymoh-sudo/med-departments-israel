export type FellowshipConfidence = "Very High" | "High" | "Medium" | "Low";

export type FellowshipDictionaryEntry = {
  entity_type: "fellowship";
  fellowshipId: string;
  canonical_name_he: string;
  canonical_name_en: string;
  aliases: string[];
  alias_type: "canonical" | "synonym" | "procedure" | "subspecialty";
  match_strength: "strong" | "medium" | "weak";
  crawler_priority: number;
  specialty_group: "ENT";
  parent_specialty: "ENT";
};

export type TriggerDictionaryEntry = {
  fellowship_id: string;
  trigger_text: string;
  trigger_type: "direct_fellowship" | "field" | "procedure" | "interest" | "role";
  match_strength: "strong" | "medium" | "weak";
  score: number;
  specialty_group: "ENT";
  notes?: string;
};

export type DetectedFellowship = {
  fellowshipId: string;
  canonicalNameHe: string;
  canonicalNameEn: string;
  totalScore: number;
  confidence: FellowshipConfidence;
  evidenceSnippets: string[];
};

export const ENT_FELLOWSHIPS: FellowshipDictionaryEntry[] = [
  {
    entity_type: "fellowship",
    fellowshipId: "ENT_LARYNGOLOGY",
    canonical_name_he: "לרינגולוגיה וקול",
    canonical_name_en: "Laryngology",
    aliases: ["laryngology", "voice", "airway", "swallowing", "מיתרי קול", "קול ובליעה", "לרינגולוגיה"],
    alias_type: "subspecialty",
    match_strength: "strong",
    crawler_priority: 1,
    specialty_group: "ENT",
    parent_specialty: "ENT"
  },
  {
    entity_type: "fellowship",
    fellowshipId: "ENT_NEUROTOLOGY",
    canonical_name_he: "נוירואוטולוגיה ואוטולוגיה",
    canonical_name_en: "Neurotology / Otology",
    aliases: ["neurotology", "otology", "cochlear implant", "hearing implants", "אוטולוגיה", "נוירואוטולוגיה", "שתלי שבלול"],
    alias_type: "subspecialty",
    match_strength: "strong",
    crawler_priority: 1,
    specialty_group: "ENT",
    parent_specialty: "ENT"
  },
  {
    entity_type: "fellowship",
    fellowshipId: "ENT_RHINOLOGY",
    canonical_name_he: "רינולוגיה וסינוסים",
    canonical_name_en: "Rhinology",
    aliases: ["rhinology", "sinus surgery", "endoscopic sinus", "רינולוגיה", "סינוסים", "ניתוחי אף וסינוסים"],
    alias_type: "subspecialty",
    match_strength: "strong",
    crawler_priority: 1,
    specialty_group: "ENT",
    parent_specialty: "ENT"
  },
  {
    entity_type: "fellowship",
    fellowshipId: "ENT_PEDIATRIC",
    canonical_name_he: "אא״ג ילדים",
    canonical_name_en: "Pediatric Otolaryngology",
    aliases: ["pediatric otolaryngology", "pediatric ent", "paediatric ent", "אף אוזן גרון ילדים", "אא\"ג ילדים"],
    alias_type: "subspecialty",
    match_strength: "strong",
    crawler_priority: 2,
    specialty_group: "ENT",
    parent_specialty: "ENT"
  },
  {
    entity_type: "fellowship",
    fellowshipId: "ENT_HEAD_NECK",
    canonical_name_he: "ראש וצוואר ואונקולוגיה",
    canonical_name_en: "Head and Neck Oncology",
    aliases: [
      "head and neck oncology",
      "head and neck surgery",
      "גידולי ראש צוואר",
      "כירורגיית ראש וצוואר",
      "מחלות אאג וכירורגיה של ראש-צוואר",
      "מחלות אא\"ג וכירורגיה של ראש-צוואר",
      "ניתוחים אונקולוגיים",
      "אונקולוגיים ושחזורים"
    ],
    alias_type: "subspecialty",
    match_strength: "strong",
    crawler_priority: 1,
    specialty_group: "ENT",
    parent_specialty: "ENT"
  },
  {
    entity_type: "fellowship",
    fellowshipId: "ENT_MICROVASCULAR",
    canonical_name_he: "שחזורים מיקרווסקולריים",
    canonical_name_en: "Microvascular Reconstruction",
    aliases: [
      "microvascular reconstruction",
      "free flap",
      "reconstructive surgery",
      "שחזור מיקרווסקולרי",
      "מתלה חופשי",
      "שחזורים פלסטיים",
      "שחזורים פלסטיים מורכבים"
    ],
    alias_type: "procedure",
    match_strength: "medium",
    crawler_priority: 3,
    specialty_group: "ENT",
    parent_specialty: "ENT"
  },
  {
    entity_type: "fellowship",
    fellowshipId: "ENT_SLEEP",
    canonical_name_he: "רפואת שינה וניתוחי שינה",
    canonical_name_en: "Sleep Surgery",
    aliases: ["sleep surgery", "sleep apnea", "snoring", "ניתוחי שינה", "דום נשימה בשינה", "נחירות"],
    alias_type: "subspecialty",
    match_strength: "medium",
    crawler_priority: 4,
    specialty_group: "ENT",
    parent_specialty: "ENT"
  },
  {
    entity_type: "fellowship",
    fellowshipId: "ENT_FACIAL_PLASTICS",
    canonical_name_he: "פלסטיקה ושחזור פנים",
    canonical_name_en: "Facial Plastic and Reconstructive Surgery",
    aliases: ["facial plastic", "facial reconstructive", "פלסטיקה של הפנים", "שחזור פנים"],
    alias_type: "subspecialty",
    match_strength: "medium",
    crawler_priority: 4,
    specialty_group: "ENT",
    parent_specialty: "ENT"
  },
  {
    entity_type: "fellowship",
    fellowshipId: "ENT_RHINOPLASTY",
    canonical_name_he: "ניתוחי אף ורינופלסטיקה",
    canonical_name_en: "Rhinoplasty",
    aliases: ["rhinoplasty", "nasal surgery", "ניתוחי אף", "רינופלסטיקה"],
    alias_type: "procedure",
    match_strength: "medium",
    crawler_priority: 5,
    specialty_group: "ENT",
    parent_specialty: "ENT"
  },
  {
    entity_type: "fellowship",
    fellowshipId: "ENT_ANTERIOR_SKULL_BASE",
    canonical_name_he: "בסיס גולגולת קדמי",
    canonical_name_en: "Anterior Skull Base",
    aliases: ["anterior skull base", "endoscopic skull base", "בסיס גולגולת קדמי", "בסיס הגולגולת בגישה אנדוסקופית"],
    alias_type: "subspecialty",
    match_strength: "strong",
    crawler_priority: 2,
    specialty_group: "ENT",
    parent_specialty: "ENT"
  },
  {
    entity_type: "fellowship",
    fellowshipId: "ENT_LATERAL_SKULL_BASE",
    canonical_name_he: "בסיס גולגולת לטרלי",
    canonical_name_en: "Lateral Skull Base",
    aliases: ["lateral skull base", "skull base surgery", "בסיס גולגולת לטרלי", "בסיס גולגולת צידי"],
    alias_type: "subspecialty",
    match_strength: "strong",
    crawler_priority: 2,
    specialty_group: "ENT",
    parent_specialty: "ENT"
  },
  {
    entity_type: "fellowship",
    fellowshipId: "ENT_TORS",
    canonical_name_he: "ניתוחים רובוטיים דרך הפה",
    canonical_name_en: "Transoral Robotic Surgery",
    aliases: ["transoral robotic surgery", "TORS", "robotic surgery", "ניתוחים רובוטיים", "כירורגיה רובוטית דרך הפה"],
    alias_type: "procedure",
    match_strength: "medium",
    crawler_priority: 5,
    specialty_group: "ENT",
    parent_specialty: "ENT"
  },
  {
    entity_type: "fellowship",
    fellowshipId: "ENT_THYROID",
    canonical_name_he: "בלוטת התריס ופאראתירואיד",
    canonical_name_en: "Thyroid and Parathyroid Surgery",
    aliases: ["thyroid surgery", "parathyroid surgery", "endocrine head and neck", "בלוטת התריס", "פאראתירואיד"],
    alias_type: "subspecialty",
    match_strength: "medium",
    crawler_priority: 5,
    specialty_group: "ENT",
    parent_specialty: "ENT"
  }
];

const directFellowshipPrefixes = [
  "fellowship in",
  "clinical fellowship in",
  "completed a fellowship in",
  "completed fellowship in",
  "התמחות-על ב",
  "התמחות על ב",
  "תת-התמחות ב",
  "השתלמות עמיתים ב",
  "פלושיפ ב"
];

export const ENT_TRIGGER_DICTIONARY: TriggerDictionaryEntry[] = ENT_FELLOWSHIPS.flatMap((entry) => {
  const aliasTriggers = entry.aliases.map((alias) => ({
    fellowship_id: entry.fellowshipId,
    trigger_text: alias,
    trigger_type: "field" as const,
    match_strength: entry.match_strength,
    score: entry.match_strength === "strong" ? 7 : entry.match_strength === "medium" ? 5 : 3,
    specialty_group: "ENT" as const,
    notes: "Alias match"
  }));
  const directTriggers = entry.aliases.flatMap((alias) =>
    directFellowshipPrefixes.map((prefix) => ({
      fellowship_id: entry.fellowshipId,
      trigger_text: `${prefix} ${alias}`,
      trigger_type: "direct_fellowship" as const,
      match_strength: "strong" as const,
      score: 10,
      specialty_group: "ENT" as const,
      notes: "Direct fellowship evidence"
    }))
  );

  return [...directTriggers, ...aliasTriggers];
});

const confidenceRank: Record<FellowshipConfidence, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  "Very High": 4
};

export function normalizeFellowshipText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[״"׳'`]/g, "")
    .replace(/[–—־]/g, "-")
    .replace(/[^\p{L}\p{N}+#.-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("he");
}

function evidenceSnippet(text: string, triggerText: string) {
  const lowerText = text.toLocaleLowerCase("he");
  const lowerTrigger = triggerText.toLocaleLowerCase("he");
  const directIndex = lowerText.indexOf(lowerTrigger);
  const fallbackToken = lowerTrigger.split(/\s+/).find((token) => token.length >= 4);
  const fallbackIndex = fallbackToken ? lowerText.indexOf(fallbackToken) : -1;
  const index = directIndex >= 0 ? directIndex : fallbackIndex;

  if (index < 0) return triggerText;

  const start = Math.max(0, index - 90);
  const end = Math.min(text.length, index + triggerText.length + 110);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";

  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

function confidenceForScore(totalScore: number, hasDirectFellowshipEvidence: boolean): FellowshipConfidence {
  if (hasDirectFellowshipEvidence) return "Very High";
  if (totalScore >= 18) return "High";
  if (totalScore >= 10) return "Medium";
  return "Low";
}

export function hasConfidenceAtLeast(value: FellowshipConfidence | null | undefined, threshold: FellowshipConfidence) {
  if (!value) return false;
  return confidenceRank[value] >= confidenceRank[threshold];
}

export function matchEntFellowships(text: string): DetectedFellowship[] {
  const normalizedText = normalizeFellowshipText(text);
  const scores = new Map<
    string,
    {
      totalScore: number;
      evidenceSnippets: string[];
      hasDirectFellowshipEvidence: boolean;
    }
  >();

  for (const trigger of ENT_TRIGGER_DICTIONARY.filter((item) => item.specialty_group === "ENT")) {
    const normalizedTrigger = normalizeFellowshipText(trigger.trigger_text);
    if (!normalizedTrigger || !normalizedText.includes(normalizedTrigger)) continue;

    const current = scores.get(trigger.fellowship_id) ?? {
      totalScore: 0,
      evidenceSnippets: [],
      hasDirectFellowshipEvidence: false
    };
    current.totalScore += trigger.score;
    current.hasDirectFellowshipEvidence ||= trigger.trigger_type === "direct_fellowship" && trigger.score >= 10;
    const snippet = evidenceSnippet(text, trigger.trigger_text);
    if (!current.evidenceSnippets.includes(snippet)) {
      current.evidenceSnippets.push(snippet);
    }
    scores.set(trigger.fellowship_id, current);
  }

  return Array.from(scores.entries())
    .map(([fellowshipId, result]) => {
      const dictionaryEntry = ENT_FELLOWSHIPS.find((entry) => entry.fellowshipId === fellowshipId);

      return {
        fellowshipId,
        canonicalNameHe: dictionaryEntry?.canonical_name_he ?? fellowshipId,
        canonicalNameEn: dictionaryEntry?.canonical_name_en ?? fellowshipId,
        totalScore: result.totalScore,
        confidence: confidenceForScore(result.totalScore, result.hasDirectFellowshipEvidence),
        evidenceSnippets: result.evidenceSnippets.slice(0, 5)
      };
    })
    .sort((left, right) => right.totalScore - left.totalScore || right.evidenceSnippets.length - left.evidenceSnippets.length);
}
