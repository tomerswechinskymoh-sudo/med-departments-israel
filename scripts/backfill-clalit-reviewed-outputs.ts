import type { ReviewedDoctorRecord } from "@/crawler/clalit/manual-review";
import {
  doctorKeyFor,
  fileExists,
  reviewedOutputPath,
  sourceUrlsFor
} from "@/crawler/clalit/manual-review";
import type { EnrichedDoctorRecord, NormalizedDoctorRecord } from "@/crawler/clalit/types";
import {
  loadClalitDepartmentConfigs,
  outputPathsForDepartment,
  parseArgs,
  readJson,
  writeJson
} from "@/crawler/clalit/utils";

async function main() {
  const args = parseArgs();
  const force = args.has("force");
  const hospitalSlug = args.get("hospital");
  const configs = (await loadClalitDepartmentConfigs()).filter(
    (config) => !hospitalSlug || config.hospitalSlug === hospitalSlug
  );
  const results: Array<{
    id: string;
    status: "created" | "overwritten" | "skipped-existing" | "skipped-no-normalized" | "failed";
    count: number;
    productionReady: number;
    error: string | null;
  }> = [];

  for (const config of configs) {
    const paths = outputPathsForDepartment(config.id);
    const outputPath = reviewedOutputPath(config.id);
    if (!(await fileExists(paths.aiNormalizedPath))) {
      results.push({ id: config.id, status: "skipped-no-normalized", count: 0, productionReady: 0, error: null });
      continue;
    }
    if (!force && (await fileExists(outputPath))) {
      const existing = await readJson<ReviewedDoctorRecord[]>(outputPath);
      results.push({
        id: config.id,
        status: "skipped-existing",
        count: existing.length,
        productionReady: existing.filter((record) => record.productionReady).length,
        error: null
      });
      continue;
    }

    try {
      const normalized = await readJson<NormalizedDoctorRecord[]>(paths.aiNormalizedPath);
      const enriched = await readJson<EnrichedDoctorRecord[]>(paths.enrichedPath);
      if (normalized.length !== enriched.length) {
        throw new Error(`normalized count ${normalized.length} != enriched count ${enriched.length}`);
      }
      const reviewed: ReviewedDoctorRecord[] = normalized.map((record, index) => {
        const source = enriched[index];
        const profileUrl = source.profileUrl ?? source.profile.sourceUrl ?? null;
        const productionReady = record.qaSeverity === "ok" && record.profileCompleteness !== "listOnly";
        return {
          ...record,
          doctorKey: doctorKeyFor(config.id, record.fullName, profileUrl),
          profileUrl,
          sourceUrls: sourceUrlsFor(record, source),
          reviewedStatus: productionReady ? "approved" : "needsMoreEvidence",
          manualReviewApplied: false,
          reviewerNote: null,
          reviewedAt: null,
          productionReady,
          mergedDoctorKeys: []
        };
      });
      const existed = await fileExists(outputPath);
      await writeJson(outputPath, reviewed);
      results.push({
        id: config.id,
        status: existed ? "overwritten" : "created",
        count: reviewed.length,
        productionReady: reviewed.filter((record) => record.productionReady).length,
        error: null
      });
    } catch (error) {
      results.push({
        id: config.id,
        status: "failed",
        count: 0,
        productionReady: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        force,
        hospitalSlug: hospitalSlug ?? null,
        created: results.filter((result) => result.status === "created").length,
        overwritten: results.filter((result) => result.status === "overwritten").length,
        skippedExisting: results.filter((result) => result.status === "skipped-existing").length,
        skippedNoNormalized: results.filter((result) => result.status === "skipped-no-normalized").length,
        failed: results.filter((result) => result.status === "failed").length,
        totalReviewedDoctors: results
          .filter((result) => result.status !== "skipped-no-normalized" && result.status !== "failed")
          .reduce((sum, result) => sum + result.count, 0),
        totalProductionReady: results.reduce((sum, result) => sum + result.productionReady, 0),
        results
      },
      null,
      2
    )
  );
  if (results.some((result) => result.status === "failed")) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
