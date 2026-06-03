import * as cheerio from "cheerio";
import {
  hasConfidenceAtLeast,
  matchEntFellowships,
  type DetectedFellowship
} from "@/lib/server/fellowshipMatcher";
import {
  extractListAfterHeading,
  extractTraining,
  type ExtractedTraining
} from "@/lib/server/trainingExtractor";

export type ShebaEntPhysicianResult = {
  physicianName: string | null;
  role: string | null;
  department: string | null;
  hospital: "שיבא";
  sourceUrl: string;
  bioText: string;
  bioTextLength: number;
  medicalSchool: string | null;
  residencySpecialty: string | null;
  residencyInstitution: string | null;
  residencyYears: string | null;
  fellowshipText: string | null;
  fellowshipInstitution: string | null;
  fellowshipCountry: string | null;
  fellowshipYears: string | null;
  clinicalInterests: string[];
  procedures: string[];
  academicTitle: string | null;
  professionalSocieties: string[];
  publicationsLink: string | null;
  extractedTraining: ExtractedTraining;
  detectedFellowships: DetectedFellowship[];
  needsExternalSearch: boolean;
  reason: string;
};

export type ShebaEntCrawlerResult = {
  ok: true;
  startUrl: string;
  departmentUrl: string;
  physiciansProcessed: number;
  results: ShebaEntPhysicianResult[];
  warnings: string[];
};

type PhysicianCandidate = {
  physicianName: string | null;
  role: string | null;
  department: string | null;
  profileUrl: string | null;
  cardText: string;
};

const SHEBA_START_URL = "https://www.shebaonline.org/";
const DEFAULT_DEPARTMENT_CANDIDATES = [
  "https://www.shebaonline.org/department/otolaryngology-head-and-neck-surgery/",
  "https://eng.sheba.co.il/otolaryngology_head_neck_surgery",
  "https://www.sheba.co.il/%D7%90%D7%A3_%D7%90%D7%95%D7%96%D7%9F_%D7%92%D7%A8%D7%95%D7%9F/"
];
const ALLOWED_HOSTS = new Set([
  "sheba.co.il",
  "www.sheba.co.il",
  "eng.sheba.co.il",
  "shebaonline.org",
  "www.shebaonline.org"
]);
const SENIOR_ROLE_PATTERNS = [
  /מנהל(?:ת)?\s+מחלקה/,
  /סגן(?:ית)?\s+מנהל(?:ת)?\s+מחלקה/,
  /מנהל(?:ת)?\s+יחידה/,
  /מנהל(?:ת)?\s+שירות/,
  /מרכז(?:ת)?\s+תחום/,
  /רופא(?:ה)?\s+בכיר(?:ה)?/,
  /\bsenior physician\b/i,
  /\bchair(?:man|person)?\b/i,
  /\bdirector\b/i,
  /\bdeputy\b/i,
  /\bhead\b/i,
  /\bconsultant\b/i,
  /\battending\b/i
];
const IGNORE_ROLE_PATTERNS = [
  /מתמחה/,
  /סטאז/,
  /אח(?:ות|ים)?/,
  /פרא-?רפואי/,
  /מזכיר(?:ה|ות)?/,
  /מתאמ(?:ת|ות)/,
  /מנהלה/,
  /\bresident\b/i,
  /\bintern\b/i,
  /\bnurse\b/i,
  /\bsecretary\b/i,
  /\bcoordinator\b/i,
  /\badministrative\b/i
];

