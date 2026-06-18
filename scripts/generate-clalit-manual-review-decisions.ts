import fs from "node:fs/promises";
import {
  doctorKeyFor,
  fileExists,
  latestBatchFile,
  ManualReviewDecision,
  REVIEW_DECISIONS_PATH
} from "@/crawler/clalit/manual-review";
import type { EnrichedDoctorRecord, NormalizedDoctorRecord } from "@/crawler/clalit/types";
import { outputPathsForDepartment, readJson, writeJson } from "@/crawler/clalit/utils";

type BatchSummary = { ids: string[] };

async function main() {
  const summaryPath = await latestBatchFile("summary.json");
  const summary = await readJson<BatchSummary>(summaryPath);
  const existing = (await fileExists(REVIEW_DECISIONS_PATH))
    ? (JSON.parse(await fs.readFile(REVIEW_DECISIONS_PATH, "utf8")) as ManualReviewDecision[])
    : [];
  const existingByKey = new Map(existing.map((decision) => [decision.doctorKey, decision]));
  const generatedAt = new Date().toISOString();
  const decisions: ManualReviewDecision[] = [];

  for (const departmentId of summary.ids) {
    const paths = outputPathsForDepartment(departmentId);
    const normalized = await readJson<NormalizedDoctorRecord[]>(paths.aiNormalizedPath);
    const enriched = await readJson<EnrichedDoctorRecord[]>(paths.enrichedPath);
    if (normalized.length !== enriched.length) {
      throw new Error(`${departmentId}: normalized count ${normalized.length} != enriched count ${enriched.length}`);
    }

    normalized.forEach((record, index) => {
      if (record.qaSeverity !== "review" && record.qaSeverity !== "fail") return;
      const source = enriched[index];
      const profileUrl = source.profileUrl ?? source.profile.sourceUrl ?? null;
      const doctorKey = doctorKeyFor(departmentId, record.fullName, profileUrl);
      decisions.push(
        existingByKey.get(doctorKey) ?? {
          departmentId,
          doctorKey,
          fullName: record.fullName,
          profileUrl,
          decision: "needsMoreEvidence",
          mergeIntoDoctorKey: null,
          reviewerNote: null,
          reviewedAt: generatedAt
        }
      );
    });
  }

  decisions.sort(
    (left, right) =>
      left.departmentId.localeCompare(right.departmentId) || left.fullName.localeCompare(right.fullName)
  );
  await writeJson(REVIEW_DECISIONS_PATH, decisions);
  console.log(
    JSON.stringify(
      {
        sourceBatchSummary: summaryPath,
        outputPath: REVIEW_DECISIONS_PATH,
        decisions: decisions.length,
        preservedExisting: decisions.filter((decision) => existingByKey.has(decision.doctorKey)).length,
        generatedNew: decisions.filter((decision) => !existingByKey.has(decision.doctorKey)).length
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
