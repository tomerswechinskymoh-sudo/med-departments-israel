export type ExtractedFellowshipTraining = {
  rawText: string;
  institution: string | null;
  country: string | null;
  years: string | null;
};

export type ExtractedTraining = {
  medicalSchool: string | null;
  residencySpecialty: string | null;
  residencyInstitution: string | null;
  residencyYears: string | null;
  fellowships: ExtractedFellowshipTraining[];
};

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sentences(text: string) {
  return compactText(text)
    .split(/(?<=[.!?])\s+|[\n\r]+|(?<=\.)\s+(?=[A-Z])|(?<=\u05D4\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return compactText(match[1]);
  }

  return null;
}

function yearsFromText(text: string) {
  const range = text.match(/(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}/);
  if (range) return range[0].replace(/[–—]/g, "-");

  const year = text.match(/\b(?:19|20)\d{2}\b/);
  return year?.[0] ?? null;
}

function countryFromText(text: string) {
  const countries = [
    ["United States", /\b(?:USA|U\.S\.A\.|United States|US)\b/i],
    ["Canada", /\bCanada\b/i],
    ["United Kingdom", /\b(?:UK|United Kingdom|England|London)\b/i],
    ["Australia", /\bAustralia\b/i],
    ["France", /\bFrance\b/i],
    ["Germany", /\bGermany\b/i],
    ["Israel", /\bIsrael\b|ישראל/]
  ] as const;

  return countries.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

function institutionFromSentence(sentence: string) {
  return firstMatch(sentence, [
    /\bat\s+([^.;,]+(?:Hospital|University|Clinic|Center|Centre|Institute|School|College)[^.;]*)/i,
    /\bfrom\s+([^.;,]+(?:Hospital|University|Clinic|Center|Centre|Institute|School|College)[^.;]*)/i,
    /ב(?:בית החולים|מרכז רפואי|אוניברסיטת|אוניברסיטה|המרכז הרפואי)\s+([^.;,\n]+)/,
    /ב-([^.;,\n]+(?:Hospital|University|Clinic|Center|Centre|Institute|School|College)[^.;]*)/i
  ]);
}

function residencyFromText(text: string) {
  const residencySentence = sentences(text).find((sentence) =>
    /residenc|training in otolaryngology|speciali[sz]ed in|התמחות|התמחה/i.test(sentence)
  );

  if (!residencySentence) {
    return {
      residencySpecialty: null,
      residencyInstitution: null,
      residencyYears: null
    };
  }

  const specialty = firstMatch(residencySentence, [
    /residency in ([^.;,]+?)(?: at| from|,|\.)/i,
    /training in ([^.;,]+?)(?: at| from|,|\.)/i,
    /speciali[sz]ed in ([^.;,]+?)(?: at| from|,|\.)/i,
    /התמחות\s+ב([^.;,\n]+?)(?:\s+ב|\s+ב-|,|\.|$)/
  ]);

  return {
    residencySpecialty: specialty ?? (/otolaryngology|ENT|אף אוזן גרון|אא"?ג/i.test(residencySentence) ? "ENT / Otolaryngology" : null),
    residencyInstitution: institutionFromSentence(residencySentence),
    residencyYears: yearsFromText(residencySentence)
  };
}

function fellowshipSentences(text: string) {
  return sentences(text).filter((sentence) =>
    /fellowship|clinical fellowship|התמחות-על|התמחות על|תת-התמחות|השתלמות עמיתים|פלושיפ/i.test(sentence)
  );
}

export function extractTraining(text: string): ExtractedTraining {
  const cleanText = compactText(text);
  const medicalSchool = firstMatch(cleanText, [
    /medical degree (?:from|at)\s+([^.;]+)/i,
    /graduated from\s+([^.;]+(?:School of Medicine|Faculty of Medicine|University)[^.;]*)/i,
    /לימודי רפואה ב([^.;,\n]+)/,
    /בוגר(?:ת)?\s+([^.;,\n]+(?:רפואה|אוניברסיטה|טכניון)[^.;,\n]*)/
  ]);
  const residency = residencyFromText(cleanText);
  const fellowships = fellowshipSentences(cleanText).map((sentence) => ({
    rawText: sentence,
    institution: institutionFromSentence(sentence),
    country: countryFromText(sentence),
    years: yearsFromText(sentence)
  }));

  return {
    medicalSchool,
    ...residency,
    fellowships
  };
}

export function extractListAfterHeading(text: string, headingPatterns: RegExp[]) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const index = lines.findIndex((line) => headingPatterns.some((pattern) => pattern.test(line)));
  if (index < 0) return [];

  const values: string[] = [];
  for (const line of lines.slice(index + 1)) {
    if (/^(Position|Role|Department|Education|Publications|Contact|תפקיד|מחלקה|השכלה|פרסומים|צור קשר)$/i.test(line)) {
      break;
    }
    values.push(line);
    if (values.length >= 10) break;
  }

  return values;
}
