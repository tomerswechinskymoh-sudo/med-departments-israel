async function main() {
  const { seedClinicalRotationsDemoData } = await import("@/lib/server/clinical-rotations-demo-seed");
  const summary = await seedClinicalRotationsDemoData();

  console.log(JSON.stringify({
    status: "ok",
    password: summary.password,
    accounts: summary.accounts,
    hospitals: summary.hospitals,
    offerings: summary.offerings,
    applications: summary.applications,
    groupInviteUrl: summary.groupInviteUrl,
    eligibilityImportId: summary.eligibilityImportId
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

export {};
