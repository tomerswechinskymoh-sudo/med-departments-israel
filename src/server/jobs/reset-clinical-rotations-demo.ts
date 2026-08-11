async function main() {
  const { resetClinicalRotationsDemoData } = await import("@/lib/server/clinical-rotations-demo-seed");
  const summary = await resetClinicalRotationsDemoData();

  console.log(JSON.stringify({ status: "ok", ...summary }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

export {};
