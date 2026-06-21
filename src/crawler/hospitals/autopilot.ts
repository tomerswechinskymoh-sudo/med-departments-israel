import fs from "node:fs/promises";
import path from "node:path";
import { getHospitalBaseline } from "./baseline-registry";
import type { AutopilotMode, CandidatePage, CrawlReadinessStatus, HospitalDoctorRecord, HospitalPilotEvaluation, HospitalPlan, MappingReadinessStatus, OutputUsability, ParserFamily, ReadinessStatus } from "./types";
import { discoverCandidatePages, extractDoctorsFromHtml, fetchPublicHtml, inspectHtml, inspectProfileHtml } from "./adapters/generic-public-site";
import { crawlHadassahDoctorSearchPilot } from "./adapters/hadassah-doctors";
import { crawlIchilovDoctorSearchPilot } from "./adapters/ichilov-search";
import { normalizeWhitespace, readJson, sleep, writeJson } from "@/crawler/clalit/utils";

const PROFILE_SAMPLE_LIMIT = 12;
const PILOT_PAGE_LIMIT = 5;

function baseOutputDir(hospitalSlug: string) {
  return path.join(process.cwd(), "data", "crawler", "hospitals", hospitalSlug);
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function writeCsv(filePath: string, rows: Array<Record<string, unknown>>) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  if (rows.length === 0) {
    await fs.writeFile(filePath, "", "utf8");
    return;
  }
  const headers = Object.keys(rows[0]);
  const body = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
  await fs.writeFile(filePath, `${body}\n`, "utf8");
}

function uniqueByUrl(candidates: CandidatePage[]) {
  const byUrl = new Map<string, CandidatePage>();
  for (const candidate of candidates) {
    const existing = byUrl.get(candidate.url);
    if (!existing || candidate.confidence > existing.confidence) byUrl.set(candidate.url, candidate);
  }
  return Array.from(byUrl.values()).sort((left, right) => right.confidence - left.confidence || left.url.localeCompare(right.url));
}

function readinessForPlan(candidatePages: CandidatePage[], doctorIndexExists: boolean, fetchFailures: number): { readiness: ReadinessStatus; blocker: string | null } {
  if (fetchFailures > 0 && candidatePages.length === 0 && !doctorIndexExists) return { readiness: "blocked", blocker: "Known URLs failed or returned no crawlable evidence." };
  if (doctorIndexExists || candidatePages.length >= 3) return { readiness: "pilotReady", blocker: null };
  if (candidatePages.length > 0) return { readiness: "inspectNeeded", blocker: "Few candidate pages; pilot can run but needs manual review." };
  return { readiness: "inspectNeeded", blocker: "No clear doctor/team pages found from known URLs." };
}

function dominantParserFamily(plan: HospitalPlan): ParserFamily {
  const counts = new Map<ParserFamily, number>();
  for (const candidate of plan.candidatePages) counts.set(candidate.parserFamily, (counts.get(candidate.parserFamily) ?? 0) + 1);
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? plan.parserFamilies[0] ?? "unknown";
}

function duplicateCounts(doctors: HospitalDoctorRecord[]) {
  const names = new Map<string, number>();
  const urls = new Map<string, number>();
  for (const doctor of doctors) {
    names.set(doctor.normalizedName, (names.get(doctor.normalizedName) ?? 0) + 1);
    if (doctor.profileUrl) urls.set(doctor.profileUrl, (urls.get(doctor.profileUrl) ?? 0) + 1);
  }
  return {
    duplicateNameCount: Array.from(names.values()).filter((count) => count > 1).length,
    duplicateProfileUrlCount: Array.from(urls.values()).filter((count) => count > 1).length
  };
}

