import fs from "node:fs/promises";
import path from "node:path";
import { qaSeverityForFlags } from "@/crawler/clalit/qa";
import type { EnrichedDoctorRecord, NormalizedDoctorRecord, QaSeverity } from "@/crawler/clalit/types";
import { outputPathsForDepartment, readJson } from "@/crawler/clalit/utils";

type BatchResult = {
  id: string;
  doctorsCount: number;
  enrichedCount: number;
  normalizedCount: number | null;
  qaFlagCounts: Record<string, number>;
  qaSeverityCounts?: Record<QaSeverity, number>;
  pass: boolean;
  productionReady?: boolean;
  error: string | null;
};

type BatchSummary = {
  runId: string;
  results: BatchResult[];
};

type ReviewRecord = {
  departmentId: string;
  departmentPass: boolean;
  productionReady: boolean;
  doctorsCount: number;
  enrichedCount: number;
  normalizedCount: number | null;
  topQaIssues: string;
  name: string;
  role: string;
  unit: string;
  qaSeverity: QaSeverity;
  qaFlags: string;
  qaNotes: string;
  sourceUrl: string;
  profileUrl: string;
};

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function latestBatchSummaryPath() {
  const baseDir = path.join(process.cwd(), "data", "crawler", "batch-runs");
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(baseDir, entry.name, "summary.json"))
    .sort();
  const existing = [];
  for (const candidate of candidates) if (await exists(candidate)) existing.push(candidate);
  const latest = existing.at(-1);
  if (!latest) throw new Error("No crawler batch summary found.");
  return latest;
}

function topQaIssues(flags: Record<string, number>) {
  return Object.entries(flags)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([flag, count]) => `${flag} (${count})`)
    .join(", ");
}

function markdown(value: unknown) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function csv(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function reviewRecordsForResult(result: BatchResult) {
  const paths = outputPathsForDepartment(result.id);
  const enriched = (await exists(paths.enrichedPath)) ? await readJson<EnrichedDoctorRecord[]>(paths.enrichedPath) : [];
  const normalized = (await exists(paths.aiNormalizedPath))
    ? await readJson<NormalizedDoctorRecord[]>(paths.aiNormalizedPath)
    : null;
  const issues = topQaIssues(result.qaFlagCounts);
  const records: ReviewRecord[] = [];

  for (let index = 0; index < enriched.length; index += 1) {
    const source = enriched[index];
    const normalizedRecord = normalized?.[index];
    const qaFlags = normalizedRecord?.qaFlags ?? source.qaFlags ?? [];
    const qaSeverity = normalizedRecord?.qaSeverity ?? source.qaSeverity ?? qaSeverityForFlags(qaFlags);
    if (qaSeverity === "ok") continue;

    records.push({
      departmentId: result.id,
      departmentPass: result.pass,
      productionReady: result.productionReady ?? false,
      doctorsCount: result.doctorsCount,
      enrichedCount: result.enrichedCount,
      normalizedCount: result.normalizedCount,
      topQaIssues: issues,
      name: normalizedRecord?.fullName ?? source.profile.fullName ?? source.fullName,
      role: normalizedRecord?.role ?? source.profile.role ?? source.titleOrRole ?? "",
      unit: normalizedRecord?.unit ?? source.profile.unit ?? source.profile.department ?? "",
      qaSeverity,
      qaFlags: qaFlags.join("; "),
      qaNotes: (normalizedRecord?.qaNotes ?? source.qaNotes ?? []).join("; "),
      sourceUrl: source.sourceUrl,
      profileUrl: source.profileUrl ?? source.profile.sourceUrl ?? ""
    });
  }
  return records;
}

async function main() {
  const summaryPath = await latestBatchSummaryPath();
  const summary = await readJson<BatchSummary>(summaryPath);
  const runDir = path.dirname(summaryPath);
  const markdownPath = path.join(runDir, "review-report.md");
  const csvPath = path.join(runDir, "review-report.csv");
  const reviewRecords = (await Promise.all(summary.results.map(reviewRecordsForResult))).flat();

  const lines = [
    `# Clalit crawler batch review: ${summary.runId}`,
    "",
    "## Department summary",
    "",
    "| Department | Doctors | Enriched | Normalized | Pass | Production ready | QA severity | Top QA issues |",
    "|---|---:|---:|---:|---|---|---|---|"
  ];
  for (const result of summary.results) {
    const severity = result.qaSeverityCounts
      ? `ok=${result.qaSeverityCounts.ok}, review=${result.qaSeverityCounts.review}, fail=${result.qaSeverityCounts.fail}`
      : "n/a";
    lines.push(
      `| ${markdown(result.id)} | ${result.doctorsCount} | ${result.enrichedCount} | ${result.normalizedCount ?? "n/a"} | ${
        result.pass ? "PASS" : "FAIL"
      } | ${result.productionReady ? "yes" : "no"} | ${severity} | ${markdown(topQaIssues(result.qaFlagCounts) || "none")} |`
    );
  }

  lines.push("", "## Records requiring review", "");
  for (const result of summary.results) {
    const departmentRecords = reviewRecords.filter((record) => record.departmentId === result.id);
    lines.push(`### ${result.id}`, "");
    if (departmentRecords.length === 0) {
      lines.push("No records require review.", "");
      continue;
    }
    lines.push(
      "| Name | Role | Unit | Severity | QA flags | QA notes | Source | Profile |",
      "|---|---|---|---|---|---|---|---|"
    );
    for (const record of departmentRecords) {
      lines.push(
        `| ${markdown(record.name)} | ${markdown(record.role)} | ${markdown(record.unit)} | ${record.qaSeverity} | ${markdown(
          record.qaFlags
        )} | ${markdown(record.qaNotes)} | ${markdown(record.sourceUrl)} | ${markdown(record.profileUrl)} |`
      );
    }
    lines.push("");
  }

  const headers = Object.keys(reviewRecords[0] ?? {
    departmentId: "",
    departmentPass: "",
    productionReady: "",
    doctorsCount: "",
    enrichedCount: "",
    normalizedCount: "",
    topQaIssues: "",
    name: "",
    role: "",
    unit: "",
    qaSeverity: "",
    qaFlags: "",
    qaNotes: "",
    sourceUrl: "",
    profileUrl: ""
  });
  const csvRows = [headers.join(","), ...reviewRecords.map((record) => headers.map((key) => csv(record[key as keyof ReviewRecord])).join(","))];

  await fs.writeFile(markdownPath, `${lines.join("\n")}\n`, "utf8");
  await fs.writeFile(csvPath, `${csvRows.join("\n")}\n`, "utf8");
  console.log(JSON.stringify({ summaryPath, markdownPath, csvPath, reviewRecords: reviewRecords.length }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
