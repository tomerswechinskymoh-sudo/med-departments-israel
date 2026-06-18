import type {
  ClalitDepartmentConfig,
  DoctorRecord,
  EnrichedDoctorRecord,
  NormalizedDoctorRecord,
  QaSeverity
} from "./types";
import { normalizeWhitespace } from "./utils";

const MANAGED_QA_FLAGS = new Set([
  "missingProfileUrl",
  "duplicateDoctor",
  "duplicateNameNeedsReview",
  "missingRawProfileText",
  "listOnlyProfile",
  "unitMismatch",
  "crossListedDoctor",
  "lowConfidenceAffiliation"
]);
const FAIL_FLAGS = new Set(["duplicateDoctor"]);
const REVIEW_FLAGS = new Set([
  "duplicateNameNeedsReview",
  "missingProfileUrl",
  "listOnlyProfile",
  "unitMismatch",
  "crossListedDoctor",
  "lowConfidenceAffiliation"
]);

type DoctorIdentityRecord = {
  fullName?: string | null;
  profileUrl?: string | null;
  profile?: { fullName?: string | null; sourceUrl?: string | null };
};

export type DuplicateDoctorContext = {
  duplicateProfileUrls: Set<string>;
  duplicateNamesWithDifferentProfiles: Set<string>;
};

function normalizeName(record: DoctorIdentityRecord) {
  return normalizeWhitespace(record.profile?.fullName ?? record.fullName ?? "").toLowerCase();
}

function normalizeProfileUrl(record: DoctorIdentityRecord) {
  const value = "profileUrl" in record ? record.profileUrl : record.profile?.sourceUrl;
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return normalizeWhitespace(value).toLowerCase();
  }
}

export function buildDuplicateDoctorContext(records: DoctorIdentityRecord[]): DuplicateDoctorContext {
  const profileUrlCounts = new Map<string, number>();
  const profileUrlsByName = new Map<string, Set<string>>();

  for (const record of records) {
    const name = normalizeName(record);
    const profileUrl = normalizeProfileUrl(record);
    if (profileUrl) profileUrlCounts.set(profileUrl, (profileUrlCounts.get(profileUrl) ?? 0) + 1);
    if (name && profileUrl) {
      const urls = profileUrlsByName.get(name) ?? new Set<string>();
      urls.add(profileUrl);
      profileUrlsByName.set(name, urls);
    }
  }

  return {
    duplicateProfileUrls: new Set(
      Array.from(profileUrlCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([profileUrl]) => profileUrl)
    ),
    duplicateNamesWithDifferentProfiles: new Set(
      Array.from(profileUrlsByName.entries())
        .filter(([, urls]) => urls.size > 1)
        .map(([name]) => name)
    )
  };
}

export function qaSeverityForFlags(flags: string[]): QaSeverity {
  if (flags.some((flag) => FAIL_FLAGS.has(flag))) return "fail";
  if (flags.some((flag) => REVIEW_FLAGS.has(flag))) return "review";
  return "ok";
}

function cleanManagedQa(flags: string[] | undefined, notes: string[] | undefined) {
  return {
    flags: (flags ?? []).filter((flag) => !MANAGED_QA_FLAGS.has(flag)),
    notes: (notes ?? []).filter(
      (note) =>
        !note.startsWith("No profileUrl") &&
        !note.startsWith("Duplicate doctor") &&
        !note.startsWith("Same normalized doctor name") &&
        !note.startsWith("Profile page fetched") &&
        !note.startsWith("Public profile contains only") &&
        !note.startsWith("Extracted unit/department") &&
        !note.startsWith("AI-normalized unit/role") &&
        !note.startsWith("Doctor appeared") &&
        !note.startsWith("Low confidence")
    )
  };
}

function includesKeyword(value: string, keywords: string[]) {
  const normalizedValue = normalizeWhitespace(value).toLowerCase();
  return keywords.some((keyword) => normalizedValue.includes(normalizeWhitespace(keyword).toLowerCase()));
}

function departmentKeywords(config: ClalitDepartmentConfig) {
  return [...config.departmentKeywordsHebrew, ...config.departmentKeywordsEnglish].filter(Boolean);
}

function allowedCrossUnit(config: ClalitDepartmentConfig, value: string) {
  return includesKeyword(value, config.allowedCrossUnits);
}

function addFlag(flags: string[], notes: string[], flag: string, note: string) {
  if (!flags.includes(flag)) flags.push(flag);
  if (!notes.includes(note)) notes.push(note);
}

function unitTextFromEnriched(record: EnrichedDoctorRecord) {
  return [
    record.profile.unit,
    record.profile.department,
    record.profile.role,
    record.titleOrRole,
    record.rawText,
    record.profile.sourceUrl
  ]
    .filter(Boolean)
    .join("\n");
}

function unitTextFromNormalized(record: NormalizedDoctorRecord) {
  return [
    record.unit,
    record.role,
    record.subspecialties.join("\n"),
    record.clinicalInterests.join("\n"),
    record.claims.map((claim) => `${claim.field}: ${claim.value} ${claim.evidence}`).join("\n")
  ]
    .filter(Boolean)
    .join("\n");
}

