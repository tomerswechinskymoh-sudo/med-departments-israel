import fs from "node:fs/promises";
import path from "node:path";
import type { ClalitDepartmentConfig } from "./types";
import type { ReviewedDoctorRecord } from "./manual-review";
import { normalizeWhitespace } from "./utils";

export type PublicClaim = {
  field: string;
  value: string;
  evidence: string;
  sourceUrl: string;
};

export type PublicDoctorRecord = {
  departmentId: string;
  hospital: string;
  hospitalSlug: string;
  department: string;
  profileCompleteness: ReviewedDoctorRecord["profileCompleteness"];
  fullName: string;
  role: string | null;
  unit: string | null;
  isSenior: boolean | null;
  specialties: string[];
  subspecialties: string[];
  clinicalInterests: string[];
  education: string[];
  residency: string[];
  fellowship: ReviewedDoctorRecord["fellowship"];
  academicTitles: string[];
  profileUrl: string | null;
  publicContact: {
    email: string | null;
    phone: string | null;
  };
  qaSeverity: ReviewedDoctorRecord["qaSeverity"];
  qaFlags: string[];
  reviewedStatus: ReviewedDoctorRecord["reviewedStatus"];
  productionReady: boolean;
  claims: PublicClaim[];
  evidenceSnippets: Array<{
    field: string;
    evidence: string;
    sourceUrl: string;
  }>;
  sourceUrls: string[];
};

export type ExportCounts = {
  approved: number;
  crossListed: number;
  needsMoreEvidence: number;
  productionReady: number;
};

export type DepartmentPublicExport = {
  runId: string;
  generatedAt: string;
  hospital: string;
  hospitalSlug: string;
  departmentId: string;
  department: string;
  summary: {
    doctorCount: number;
    counts: ExportCounts;
  };
  doctors: PublicDoctorRecord[];
};

export type HospitalPublicExport = {
  runId: string;
  generatedAt: string;
  hospital: string;
  hospitalSlug: string;
  summary: {
    departmentCount: number;
    doctorCount: number;
    counts: ExportCounts;
  };
  departments: Array<{
    departmentId: string;
    department: string;
    doctorCount: number;
    productionReadyCount: number;
    doctors: PublicDoctorRecord[];
  }>;
  doctors: PublicDoctorRecord[];
};

export type GlobalPublicExport = {
  runId: string;
  generatedAt: string;
  summary: {
    hospitalCount: number;
    departmentCount: number;
    doctorCount: number;
    counts: ExportCounts;
  };
  hospitals: Array<{
    hospital: string;
    hospitalSlug: string;
    departmentCount: number;
    doctorCount: number;
  }>;
  doctors: PublicDoctorRecord[];
};

function validPublicSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeEvidenceValue(value: string) {
  return normalizeWhitespace(value).replace(/\s+/g, "").toLowerCase();
}

export function sourcedPublicContact(value: string | null, claims: PublicClaim[]) {
  if (!value) return null;
  const normalizedValue = normalizeEvidenceValue(value);
  const supported = claims.some((claim) => {
    if (!validPublicSourceUrl(claim.sourceUrl)) return false;
    return normalizeEvidenceValue(`${claim.value} ${claim.evidence}`).includes(normalizedValue);
  });
  return supported ? value : null;
}

export function toPublicDoctor(
  departmentId: string,
  config: ClalitDepartmentConfig,
  record: ReviewedDoctorRecord
): PublicDoctorRecord {
  const claims = record.claims
    .filter((claim) => validPublicSourceUrl(claim.sourceUrl))
    .map((claim) => ({
      field: claim.field,
      value: claim.value,
      evidence: claim.evidence,
      sourceUrl: claim.sourceUrl
    }));
  const productionReady =
    record.productionReady &&
    record.qaSeverity !== "fail" &&
    (record.qaSeverity === "ok" ||
      (record.profileCompleteness === "listOnly" &&
        record.manualReviewApplied &&
        (record.reviewedStatus === "approved" || record.reviewedStatus === "crossListed"))) &&
    record.reviewedStatus !== "needsMoreEvidence" &&
    record.reviewedStatus !== "rejected";

  return {
    departmentId,
    hospital: config.hospital,
    hospitalSlug: config.hospitalSlug,
    department: config.department,
    profileCompleteness: record.profileCompleteness,
    fullName: record.fullName,
    role: record.role,
    unit: record.unit,
    isSenior: record.isSenior,
    specialties: record.specialties,
    subspecialties: record.subspecialties,
    clinicalInterests: record.clinicalInterests,
    education: record.education,
    residency: record.residency,
    fellowship: record.fellowship,
    academicTitles: record.academicTitles,
    profileUrl: record.profileUrl,
    publicContact: {
      email: sourcedPublicContact(record.contact.email, claims),
      phone: sourcedPublicContact(record.contact.phone, claims)
    },
    qaSeverity: record.qaSeverity,
    qaFlags: record.qaFlags,
    reviewedStatus: record.reviewedStatus,
    productionReady,
    claims,
    evidenceSnippets: claims.map((claim) => ({
      field: claim.field,
      evidence: claim.evidence,
      sourceUrl: claim.sourceUrl
    })),
    sourceUrls: Array.from(new Set(record.sourceUrls.filter(validPublicSourceUrl)))
  };
}

export function countPublicDoctors(records: PublicDoctorRecord[]): ExportCounts {
  return {
    approved: records.filter((record) => record.reviewedStatus === "approved").length,
    crossListed: records.filter((record) => record.reviewedStatus === "crossListed").length,
    needsMoreEvidence: records.filter((record) => record.reviewedStatus === "needsMoreEvidence").length,
    productionReady: records.filter((record) => record.productionReady).length
  };
}

export const PUBLIC_CSV_HEADERS = [
  "departmentId",
  "hospital",
  "hospitalSlug",
  "department",
  "profileCompleteness",
  "fullName",
  "role",
  "unit",
  "isSenior",
  "specialties",
  "subspecialties",
  "clinicalInterests",
  "education",
  "residency",
  "fellowship",
  "academicTitles",
  "profileUrl",
  "publicContact",
  "qaSeverity",
  "qaFlags",
  "reviewedStatus",
  "productionReady",
  "claims",
  "evidenceSnippets",
  "sourceUrls"
] as const;

function csvCell(value: unknown) {
  const serialized =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return /[",\r\n]/.test(serialized) ? `"${serialized.replace(/"/g, '""')}"` : serialized;
}

export function publicDoctorsToCsv(records: PublicDoctorRecord[]) {
  const rows = records.map((record) => PUBLIC_CSV_HEADERS.map((header) => csvCell(record[header])).join(","));
  return `${PUBLIC_CSV_HEADERS.join(",")}\n${rows.join("\n")}${rows.length > 0 ? "\n" : ""}`;
}

export async function writeText(filePath: string, value: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, "utf8");
}

export function safeRunId(value: string) {
  if (!/^[A-Za-z0-9._-]+$/.test(value) || value.includes("..")) {
    throw new Error("Invalid --runId. Use letters, numbers, dots, underscores, and hyphens only.");
  }
  return value;
}

export function timestampRunId(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
}

export async function latestExportRunId() {
  const runsDir = path.join(process.cwd(), "data", "crawler", "runs");
  const entries = await fs.readdir(runsDir, { withFileTypes: true });
  const runIds = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      await fs.access(path.join(runsDir, entry.name, "manifest.json"));
      runIds.push(entry.name);
    } catch {
      // Ignore incomplete run directories.
    }
  }
  const latest = runIds.sort().at(-1);
  if (!latest) throw new Error("No completed Clalit export run found.");
  return latest;
}