function evaluateReadiness(evaluation: Omit<HospitalPilotEvaluation, "readiness" | "crawlReadiness" | "mappingReadiness" | "outputUsability" | "mainBlocker">): { readiness: ReadinessStatus; mainBlocker: string | null } {
  if (evaluation.rawDoctorRecords === 0) return { readiness: "blocked", mainBlocker: "Pilot extracted zero doctor records." };
  if (evaluation.duplicateProfileUrlCount > 0) return { readiness: "needsCalibration", mainBlocker: "Duplicate profile URLs remain in pilot output." };
  if (evaluation.suspectedFalsePositiveCount > Math.max(2, evaluation.rawDoctorRecords * 0.2)) {
    return { readiness: "needsCalibration", mainBlocker: "Suspected false positives exceed safe threshold." };
  }
  if (evaluation.profileUrlCoverage < 0.5) return { readiness: "needsHumanReview", mainBlocker: "Profile URL coverage is below 50%." };
  if (evaluation.productionReadyCount >= 10 && evaluation.profileUrlCoverage >= 0.7) {
    return { readiness: "safeForFullBatch", mainBlocker: null };
  }
  return { readiness: "needsHumanReview", mainBlocker: "Pilot has useful records but insufficient production-ready coverage." };
}

function crawlReadinessFromReadiness(readiness: ReadinessStatus): CrawlReadinessStatus {
  if (readiness === "safeForFullBatch") return "safeForFullBatch";
  if (readiness === "blocked") return "blocked";
  if (readiness === "needsCalibration" || readiness === "needsHumanReview") return "needsCalibration";
  return "pilotReady";
}

function outputUsabilityFor(crawlReadiness: CrawlReadinessStatus, mappingReadiness: MappingReadinessStatus): OutputUsability {
  if (crawlReadiness === "blocked" || crawlReadiness === "needsAdapter") return "notUsableYet";
  if (mappingReadiness === "sourceUrlMapped" || mappingReadiness === "partiallyMapped") return "departmentMappedRoster";
  if (mappingReadiness === "hospitalRosterOnly" || mappingReadiness === "reviewNeeded") return "hospitalRoster";
  return "notUsableYet";
}

export async function runHospitalPlan(hospitalSlug: string): Promise<HospitalPlan> {
  const baseline = getHospitalBaseline(hospitalSlug);
  const outputDir = baseOutputDir(hospitalSlug);
  const urls = Array.from(
    new Set([
      baseline.homepageUrl,
      ...baseline.departmentsIndexUrlCandidates,
      ...baseline.doctorIndexUrlCandidates,
      ...baseline.pilotUrlCandidates
    ])
  );

  const fetches = [];
  const candidatePages: CandidatePage[] = [];
  const recommendedPilotUrls = new Set<string>();
  let doctorIndexExists = false;

  for (const url of urls) {
    const response = await fetchPublicHtml(url);
    const snapshot = inspectHtml(response.finalUrl || url, response.html, response.ok, response.statusCode, response.error);
    fetches.push({ ...snapshot, finalUrl: response.finalUrl || url });
    if (response.html) {
      const candidates = discoverCandidatePages(response.html, response.finalUrl || url, baseline);
      candidatePages.push(...candidates);
      const parser = baseline.doctorIndexUrlCandidates.includes(url) ? "doctorIndexAssisted" : baseline.parserFamilies[0] ?? "unknown";
      const doctors = extractDoctorsFromHtml(response.html, response.finalUrl || url, baseline, parser);
      if (baseline.doctorIndexUrlCandidates.includes(url) && doctors.length > 0) doctorIndexExists = true;
      if (doctors.length > 0) recommendedPilotUrls.add(response.finalUrl || url);
    }
    await sleep(250);
  }

  for (const candidate of uniqueByUrl(candidatePages).slice(0, 8)) recommendedPilotUrls.add(candidate.url);
  for (const url of baseline.pilotUrlCandidates) recommendedPilotUrls.add(url);
  const readiness = readinessForPlan(candidatePages, doctorIndexExists, fetches.filter((item) => !item.ok).length);
  const crawlReadiness = crawlReadinessFromReadiness(readiness.readiness);
  const mappingReadiness: MappingReadinessStatus = "blocked";
  const plan: HospitalPlan = {
    hospitalSlug,
    hospitalName: baseline.hospitalName,
    generatedAt: new Date().toISOString(),
    provider: baseline.provider,
    websiteFamily: baseline.websiteFamily,
    knownUrls: {
      homepageUrl: baseline.homepageUrl,
      departmentsIndexUrlCandidates: baseline.departmentsIndexUrlCandidates,
      doctorIndexUrlCandidates: baseline.doctorIndexUrlCandidates,
      pilotUrlCandidates: baseline.pilotUrlCandidates
    },
    fetches,
    candidatePages: uniqueByUrl(candidatePages),
    doctorIndexExists,
    parserFamilies: baseline.parserFamilies,
    recommendedPilotUrls: Array.from(recommendedPilotUrls).slice(0, 12),
    readiness: readiness.readiness,
    crawlReadiness,
    mappingReadiness,
    outputUsability: outputUsabilityFor(crawlReadiness, mappingReadiness),
    mainBlocker: readiness.blocker
  };

  await writeJson(path.join(outputDir, "plan.json"), plan);
  await writeCsv(
    path.join(outputDir, "plan.csv"),
    plan.candidatePages.map((candidate) => ({
      url: candidate.url,
      sourceUrl: candidate.sourceUrl,
      anchorText: candidate.anchorText,
      patternType: candidate.patternType,
      parserFamily: candidate.parserFamily,
      confidence: candidate.confidence,
      evidence: candidate.evidence
    }))
  );
  await fs.writeFile(path.join(outputDir, "inspection.md"), renderInspection(plan), "utf8");
  return plan;
}

