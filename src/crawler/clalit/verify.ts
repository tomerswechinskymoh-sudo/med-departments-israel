import fs from "node:fs/promises";
import {
  buildDuplicateDoctorContext,
  qaFlagSeverity,
  summarizeQaFlags,
  summarizeQaSeverity
} from "./qa";
import type { DoctorRecord, EnrichedDoctorRecord, NormalizedDoctorRecord } from "./types";
import { loadClalitDepartmentConfig, outputPathsForDepartment, readJson } from "./utils";

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isAbsoluteUrl(value: string | null | undefined) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function assertPass(condition: boolean, message: string, failures: string[]) {
  if (!condition) failures.push(message);
}

function flagsBySeverity(qaFlagsSummary: Record<string, number>, severity: "review" | "fail") {
  return Object.fromEntries(Object.entries(qaFlagsSummary).filter(([flag]) => qaFlagSeverity(flag) === severity));
}

export async function verifyClalitCrawlerOutput(id: string) {
  const config = await loadClalitDepartmentConfig(id);
  const paths = outputPathsForDepartment(config.id);
  const failures: string[] = [];
  const doctors = await readJson<DoctorRecord[]>(paths.doctorsPath);
  const enriched = await readJson<EnrichedDoctorRecord[]>(paths.enrichedPath);
  const normalizedExists = await exists(paths.aiNormalizedPath);
  const normalized = normalizedExists ? await readJson<NormalizedDoctorRecord[]>(paths.aiNormalizedPath) : null;
  const duplicateContext = buildDuplicateDoctorContext(doctors);

  const profileEvidenceEligible = enriched.filter((doctor) => doctor.profileCompleteness !== "listOnly");
  const roleCount = profileEvidenceEligible.filter((doctor) => Boolean(doctor.profile.role)).length;
  const specialtyEvidenceCount = profileEvidenceEligible.filter(
    (doctor) =>
      doctor.profile.specialties.length > 0 ||
      doctor.profile.subspecialties.length > 0 ||
      doctor.profile.fellowship.length > 0 ||
      doctor.profile.clinicalInterests.length > 0
  ).length;
  const sourceUrlCount = doctors.filter((doctor) => Boolean(doctor.sourceUrl)).length;
  const absoluteProfileUrlCount = doctors.filter((doctor) => isAbsoluteUrl(doctor.profileUrl)).length;
  const missingProfileUrlCount = doctors.filter(
    (doctor) => doctor.qaFlags?.includes("missingProfileUrl") || !doctor.profileUrl
  ).length;
  const allQaRecords = normalized ?? enriched;
  const qaFlagsSummary = summarizeQaFlags(allQaRecords);
  const qaSeverityCounts = summarizeQaSeverity(allQaRecords);
  const failFlags = flagsBySeverity(qaFlagsSummary, "fail");
  const reviewFlags = flagsBySeverity(qaFlagsSummary, "review");
  const duplicateProfileUrlCount = duplicateContext.duplicateProfileUrls.size;
  const duplicateNameCount = duplicateContext.duplicateNamesWithDifferentProfiles.size;
  const unitMismatchCount = qaFlagsSummary.unitMismatch ?? 0;
  const roleCoverage = profileEvidenceEligible.length > 0 ? roleCount / profileEvidenceEligible.length : 1;
  const specialtyEvidenceCoverage =
    profileEvidenceEligible.length > 0 ? specialtyEvidenceCount / profileEvidenceEligible.length : 1;
  const missingProfileUrlCoverage = doctors.length > 0 ? missingProfileUrlCount / doctors.length : 0;
  const smallPageType = ["clinic", "unit", "subUnit", "service", "lab", "institute"].includes(config.pageType ?? "");
  const minDoctorsExpected = config.minDoctorsExpected ?? (config.allowSmallDepartment || smallPageType ? 1 : 5);
  const maxDuplicateDoctors = config.maxDuplicateDoctors ?? 0;
  const maxUnitMismatch = config.maxUnitMismatch ?? null;
  const minSpecialtyEvidenceCoverage = config.minSpecialtyEvidenceCoverage ?? 0.3;
  const maxMissingProfileUrlCoverage = config.maxMissingProfileUrlCoverage ?? 0.2;
  const profileCompletenessCounts = allQaRecords.reduce(
    (counts, doctor) => {
      counts[doctor.profileCompleteness] += 1;
      return counts;
    },
    { full: 0, partial: 0, listOnly: 0 }
  );

  assertPass(
    doctors.length >= minDoctorsExpected,
    `doctor list count ${doctors.length} < configured minimum ${minDoctorsExpected}`,
    failures
  );
  assertPass(enriched.length === doctors.length, `enriched count ${enriched.length} != doctor count ${doctors.length}`, failures);
  if (normalized) {
    assertPass(
      normalized.length === doctors.length,
      `normalized count ${normalized.length} != doctor count ${doctors.length}`,
      failures
    );
  }
  assertPass(roleCoverage >= 0.5, `role coverage ${roleCoverage.toFixed(2)} < 0.50`, failures);
  assertPass(
    specialtyEvidenceCoverage >= minSpecialtyEvidenceCoverage,
    `specialty/subspecialty/fellowship/clinicalInterests coverage ${specialtyEvidenceCoverage.toFixed(2)} < ${minSpecialtyEvidenceCoverage.toFixed(2)}`,
    failures
  );
  assertPass(sourceUrlCount === doctors.length, `sourceUrl count ${sourceUrlCount} != doctor count ${doctors.length}`, failures);
  assertPass(
    absoluteProfileUrlCount === doctors.length,
    `absolute profile URL count ${absoluteProfileUrlCount} != doctor count ${doctors.length}`,
    failures
  );
  assertPass(
    duplicateProfileUrlCount <= maxDuplicateDoctors,
    `duplicate profileUrl count ${duplicateProfileUrlCount} > configured maximum ${maxDuplicateDoctors}`,
    failures
  );
  if (maxUnitMismatch !== null) {
    assertPass(
      unitMismatchCount <= maxUnitMismatch,
      `unitMismatch count ${unitMismatchCount} > configured maximum ${maxUnitMismatch}`,
      failures
    );
  }
  assertPass(
    missingProfileUrlCoverage <= maxMissingProfileUrlCoverage,
    `missingProfileUrl coverage ${missingProfileUrlCoverage.toFixed(2)} > ${maxMissingProfileUrlCoverage.toFixed(2)}`,
    failures
  );

  const ok = failures.length === 0;
  return {
    ok,
    productionReady: ok && qaSeverityCounts.review === 0 && qaSeverityCounts.fail === 0,
    id: config.id,
    doctors: doctors.length,
    enriched: enriched.length,
    normalized: normalized?.length ?? null,
    thresholds: {
      minDoctorsExpected,
      allowSmallDepartment: config.allowSmallDepartment ?? false,
      maxDuplicateDoctors,
      maxUnitMismatch,
      minSpecialtyEvidenceCoverage,
      maxMissingProfileUrlCoverage
    },
    roleCount,
    profileEvidenceEligibleCount: profileEvidenceEligible.length,
    profileCompletenessCounts,
    roleCoverage: Number(roleCoverage.toFixed(3)),
    specialtyEvidenceCount,
    specialtyEvidenceCoverage: Number(specialtyEvidenceCoverage.toFixed(3)),
    sourceUrlCount,
    absoluteProfileUrlCount,
    qaFlagsSummary,
    qaSeverityCounts,
    failFlags,
    reviewFlags,
    duplicateProfileUrlCount,
    duplicateNameCount,
    unitMismatchCount,
    missingProfileUrlCount,
    failures
  };
}
