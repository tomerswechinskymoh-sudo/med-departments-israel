import fs from "node:fs/promises";
import path from "node:path";
import { normalizeClalitDepartmentWithAi } from "@/crawler/clalit/normalize-ai";
import { crawlClalitDepartmentDoctors } from "@/crawler/clalit/parse-doctor-list";
import { enrichClalitDepartmentProfiles } from "@/crawler/clalit/parse-profile";
import type { DoctorRecord, EnrichedDoctorRecord, NormalizedDoctorRecord } from "@/crawler/clalit/types";
import {
  ensureOutputDirs,
  loadClalitDepartmentConfig,
  loadEnvFiles,
  outputPathsForDepartment,
  parseArgs,
  readJson,
  writeJson
} from "@/crawler/clalit/utils";
import { verifyClalitCrawlerOutput } from "@/crawler/clalit/verify";

type BatchConfig = { name?: string; ids: string[] } | string[];

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function readIds(args: ReturnType<typeof parseArgs>) {
  const rawIds = args.get("ids");
  if (rawIds) {
    return rawIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  const configPath = args.get("config");
  if (!configPath) throw new Error("Provide --ids <id1,id2> or --config <batch-config.json>.");

  const absoluteConfigPath = path.resolve(process.cwd(), configPath);
  const batchConfig = await readJson<BatchConfig>(absoluteConfigPath);
  const ids = Array.isArray(batchConfig) ? batchConfig : batchConfig.ids;
  if (!Array.isArray(ids) || ids.length === 0) throw new Error(`Batch config has no ids: ${configPath}`);
  return ids.map((id) => id.trim()).filter(Boolean);
}

async function outputCounts(id: string) {
  const paths = outputPathsForDepartment(id);
  const doctors = (await fileExists(paths.doctorsPath)) ? await readJson<DoctorRecord[]>(paths.doctorsPath) : [];
  const enriched = (await fileExists(paths.enrichedPath))
    ? await readJson<EnrichedDoctorRecord[]>(paths.enrichedPath)
    : [];
  const normalized = (await fileExists(paths.aiNormalizedPath))
    ? await readJson<NormalizedDoctorRecord[]>(paths.aiNormalizedPath)
    : null;

  return {
    doctorsCount: doctors.length,
    enrichedCount: enriched.length,
    normalizedCount: normalized?.length ?? null
  };
}

async function runDepartment(id: string, aiEnabled: boolean) {
  const errors: string[] = [];
  let qaFlagCounts: Record<string, number> = {};
  let verification: Awaited<ReturnType<typeof verifyClalitCrawlerOutput>> | null = null;
  let pagesCrawled = 0;
  let rawDoctorItemsCount = 0;
  let crawlWarnings: string[] = [];
  let rejectedCandidates: Array<{ pageNumber: number; fullName: string; profileUrl: string | null; rawText: string; reason: string }> = [];

  try {
    const config = await loadClalitDepartmentConfig(id);
    const paths = outputPathsForDepartment(config.id);
    await ensureOutputDirs(paths);

    const crawlSummary = await crawlClalitDepartmentDoctors(config, paths);
    pagesCrawled = crawlSummary.pagesCrawled;
    rawDoctorItemsCount = crawlSummary.doctorsPerPage.reduce((sum, page) => sum + page.doctorsFound, 0);
    crawlWarnings = crawlSummary.warnings;
    rejectedCandidates = crawlSummary.rejectedCandidates ?? [];
    await enrichClalitDepartmentProfiles(config, paths);

    if (aiEnabled) {
      const aiSummary = await normalizeClalitDepartmentWithAi({ config, paths });
      if ("ok" in aiSummary && !aiSummary.ok) errors.push(`AI normalization: ${JSON.stringify(aiSummary)}`);
    }

    verification = await verifyClalitCrawlerOutput(id);
    qaFlagCounts = verification.qaFlagsSummary;
    errors.push(...verification.failures);
  } catch (error) {
    errors.push(errorMessage(error));
  }

  const counts = await outputCounts(id);
  return {
    id,
    ...counts,
    pagesCrawled,
    rawDoctorItemsCount,
    crawlWarnings,
    rejectedCandidates,
    qaFlagCounts,
    qaSeverityCounts: verification?.qaSeverityCounts ?? { ok: 0, review: 0, fail: 0 },
    productionReady: verification?.productionReady ?? false,
    pass: errors.length === 0 && Boolean(verification?.ok),
    error: errors.length > 0 ? errors.join(" | ") : null,
    verification
  };
}

async function main() {
  const args = parseArgs();
  const ids = Array.from(new Set(await readIds(args)));
  await loadEnvFiles();
  const aiEnabled = Boolean(process.env.OPENAI_API_KEY?.trim());
  const startedAt = new Date();
  const runId = startedAt.toISOString().replace(/[:.]/g, "-");
  const summaryPath = path.join(process.cwd(), "data", "crawler", "batch-runs", runId, "summary.json");
  const results = [];

  for (const id of ids) {
    console.log(`[batch] start ${id}`);
    const result = await runDepartment(id, aiEnabled);
    results.push(result);
    console.log(`[batch] ${result.pass ? "PASS" : "FAIL"} ${id}`);
  }

  const summary = {
    runId,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    aiEnabled,
    ids,
    passed: results.filter((result) => result.pass).length,
    failed: results.filter((result) => !result.pass).length,
    results
  };

  await writeJson(summaryPath, summary);
  console.log(JSON.stringify({ summaryPath, ...summary }, null, 2));
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
