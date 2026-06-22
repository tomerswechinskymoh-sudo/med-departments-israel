import { execFileSync } from "node:child_process";
import { parseArgs } from "@/crawler/clalit/utils";
import { registerHospitalBaseline } from "@/crawler/hospitals/baseline-registry";
import { runHospitalAutopilot, summarizeAutopilotResult } from "@/crawler/hospitals/autopilot";
import {
  applyMasterDeptMappingToReviewed,
  buildNationalRemainingQueue,
  buildMasterDeptNationalPlan,
  buildNationalHospitalPlan,
  buildSyntheticBaselineForQueueItem,
  buildWave2Plan,
  buildWave3Plan,
  inspectMasterDeptTargets,
  loadMasterDeptTargets,
  crawlReadinessFromLegacy,
  mappingReadinessFor,
  readCanonicalStats,
  nationalPlanSummary,
  outputUsabilityFor,
  readMappingStats,
  writeNationalPlanOutputs
} from "@/crawler/hospitals/master-dept";
import type { NationalSweepResult } from "@/crawler/hospitals/master-dept";
import type { AutopilotMode, CrawlReadinessStatus, HospitalPilotEvaluation, MappingReadinessStatus, OutputUsability } from "@/crawler/hospitals/types";

const modes = new Set(["plan", "pilot", "evaluate", "full", "national-plan", "national-pilot", "national-sweep", "national-full-safe"]);
const wave1HospitalSlugs = ["ichilov", "hadassah", "meir"];
const wave3HospitalSlugs = ["shamir", "maayanei-hayeshua", "galilee", "laniado", "wolfson"];
const nationalCalibrationSlugs = ["barzilai", "nazareth-scottish", "schneider", "holy-family", "saint-vincent"];
const nationalAdapterPrioritySlugs = ["shaare-zedek", "rambam", "yoseftal", "beer-sheva-mental-health"];

