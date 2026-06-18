import fs from "node:fs/promises";
import { loadClalitDepartmentConfig, outputPathsForDepartment, readJson } from "@/crawler/clalit/utils";
import type { DoctorRecord, EnrichedDoctorRecord, NormalizedDoctorRecord } from "@/crawler/clalit/types";

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function assertPass(condition: boolean, message: string, failures: string[]) {
  if (!condition) failures.push(message);
}

async function main() {
  const config = await loadClalitDepartmentConfig("rabin-beilinson-ent");
  const paths = outputPathsForDepartment(config.id);
  const failures: string[] = [];

  const doctors = await readJson<DoctorRecord[]>(paths.doctorsPath);
  const enriched = await readJson<EnrichedDoctorRecord[]>(paths.enrichedPath);
  const normalizedExists = await exists(paths.aiNormalizedPath);
  const normalized = normalizedExists ? await readJson<NormalizedDoctorRecord[]>(paths.aiNormalizedPath) : null;

  const profileUrlCount = doctors.filter((doctor) => Boolean(doctor.profileUrl)).length;
  const roleCount = enriched.filter((doctor) => Boolean(doctor.profile.role)).length;
  const fellowshipOrSubspecialtyCount = enriched.filter(
    (doctor) => doctor.profile.fellowship.length > 0 || doctor.profile.subspecialties.length > 0
  ).length;

  assertPass(doctors.length >= 15, `doctor list count ${doctors.length} < 15`, failures);
  assertPass(enriched.length === doctors.length, `enriched count ${enriched.length} != doctor count ${doctors.length}`, failures);
  if (normalized) {
    assertPass(
      normalized.length === doctors.length,
      `normalized count ${normalized.length} != doctor count ${doctors.length}`,
      failures
    );
  }
  assertPass(profileUrlCount >= 10, `profile URL count ${profileUrlCount} < 10`, failures);
  assertPass(roleCount >= 10, `role count ${roleCount} < 10`, failures);
  assertPass(
    fellowshipOrSubspecialtyCount >= 8,
    `fellowship/subspecialty count ${fellowshipOrSubspecialtyCount} < 8`,
    failures
  );

  const summary = {
    ok: failures.length === 0,
    id: config.id,
    doctors: doctors.length,
    enriched: enriched.length,
    normalized: normalized?.length ?? null,
    profileUrlCount,
    roleCount,
    fellowshipOrSubspecialtyCount,
    failures
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failures.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
