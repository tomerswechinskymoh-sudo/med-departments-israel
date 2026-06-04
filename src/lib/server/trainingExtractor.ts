export type ExtractedTrainingType =
  | "fellowship"
  | "subspecialty_training"
  | "residency"
  | "course"
  | "clinical_training"
  | "education";

export type ExtractedFellowshipTraining = {
  rawText: string;
  institution: string | null;
  country: string | null;
  years: string | null;
  trainingType?: ExtractedTrainingType;
  confidenceScore?: number;
  sourceLine?: string;
  section?: string | null;
};

export type TrainingExtractionDiagnostics = {
  educationSectionLength: number;
  clinicalExperienceSectionLength: number;
  curriculumSectionLength: number;
  detected: boolean;
  extractedLines: string[];
  rejectionReason: string | null;
  normalizedBioPreview: string | null;
};

export type ExtractedTraining = {
  medicalSchool: string | null;
  residencySpecialty: string | null;
  residencyInstitution: string | null;
  residencyYears: string | null;
  fellowships: ExtractedFellowshipTraining[];
  diagnostics?: TrainingExtractionDiagnostics;
};

const SECTION_HEADINGS = [
  "השכלה",
  "ניסיון קליני",
  "קורות חיים",
  "Education",
  "Clinical Experience",
  "Curriculum Vitae",
  "CV"
];

const STOP_HEADINGS = [
  "תחומי מומחיות",
  "תחומי עניין קליניים",
  "פרסומים",
  "איגודים מקצועיים",
  "צור קשר",
  "תפקיד",
  "מחלקה",
  "Areas of Expertise",
  "Clinical Interests",
  "Publications",
  "Professional Societies",
  "Memberships",
  "Contact",
  "Position",
  "Role",
  "Department"
];

const TRAINING_PATTERNS = [
  /התמחות[-\s]?על/i,
  /התמחות\s+על/i,
  /תת[-\s]?התמחות/i,
  /השתלמות\s+עמיתים/i,
  /השתלמות/i,
  /פלושיפ/i,
  /התמחות/i,
  /\bfellowship\b/i,
  /\bclinical fellowship\b/i,
  /\badvanced training\b/i,
  /\bvisiting fellowship\b/i,
  /\bsubspecialty training\b/i,
  /\boverseas training\b/i,
  /\bpostdoctoral clinical training\b/i,
  /\bresidency\b/i,
  /\bclinical training\b/i,
  /\bcourse\b/i,
  /קורס/i
];

const FOREIGN_OR_INSTITUTION_PATTERNS = [
  /ארה["״]?ב|ארצות הברית|ניו יורק|מינסוטה|רוצ'סטר|בוסטון|פילדלפיה|לונדון|קנדה|אנגליה|צרפת|פריז|גרמניה|אוסטרליה/i,
  /\bUSA\b|\bU\.S\.A\.\b|United States|New York|Minnesota|Rochester|Boston|Philadelphia|London|Canada|England|France|Paris|Germany|Australia/i,
  /מאיו קליניק|Mayo Clinic|בית ישראל|Beth Israel|Tenon|סוראסקי|Sourasky|Harvard|Massachusetts|Memorial Sloan|Johns Hopkins|Cleveland Clinic/i,
  /Hospital|University|Clinic|Center|Centre|Institute|School|College/i,
  /בית החולים|מרכז רפואי|אוניברסיט(?:ה|ת)|קליניק|מכון/i
];

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeLine(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[־–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedLines(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split(/\n+|(?<=\.)\s+(?=(?:19|20)\d{2}\s*[-–—]|(?:התמחות|השתלמות|קורס|fellowship|clinical|residency))/i)
    .map(normalizeLine)
    .filter(Boolean);
}

function isHeading(line: string, headings: string[]) {
  const clean = normalizeLine(line).replace(/:$/, "");
  return headings.some((heading) => clean.toLocaleLowerCase("he") === heading.toLocaleLowerCase("he"));
}

function sectionLines(lines: string[], headingPatterns: RegExp[]) {
  const matches: Array<{ heading: string; lines: string[] }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!headingPatterns.some((pattern) => pattern.test(line))) continue;

    const values: string[] = [];
    for (const next of lines.slice(index + 1)) {
      if (isHeading(next, STOP_HEADINGS) || isHeading(next, SECTION_HEADINGS)) break;
      values.push(next);
      if (values.join(" ").length > 5000) break;
    }
    matches.push({ heading: line.replace(/:$/, ""), lines: values });
  }

  return matches;
}

function allTrainingWindows(lines: string[]) {
  const windows: Array<{ text: string; sourceLine: string; section: string | null }> = [];
  const sections = sectionLines(lines, [
    /^השכלה:?$/i,
    /^ניסיון קליני:?$/i,
    /^קורות חיים:?$/i,
    /^Education:?$/i,
    /^Clinical Experience:?$/i,
    /^Curriculum Vitae:?$/i,
    /^CV:?$/i
  ]);
  const scopedLines = sections.length > 0
    ? sections.flatMap((section) => section.lines.map((line) => ({ line, section: section.heading })))
    : lines.map((line) => ({ line, section: null }));

  for (let index = 0; index < scopedLines.length; index += 1) {
    const current = scopedLines[index];
    if (!current) continue;
    const previous = scopedLines[index - 1];
    const next = scopedLines[index + 1];
    const variants = [current.line];
    if (previous && sameSection(previous.section, current.section) && isYearOnlyLine(previous.line)) {
      variants.push(`${previous.line}, ${current.line}`);
    }
    if (next && sameSection(next.section, current.section) && isYearOnlyLine(current.line)) {
      variants.push(`${current.line}, ${next.line}`);
    }

    for (const variant of variants) {
      windows.push({
        text: normalizeLine(variant),
        sourceLine: current.line,
        section: current.section
      });
    }
  }

  return dedupeByText(windows);
}

function isYearOnlyLine(line: string) {
  return /^(?:19|20)\d{2}\s*(?:[-–—]\s*(?:כיום|היום|present|current|(?:19|20)\d{2}))?$/i.test(line.trim());
}

function sameSection(left: string | null, right: string | null) {
  return (left ?? "") === (right ?? "");
}

function dedupeByText<T extends { text: string }>(items: T[]) {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const key = item.text.toLocaleLowerCase("he");
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return compactText(match[1]);
  }

  return null;
}

