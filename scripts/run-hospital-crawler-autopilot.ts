import { parseArgs } from "@/crawler/clalit/utils";
import { runHospitalAutopilot, summarizeAutopilotResult } from "@/crawler/hospitals/autopilot";
import {
  applyMasterDeptMappingToReviewed,
  buildMasterDeptNationalPlan,
  buildNationalHospitalPlan,
  buildWave2Plan,
  inspectMasterDeptTargets,
  loadMasterDeptTargets,
  nationalPlanSummary,
  readMappingStats,
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
    const wave = Number(args.get("wave") ?? "1");
    const limit = Number(args.get("limit") ?? (wave === 2 ? 5 : wave1HospitalSlugs.length));
    const targets = await loadMasterDeptTargets();
    const initialPlan = buildNationalHospitalPlan(targets);
    const wave1MappingBefore = Object.fromEntries(await Promise.all(wave1HospitalSlugs.map(async (slug) => [slug, await readMappingStats(slug)])));

    if (wave === 2) {
      const preselected = buildWave2Plan(initialPlan, targets, limit);
      await inspectMasterDeptTargets(targets, { hospitalNames: preselected.flatMap((item) => item.hospitalNames), limit: 120 });
      const inspectedPlan = buildNationalHospitalPlan(targets);
      const wave2SelectedHospitals = buildWave2Plan(inspectedPlan, targets, limit);
      const wave2Results = [];
      for (const item of wave2SelectedHospitals) {
        if (item.adapterParserFamily === "adapter-needed") {
          wave2Results.push({
            hospital: item.hospitalSlug,
            readiness: "blocked",
            reviewedRecords: 0,
            productionReadyCount: 0,
            mappedRecords: 0,
            mappingStats: await readMappingStats(item.hospitalSlug),
            mainBlocker: "No runnable baseline adapter for this Wave2 candidate."
          });
          continue;
        }
        const evaluation = (await runHospitalAutopilot(item.hospitalSlug, "pilot", false)) as HospitalPilotEvaluation;
        const mapping = await applyMasterDeptMappingToReviewed(item.hospitalSlug, targets);
        wave2Results.push({
          hospital: item.hospitalSlug,
          readiness: evaluation.readiness,
          reviewedRecords: evaluation.reviewedRecords,
          productionReadyCount: evaluation.productionReadyCount,
          mappedRecords: mapping.mappedRecords,
          mappingStats: mapping.mappingStats,
          mainBlocker: evaluation.mainBlocker
        });
      }
      const wave1MappingAfter = Object.fromEntries(await Promise.all(wave1HospitalSlugs.map(async (slug) => [slug, await readMappingStats(slug)])));
      const wave1Results = [];
      for (const slug of wave1HospitalSlugs) {
        const evaluation = (await runHospitalAutopilot(slug, "evaluate", false)) as HospitalPilotEvaluation;
        const stats = wave1MappingAfter[slug];
        wave1Results.push({
          hospital: slug,
          readiness: evaluation.readiness,
          reviewedRecords: evaluation.reviewedRecords,
          productionReadyCount: evaluation.productionReadyCount,
          mappedRecords: stats.totalReviewed - stats.unmapped
        });
      }
      const report = await writeNationalPlanOutputs(targets, inspectedPlan, { wave1Results, wave1MappingBefore, wave1MappingAfter, wave2SelectedHospitals, wave2Results });
      console.log(JSON.stringify({ ...nationalPlanSummary(targets, inspectedPlan, report), wave2SelectedHospitals, wave2Results }, null, 2));
      return;
    }

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
    const wave1MappingAfter = Object.fromEntries(await Promise.all(wave1HospitalSlugs.map(async (slug) => [slug, await readMappingStats(slug)])));
    const plan = buildNationalHospitalPlan(targets);
    const report = await writeNationalPlanOutputs(targets, plan, { wave1Results, wave1MappingBefore, wave1MappingAfter });
    console.log(JSON.stringify({ ...nationalPlanSummary(targets, plan, report), wave1Results, wave1MappingBefore, wave1MappingAfter }, null, 2));
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
