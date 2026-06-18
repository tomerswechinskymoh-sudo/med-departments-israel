import fs from "node:fs/promises";
import {
  doctorKeyFor,
  latestBatchFile,
  ManualReviewDecision,
  mergeReviewedDoctors,
  REVIEW_AUDIT_PATH,
  REVIEW_DECISIONS_PATH,
  ReviewedDoctorRecord,
  reviewedOutputPath,
  sourceUrlsFor
} from "@/crawler/clalit/manual-review";
import type { EnrichedDoctorRecord, NormalizedDoctorRecord } from "@/crawler/clalit/types";
import { outputPathsForDepartment, readJson, writeJson } from "@/crawler/clalit/utils";

type BatchSummary = { ids: string[] };

function decisionState(
  record: NormalizedDoctorRecord,
  decision: ManualReviewDecision | undefined
): Pick<ReviewedDoctorRecord, "reviewedStatus" | "manualReviewApplied" | "reviewerNote" | "reviewedAt" | "productionReady"> {
  if (!decision) {
    const needsReview =
      record.qaSeverity === "review" || record.qaSeverity === "fail" || record.profileCompleteness === "listOnly";
    return {
      reviewedStatus: needsReview ? "needsMoreEvidence" : "approved",
      manualReviewApplied: false,
      reviewerNote: needsReview ? "No manual decision found for a QA review/fail record." : null,
      reviewedAt: null,
      productionReady: !needsReview
    };
  }
  return {
    reviewedStatus: decision.decision,
    manualReviewApplied: true,
    reviewerNote: decision.reviewerNote,
    reviewedAt: decision.reviewedAt,
    productionReady: decision.decision === "approved" || decision.decision === "crossListed"
  };
}

