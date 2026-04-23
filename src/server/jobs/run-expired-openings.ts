import { processExpiredOpenings } from "./process-expired-openings";

async function main() {
  const result = await processExpiredOpenings();
  console.log("Processed expired openings.");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
