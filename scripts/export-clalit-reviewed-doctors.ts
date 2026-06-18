import fs from "node:fs/promises";
import path from "node:path";
import type { ReviewedDoctorRecord } from "@/crawler/clalit/manual-review";
import { fileExists, reviewedOutputPath } from "@/crawler/clalit/manual-review";
import {
  countPublicDoctors,
  DepartmentPublicExport,
  GlobalPublicExport,
  HospitalPublicExport,
  publicDoctorsToCsv,
  safeRunId,
  timestampRunId,
  toPublicDoctor,
  writeText
} from "@/crawler/clalit/public-export";
import type { ClalitDepartmentConfig } from "@/crawler/clalit/types";
import {
  loadClalitDepartmentConfigs,
  parseArgs,
  readJson,
  writeJson
} from "@/crawler/clalit/utils";

type ExportMode =
  | { type: "all" }
  | { type: "hospital"; hospitalSlug: string }
  | { type: "department"; departmentId: string };

function selectedMode(args: ReturnType<typeof parseArgs>): ExportMode {
  const modes = [args.has("all"), Boolean(args.get("hospital")), Boolean(args.get("id"))].filter(Boolean).length;
  if (modes !== 1) throw new Error("Choose exactly one mode: --all, --hospital <slug>, or --id <departmentId>.");
  if (args.has("all")) return { type: "all" };
  const hospitalSlug = args.get("hospital");
  if (hospitalSlug) return { type: "hospital", hospitalSlug };
  return { type: "department", departmentId: args.get("id")! };
}

async function uniqueAutomaticRunId() {
  const base = timestampRunId();
  const runsDir = path.join(process.cwd(), "data", "crawler", "runs");
  let runId = base;
  let suffix = 2;
  while (await fileExists(path.join(runsDir, runId))) {
    runId = `${base}-${suffix}`;
    suffix += 1;
  }
  return runId;
}

async function resolveRunId(args: ReturnType<typeof parseArgs>) {
  const explicit = args.get("runId");
  const runId = explicit ? safeRunId(explicit) : await uniqueAutomaticRunId();
  const runDir = path.join(process.cwd(), "data", "crawler", "runs", runId);
  if (explicit && (await fileExists(runDir))) throw new Error(`Export run already exists: ${runId}`);
  return { runId, runDir };
}

async function availableReviewedConfigs(configs: ClalitDepartmentConfig[]) {
  const available = [];
  for (const config of configs) {
    if (await fileExists(reviewedOutputPath(config.id))) available.push(config);
  }
  return available;
}

function filterConfigs(configs: ClalitDepartmentConfig[], mode: ExportMode) {
  if (mode.type === "all") return configs;
  if (mode.type === "hospital") return configs.filter((config) => config.hospitalSlug === mode.hospitalSlug);
  return configs.filter((config) => config.id === mode.departmentId);
}

function relativeToProject(filePath: string) {
  return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}

