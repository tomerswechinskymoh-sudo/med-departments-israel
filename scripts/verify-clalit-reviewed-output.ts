import {
  ManualReviewDecision,
  REVIEW_AUDIT_PATH,
  REVIEW_DECISIONS_PATH,
  ReviewedDoctorRecord,
  reviewedOutputPath
} from "@/crawler/clalit/manual-review";
import { parseArgs, readJson } from "@/crawler/clalit/utils";

type ReviewAudit = {
  departments: Array<{
    departmentId: string;
    inputCount: number;
    reviewedCount: number;
    unresolvedReviewCount: number;
    unresolvedFailCount: number;
    excluded: Array<{ doctorKey: string; decision: "rejected" | "merge" }>;
  }>;
};

async function main() {
  const args = parseArgs();
  const id = args.get("id");
  if (!id) throw new Error("Missing --id <department-config-id>.");
  const reviewed = await readJson<ReviewedDoctorRecord[]>(reviewedOutputPath(id));
  const decisions = (await readJson<ManualReviewDecision[]>(REVIEW_DECISIONS_PATH)).filter((item) => item.departmentId === id);
  const audit = await readJson<ReviewAudit>(REVIEW_AUDIT_PATH);
  const departmentAudit = audit.departments.find((item) => item.departmentId === id);
  if (!departmentAudit) throw new Error(`No audit entry found for ${id}.`);

  const failures: string[] = [];
  const outputKeys = new Set(reviewed.map((record) => record.doctorKey));
  const rejectedKeys = decisions.filter((item) => item.decision === "rejected").map((item) => item.doctorKey);
  const expectedExcludedKeys = new Set(
    decisions.filter((item) => item.decision === "rejected" || item.decision === "merge").map((item) => item.doctorKey)
  );
  const auditedExcludedKeys = new Set(departmentAudit.excluded.map((item) => item.doctorKey));
  const unresolvedFail = reviewed.filter(
    (record) => record.qaSeverity === "fail" && record.reviewedStatus === "needsMoreEvidence"
  );
  const unresolvedReview = reviewed.filter(
    (record) => record.qaSeverity === "review" && record.reviewedStatus === "needsMoreEvidence"
  );
  const missingDoctorKey = reviewed.filter((record) => !record.doctorKey);

  if (rejectedKeys.some((key) => outputKeys.has(key))) failures.push("Rejected records exist in doctors-reviewed.json.");
  if (unresolvedFail.length > 0) failures.push(`Unresolved fail severity records: ${unresolvedFail.length}.`);
  if (missingDoctorKey.length > 0) failures.push(`Reviewed records missing doctorKey: ${missingDoctorKey.length}.`);
  for (const key of expectedExcludedKeys) {
    if (!auditedExcludedKeys.has(key)) failures.push(`Excluded doctorKey missing from audit: ${key}.`);
  }
  if (departmentAudit.reviewedCount !== reviewed.length) {
    failures.push(`Audit reviewedCount ${departmentAudit.reviewedCount} != output count ${reviewed.length}.`);
  }

  const result = {
    ok: failures.length === 0,
    id,
    reviewedCount: reviewed.length,
    rejectedCount: rejectedKeys.length,
    excludedCount: departmentAudit.excluded.length,
    unresolvedReviewCount: unresolvedReview.length,
    unresolvedFailCount: unresolvedFail.length,
    productionReadyCount: reviewed.filter((record) => record.productionReady).length,
    failures
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