function yearsFromText(text: string) {
  const range = text.match(/(?:19|20)\d{2}\s*[-–—]\s*(?:כיום|היום|present|current|(?:19|20)\d{2})/i);
  if (range) return normalizeLine(range[0]);

  const reversedOrOdd = text.match(/(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}/);
  if (reversedOrOdd) return normalizeLine(reversedOrOdd[0]);

  const year = text.match(/\b(?:19|20)\d{2}\b/);
  return year?.[0] ?? null;
}

function countryFromText(text: string) {
  const countries = [
    ["ארה\"ב", /ארה["״]?ב|ארצות הברית|\b(?:USA|U\.S\.A\.|United States|US)\b|New York|Minnesota|Rochester|Boston|Philadelphia|פילדלפיה/i],
    ["Canada", /\bCanada\b|קנדה/i],
    ["United Kingdom", /\b(?:UK|United Kingdom|England|London)\b|אנגליה|לונדון/i],
    ["Australia", /\bAustralia\b|אוסטרליה/i],
    ["France", /\bFrance\b|Paris|צרפת|פריז/i],
    ["Germany", /\bGermany\b|גרמניה/i],
    ["Israel", /\bIsrael\b|ישראל/]
  ] as const;

  return countries.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

function institutionFromSentence(sentence: string) {
  const known = [
    "בית ישראל",
    "Beth Israel",
    "מאיו קליניק",
    "Mayo Clinic",
    "Tenon",
    "מרכז רפואי סוראסקי",
    "סוראסקי",
    "Memorial Sloan Kettering",
    "Johns Hopkins",
    "Cleveland Clinic",
    "Harvard",
    "Massachusetts Eye and Ear"
  ];
  const knownMatch = known.find((name) => new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(sentence));
  if (knownMatch) return knownMatch;

  return firstMatch(sentence, [
    /\bat\s+([^.;\n]+(?:Hospital|University|Clinic|Center|Centre|Institute|School|College)[^.;\n]*)/i,
    /\bfrom\s+([^.;\n]+(?:Hospital|University|Clinic|Center|Centre|Institute|School|College)[^.;\n]*)/i,
    /ב(?:בית החולים|מרכז רפואי|אוניברסיטת|אוניברסיטה|המרכז הרפואי|קליניק)\s+([^.;\n]+)/,
    /ב-([^.;\n]+(?:Hospital|University|Clinic|Center|Centre|Institute|School|College)[^.;\n]*)/i,
    /,\s*([^,;\n]+(?:Hospital|University|Clinic|Center|Centre|Institute|School|College|קליניק|בית חולים)[^,;\n]*)/i
  ]);
}

function trainingTypeFromText(text: string): ExtractedTrainingType {
  if (/התמחות[-\s]?על|התמחות\s+על|תת[-\s]?התמחות|\bfellowship\b|subspecialty training|advanced training|postdoctoral clinical training/i.test(text)) {
    return "fellowship";
  }
  if (/השתלמות\s+עמיתים|visiting fellowship/i.test(text)) return "subspecialty_training";
  if (/השתלמות|overseas training|clinical training/i.test(text)) return "clinical_training";
  if (/קורס|\bcourse\b/i.test(text)) return "course";
  if (/התמחות|\bresidency\b/i.test(text)) return "residency";
  return "education";
}

function confidenceForTrainingLine(text: string, section: string | null) {
  let score = 0.35;
  if (TRAINING_PATTERNS.some((pattern) => pattern.test(text))) score += 0.25;
  if (yearsFromText(text)) score += 0.15;
  if (institutionFromSentence(text)) score += 0.1;
  if (countryFromText(text) && countryFromText(text) !== "Israel") score += 0.1;
  if (section && /השכלה|ניסיון קליני|קורות חיים|Education|Clinical Experience|CV/i.test(section)) score += 0.05;

  return Math.min(0.98, Number(score.toFixed(2)));
}

function isTrainingLine(text: string) {
  if (!TRAINING_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (/תחומי\s+התמחות|מומחיות|Specialties/i.test(text) && !yearsFromText(text)) return false;
  if (text.length < 8) return false;

  return yearsFromText(text) !== null || FOREIGN_OR_INSTITUTION_PATTERNS.some((pattern) => pattern.test(text)) || /התמחות[-\s]?על|fellowship|השתלמות/.test(text);
}

function residencyFromTrainingLines(lines: ExtractedFellowshipTraining[]) {
  const residency = lines.find((line) => line.trainingType === "residency");
  if (!residency) {
    return {
      residencySpecialty: null,
      residencyInstitution: null,
      residencyYears: null
    };
  }

  const specialty = firstMatch(residency.rawText, [
    /residency in ([^.;,]+?)(?: at| from|,|\.|$)/i,
    /training in ([^.;,]+?)(?: at| from|,|\.|$)/i,
    /speciali[sz]ed in ([^.;,]+?)(?: at| from|,|\.|$)/i,
    /התמחות\s+ב([^.;,\n]+?)(?:\s+ב|\s+ב-|,|\.|$)/
  ]);

  return {
    residencySpecialty:
      specialty ?? (/otolaryngology|ENT|אף אוזן גרון|אא"?ג|מחלות אא/i.test(residency.rawText) ? "ENT / Otolaryngology" : null),
    residencyInstitution: residency.institution,
    residencyYears: residency.years
  };
}

function medicalSchoolFromText(text: string) {
  return firstMatch(compactText(text), [
    /medical degree (?:from|at)\s+([^.;]+)/i,
    /graduated from\s+([^.;]+(?:School of Medicine|Faculty of Medicine|University)[^.;]*)/i,
    /לימודי רפואה ב([^.;,\n]+)/,
    /בוגר(?:ת)?\s+([^.;,\n]+(?:רפואה|אוניברסיטה|טכניון)[^.;,\n]*)/
  ]);
}

export function extractTraining(text: string): ExtractedTraining {
  const lines = normalizedLines(text);
  const educationSections = sectionLines(lines, [/^השכלה:?$/i, /^Education:?$/i]);
  const clinicalSections = sectionLines(lines, [/^ניסיון קליני:?$/i, /^Clinical Experience:?$/i]);
  const curriculumSections = sectionLines(lines, [/^קורות חיים:?$/i, /^Curriculum Vitae:?$/i, /^CV:?$/i]);
  const windows = allTrainingWindows(lines);
  const fellowships = dedupeByText(
    windows
      .filter((window) => isTrainingLine(window.text))
      .map((window) => ({
        text: window.text,
        rawText: window.text,
        institution: institutionFromSentence(window.text),
        country: countryFromText(window.text),
        years: yearsFromText(window.text),
        trainingType: trainingTypeFromText(window.text),
        confidenceScore: confidenceForTrainingLine(window.text, window.section),
        sourceLine: window.sourceLine,
        section: window.section
      }))
  ).map(({ text: _text, ...line }) => line);
  const residency = residencyFromTrainingLines(fellowships);
  const extractedLines = fellowships.map((line) => line.rawText);
  const sectionLength = (sections: Array<{ lines: string[] }>) => sections.map((section) => section.lines.join("\n")).join("\n").length;
  const normalizedBio = compactText(text);

  return {
    medicalSchool: medicalSchoolFromText(text),
    ...residency,
    fellowships,
    diagnostics: {
      educationSectionLength: sectionLength(educationSections),
      clinicalExperienceSectionLength: sectionLength(clinicalSections),
      curriculumSectionLength: sectionLength(curriculumSections),
      detected: fellowships.length > 0,
      extractedLines,
      rejectionReason:
        fellowships.length > 0
          ? null
          : "No training line matched section-aware training/fellowship/residency patterns.",
      normalizedBioPreview: fellowships.length > 0 ? null : normalizedBio.slice(0, 1000)
    }
  };
}

export function extractListAfterHeading(text: string, headingPatterns: RegExp[]) {
  const lines = normalizedLines(text);
  const index = lines.findIndex((line) => headingPatterns.some((pattern) => pattern.test(line)));
  if (index < 0) return [];

  const values: string[] = [];
  for (const line of lines.slice(index + 1)) {
    if (isHeading(line, STOP_HEADINGS) || isHeading(line, SECTION_HEADINGS)) {
      break;
    }
    values.push(line);
    if (values.length >= 10) break;
  }

  return values;
}
