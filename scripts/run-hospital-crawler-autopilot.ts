import { parseArgs } from "@/crawler/clalit/utils";
import { runHospitalAutopilot, summarizeAutopilotResult } from "@/crawler/hospitals/autopilot";
import {
  applyMasterDeptMappingToReviewed,
  buildMasterDeptNationalPlan,
  buildNationalHospitalPlan,
  inspectMasterDeptTargets,
  loadMasterDeptTargets,
  nationalPlanSummary,
  writeNationalPlanOutputs
} from "@/crawler/hospitals/master-dept";
import type { AutopilotMode, HospitalPilotEvaluation } from "@/crawler/hospitals/types";

const modes = new Set(["plan", "pilot", "evaluate", "full", "national-plan", "national-pilot", "national-full-safe"]);
const wave1HospitalSlugs = ["ichilov", "hadassah", "meir"];

async function main() {
  const args = parseArgs();
  const hospital = args.get("hospital");
  const mode = (args.get("mode") ?? "plan") as AutopilotMode;
  if (!modes.has(mode)) throw new Error(`Invalid --mode "${mode}". Use plan, pilot, evaluate, or full.`);

  if (mode === "national-plan") {
    const result = await buildMasterDeptNationalPlan({ inspectWave1Urls: args.has("inspect-wave1-urls") });
    console.log(JSON.stringify(nationalPlanSummary(result.targets, result.plan, result.report), null, 2));
    return;
  }

  if (mode === "national-pilot") {
    const limit = Number(args.get("limit") ?? wave1HospitalSlugs.length);
    const targets = await loadMasterDeptTargets();
    const initialPlan = buildNationalHospitalPlan(targets);
    await inspectMasterDeptTargets(targets, { hospitalNames: initialPlan.filter((item) => item.wave === 1).map((item) => item.hospitalName), limit: 80 });
    const wave1Results = [];
    for (const slug of wave1HospitalSlugs.slice(0, Math.max(0, limit))) {
      const evaluation = (await runHospitalAutopilot(slug, "pilot", false)) as HospitalPilotEvaluation;
      const mapping = await applyMasterDeptMappingToReviewed(slug, targets);
      wave1Results.push({
        hospital: slug,
        readiness: evaluation.readiness,
        reviewedRecords: evaluation.reviewedRecords,
        productionReadyCount: evaluation.productionReadyCount,
        mappedRecords: mapping.mappedRecords
      });
    }
    const plan = buildNationalHospitalPlan(targets);
    const report = await writeNationalPlanOutputs(targets, plan, wave1Results);
    console.log(JSON.stringify({ ...nationalPlanSummary(targets, plan, report), wave1Results }, null, 2));
    return;
  }

  if (mode === "national-full-safe") {
    if (!args.has("confirm")) throw new Error("national-full-safe requires --confirm.");
    throw new Error("national-full-safe is not implemented yet: provider-specific full adapters must be added before any national full run.");
  }

  if (!hospital) throw new Error("Missing --hospital <slug>.");

  const result = await runHospitalAutopilot(hospital, mode, args.has("confirm"));
  console.log(JSON.stringify(summarizeAutopilotResult(mode, result), null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