function isAllowedShebaUrl(value: string) {
  try {
    return ALLOWED_HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

export function assertAllowedShebaUrl(value: string) {
  if (!isAllowedShebaUrl(value)) {
    throw new Error("מותר לסרוק רק URL של שיבא עבור POC זה.");
  }
}

function absoluteUrl(href: string | undefined, baseUrl: string) {
  if (!href) return null;
  try {
    const url = new URL(href, baseUrl);
    if (!ALLOWED_HOSTS.has(url.hostname)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url: string) {
  assertAllowedShebaUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "HitmachutAdminPOC/1.0 (+https://hitmachut.org)",
        accept: "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function visibleTextFromHtml(html: string) {
  const $ = cheerio.load(html);
  $("script,style,noscript,svg,iframe,form,header,footer,nav").remove();
  $("br").replaceWith("\n");

  return $("body")
    .text()
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function linkRows(html: string, baseUrl: string) {
  const $ = cheerio.load(html);

  return $("a")
    .toArray()
    .map((node) => {
      const element = $(node);
      return {
        text: element.text().replace(/\s+/g, " ").trim(),
        href: absoluteUrl(element.attr("href"), baseUrl),
        cardText: element.closest("article,li,.card,.doctor,.team,.staff,.elementor-column,.elementor-widget").text().replace(/\s+/g, " ").trim()
      };
    })
    .filter((row): row is { text: string; href: string; cardText: string } => Boolean(row.href));
}

function looksLikeEntDepartmentLink(row: { text: string; href: string }) {
  const value = `${row.text} ${row.href}`.toLocaleLowerCase("he");

  return /otolaryngology|ear[-\s]?nose[-\s]?throat|head[-\s]?and[-\s]?neck|ent|אוזן|גרון|אא/.test(value);
}

async function findDepartmentUrl(inputUrl: string | null | undefined, warnings: string[]) {
  if (inputUrl) {
    assertAllowedShebaUrl(inputUrl);
    return inputUrl;
  }

  try {
    const startHtml = await fetchHtml(SHEBA_START_URL);
    const links = linkRows(startHtml, SHEBA_START_URL);
    const linkedCandidate = links.find(looksLikeEntDepartmentLink)?.href;
    if (linkedCandidate) return linkedCandidate;
  } catch (error) {
    warnings.push(`סריקת עמוד הבית של שיבא נכשלה: ${error instanceof Error ? error.message : "שגיאה לא ידועה"}`);
  }

  return DEFAULT_DEPARTMENT_CANDIDATES[0];
}

function maybePhysicianName(text: string) {
  const lines = text.split(/\n| {2,}/).map((line) => line.trim()).filter(Boolean);
  const direct = lines.find((line) => /^(?:Dr\.|Prof\.|Professor|ד"ר|ד״ר|פרופ)/i.test(line));
  const cleanName = (value: string) =>
    value
      .replace(/\b(?:Senior Physician|Chairman|Director|Deputy|Head|Resident|Nurse|Otolaryngology|Read More)\b.*$/i, "")
      .replace(/\b(?:מנהל|סגן|רופא|מתמחה|אח|אחות|מחלקה|קרא עוד)\b.*$/, "")
      .replace(/\s+/g, " ")
      .trim();

  if (direct) return cleanName(direct);

  const match = text.match(/((?:Dr\.|Prof\.|Professor|ד"ר|ד״ר|פרופ)[^,\n|]{3,80})/i);
  return match?.[1] ? cleanName(match[1]) : null;
}

function maybeRole(text: string) {
  const lines = text.split(/\n| {2,}/).map((line) => line.trim()).filter(Boolean);
  const roleLine = lines.find((line) => [...SENIOR_ROLE_PATTERNS, ...IGNORE_ROLE_PATTERNS].some((pattern) => pattern.test(line)));

  return roleLine ?? null;
}

function isSeniorPhysicianCandidate(candidate: PhysicianCandidate) {
  const text = `${candidate.role ?? ""} ${candidate.cardText}`;
  if (IGNORE_ROLE_PATTERNS.some((pattern) => pattern.test(text))) return false;

  return SENIOR_ROLE_PATTERNS.some((pattern) => pattern.test(text));
}

function dedupeCandidates(candidates: PhysicianCandidate[]) {
  const seen = new Set<string>();
  const deduped: PhysicianCandidate[] = [];

  for (const candidate of candidates) {
    const key = candidate.profileUrl ?? candidate.physicianName ?? candidate.cardText.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function extractPhysicianCandidates(html: string, departmentUrl: string) {
  const $ = cheerio.load(html);
  const candidates: PhysicianCandidate[] = [];

  for (const row of linkRows(html, departmentUrl)) {
    const linkContext = `${row.text} ${row.href} ${row.cardText}`;
    const isProfileLink = /\/doctor|\/doctors|physician|profile|read more|קרא עוד|למידע נוסף/i.test(linkContext);
    const hasPhysicianCue = /Dr\.|Prof\.|Professor|ד"ר|ד״ר|פרופ|רופא|מנהל|Senior Physician|Chairman|Director/i.test(linkContext);
    if (!isProfileLink && !hasPhysicianCue) continue;

    candidates.push({
      physicianName: maybePhysicianName(row.cardText || row.text),
      role: maybeRole(row.cardText),
      department: /אף אוזן גרון|אא"?ג/i.test(row.cardText) ? "אף אוזן גרון" : "Otolaryngology - Head and Neck Surgery",
      profileUrl: row.href,
      cardText: row.cardText || row.text
    });
  }

  $("article,li,.card,.doctor,.team,.staff,.elementor-column,.elementor-widget").each((_, node) => {
    const element = $(node);
    const cardText = element.text().replace(/\s+/g, " ").trim();
    if (!/Dr\.|Prof\.|Professor|ד"ר|ד״ר|פרופ|רופא|מנהל|Senior Physician|Chairman|Director/i.test(cardText)) return;
    const profileUrl = absoluteUrl(element.find("a").first().attr("href"), departmentUrl);
    candidates.push({
      physicianName: maybePhysicianName(cardText),
      role: maybeRole(cardText),
      department: /אף אוזן גרון|אא"?ג/i.test(cardText) ? "אף אוזן גרון" : "Otolaryngology - Head and Neck Surgery",
      profileUrl,
      cardText
    });
  });

  return dedupeCandidates(candidates).filter(isSeniorPhysicianCandidate);
}

function valueAfterHeading(text: string, headings: string[]) {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);

  for (const heading of headings) {
    const index = lines.findIndex((line) => line.toLocaleLowerCase("he") === heading.toLocaleLowerCase("he"));
    if (index >= 0) return lines[index + 1] ?? null;
  }

  return null;
}

function extractPublicationsLink(html: string, sourceUrl: string) {
  return linkRows(html, sourceUrl).find((row) =>
    /publication|pubmed|google scholar|מאמר|פרסומים/i.test(`${row.text} ${row.href}`)
  )?.href ?? null;
}

function academicTitleFromText(text: string, name: string | null) {
  const title = text.match(/\b(?:Professor|Prof\.|Associate Professor|Assistant Professor)\b/i)?.[0];
  if (title) return title;
  if (name && /פרופ|Prof\.|Professor/i.test(name)) return name.match(/פרופ|Prof\.|Professor/i)?.[0] ?? null;
  return null;
}

function topFellowshipConfidence(detected: DetectedFellowship[]) {
  return detected[0]?.confidence ?? null;
}

function needsExternalSearch(input: {
  detectedFellowships: DetectedFellowship[];
  bioTextLength: number;
  role: string | null;
}) {
  const hasHighEvidence = hasConfidenceAtLeast(topFellowshipConfidence(input.detectedFellowships), "High");
  const isSeniorRole = input.role ? SENIOR_ROLE_PATTERNS.some((pattern) => pattern.test(input.role ?? "")) : false;
  const reasons: string[] = [];

  if (!hasHighEvidence) reasons.push("לא זוהה פלושיפ בביטחון High/Very High");
  if (input.bioTextLength < 500) reasons.push("טקסט ביוגרפי קצר מ-500 תווים");
  if (isSeniorRole && !hasHighEvidence) reasons.push("תפקיד בכיר ללא עדות פלושיפ חזקה");

  return {
    value: reasons.length > 0,
    reason: reasons.length > 0 ? reasons.join("; ") : "זוהתה עדות פלושיפ מספקת בטקסט הקיים"
  };
}

function clinicalInterestsFromText(text: string) {
  const explicit = extractListAfterHeading(text, [/^Areas of Expertise$/i, /^Clinical Interests$/i, /^תחומי מומחיות$/, /^תחומי עניין קליניים$/]);
  if (explicit.length > 0) return explicit.slice(0, 8);

  const matches = text.match(/(?:laryngology|neurotology|rhinology|sleep surgery|head and neck oncology|cochlear implants|voice disorders|sinus surgery|אוטולוגיה|רינולוגיה|מיתרי קול|ראש וצוואר|שתלי שבלול)/gi);
  return Array.from(new Set(matches ?? [])).slice(0, 8);
}

function proceduresFromText(text: string) {
  const matches = text.match(/(?:endoscopic sinus surgery|cochlear implant|microvascular reconstruction|free flap|TORS|rhinoplasty|thyroid surgery|ניתוחי סינוסים|שתלי שבלול|שחזור מיקרווסקולרי|ניתוחי אף|בלוטת התריס)/gi);

  return Array.from(new Set(matches ?? [])).slice(0, 8);
}

function societiesFromText(text: string) {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const explicit = extractListAfterHeading(text, [/^Professional Societies$/i, /^Memberships$/i, /^איגודים מקצועיים$/]);
  if (explicit.length > 0) return explicit.slice(0, 8);

  return lines.filter((line) => /society|association|academy|איגוד|חברה מקצועית/i.test(line)).slice(0, 8);
}

function resultFromProfile(input: {
  candidate: PhysicianCandidate;
  sourceUrl: string;
  html: string;
}) {
  const text = visibleTextFromHtml(input.html);
  const $ = cheerio.load(input.html);
  const name = $("h1").first().text().replace(/\s+/g, " ").trim() || input.candidate.physicianName;
  const role = valueAfterHeading(text, ["Position", "Role", "תפקיד"]) ?? input.candidate.role;
  const department = valueAfterHeading(text, ["Department", "מחלקה"]) ?? input.candidate.department;
  const training = extractTraining(text);
  const detectedFellowships = matchEntFellowships(text);
  const externalSearch = needsExternalSearch({
    detectedFellowships,
    bioTextLength: text.length,
    role
  });
  const firstFellowship = training.fellowships[0] ?? null;

  return {
    physicianName: name,
    role,
    department,
    hospital: "שיבא" as const,
    sourceUrl: input.sourceUrl,
    bioText: text,
    bioTextLength: text.length,
    medicalSchool: training.medicalSchool,
    residencySpecialty: training.residencySpecialty,
    residencyInstitution: training.residencyInstitution,
    residencyYears: training.residencyYears,
    fellowshipText: firstFellowship?.rawText ?? null,
    fellowshipInstitution: firstFellowship?.institution ?? null,
    fellowshipCountry: firstFellowship?.country ?? null,
    fellowshipYears: firstFellowship?.years ?? null,
    clinicalInterests: clinicalInterestsFromText(text),
    procedures: proceduresFromText(text),
    academicTitle: academicTitleFromText(text, name),
    professionalSocieties: societiesFromText(text),
    publicationsLink: extractPublicationsLink(input.html, input.sourceUrl),
    extractedTraining: training,
    detectedFellowships,
    needsExternalSearch: externalSearch.value,
    reason: externalSearch.reason
  };
}

function resultFromCandidateOnly(candidate: PhysicianCandidate, departmentUrl: string): ShebaEntPhysicianResult {
  const text = candidate.cardText;
  const training = extractTraining(text);
  const detectedFellowships = matchEntFellowships(text);
  const externalSearch = needsExternalSearch({
    detectedFellowships,
    bioTextLength: text.length,
    role: candidate.role
  });
  const firstFellowship = training.fellowships[0] ?? null;

  return {
    physicianName: candidate.physicianName,
    role: candidate.role,
    department: candidate.department,
    hospital: "שיבא",
    sourceUrl: candidate.profileUrl ?? departmentUrl,
    bioText: text,
    bioTextLength: text.length,
    medicalSchool: training.medicalSchool,
    residencySpecialty: training.residencySpecialty,
    residencyInstitution: training.residencyInstitution,
    residencyYears: training.residencyYears,
    fellowshipText: firstFellowship?.rawText ?? null,
    fellowshipInstitution: firstFellowship?.institution ?? null,
    fellowshipCountry: firstFellowship?.country ?? null,
    fellowshipYears: firstFellowship?.years ?? null,
    clinicalInterests: clinicalInterestsFromText(text),
    procedures: proceduresFromText(text),
    academicTitle: academicTitleFromText(text, candidate.physicianName),
    professionalSocieties: societiesFromText(text),
    publicationsLink: null,
    extractedTraining: training,
    detectedFellowships,
    needsExternalSearch: externalSearch.value,
    reason: externalSearch.reason
  };
}

export async function runShebaEntFellowshipCrawler(input: {
  departmentUrl?: string | null;
} = {}): Promise<ShebaEntCrawlerResult> {
  const warnings: string[] = [];
  const departmentUrl = await findDepartmentUrl(input.departmentUrl, warnings);
  const departmentHtml = await fetchHtml(departmentUrl);
  const candidates = extractPhysicianCandidates(departmentHtml, departmentUrl);
  const results: ShebaEntPhysicianResult[] = [];

  if (candidates.length === 0) {
    warnings.push("לא נמצאו כרטיסי רופאים בכירים בעמוד המחלקה. נסה להדביק URL ידני של עמוד אא״ג שיבא.");
  }

  for (const candidate of candidates) {
    if (!candidate.profileUrl) {
      results.push(resultFromCandidateOnly(candidate, departmentUrl));
      continue;
    }

    try {
      const profileHtml = await fetchHtml(candidate.profileUrl);
      results.push(resultFromProfile({
        candidate,
        sourceUrl: candidate.profileUrl,
        html: profileHtml
      }));
    } catch (error) {
      warnings.push(
        `טעינת פרופיל נכשלה עבור ${candidate.physicianName ?? candidate.profileUrl}: ${
          error instanceof Error ? error.message : "שגיאה לא ידועה"
        }`
      );
      results.push(resultFromCandidateOnly(candidate, departmentUrl));
    }
  }

  return {
    ok: true,
    startUrl: SHEBA_START_URL,
    departmentUrl,
    physiciansProcessed: results.length,
    results,
    warnings
  };
}

export const shebaEntCrawlerInternals = {
  extractPhysicianCandidates,
  visibleTextFromHtml,
  isSeniorPhysicianCandidate,
  resultFromProfile
};
