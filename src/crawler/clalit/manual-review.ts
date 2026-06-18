import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { EnrichedDoctorRecord, NormalizedDoctorRecord, QaSeverity } from "./types";
import { normalizeWhitespace } from "./utils";

export const REVIEW_DIR = path.join(process.cwd(), "data", "crawler", "review");
export const REVIEW_DECISIONS_PATH = path.join(REVIEW_DIR, "manual-review-decisions.json");
export const REVIEW_AUDIT_PATH = path.join(REVIEW_DIR, "review-application-audit.json");

export type ManualReviewDecisionValue =
  | "approved"
  | "rejected"
  | "merge"
  | "crossListed"
  | "needsMoreEvidence";

export type ManualReviewDecision = {
  departmentId: string;
  doctorKey: string;
  fullName: string;
  profileUrl: string | null;
  decision: ManualReviewDecisionValue;
  mergeIntoDoctorKey: string | null;
  reviewerNote: string | null;
  reviewedAt: string;
};

export type ReviewedStatus = ManualReviewDecisionValue | "approved";

export type ReviewedDoctorRecord = NormalizedDoctorRecord & {
  doctorKey: string;
  profileUrl: string | null;
  sourceUrls: string[];
  reviewedStatus: ReviewedStatus;
  manualReviewApplied: boolean;
  reviewerNote: string | null;
  reviewedAt: string | null;
  productionReady: boolean;
  mergedDoctorKeys: string[];
};

export function normalizeDoctorName(value: string) {
  return normalizeWhitespace(value.normalize("NFKC"))
    .replace(/[״”]/g, '"')
    .replace(/[׳’]/g, "'")
    .toLowerCase();
}

export function normalizeDoctorProfileUrl(value: string | null | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return normalizeWhitespace(value).toLowerCase();
  }
}

export function doctorKeyFor(departmentId: string, fullName: string, profileUrl: string | null | undefined) {
  const identity = [departmentId, normalizeDoctorName(fullName), normalizeDoctorProfileUrl(profileUrl)].join("|");
  return crypto.createHash("sha256").update(identity).digest("hex").slice(0, 24);
}

export function reviewedOutputPath(departmentId: string) {
  return path.join(process.cwd(), "data", "crawler", "output", departmentId, "doctors-reviewed.json");
}

export async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function sourceUrlsFor(record: NormalizedDoctorRecord, enriched: EnrichedDoctorRecord) {
  return Array.from(
    new Set(
      [
        enriched.sourceUrl,
        enriched.profileUrl,
        enriched.profile.sourceUrl,
        ...record.claims.map((claim) => claim.sourceUrl)
      ].filter((value): value is string => Boolean(value))
    )
  );
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeWhitespace(value)).filter(Boolean)));
}

function uniqueObjects<T>(values: T[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = JSON.stringify(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeReviewedDoctors(target: ReviewedDoctorRecord, source: ReviewedDoctorRecord) {
  const completenessRank = { listOnly: 0, partial: 1, full: 2 } as const;
  return {
    ...target,
    profileCompleteness:
      completenessRank[source.profileCompleteness] > completenessRank[target.profileCompleteness]
        ? source.profileCompleteness
        : target.profileCompleteness,
    role: target.role ?? source.role,
    unit: target.unit ?? source.unit,
    seniorityEvidence: target.seniorityEvidence ?? source.seniorityEvidence,
    isSenior: target.isSenior ?? source.isSenior,
    specialties: uniqueStrings([...target.specialties, ...source.specialties]),
    subspecialties: uniqueStrings([...target.subspecialties, ...source.subspecialties]),
    clinicalInterests: uniqueStrings([...target.clinicalInterests, ...source.clinicalInterests]),
    education: uniqueStrings([...target.education, ...source.education]),
    residency: uniqueStrings([...target.residency, ...source.residency]),
    fellowship: uniqueObjects([...target.fellowship, ...source.fellowship]),
    academicTitles: uniqueStrings([...target.academicTitles, ...source.academicTitles]),
    contact: {
      email: target.contact.email ?? source.contact.email,
      phone: target.contact.phone ?? source.contact.phone
    },
    claims: uniqueObjects([...target.claims, ...source.claims]),
    missingImportantFields: uniqueStrings([...target.missingImportantFields, ...source.missingImportantFields]),
    qaFlags: uniqueStrings([...target.qaFlags, ...source.qaFlags]),
    qaNotes: uniqueStrings([...target.qaNotes, ...source.qaNotes]),
    qaSeverity: (["fail", "review", "ok"] as QaSeverity[]).find(
      (severity) => target.qaSeverity === severity || source.qaSeverity === severity
    ) ?? "ok",
    sourceUrls: uniqueStrings([...target.sourceUrls, ...source.sourceUrls]),
    mergedDoctorKeys: uniqueStrings([...target.mergedDoctorKeys, source.doctorKey, ...source.mergedDoctorKeys])
  } satisfies ReviewedDoctorRecord;
}

export function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  const [headers = [], ...dataRows] = rows;
  return dataRows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

export async function latestBatchFile(filename: string) {
  const baseDir = path.join(process.cwd(), "data", "crawler", "batch-runs");
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(baseDir, entry.name, filename))
    .sort();
  const existing = [];
  for (const candidate of candidates) if (await fileExists(candidate)) existing.push(candidate);
  const latest = existing.at(-1);
  if (!latest) throw new Error(`No batch file found: ${filename}`);
  return latest;
}
