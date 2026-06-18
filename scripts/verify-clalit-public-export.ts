import fs from "node:fs/promises";
import path from "node:path";
import {
  DepartmentPublicExport,
  GlobalPublicExport,
  latestExportRunId,
  PUBLIC_CSV_HEADERS,
  PublicDoctorRecord,
  safeRunId,
  sourcedPublicContact
} from "@/crawler/clalit/public-export";
import { parseArgs, readJson } from "@/crawler/clalit/utils";

const PUBLIC_RECORD_KEYS = new Set(PUBLIC_CSV_HEADERS);
const FORBIDDEN_KEYS = new Set([
  "rawProfileText",
  "rawHtml",
  "confidence",
  "qaNotes",
  "reviewerNote",
  "manualReviewApplied",
  "reviewedAt",
  "mergedDoctorKeys",
  "doctorKey",
  "missingImportantFields",
  "seniorityEvidence"
]);

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function inspectValue(value: unknown, location: string, failures: string[]) {
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower.includes("ai-cache") || lower.includes("openai prompt") || lower.includes("openai_api_key")) {
      failures.push(`${location}: forbidden OpenAI/cache reference.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectValue(item, `${location}[${index}]`, failures));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) failures.push(`${location}: forbidden field ${key}.`);
    inspectValue(nested, `${location}.${key}`, failures);
  }
}

function verifyDoctor(record: PublicDoctorRecord, index: number, failures: string[]) {
  const location = `doctors[${index}]`;
  for (const key of Object.keys(record)) {
    if (!PUBLIC_RECORD_KEYS.has(key as (typeof PUBLIC_CSV_HEADERS)[number])) {
      failures.push(`${location}: unexpected public field ${key}.`);
    }
  }
  if (!record.fullName) failures.push(`${location}: fullName missing.`);
  if (!record.departmentId) failures.push(`${location}: departmentId missing.`);
  if (!Array.isArray(record.sourceUrls) || record.sourceUrls.length === 0) failures.push(`${location}: sourceUrls missing.`);
  if (record.reviewedStatus === "rejected") failures.push(`${location}: rejected record exported.`);
  const manuallyApprovedListOnly =
    record.profileCompleteness === "listOnly" &&
    (record.reviewedStatus === "approved" || record.reviewedStatus === "crossListed");
  if (
    (record.qaSeverity === "fail" ||
      (record.qaSeverity === "review" && !manuallyApprovedListOnly) ||
      record.reviewedStatus === "needsMoreEvidence") &&
    record.productionReady
  ) {
    failures.push(`${location}: productionReady must be false for unresolved QA/review status.`);
  }
  if (!(["full", "partial", "listOnly"] as const).includes(record.profileCompleteness)) {
    failures.push(`${location}: invalid profileCompleteness.`);
  }
  for (const field of ["email", "phone"] as const) {
    const value = record.publicContact[field];
    if (value && sourcedPublicContact(value, record.claims) !== value) {
      failures.push(`${location}: publicContact.${field} lacks public claim evidence.`);
    }
  }
  inspectValue(record, location, failures);
}

function selectedDepartmentIds(args: ReturnType<typeof parseArgs>, globalExport: GlobalPublicExport) {
  const modes = [args.has("all"), Boolean(args.get("hospital")), Boolean(args.get("id"))].filter(Boolean).length;
  if (modes !== 1) throw new Error("Choose exactly one mode: --all, --hospital <slug>, or --id <departmentId>.");
  if (args.has("all")) return Array.from(new Set(globalExport.doctors.map((record) => record.departmentId)));
  const hospitalSlug = args.get("hospital");
  if (hospitalSlug) {
    return Array.from(
      new Set(globalExport.doctors.filter((record) => record.hospitalSlug === hospitalSlug).map((record) => record.departmentId))
    );
  }
  return [args.get("id")!];
}

async function main() {
  const args = parseArgs();
  const runId = args.get("runId") ? safeRunId(args.get("runId")!) : await latestExportRunId();
  const runDir = path.join(process.cwd(), "data", "crawler", "runs", runId);
  const failures: string[] = [];
  const manifest = await readJson<{
    runId: string;
    hospitalCount: number;
    departmentCount: number;
    doctorCount: number;
    hospitalSlugs: string[];
    departmentIds: string[];
    sourceReviewedFiles: string[];
    counts: { approved: number; crossListed: number; needsMoreEvidence: number; productionReady: number };
  }>(path.join(runDir, "manifest.json"));
  const globalExport = await readJson<GlobalPublicExport>(path.join(runDir, "all-hospitals-public.json"));
  const departmentIds = selectedDepartmentIds(args, globalExport);
  if (departmentIds.length === 0) failures.push("Selected scope contains no departments.");

  if (manifest.runId !== runId) failures.push(`Manifest runId ${manifest.runId} != directory runId ${runId}.`);
  if (manifest.doctorCount !== globalExport.doctors.length) {
    failures.push(`Manifest doctorCount ${manifest.doctorCount} != global doctor count ${globalExport.doctors.length}.`);
  }
  if (manifest.departmentCount !== manifest.departmentIds.length) failures.push("Manifest department count mismatch.");
  if (manifest.hospitalCount !== manifest.hospitalSlugs.length) failures.push("Manifest hospital count mismatch.");
  if (!(await exists(path.join(runDir, "all-hospitals-public.csv")))) failures.push("Global CSV missing.");

  const selectedDoctors = globalExport.doctors.filter((record) => departmentIds.includes(record.departmentId));
  selectedDoctors.forEach((record, index) => verifyDoctor(record, index, failures));

  let departmentDoctorCount = 0;
  for (const departmentId of departmentIds) {
    const configRecord = globalExport.doctors.find((record) => record.departmentId === departmentId);
    if (!configRecord) {
      failures.push(`No global records found for department ${departmentId}.`);
      continue;
    }
    const departmentDir = path.join(
      runDir,
      "hospitals",
      configRecord.hospitalSlug,
      "departments",
      departmentId
    );
    const jsonPath = path.join(departmentDir, "doctors-public.json");
    const csvPath = path.join(departmentDir, "doctors-public.csv");
    if (!(await exists(jsonPath))) {
      failures.push(`Department JSON missing: ${departmentId}.`);
      continue;
    }
    if (!(await exists(csvPath))) failures.push(`Department CSV missing: ${departmentId}.`);
    const departmentExport = await readJson<DepartmentPublicExport>(jsonPath);
    departmentDoctorCount += departmentExport.doctors.length;
    departmentExport.doctors.forEach((record, index) => verifyDoctor(record, index, failures));
    if (departmentExport.summary.doctorCount !== departmentExport.doctors.length) {
      failures.push(`${departmentId}: department summary doctor count mismatch.`);
    }
  }
  if (departmentDoctorCount !== selectedDoctors.length) {
    failures.push(`Selected department doctor total ${departmentDoctorCount} != selected global total ${selectedDoctors.length}.`);
  }

  for (const hospitalSlug of Array.from(new Set(selectedDoctors.map((record) => record.hospitalSlug)))) {
    if (!(await exists(path.join(runDir, "hospitals", hospitalSlug, "hospital-public.json")))) {
      failures.push(`Hospital JSON missing: ${hospitalSlug}.`);
    }
    if (!(await exists(path.join(runDir, "hospitals", hospitalSlug, "hospital-public.csv")))) {
      failures.push(`Hospital CSV missing: ${hospitalSlug}.`);
    }
  }

  const result = {
    ok: failures.length === 0,
    runId,
    hospitalCount: new Set(selectedDoctors.map((record) => record.hospitalSlug)).size,
    departmentCount: departmentIds.length,
    doctorCount: selectedDoctors.length,
    productionReadyCount: selectedDoctors.filter((record) => record.productionReady).length,
    failures
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