async function applyDepartment(departmentId: string, decisions: ManualReviewDecision[]) {
  const paths = outputPathsForDepartment(departmentId);
  const normalized = await readJson<NormalizedDoctorRecord[]>(paths.aiNormalizedPath);
  const enriched = await readJson<EnrichedDoctorRecord[]>(paths.enrichedPath);
  if (normalized.length !== enriched.length) {
    throw new Error(`${departmentId}: normalized count ${normalized.length} != enriched count ${enriched.length}`);
  }

  const decisionsByKey = new Map(decisions.filter((item) => item.departmentId === departmentId).map((item) => [item.doctorKey, item]));
  const baseRecords = normalized.map((record, index): ReviewedDoctorRecord => {
    const source = enriched[index];
    const profileUrl = source.profileUrl ?? source.profile.sourceUrl ?? null;
    const doctorKey = doctorKeyFor(departmentId, record.fullName, profileUrl);
    const decision = decisionsByKey.get(doctorKey);
    return {
      ...record,
      doctorKey,
      profileUrl,
      sourceUrls: sourceUrlsFor(record, source),
      ...decisionState(record, decision),
      mergedDoctorKeys: []
    };
  });
  const baseByKey = new Map(baseRecords.map((record) => [record.doctorKey, record]));
  const outputByKey = new Map<string, ReviewedDoctorRecord>();
  const excluded: Array<{
    doctorKey: string;
    fullName: string;
    profileUrl: string | null;
    decision: "rejected" | "merge";
    mergeIntoDoctorKey: string | null;
  }> = [];
  const applications: Array<{
    doctorKey: string;
    fullName: string;
    decision: string;
    applied: boolean;
    inReviewedOutput: boolean;
    error: string | null;
  }> = [];

  for (const record of baseRecords) {
    const decision = decisionsByKey.get(record.doctorKey);
    if (decision?.decision === "rejected" || decision?.decision === "merge") {
      excluded.push({
        doctorKey: record.doctorKey,
        fullName: record.fullName,
        profileUrl: record.profileUrl,
        decision: decision.decision,
        mergeIntoDoctorKey: decision.mergeIntoDoctorKey
      });
      continue;
    }
    outputByKey.set(record.doctorKey, record);
    applications.push({
      doctorKey: record.doctorKey,
      fullName: record.fullName,
      decision: decision?.decision ?? "autoApproved",
      applied: Boolean(decision),
      inReviewedOutput: true,
      error: null
    });
  }

  for (const decision of decisionsByKey.values()) {
    if (decision.decision !== "merge") continue;
    const source = baseByKey.get(decision.doctorKey);
    const targetKey = decision.mergeIntoDoctorKey;
    const target = targetKey ? outputByKey.get(targetKey) : null;
    if (!source || !targetKey || !target) {
      applications.push({
        doctorKey: decision.doctorKey,
        fullName: decision.fullName,
        decision: decision.decision,
        applied: false,
        inReviewedOutput: false,
        error: !source ? "Source doctorKey not found." : !targetKey ? "mergeIntoDoctorKey is required." : "Merge target not found in output."
      });
      continue;
    }
    outputByKey.set(targetKey, mergeReviewedDoctors(target, source));
    applications.push({
      doctorKey: decision.doctorKey,
      fullName: decision.fullName,
      decision: decision.decision,
      applied: true,
      inReviewedOutput: false,
      error: null
    });
  }

  for (const decision of decisionsByKey.values()) {
    if (baseByKey.has(decision.doctorKey)) continue;
    applications.push({
      doctorKey: decision.doctorKey,
      fullName: decision.fullName,
      decision: decision.decision,
      applied: false,
      inReviewedOutput: false,
      error: "Decision doctorKey not found in current normalized output."
    });
  }

  const reviewed = Array.from(outputByKey.values());
  await writeJson(reviewedOutputPath(departmentId), reviewed);
  return {
    departmentId,
    inputCount: normalized.length,
    reviewedCount: reviewed.length,
    decisionsFound: decisionsByKey.size,
    decisionsApplied: applications.filter((item) => item.applied).length,
    unresolvedReviewCount: reviewed.filter((record) => record.reviewedStatus === "needsMoreEvidence" && record.qaSeverity === "review").length,
    unresolvedFailCount: reviewed.filter((record) => record.reviewedStatus === "needsMoreEvidence" && record.qaSeverity === "fail").length,
    productionReadyCount: reviewed.filter((record) => record.productionReady).length,
    excluded,
    applications,
    outputPath: reviewedOutputPath(departmentId)
  };
}

async function main() {
  const decisions = await readJson<ManualReviewDecision[]>(REVIEW_DECISIONS_PATH);
  const duplicateDecisionKeys = decisions.filter(
    (decision, index) => decisions.findIndex((candidate) => candidate.doctorKey === decision.doctorKey) !== index
  );
  if (duplicateDecisionKeys.length > 0) throw new Error(`Duplicate decision doctorKey values: ${duplicateDecisionKeys.length}`);

  const latestSummaryPath = await latestBatchFile("summary.json");
  const summary = await readJson<BatchSummary>(latestSummaryPath);
  const departments = [];
  for (const departmentId of summary.ids) departments.push(await applyDepartment(departmentId, decisions));

  const audit = {
    appliedAt: new Date().toISOString(),
    decisionsPath: REVIEW_DECISIONS_PATH,
    sourceBatchSummary: latestSummaryPath,
    totalDecisions: decisions.length,
    decisionsApplied: departments.reduce((sum, item) => sum + item.decisionsApplied, 0),
    totalReviewedRecords: departments.reduce((sum, item) => sum + item.reviewedCount, 0),
    unresolvedReviewCount: departments.reduce((sum, item) => sum + item.unresolvedReviewCount, 0),
    unresolvedFailCount: departments.reduce((sum, item) => sum + item.unresolvedFailCount, 0),
    departments
  };
  await writeJson(REVIEW_AUDIT_PATH, audit);
  console.log(JSON.stringify({ auditPath: REVIEW_AUDIT_PATH, ...audit }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