function renderInspection(plan: HospitalPlan) {
  return [
    `# ${plan.hospitalName} crawler inspection`,
    "",
    `- generatedAt: ${plan.generatedAt}`,
    `- provider: ${plan.provider}`,
    `- doctorIndexExists: ${plan.doctorIndexExists}`,
    `- readiness: ${plan.readiness}`,
    `- mainBlocker: ${plan.mainBlocker ?? "none"}`,
    "",
    "## Fetches",
    ...plan.fetches.map((fetch) => `- ${fetch.ok ? "OK" : "FAIL"} ${fetch.statusCode ?? "n/a"} ${fetch.url} title=${fetch.title ?? "n/a"} text=${fetch.visibleTextLength}`),
    "",
    "## Candidate pages",
    ...plan.candidatePages.slice(0, 40).map((candidate) => `- ${candidate.confidence} ${candidate.patternType} ${candidate.parserFamily} ${candidate.url} text=${candidate.anchorText || "n/a"}`)
  ].join("\n");
}

export async function runHospitalPilot(hospitalSlug: string): Promise<HospitalPilotEvaluation> {
  const baseline = getHospitalBaseline(hospitalSlug);
  const outputDir = baseOutputDir(hospitalSlug);
  const plan = await runHospitalPlan(hospitalSlug);
  const parserFamily = dominantParserFamily(plan);
  const selectedUrls =
    baseline.hospitalSlug === "ichilov"
      ? ["https://www.tasmc.org.il/doctorssearch/"]
      : baseline.hospitalSlug === "hadassah"
        ? ["https://he.hadassah.org.il/doctor-search/"]
        : baseline.hospitalSlug === "meir"
          ? Array.from(
              new Set([
                ...baseline.pilotUrlCandidates,
                ...plan.candidatePages
                  .filter((candidate) => candidate.patternType === "teamPage" || candidate.patternType === "staffPage")
                  .map((candidate) => candidate.url)
              ])
            ).slice(0, PILOT_PAGE_LIMIT)
      : Array.from(new Set(plan.recommendedPilotUrls)).slice(0, PILOT_PAGE_LIMIT);
  const doctorsByKey = new Map<string, HospitalDoctorRecord>();
  const profileFetches = new Map<string, { ok: boolean; textLength: number; completeness: "full" | "partial" | "listOnly" }>();

  if (baseline.hospitalSlug === "ichilov") {
    const doctors = await crawlIchilovDoctorSearchPilot(baseline);
    for (const doctor of doctors) {
      const key = `${doctor.normalizedName}::${doctor.profileUrl ?? doctor.sourceUrl}`;
      doctorsByKey.set(key, doctor);
    }
  } else if (baseline.hospitalSlug === "hadassah") {
    const doctors = await crawlHadassahDoctorSearchPilot(baseline);
    for (const doctor of doctors) {
      const key = `${doctor.normalizedName}::${doctor.profileUrl ?? doctor.sourceUrl}`;
      doctorsByKey.set(key, doctor);
    }
  } else {
    for (const url of selectedUrls) {
      const response = await fetchPublicHtml(url);
      if (!response.html) continue;
      const pageParser =
        plan.candidatePages.find((candidate) => candidate.url === url)?.parserFamily ??
        (baseline.doctorIndexUrlCandidates.includes(url) ? "doctorIndexAssisted" : parserFamily);
      const doctors = extractDoctorsFromHtml(response.html, response.finalUrl || url, baseline, pageParser);
      for (const doctor of doctors) {
        const key = `${doctor.normalizedName}::${doctor.profileUrl ?? doctor.sourceUrl}`;
        doctorsByKey.set(key, doctor);
      }
      await sleep(250);
    }
  }

  const doctors = Array.from(doctorsByKey.values());
  const profileUrls = Array.from(new Set(doctors.map((doctor) => doctor.profileUrl).filter(Boolean) as string[])).slice(0, PROFILE_SAMPLE_LIMIT);
  for (const profileUrl of profileUrls) {
    const response = await fetchPublicHtml(profileUrl);
    const profile = inspectProfileHtml(response.html);
    profileFetches.set(profileUrl, {
      ok: response.ok && profile.textLength > 0,
      textLength: profile.textLength,
      completeness: profile.completeness
    });
    await sleep(200);
  }

  const reviewed = doctors.map((doctor) => {
    const profile = doctor.profileUrl ? profileFetches.get(doctor.profileUrl) : null;
    const profileCompleteness =
      baseline.hospitalSlug === "hadassah"
        ? (doctor.profileCompleteness ?? "partial")
        : profile?.completeness ?? (doctor.profileUrl ? "partial" : "listOnly");
    const qaFlags = [...doctor.qaFlags];
    if (!doctor.profileUrl) qaFlags.push("missingProfileUrl");
    if (doctor.rawText.length > 700 && !doctor.profileUrl) qaFlags.push("suspectedFalsePositive");
    const qaSeverity: "ok" | "review" | "fail" = qaFlags.includes("suspectedFalsePositive")
      ? "review"
      : qaFlags.length > 0
        ? "review"
        : "ok";
    return {
      ...doctor,
      profileCompleteness,
      profileTextLength: profile?.textLength ?? 0,
      qaFlags: Array.from(new Set(qaFlags)),
      qaSeverity,
      productionReady: qaSeverity === "ok" && Boolean(doctor.profileUrl),
      reviewedStatus: qaSeverity === "ok" ? "approved" : "needsMoreEvidence"
    };
  });

  const completeness = {
    full: reviewed.filter((doctor) => doctor.profileCompleteness === "full").length,
    partial: reviewed.filter((doctor) => doctor.profileCompleteness === "partial").length,
    listOnly: reviewed.filter((doctor) => doctor.profileCompleteness === "listOnly").length
  };
  const duplicates = duplicateCounts(reviewed);
  const baseEvaluation = {
    hospitalSlug,
    hospitalName: baseline.hospitalName,
    generatedAt: new Date().toISOString(),
    urlsUsed: selectedUrls,
    doctorIndexExists: plan.doctorIndexExists,
    parserFamily,
    candidatePagesFound: plan.candidatePages.length,
    pilotPagesSelected: selectedUrls.length,
    rawDoctorRecords: doctors.length,
    profileUrlCoverage: doctors.length === 0 ? 0 : doctors.filter((doctor) => doctor.profileUrl).length / doctors.length,
    profileFetchSuccess: Array.from(profileFetches.values()).filter((item) => item.ok).length,
    reviewedRecords: reviewed.length,
    productionReadyCount: reviewed.filter((doctor) => doctor.productionReady).length,
    missingProfileUrlCount: reviewed.filter((doctor) => !doctor.profileUrl).length,
    duplicateNameCount: duplicates.duplicateNameCount,
    duplicateProfileUrlCount: duplicates.duplicateProfileUrlCount,
    suspectedFalsePositiveCount: reviewed.filter((doctor) => doctor.qaFlags.includes("suspectedFalsePositive")).length,
    profileCompleteness: completeness
  };
  const readiness = evaluateReadiness(baseEvaluation);
  const crawlReadiness = crawlReadinessFromReadiness(readiness.readiness);
  const mappingReadiness: MappingReadinessStatus = doctors.length > 0 ? "hospitalRosterOnly" : "blocked";
  const evaluation: HospitalPilotEvaluation = {
    ...baseEvaluation,
    readiness: readiness.readiness,
    crawlReadiness,
    mappingReadiness,
    outputUsability: outputUsabilityFor(crawlReadiness, mappingReadiness),
    mainBlocker: readiness.mainBlocker
  };

  await writeJson(path.join(outputDir, "doctor-index", "doctors.json"), doctors);
  await writeJson(
    path.join(outputDir, "doctor-index", "identity-map.json"),
    doctors.map((doctor) => ({
      canonicalName: doctor.fullName,
      normalizedName: doctor.normalizedName,
      profileUrl: doctor.profileUrl,
      sourceUrl: doctor.sourceUrl,
      evidence: doctor.sourceEvidence
    }))
  );
  await writeJson(path.join(outputDir, "pilot", "config.json"), { selectedUrls, generatedAt: evaluation.generatedAt });
  await writeJson(path.join(outputDir, "pilot", "evaluation.json"), evaluation);
  await writeJson(path.join(outputDir, "reviewed", "doctors-reviewed.json"), reviewed);
  return evaluation;
}

