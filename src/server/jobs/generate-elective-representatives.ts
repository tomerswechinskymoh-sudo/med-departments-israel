import { generateElectiveRepresentativesByHospital } from "@/lib/server/elective-representative-generation";

const resetExistingPasswords = process.argv.includes("--reset-passwords");

const summary = await generateElectiveRepresentativesByHospital({ resetExistingPasswords });

console.log(JSON.stringify({
  ok: summary.ok,
  warning: summary.warning,
  hospitalsProcessed: summary.hospitalsProcessed,
  representativesCreated: summary.representativesCreated,
  representativesUpdated: summary.representativesUpdated,
  results: summary.results
}, null, 2));
