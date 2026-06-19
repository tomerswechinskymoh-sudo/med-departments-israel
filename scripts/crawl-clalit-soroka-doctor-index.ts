import { crawlSorokaDoctorIndex } from "@/crawler/clalit/soroka-doctor-index";

async function main() {
  const summary = await crawlSorokaDoctorIndex();
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