export function qaForDoctorRecord(record: DoctorRecord, duplicates: DuplicateDoctorContext) {
  const clean = cleanManagedQa(record.qaFlags, record.qaNotes);
  const flags = [...clean.flags];
  const notes = [...clean.notes];
  const fullName = normalizeName(record);
  const profileUrl = normalizeProfileUrl(record);

  if (!record.profileUrl) {
    addFlag(flags, notes, "missingProfileUrl", "No profileUrl was found on the department doctors list.");
  }
  if (profileUrl && duplicates.duplicateProfileUrls.has(profileUrl)) {
    addFlag(flags, notes, "duplicateDoctor", `Duplicate doctor profileUrl in same department output: ${record.profileUrl}.`);
  } else if (fullName && duplicates.duplicateNamesWithDifferentProfiles.has(fullName)) {
    addFlag(
      flags,
      notes,
      "duplicateNameNeedsReview",
      `Same normalized doctor name appears with different profile URLs: ${record.fullName}.`
    );
  }

  return { flags, notes, qaSeverity: qaSeverityForFlags(flags) };
}

export function qaForEnrichedDoctor(
  record: EnrichedDoctorRecord,
  config: ClalitDepartmentConfig,
  duplicates: DuplicateDoctorContext
) {
  const base = qaForDoctorRecord(record, duplicates);
  const flags = [...base.flags];
  const notes = [...base.notes];
  const keywords = departmentKeywords(config);
  const unitText = unitTextFromEnriched(record);
  const unit = normalizeWhitespace(record.profile.unit ?? record.titleOrRole ?? "");

  if (record.profileCompleteness === "listOnly") {
    addFlag(
      flags,
      notes,
      "listOnlyProfile",
      "Public profile contains only doctor-list identity or name/unit metadata; no rich profile content is published."
    );
  }
  if (unitText && keywords.length > 0 && !includesKeyword(unitText, keywords) && !allowedCrossUnit(config, unitText)) {
    addFlag(
      flags,
      notes,
      "unitMismatch",
      `Extracted unit/department does not match configured department keywords. unit="${unit || "unknown"}".`
    );
    addFlag(flags, notes, "crossListedDoctor", "Doctor appeared in this department list but profile/unit appears to belong elsewhere.");
  }

  return { flags, notes, qaSeverity: qaSeverityForFlags(flags) };
}

export function qaForNormalizedDoctor(
  record: NormalizedDoctorRecord,
  sourceDoctor: EnrichedDoctorRecord,
  config: ClalitDepartmentConfig,
  duplicates: DuplicateDoctorContext
) {
  const sourceQa = qaForEnrichedDoctor(sourceDoctor, config, duplicates);
  const clean = cleanManagedQa(record.qaFlags, record.qaNotes);
  const flags = Array.from(new Set([...clean.flags, ...sourceQa.flags]));
  const notes = Array.from(new Set([...clean.notes, ...sourceQa.notes]));
  const keywords = departmentKeywords(config);
  const unitText = unitTextFromNormalized(record);
  const hasAffiliationEvidence = keywords.length === 0 || includesKeyword(unitText, keywords) || allowedCrossUnit(config, unitText);

  if (unitText && !hasAffiliationEvidence) {
    addFlag(
      flags,
      notes,
      "unitMismatch",
      `AI-normalized unit/role/subspecialty evidence does not match configured department keywords. unit="${record.unit ?? "unknown"}".`
    );
    addFlag(flags, notes, "crossListedDoctor", "Doctor appeared in this department list but normalized profile appears to belong elsewhere.");
  }

  const allCoreConfidenceLow =
    record.confidence.role < 0.55 &&
    record.confidence.isSenior < 0.55 &&
    record.confidence.subspecialties < 0.45;
  if (!hasAffiliationEvidence || allCoreConfidenceLow) {
    addFlag(flags, notes, "lowConfidenceAffiliation", "Low confidence or weak department-affiliation evidence; review manually.");
  }

  return {
    ...record,
    profileCompleteness: sourceDoctor.profileCompleteness,
    qaFlags: flags,
    qaNotes: notes,
    qaSeverity: qaSeverityForFlags(flags)
  };
}

export function summarizeQaFlags(records: Array<{ qaFlags?: string[] }>) {
  const summary: Record<string, number> = {};
  for (const record of records) {
    for (const flag of record.qaFlags ?? []) summary[flag] = (summary[flag] ?? 0) + 1;
  }
  return summary;
}

export function summarizeQaSeverity(records: Array<{ qaFlags?: string[]; qaSeverity?: QaSeverity }>) {
  const summary: Record<QaSeverity, number> = { ok: 0, review: 0, fail: 0 };
  for (const record of records) summary[record.qaSeverity ?? qaSeverityForFlags(record.qaFlags ?? [])] += 1;
  return summary;
}

export function qaFlagSeverity(flag: string): QaSeverity {
  if (FAIL_FLAGS.has(flag)) return "fail";
  if (REVIEW_FLAGS.has(flag)) return "review";
  return "ok";
}
