import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { DoctorRecord } from "./types";
import { normalizeWhitespace } from "./utils";

const IDENTITY_MAP_PATH = path.join(process.cwd(), "data", "crawler", "output", "soroka-doctor-index", "identity-map.json");

type IdentityMapEntry = {
  canonicalName: string;
  normalizedName: string;
  titleStrippedName: string;
  titlePrefix: string | null;
  profileUrl: string | null;
  knownUnits: string[];
  knownFields: string[];
  sourceEvidence: string[];
  profileCompleteness: "full" | "partial" | "listOnly";
};

type IdentityMapFile = {
  entries: IdentityMapEntry[];
};

type IdentityResolver = {
  byProfileUrl: Map<string, IdentityMapEntry>;
  byNormalizedName: Map<string, IdentityMapEntry[]>;
};

const doctorTitlePattern = /^(ד["״']?ר|ד״ר|ד"ר|פרופ['׳]?|פרופ׳|פרופסור)\s+/;
const nonPhysicianPattern =
  /(אחות|אחים|אחיות|מזכיר|מזכירה|מינהל|מנהלנית|עובד|עובדת|טכנאי|טכנאית|פיזיותרפ|עבודה סוציאלית|דיאט|רוקח|סטודנט|מתנדב|הדרכה)/;
const proseNoisePattern =
  /(צוות|רופאים מתמחים|אל הצוות|מטפל|מטפלת|פונים|כולל|לפי הצורך|במיון|במרפאה|השירות|ניתן|מבוצע|הפעילות|סטודנטים|מחלקות אחרות)/;

let cachedResolver: IdentityResolver | null | undefined;

export function normalizeSorokaDoctorName(name: string) {
  return normalizeWhitespace(name)
    .replace(doctorTitlePattern, "")
    .replace(/[׳']/g, "")
    .replace(/[״"]/g, "")
    .replace(/[.\-–—:;()[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedProfileUrl(value: string | null | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return normalizeWhitespace(value).toLowerCase();
  }
}

function loadResolver() {
  if (cachedResolver !== undefined) return cachedResolver;
  if (!existsSync(IDENTITY_MAP_PATH)) {
    cachedResolver = null;
    return cachedResolver;
  }

  const file = JSON.parse(readFileSync(IDENTITY_MAP_PATH, "utf8")) as IdentityMapFile;
  const byProfileUrl = new Map<string, IdentityMapEntry>();
  const byNormalizedName = new Map<string, IdentityMapEntry[]>();

  for (const entry of file.entries) {
    const profileUrl = normalizedProfileUrl(entry.profileUrl);
    if (profileUrl) byProfileUrl.set(profileUrl, entry);
    const normalizedName = entry.normalizedName || normalizeSorokaDoctorName(entry.canonicalName);
    byNormalizedName.set(normalizedName, [...(byNormalizedName.get(normalizedName) ?? []), entry]);
  }

  cachedResolver = { byProfileUrl, byNormalizedName };
  return cachedResolver;
}

function exactMatch(record: DoctorRecord) {
  const resolver = loadResolver();
  if (!resolver) return null;

  const profileMatch = resolver.byProfileUrl.get(normalizedProfileUrl(record.profileUrl));
  if (profileMatch) return { entry: profileMatch, source: "profileUrl" as const };

  const matches = resolver.byNormalizedName.get(normalizeSorokaDoctorName(record.fullName)) ?? [];
  if (matches.length === 1) return { entry: matches[0], source: "normalizedName" as const };

  return null;
}

function isSorokaDoctorProfileUrl(value: string | null | undefined) {
  return Boolean(value && /\/soroka\/he\/our-specialists\/Pages\/[^/]+\.aspx(?:$|[?#])/i.test(value));
}

function isStrongPhysicianName(value: string) {
  const name = normalizeWhitespace(value).replace(/[.]+$/g, "");
  const stripped = name.replace(doctorTitlePattern, "").trim();
  const tokens = stripped.split(/\s+/).filter(Boolean);
  if (!doctorTitlePattern.test(name)) return false;
  if (name.length > 55 || stripped.length < 4) return false;
  if (tokens.length < 2 || tokens.length > 5) return false;
  if (/[.:;?!]/.test(stripped)) return false;
  if (/\s[-–—]\s/.test(stripped)) return false;
  if (nonPhysicianPattern.test(name) || proseNoisePattern.test(name)) return false;
  return /^[א-ת][א-ת\s'׳״"-]+$/.test(stripped);
}

function isProseFragment(record: DoctorRecord) {
  const text = normalizeWhitespace(`${record.fullName} ${record.rawText}`);
  if (text.length > 280) return true;
  if (proseNoisePattern.test(text)) return true;
  return !isStrongPhysicianName(record.fullName);
}

function addUnique(values: string[] | undefined, additions: string[]) {
  return Array.from(new Set([...(values ?? []), ...additions].map(normalizeWhitespace).filter(Boolean)));
}

export function applySorokaIdentityMap(records: DoctorRecord[]) {
  const accepted: DoctorRecord[] = [];
  const rejected: Array<{
    fullName: string;
    profileUrl: string | null;
    rawText: string;
    reason: string;
  }> = [];
  const seen = new Set<string>();

  for (const record of records) {
    const match = exactMatch(record);
    const nonDoctorProfileUrl = record.profileUrl && !isSorokaDoctorProfileUrl(record.profileUrl);

    if (!match && (nonDoctorProfileUrl || isProseFragment(record))) {
      rejected.push({
        fullName: record.fullName,
        profileUrl: record.profileUrl,
        rawText: record.rawText.slice(0, 500),
        reason: nonDoctorProfileUrl ? "non-doctor profile URL not found in Soroka index" : "unmatched prose or weak physician-name candidate"
      });
      continue;
    }

    const enriched: DoctorRecord = match
      ? {
          ...record,
          fullName: match.entry.canonicalName || record.fullName,
          profileUrl: match.entry.profileUrl || record.profileUrl,
          titleOrRole: record.titleOrRole ?? (match.entry.knownUnits.join("\n") || null),
          indexMatched: true,
          indexMatchSource: match.source,
          indexProfileUrl: match.entry.profileUrl,
          indexKnownUnits: addUnique(record.indexKnownUnits, match.entry.knownUnits),
          indexKnownFields: addUnique(record.indexKnownFields, match.entry.knownFields)
        }
      : {
          ...record,
          profileUrl: isSorokaDoctorProfileUrl(record.profileUrl) ? record.profileUrl : null,
          indexMatched: false,
          indexMatchSource: null,
          qaFlags: addUnique(record.qaFlags, ["indexUnmatched"]),
          qaNotes: addUnique(record.qaNotes, ["Soroka doctor candidate did not match the hospital doctor index; review before publishing."])
        };

    const key = enriched.profileUrl
      ? `profile:${normalizedProfileUrl(enriched.profileUrl)}`
      : `name:${normalizeSorokaDoctorName(enriched.fullName)}|${enriched.rawText.slice(0, 120)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    accepted.push(enriched);
  }

  return { accepted, rejected };
}

export function hasSorokaIdentityMap() {
  return Boolean(loadResolver());
}