export async function runHospitalEvaluate(hospitalSlug: string) {
  const filePath = path.join(baseOutputDir(hospitalSlug), "pilot", "evaluation.json");
  return readJson<HospitalPilotEvaluation>(filePath);
}

export async function runHospitalFull(hospitalSlug: string, confirm: boolean) {
  const evaluation = await runHospitalEvaluate(hospitalSlug);
  if (!confirm) throw new Error("Full mode requires --confirm.");
  if (evaluation.readiness !== "safeForFullBatch") {
    throw new Error(`Full mode blocked: readiness=${evaluation.readiness}; blocker=${evaluation.mainBlocker ?? "none"}`);
  }
  throw new Error(`Full mode is intentionally not implemented for ${hospitalSlug}; add a provider-specific full adapter first.`);
}

export async function runHospitalAutopilot(hospitalSlug: string, mode: AutopilotMode, confirm = false) {
  if (mode === "plan") return runHospitalPlan(hospitalSlug);
  if (mode === "pilot") return runHospitalPilot(hospitalSlug);
  if (mode === "evaluate") return runHospitalEvaluate(hospitalSlug);
  return runHospitalFull(hospitalSlug, confirm);
}

export function summarizeAutopilotResult(mode: AutopilotMode, result: unknown) {
  if (mode === "plan") {
    const plan = result as HospitalPlan;
    return {
      hospital: plan.hospitalSlug,
      mode,
      doctorIndexExists: plan.doctorIndexExists,
      candidatePages: plan.candidatePages.length,
      recommendedPilotUrls: plan.recommendedPilotUrls.length,
      readiness: plan.readiness,
      crawlReadiness: plan.crawlReadiness,
      mappingReadiness: plan.mappingReadiness,
      outputUsability: plan.outputUsability,
      mainBlocker: plan.mainBlocker
    };
  }
  if (mode === "pilot" || mode === "evaluate") {
    const evaluation = result as HospitalPilotEvaluation;
    return {
      hospital: evaluation.hospitalSlug,
      mode,
      doctorIndexExists: evaluation.doctorIndexExists,
      parserFamily: evaluation.parserFamily,
      rawDoctorRecords: evaluation.rawDoctorRecords,
      profileUrlCoverage: Number(evaluation.profileUrlCoverage.toFixed(2)),
      reviewedRecords: evaluation.reviewedRecords,
      productionReadyCount: evaluation.productionReadyCount,
      readiness: evaluation.readiness,
      crawlReadiness: evaluation.crawlReadiness,
      mappingReadiness: evaluation.mappingReadiness,
      outputUsability: evaluation.outputUsability,
      mainBlocker: evaluation.mainBlocker
    };
  }
  return { mode, result: normalizeWhitespace(String(result)) };
}