function readCommittedNationalCoverageReport() {
  try {
    const raw = execFileSync("git", ["show", "HEAD:data/crawler/hospitals/national-coverage-report.json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return JSON.parse(raw) as { nationalSweepResults?: NationalSweepResult[] };
  } catch {
    return null;
  }
}

function canonicalCalibratedReadiness(evaluation: HospitalPilotEvaluation, canonicalStats: Awaited<ReturnType<typeof readCanonicalStats>>) {
  if (evaluation.mainBlocker === "Duplicate profile URLs remain in pilot output." && canonicalStats.duplicateProfileUrlGroupsAfter === 0) {
    if (canonicalStats.sourceUrlMatchLinks === 0) {
      return {
        readiness: "needsHumanReview",
        mainBlocker: "Canonicalization removed duplicate identity issue; department links still require review because source lineage is not row-specific."
      };
    }
    return {
      readiness: "needsHumanReview",
      mainBlocker: "Canonicalization removed duplicate identity issue; pilot still needs department-link QA before controlled full."
    };
  }
  return { readiness: evaluation.readiness, mainBlocker: evaluation.mainBlocker };
}

function splitFor(hospital: string, readiness: string, canonicalStats: Awaited<ReturnType<typeof readCanonicalStats>>) {
  const crawlReadiness = crawlReadinessFromLegacy(readiness);
  const mappingReadiness = mappingReadinessFor(hospital, canonicalStats);
  const outputUsability = outputUsabilityFor(crawlReadiness, mappingReadiness, canonicalStats);
  return { crawlReadiness, mappingReadiness, outputUsability };
}

function blockedSplit(crawlReadiness: CrawlReadinessStatus = "blocked") {
  return {
    crawlReadiness,
    mappingReadiness: "blocked" as MappingReadinessStatus,
    outputUsability: "notUsableYet" as OutputUsability
  };
}

async function currentWave1Results(wave1MappingAfter: Record<string, Awaited<ReturnType<typeof readMappingStats>>>) {
  const results = [];
  for (const slug of wave1HospitalSlugs) {
    const evaluation = (await runHospitalAutopilot(slug, "evaluate", false)) as HospitalPilotEvaluation;
    const canonicalStats = await readCanonicalStats(slug);
    const split = splitFor(slug, evaluation.readiness, canonicalStats);
    const stats = wave1MappingAfter[slug];
    results.push({
      hospital: slug,
      readiness: evaluation.readiness,
      crawlReadiness: split.crawlReadiness,
      mappingReadiness: split.mappingReadiness,
      outputUsability: split.outputUsability,
      reviewedRecords: evaluation.reviewedRecords,
      productionReadyCount: evaluation.productionReadyCount,
      mappedRecords: stats.totalReviewed - stats.unmapped
    });
  }
  return results;
}

async function currentWave2Results(targets: Awaited<ReturnType<typeof loadMasterDeptTargets>>) {
  const results = [];
  for (const slug of ["emek", "carmel", "kaplan", "rabin"]) {
    try {
      const evaluation = (await runHospitalAutopilot(slug, "evaluate", false)) as HospitalPilotEvaluation;
      const mapping = await applyMasterDeptMappingToReviewed(slug, targets);
      const calibrated = canonicalCalibratedReadiness(evaluation, mapping.canonicalStats);
      const split = splitFor(slug, calibrated.readiness, mapping.canonicalStats);
      results.push({
        hospital: slug,
        readiness: calibrated.readiness,
        crawlReadiness: split.crawlReadiness,
        mappingReadiness: split.mappingReadiness,
        outputUsability: split.outputUsability,
        reviewedRecords: evaluation.reviewedRecords,
        productionReadyCount: evaluation.productionReadyCount,
        mappedRecords: mapping.mappedRecords,
        mappingStats: mapping.mappingStats,
        canonicalStats: mapping.canonicalStats,
        mainBlocker: calibrated.mainBlocker
      });
    } catch (error) {
      const mappingStats = await readMappingStats(slug);
      const canonicalStats = await readCanonicalStats(slug);
      const split = blockedSplit("needsCalibration");
      results.push({
        hospital: slug,
        readiness: "needsCalibration",
        crawlReadiness: split.crawlReadiness,
        mappingReadiness: split.mappingReadiness,
        outputUsability: split.outputUsability,
        reviewedRecords: mappingStats.totalReviewed,
        productionReadyCount: canonicalStats.productionReadyCanonicalDoctors,
        mappedRecords: mappingStats.totalReviewed - mappingStats.unmapped,
        mappingStats,
        canonicalStats,
        mainBlocker: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return results;
}

async function currentWave3Results(targets: Awaited<ReturnType<typeof loadMasterDeptTargets>>) {
  const results = [];
  for (const slug of wave3HospitalSlugs) {
    try {
      const evaluation = (await runHospitalAutopilot(slug, "evaluate", false)) as HospitalPilotEvaluation;
      const mapping = await applyMasterDeptMappingToReviewed(slug, targets);
      const calibrated = canonicalCalibratedReadiness(evaluation, mapping.canonicalStats);
      const split = splitFor(slug, calibrated.readiness, mapping.canonicalStats);
      results.push({
        hospital: slug,
        readiness: calibrated.readiness,
        crawlReadiness: split.crawlReadiness,
        mappingReadiness: split.mappingReadiness,
        outputUsability: split.outputUsability,
        reviewedRecords: evaluation.reviewedRecords,
        productionReadyCount: evaluation.productionReadyCount,
        mappedRecords: mapping.mappedRecords,
        mappingStats: mapping.mappingStats,
        canonicalStats: mapping.canonicalStats,
        mainBlocker: calibrated.mainBlocker
      });
    } catch (error) {
      const mappingStats = await readMappingStats(slug);
      const canonicalStats = await readCanonicalStats(slug);
      const split = blockedSplit();
      results.push({
        hospital: slug,
        readiness: "blocked",
        crawlReadiness: split.crawlReadiness,
        mappingReadiness: split.mappingReadiness,
        outputUsability: split.outputUsability,
        reviewedRecords: mappingStats.totalReviewed,
        productionReadyCount: canonicalStats.productionReadyCanonicalDoctors,
        mappedRecords: mappingStats.totalReviewed - mappingStats.unmapped,
        mappingStats,
        canonicalStats,
        mainBlocker: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return results;
}

function blockerTypeFor(errorMessage: string | null, evaluation?: HospitalPilotEvaluation) {
  const text = `${errorMessage ?? ""} ${evaluation?.mainBlocker ?? ""}`.toLowerCase();
  if (/manual seed|needsmanualseed|not marked safe/.test(text)) return "needsManualSeedUrl" as const;
  if (/no master_dept source url|no master dept source url|no row urls/.test(text)) return "noMasterDeptSourceUrl" as const;
  if (evaluation && evaluation.rawDoctorRecords === 0) return "noPublicRosterFound" as const;
  if (/403|forbidden/.test(text)) return "siteBlocked" as const;
  if (/404|410|stale/.test(text)) return "staleMasterDeptUrls" as const;
  if (/api|js|angular|shell/.test(text)) return "apiNeedsAdapter" as const;
  if (/parser|selector/.test(text)) return "parserMissing" as const;
  if (/no doctor|zero doctor|0 doctor/.test(text)) return "noDoctorPagesFound" as const;
  return "other" as const;
}

async function pilotResultForItem(item: { hospitalSlug: string; plannedAction: NationalSweepResult["plannedAction"] }, targets: Awaited<ReturnType<typeof loadMasterDeptTargets>>) {
  try {
    const evaluation = (await runHospitalAutopilot(item.hospitalSlug, "pilot", false)) as HospitalPilotEvaluation;
    const mapping = await applyMasterDeptMappingToReviewed(item.hospitalSlug, targets);
    const calibrated = canonicalCalibratedReadiness(evaluation, mapping.canonicalStats);
    const split = splitFor(item.hospitalSlug, calibrated.readiness, mapping.canonicalStats);
    return {
      hospital: item.hospitalSlug,
      plannedAction: item.plannedAction,
      readiness: calibrated.readiness,
      crawlReadiness: split.crawlReadiness,
      mappingReadiness: split.mappingReadiness,
      outputUsability: split.outputUsability,
      reviewedRecords: evaluation.reviewedRecords,
      productionReadyCount: evaluation.productionReadyCount,
      mappedRecords: mapping.mappedRecords,
      mappingStats: mapping.mappingStats,
      canonicalStats: mapping.canonicalStats,
      mainBlocker: calibrated.mainBlocker,
      blockerType: calibrated.mainBlocker ? blockerTypeFor(calibrated.mainBlocker, evaluation) : "none"
    } satisfies NationalSweepResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const mappingStats = await readMappingStats(item.hospitalSlug);
    const canonicalStats = await readCanonicalStats(item.hospitalSlug);
    const split = blockedSplit();
    return {
      hospital: item.hospitalSlug,
      plannedAction: item.plannedAction,
      readiness: "blocked",
      crawlReadiness: split.crawlReadiness,
      mappingReadiness: split.mappingReadiness,
      outputUsability: split.outputUsability,
      reviewedRecords: mappingStats.totalReviewed,
      productionReadyCount: canonicalStats.productionReadyCanonicalDoctors,
      mappedRecords: mappingStats.totalReviewed - mappingStats.unmapped,
      mappingStats,
      canonicalStats,
      mainBlocker: errorMessage,
      blockerType: blockerTypeFor(errorMessage)
    } satisfies NationalSweepResult;
  }
}

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
          const split = blockedSplit("needsAdapter");
          wave2Results.push({
            hospital: item.hospitalSlug,
            readiness: "blocked",
            crawlReadiness: split.crawlReadiness,
            mappingReadiness: split.mappingReadiness,
            outputUsability: split.outputUsability,
            reviewedRecords: 0,
            productionReadyCount: 0,
            mappedRecords: 0,
            mappingStats: await readMappingStats(item.hospitalSlug),
            canonicalStats: await readCanonicalStats(item.hospitalSlug),
            mainBlocker: "No runnable baseline adapter for this Wave2 candidate."
          });
          continue;
        }
        const evaluation = (await runHospitalAutopilot(item.hospitalSlug, "pilot", false)) as HospitalPilotEvaluation;
        const mapping = await applyMasterDeptMappingToReviewed(item.hospitalSlug, targets);
        const calibrated = canonicalCalibratedReadiness(evaluation, mapping.canonicalStats);
        const split = splitFor(item.hospitalSlug, calibrated.readiness, mapping.canonicalStats);
        wave2Results.push({
          hospital: item.hospitalSlug,
          readiness: calibrated.readiness,
          crawlReadiness: split.crawlReadiness,
          mappingReadiness: split.mappingReadiness,
          outputUsability: split.outputUsability,
          reviewedRecords: evaluation.reviewedRecords,
          productionReadyCount: evaluation.productionReadyCount,
          mappedRecords: mapping.mappedRecords,
          mappingStats: mapping.mappingStats,
          canonicalStats: mapping.canonicalStats,
          mainBlocker: calibrated.mainBlocker
        });
      }
      const wave1MappingAfter = Object.fromEntries(await Promise.all(wave1HospitalSlugs.map(async (slug) => [slug, await readMappingStats(slug)])));
      const canonicalStatsByHospital = Object.fromEntries(await Promise.all([...wave1HospitalSlugs, ...wave2Results.map((result) => result.hospital)].map(async (slug) => [slug, await readCanonicalStats(slug)])));
      const wave1Results = await currentWave1Results(wave1MappingAfter);
      const report = await writeNationalPlanOutputs(targets, inspectedPlan, { wave1Results, wave1MappingBefore, wave1MappingAfter, canonicalStatsByHospital, wave2SelectedHospitals, wave2Results });
      console.log(JSON.stringify({ ...nationalPlanSummary(targets, inspectedPlan, report), wave2SelectedHospitals, wave2Results }, null, 2));
      return;
    }

    if (wave === 3) {
      const preselected = buildWave3Plan(initialPlan, targets, limit);
      await inspectMasterDeptTargets(targets, { hospitalNames: preselected.flatMap((item) => item.hospitalNames), limit: 160 });
      const inspectedPlan = buildNationalHospitalPlan(targets);
      const wave3SelectedHospitals = buildWave3Plan(inspectedPlan, targets, limit);
      const wave3Results = [];
      for (const item of wave3SelectedHospitals) {
        try {
          const evaluation = (await runHospitalAutopilot(item.hospitalSlug, "pilot", false)) as HospitalPilotEvaluation;
          const mapping = await applyMasterDeptMappingToReviewed(item.hospitalSlug, targets);
          const calibrated = canonicalCalibratedReadiness(evaluation, mapping.canonicalStats);
          const split = splitFor(item.hospitalSlug, calibrated.readiness, mapping.canonicalStats);
          wave3Results.push({
            hospital: item.hospitalSlug,
            readiness: calibrated.readiness,
            crawlReadiness: split.crawlReadiness,
            mappingReadiness: split.mappingReadiness,
            outputUsability: split.outputUsability,
            reviewedRecords: evaluation.reviewedRecords,
            productionReadyCount: evaluation.productionReadyCount,
            mappedRecords: mapping.mappedRecords,
            mappingStats: mapping.mappingStats,
            canonicalStats: mapping.canonicalStats,
            mainBlocker: calibrated.mainBlocker
          });
        } catch (error) {
          const mappingStats = await readMappingStats(item.hospitalSlug);
          const canonicalStats = await readCanonicalStats(item.hospitalSlug);
          const split = blockedSplit();
          wave3Results.push({
            hospital: item.hospitalSlug,
            readiness: "blocked",
            crawlReadiness: split.crawlReadiness,
            mappingReadiness: split.mappingReadiness,
            outputUsability: split.outputUsability,
            reviewedRecords: mappingStats.totalReviewed,
            productionReadyCount: canonicalStats.productionReadyCanonicalDoctors,
            mappedRecords: mappingStats.totalReviewed - mappingStats.unmapped,
            mappingStats,
            canonicalStats,
            mainBlocker: error instanceof Error ? error.message : String(error)
          });
        }
      }
      const wave1MappingAfter = Object.fromEntries(await Promise.all(wave1HospitalSlugs.map(async (slug) => [slug, await readMappingStats(slug)])));
      const wave1Results = await currentWave1Results(wave1MappingAfter);
      const wave2Results = await currentWave2Results(targets);
      const selectedWave2Slugs = new Set(wave2Results.map((result) => result.hospital));
      const wave2SelectedHospitals = buildWave2Plan(inspectedPlan, targets, 5).filter((item) => selectedWave2Slugs.has(item.hospitalSlug));
      const canonicalStatsByHospital = Object.fromEntries(await Promise.all(
        [...new Set([...wave1HospitalSlugs, ...wave2Results.map((result) => result.hospital), ...wave3Results.map((result) => result.hospital)])]
          .map(async (slug) => [slug, await readCanonicalStats(slug)])
      ));
      const report = await writeNationalPlanOutputs(targets, inspectedPlan, {
        wave1Results,
        wave1MappingBefore,
        wave1MappingAfter,
        canonicalStatsByHospital,
        wave2SelectedHospitals,
        wave2Results,
        wave3SelectedHospitals,
        wave3Results
      });
      console.log(JSON.stringify({ ...nationalPlanSummary(targets, inspectedPlan, report), wave3SelectedHospitals, wave3Results }, null, 2));
      return;
    }

    await inspectMasterDeptTargets(targets, { hospitalNames: initialPlan.filter((item) => item.wave === 1).map((item) => item.hospitalName), limit: 80 });
    const wave1Results = [];
    for (const slug of wave1HospitalSlugs.slice(0, Math.max(0, limit))) {
      const evaluation = (await runHospitalAutopilot(slug, "pilot", false)) as HospitalPilotEvaluation;
      const mapping = await applyMasterDeptMappingToReviewed(slug, targets);
      const split = splitFor(slug, evaluation.readiness, mapping.canonicalStats);
      wave1Results.push({
        hospital: slug,
        readiness: evaluation.readiness,
        crawlReadiness: split.crawlReadiness,
        mappingReadiness: split.mappingReadiness,
        outputUsability: split.outputUsability,
        reviewedRecords: evaluation.reviewedRecords,
        productionReadyCount: evaluation.productionReadyCount,
        mappedRecords: mapping.mappedRecords
      });
    }
    const wave1MappingAfter = Object.fromEntries(await Promise.all(wave1HospitalSlugs.map(async (slug) => [slug, await readMappingStats(slug)])));
    const canonicalStatsByHospital = Object.fromEntries(await Promise.all(wave1HospitalSlugs.map(async (slug) => [slug, await readCanonicalStats(slug)])));
    const plan = buildNationalHospitalPlan(targets);
    const report = await writeNationalPlanOutputs(targets, plan, { wave1Results, wave1MappingBefore, wave1MappingAfter, canonicalStatsByHospital });
    console.log(JSON.stringify({ ...nationalPlanSummary(targets, plan, report), wave1Results, wave1MappingBefore, wave1MappingAfter }, null, 2));
    return;
  }

  if (mode === "national-sweep") {
    const limit = Number(args.get("limit") ?? "10");
    const targets = await loadMasterDeptTargets();
    const initialPlan = buildNationalHospitalPlan(targets);
    const initialQueue = buildNationalRemainingQueue(initialPlan, targets);
    const calibrationItems = initialQueue.filter((item) => nationalCalibrationSlugs.includes(item.hospitalSlug));
    const calibrationNames = calibrationItems.map((item) => item.hospitalName);
    const adapterPriorityItems = initialQueue.filter((item) => nationalAdapterPrioritySlugs.includes(item.hospitalSlug));
    const inspectCandidates = initialQueue
      .filter((item) => item.plannedAction === "pilot" || item.plannedAction === "adapterInspect")
      .slice(0, limit);
    await inspectMasterDeptTargets(targets, {
      hospitalNames: Array.from(new Set([...calibrationNames, ...adapterPriorityItems.map((item) => item.hospitalName), ...inspectCandidates.map((item) => item.hospitalName)])),
      limit: 320
    });
    const inspectedPlan = buildNationalHospitalPlan(targets);
    const nationalRemainingQueue = buildNationalRemainingQueue(inspectedPlan, targets);
    const sweepQueue = nationalRemainingQueue
      .filter((item) => item.plannedAction === "pilot" || item.plannedAction === "adapterInspect")
      .slice(0, limit);
    const calibrationResults: NationalSweepResult[] = [];
    for (const slug of nationalCalibrationSlugs) {
      const item = nationalRemainingQueue.find((candidate) => candidate.hospitalSlug === slug) ??
        calibrationItems.find((candidate) => candidate.hospitalSlug === slug);
      if (item) registerHospitalBaseline(buildSyntheticBaselineForQueueItem(item, targets));
      calibrationResults.push(await pilotResultForItem({ hospitalSlug: slug, plannedAction: "pilot" }, targets));
    }
    const inspectedAdapterPriorityItems = nationalRemainingQueue.filter((item) => nationalAdapterPrioritySlugs.includes(item.hospitalSlug));
    const adapterPriorityResults: NationalSweepResult[] = [];
    for (const item of inspectedAdapterPriorityItems) {
      if (item.plannedAction !== "pilot") {
        const mappingStats = await readMappingStats(item.hospitalSlug);
        const canonicalStats = await readCanonicalStats(item.hospitalSlug);
        const split = blockedSplit(item.expectedCrawlReadiness === "needsAdapter" ? "needsAdapter" : "blocked");
        adapterPriorityResults.push({
          hospital: item.hospitalSlug,
          plannedAction: item.plannedAction,
          readiness: item.expectedCrawlReadiness === "needsAdapter" ? "needsAdapter" : "blocked",
          crawlReadiness: split.crawlReadiness,
          mappingReadiness: split.mappingReadiness,
          outputUsability: split.outputUsability,
          reviewedRecords: mappingStats.totalReviewed,
          productionReadyCount: canonicalStats.productionReadyCanonicalDoctors,
          mappedRecords: mappingStats.totalReviewed - mappingStats.unmapped,
          mappingStats,
          canonicalStats,
          mainBlocker: item.needsManualSeedUrl
            ? "No safe seed URL is available yet; manual seed URL verification required."
            : item.rowsWithUrls === 0
              ? "No Master_Dept source URLs available; seed registry did not provide a safe pilot URL."
              : "Adapter inspection required before pilot.",
          blockerType: item.needsManualSeedUrl
            ? "needsManualSeedUrl"
            : item.rowsWithUrls === 0
              ? "noMasterDeptSourceUrl"
              : "parserMissing"
        });
      } else {
        registerHospitalBaseline(buildSyntheticBaselineForQueueItem(item, targets));
        adapterPriorityResults.push(await pilotResultForItem(item, targets));
      }
    }
    const nationalSweepResults: NationalSweepResult[] = [];

    for (const item of sweepQueue) {
      if (item.plannedAction !== "pilot") {
        const mappingStats = await readMappingStats(item.hospitalSlug);
        const canonicalStats = await readCanonicalStats(item.hospitalSlug);
        const split = blockedSplit(item.expectedCrawlReadiness === "needsAdapter" ? "needsAdapter" : "blocked");
        nationalSweepResults.push({
          hospital: item.hospitalSlug,
          plannedAction: item.plannedAction,
          readiness: item.expectedCrawlReadiness === "needsAdapter" ? "needsAdapter" : "blocked",
          crawlReadiness: split.crawlReadiness,
          mappingReadiness: split.mappingReadiness,
          outputUsability: split.outputUsability,
          reviewedRecords: mappingStats.totalReviewed,
          productionReadyCount: canonicalStats.productionReadyCanonicalDoctors,
          mappedRecords: mappingStats.totalReviewed - mappingStats.unmapped,
          mappingStats,
          canonicalStats,
          mainBlocker: item.needsManualSeedUrl
            ? "No safe seed URL is available yet; manual seed URL verification required."
            : item.rowsWithUrls === 0
              ? "No Master_Dept source URLs available; seed registry did not provide a safe pilot URL."
              : "Adapter inspection required before pilot.",
          blockerType: item.needsManualSeedUrl
            ? "needsManualSeedUrl"
            : item.rowsWithUrls === 0
              ? "noMasterDeptSourceUrl"
              : "parserMissing"
        });
        continue;
      }

      registerHospitalBaseline(buildSyntheticBaselineForQueueItem(item, targets));
      nationalSweepResults.push(await pilotResultForItem(item, targets));
    }
    const previousReport = limit === 0 ? readCommittedNationalCoverageReport() : null;
    const reportNationalSweepResults = limit === 0
      ? previousReport?.nationalSweepResults ?? nationalSweepResults
      : nationalSweepResults;

    const wave1MappingBefore = Object.fromEntries(await Promise.all(wave1HospitalSlugs.map(async (slug) => [slug, await readMappingStats(slug)])));
    const wave1MappingAfter = wave1MappingBefore;
    const wave1Results = await currentWave1Results(wave1MappingAfter);
    const wave2Results = await currentWave2Results(targets);
    const wave3Results = await currentWave3Results(targets);
    const wave2SelectedHospitals = buildWave2Plan(inspectedPlan, targets, 5).filter((item) => new Set(wave2Results.map((result) => result.hospital)).has(item.hospitalSlug));
    const wave3SelectedHospitals = buildWave3Plan(inspectedPlan, targets, 5);
    const allResultSlugs = [...new Set([
      ...wave1HospitalSlugs,
      ...wave2Results.map((result) => result.hospital),
      ...wave3Results.map((result) => result.hospital),
      ...calibrationResults.map((result) => result.hospital),
      ...adapterPriorityResults.map((result) => result.hospital),
      ...reportNationalSweepResults.map((result) => result.hospital)
    ])];
    const canonicalStatsByHospital = Object.fromEntries(await Promise.all(allResultSlugs.map(async (slug) => [slug, await readCanonicalStats(slug)])));
    const report = await writeNationalPlanOutputs(targets, inspectedPlan, {
      wave1Results,
      wave1MappingBefore,
      wave1MappingAfter,
      canonicalStatsByHospital,
      wave2SelectedHospitals,
      wave2Results,
      wave3SelectedHospitals,
      wave3Results,
      nationalRemainingQueue,
      nationalSweepResults: reportNationalSweepResults,
      calibrationResults,
      adapterPriorityResults
    });
    console.log(JSON.stringify({ ...nationalPlanSummary(targets, inspectedPlan, report), calibrationResults, adapterPriorityResults, nationalSweepResults: reportNationalSweepResults, nextQueue: nationalRemainingQueue.slice(limit, limit + 10) }, null, 2));
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