async function main() {
  const args = parseArgs();
  const mode = selectedMode(args);
  const { runId, runDir } = await resolveRunId(args);
  const generatedAt = new Date().toISOString();
  const configs = filterConfigs(await availableReviewedConfigs(await loadClalitDepartmentConfigs()), mode);
  if (configs.length === 0) {
    throw new Error(
      mode.type === "all"
        ? "No reviewed department outputs found."
        : `No reviewed output found for ${mode.type === "hospital" ? mode.hospitalSlug : mode.departmentId}.`
    );
  }

  const packageJson = await readJson<{ version?: string }>(path.join(process.cwd(), "package.json"));
  const departmentExports: DepartmentPublicExport[] = [];
  const sourceReviewedFiles: string[] = [];

  for (const config of configs) {
    const sourcePath = reviewedOutputPath(config.id);
    const reviewed = await readJson<ReviewedDoctorRecord[]>(sourcePath);
    const doctors = reviewed
      .filter((record) => record.reviewedStatus !== "rejected")
      .map((record) => toPublicDoctor(config.id, config, record));
    const departmentExport: DepartmentPublicExport = {
      runId,
      generatedAt,
      hospital: config.hospital,
      hospitalSlug: config.hospitalSlug,
      departmentId: config.id,
      department: config.department,
      summary: {
        doctorCount: doctors.length,
        counts: countPublicDoctors(doctors)
      },
      doctors
    };
    departmentExports.push(departmentExport);
    sourceReviewedFiles.push(relativeToProject(sourcePath));

    const departmentDir = path.join(
      runDir,
      "hospitals",
      config.hospitalSlug,
      "departments",
      config.id
    );
    await writeJson(path.join(departmentDir, "doctors-public.json"), departmentExport);
    await writeText(path.join(departmentDir, "doctors-public.csv"), publicDoctorsToCsv(doctors));
  }

  const hospitalSlugs = Array.from(new Set(departmentExports.map((item) => item.hospitalSlug))).sort();
  const hospitalExports: HospitalPublicExport[] = [];
  for (const hospitalSlug of hospitalSlugs) {
    const departments = departmentExports.filter((item) => item.hospitalSlug === hospitalSlug);
    const doctors = departments.flatMap((item) => item.doctors);
    const hospitalExport: HospitalPublicExport = {
      runId,
      generatedAt,
      hospital: departments[0].hospital,
      hospitalSlug,
      summary: {
        departmentCount: departments.length,
        doctorCount: doctors.length,
        counts: countPublicDoctors(doctors)
      },
      departments: departments.map((item) => ({
        departmentId: item.departmentId,
        department: item.department,
        doctorCount: item.doctors.length,
        productionReadyCount: item.doctors.filter((doctor) => doctor.productionReady).length,
        doctors: item.doctors
      })),
      doctors
    };
    hospitalExports.push(hospitalExport);
    const hospitalDir = path.join(runDir, "hospitals", hospitalSlug);
    await writeJson(path.join(hospitalDir, "hospital-public.json"), hospitalExport);
    await writeText(path.join(hospitalDir, "hospital-public.csv"), publicDoctorsToCsv(doctors));
  }

  const allDoctors = departmentExports.flatMap((item) => item.doctors);
  const globalExport: GlobalPublicExport = {
    runId,
    generatedAt,
    summary: {
      hospitalCount: hospitalExports.length,
      departmentCount: departmentExports.length,
      doctorCount: allDoctors.length,
      counts: countPublicDoctors(allDoctors)
    },
    hospitals: hospitalExports.map((item) => ({
      hospital: item.hospital,
      hospitalSlug: item.hospitalSlug,
      departmentCount: item.summary.departmentCount,
      doctorCount: item.summary.doctorCount
    })),
    doctors: allDoctors
  };
  await writeJson(path.join(runDir, "all-hospitals-public.json"), globalExport);
  await writeText(path.join(runDir, "all-hospitals-public.csv"), publicDoctorsToCsv(allDoctors));

  const manifest = {
    runId,
    generatedAt,
    hospitalCount: hospitalExports.length,
    departmentCount: departmentExports.length,
    doctorCount: allDoctors.length,
    hospitalSlugs,
    departmentIds: departmentExports.map((item) => item.departmentId).sort(),
    sourceReviewedFiles: sourceReviewedFiles.sort(),
    crawlerVersion: packageJson.version ?? null,
    counts: countPublicDoctors(allDoctors)
  };
  await writeJson(path.join(runDir, "manifest.json"), manifest);

  console.log(
    JSON.stringify(
      {
        runId,
        runDir: relativeToProject(runDir),
        hospitalCount: hospitalExports.length,
        departmentCount: departmentExports.length,
        doctorCount: allDoctors.length,
        hospitals: hospitalExports.map((item) => ({
          hospitalSlug: item.hospitalSlug,
          doctorCount: item.summary.doctorCount,
          departmentCount: item.summary.departmentCount
        })),
        departments: departmentExports.map((item) => ({
          departmentId: item.departmentId,
          doctorCount: item.summary.doctorCount,
          productionReadyCount: item.summary.counts.productionReady
        })),
        manifest
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
