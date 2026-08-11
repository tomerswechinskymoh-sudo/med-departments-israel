import { runClinicalRotationRetentionCleanup } from "@/lib/clinical-rotations-privacy";

async function main() {
  const result = await runClinicalRotationRetentionCleanup();
  console.log(JSON.stringify({
    clinicalRotationIdentityDocumentsDeleted: result.identityDocuments.deleted,
    clinicalRotationEligibilitySourcesDeleted: result.eligibilitySources.deleted,
    clinicalRotationEligibilitySourcesFailed: result.eligibilitySources.failed
  }));
}

main().catch((error) => {
  console.error("[clinical-rotations] identity document cleanup failed", error instanceof Error ? error.message : "unknown");
  process.exit(1);
});
