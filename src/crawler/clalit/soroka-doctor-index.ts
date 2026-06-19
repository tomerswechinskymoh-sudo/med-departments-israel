import fs from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";
import type { CheerioAPI } from "cheerio";
import { fetchClalitHtml } from "./fetch";
import { enrichDoctorProfile, inspectProfile, profileCoverage } from "./parse-profile";
import type { DoctorRecord, EnrichedDoctorRecord, ProfileCompleteness, ProfileInspectionEntry } from "./types";
import { absoluteUrl, normalizeText, normalizeWhitespace, readJson, sleep, writeJson } from "./utils";

export const SOROKA_DOCTOR_INDEX_URL =
  "https://hospitals.clalit.co.il/soroka/he/our-specialists/Pages/default.aspx";

const OUTPUT_DIR = path.join(process.cwd(), "data", "crawler", "output", "soroka-doctor-index");
const HOSPITAL = "Soroka Medical Center";
const INDEX_DEPARTMENT = "Soroka hospital doctor index";
const PROFILE_CONCURRENCY = 5;
const PROFILE_REQUEST_DELAY_MS = 100;

const doctorTitlePattern = /^(ד["״']?ר|ד״ר|ד"ר|פרופ['׳]?|פרופ׳|פרופסור)\s+/;

export type SorokaDoctorIndexRecord = DoctorRecord & {
  normalizedName: string;
  titlePrefix: string | null;
  visibleMedicalFields: string[];
  sourceIndexUrl: string;
  evidenceSnippet: string;
  sectionContext: string | null;
  indexOccurrences: number;
};

export type SorokaEnrichedDoctorRecord = EnrichedDoctorRecord & {
  normalizedName?: string;
  titlePrefix?: string | null;
  visibleMedicalFields?: string[];
  sourceIndexUrl?: string;
  evidenceSnippet?: string;
  sectionContext?: string | null;
  indexOccurrences?: number;
};

export type SorokaIdentityMapEntry = {
  canonicalName: string;
  normalizedName: string;
  titleStrippedName: string;
  titlePrefix: string | null;
  profileUrl: string | null;
  knownUnits: string[];
  knownFields: string[];
  sourceEvidence: string[];
  profileCompleteness: ProfileCompleteness;
  keys: {
    normalizedName: string;
    titleStrippedName: string;
    profileUrl: string | null;
    hebrewPunctuationVariants: string[];
  };
};

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => normalizeWhitespace(value ?? "")).filter(Boolean)));
}

function titlePrefixFromName(name: string) {
  return name.match(doctorTitlePattern)?.[1] ?? null;
}

function stripTitlePrefix(name: string) {
  return normalizeWhitespace(name.replace(doctorTitlePattern, ""));
}

function normalizeDoctorName(name: string) {
  return stripTitlePrefix(name)
    .replace(/[׳']/g, "")
    .replace(/[״"]/g, "")
    .replace(/[.\-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function punctuationVariants(name: string) {
  const stripped = stripTitlePrefix(name);
  return unique([
    stripped,
    stripped.replace(/ד"ר/g, "ד״ר"),
    stripped.replace(/פרופ'/g, "פרופ׳"),
    stripped.replace(/[׳']/g, ""),
    stripped.replace(/[״"]/g, ""),
    normalizeDoctorName(stripped)
  ]);
}

function isDoctorProfileHref(href: string) {
  return href.includes("/soroka/he/our-specialists/Pages/") && /\.aspx(?:$|[?#])/i.test(href);
}

function isDoctorName(text: string) {
  return doctorTitlePattern.test(normalizeWhitespace(text));
}

function medicalFieldLinks($: CheerioAPI, root: ReturnType<CheerioAPI>) {
  return unique(
    root
      .find("a[href*='/med-units/'], a[href*='/departments-and-clinics/']")
      .toArray()
      .map((link) => $(link).text())
  );
}

function imageFromBlock($: CheerioAPI, root: ReturnType<CheerioAPI>, sourceUrl: string) {
  for (const image of root.find("img").toArray()) {
    const src =
      $(image).attr("src") ??
      $(image).attr("data-src") ??
      $(image).attr("data-original") ??
      $(image).attr("data-lazy-src") ??
      null;
    const absolute = absoluteUrl(src, sourceUrl);
    if (absolute) return absolute;
  }

  return null;
}

function sectionContextFor($: CheerioAPI, root: ReturnType<CheerioAPI>) {
  const previousHeading = root
    .prevAll("dt,h2,h3,h4")
    .first()
    .text();
  const text = normalizeWhitespace(previousHeading);
  return text || null;
}

export function parseSorokaDoctorIndex(html: string, sourceUrl = SOROKA_DOCTOR_INDEX_URL) {
  const $ = load(html);
  const recordsByProfileUrl = new Map<string, SorokaDoctorIndexRecord>();
  const rawRows: Array<{ fullName: string; profileUrl: string; units: string[]; rawText: string }> = [];

  $("dd.MedicalFieldOrder").each((_, row) => {
    const rowHandle = $(row);
    const doctorAnchor = rowHandle
      .find("a")
      .toArray()
      .find((anchor) => {
        const href = absoluteUrl($(anchor).attr("href"), sourceUrl) ?? "";
        const text = normalizeWhitespace($(anchor).text());
        return isDoctorProfileHref(href) && isDoctorName(text);
      });
    if (!doctorAnchor) return;

    const fullName = normalizeWhitespace($(doctorAnchor).text());
    const profileUrl = absoluteUrl($(doctorAnchor).attr("href"), sourceUrl);
    if (!profileUrl || !fullName) return;

    const units = medicalFieldLinks($, rowHandle);
    const rawText = normalizeText(rowHandle.text());
    rawRows.push({ fullName, profileUrl, units, rawText });

    const existing = recordsByProfileUrl.get(profileUrl);
    const combinedUnits = unique([...(existing?.visibleMedicalFields ?? []), ...units]);
    const combinedRaw = unique([existing?.rawText, rawText]).join("\n");
    const record: SorokaDoctorIndexRecord = {
      fullName: existing?.fullName ?? fullName,
      normalizedName: normalizeDoctorName(existing?.fullName ?? fullName),
      titlePrefix: titlePrefixFromName(existing?.fullName ?? fullName),
      titleOrRole: combinedUnits.length > 0 ? combinedUnits.join("\n") : null,
      profileUrl,
      imageUrl: existing?.imageUrl ?? imageFromBlock($, rowHandle, sourceUrl),
      rawText: combinedRaw,
      sourceUrl,
      hospital: HOSPITAL,
      department: INDEX_DEPARTMENT,
      sectionHeading: sectionContextFor($, rowHandle),
      visibleMedicalFields: combinedUnits,
      sourceIndexUrl: sourceUrl,
      evidenceSnippet: normalizeText(rawText).slice(0, 500),
      sectionContext: sectionContextFor($, rowHandle),
      indexOccurrences: (existing?.indexOccurrences ?? 0) + 1
    };
    recordsByProfileUrl.set(profileUrl, record);
  });

  // Fallback for future Soroka markup changes: profile anchors can still carry doctor names.
  $("a").each((_, anchor) => {
    const href = absoluteUrl($(anchor).attr("href"), sourceUrl);
    const fullName = normalizeWhitespace($(anchor).text());
    if (!href || !isDoctorProfileHref(href) || !isDoctorName(fullName) || recordsByProfileUrl.has(href)) return;
    const rowHandle = $(anchor).closest("li,dd,tr,div,p");
    const rawText = normalizeText(rowHandle.text() || fullName);
    recordsByProfileUrl.set(href, {
      fullName,
      normalizedName: normalizeDoctorName(fullName),
      titlePrefix: titlePrefixFromName(fullName),
      titleOrRole: null,
      profileUrl: href,
      imageUrl: imageFromBlock($, rowHandle, sourceUrl),
      rawText,
      sourceUrl,
      hospital: HOSPITAL,
      department: INDEX_DEPARTMENT,
      sectionHeading: sectionContextFor($, rowHandle),
      visibleMedicalFields: medicalFieldLinks($, rowHandle),
      sourceIndexUrl: sourceUrl,
      evidenceSnippet: rawText.slice(0, 500),
      sectionContext: sectionContextFor($, rowHandle),
      indexOccurrences: 1
    });
  });

  const records = Array.from(recordsByProfileUrl.values()).sort((left, right) =>
    left.normalizedName.localeCompare(right.normalizedName, "he")
  );
  const title = normalizeWhitespace($("title").first().text());
  const headingValues = unique(
    $("h1,h2")
      .toArray()
      .map((heading) => $(heading).text())
  );

  return {
    records,
    inspection: {
      sourceUrl,
      title,
      headingValues,
      htmlSize: html.length,
      namesEmbeddedInDocumentHtml: records.length > 0,
      rawIndexRows: rawRows.length,
      uniqueProfileUrls: records.length,
      duplicateIndexRows: rawRows.length - records.length,
      sampleRows: rawRows.slice(0, 20),
      first15Doctors: records.slice(0, 15).map((record) => ({
        fullName: record.fullName,
        profileUrl: record.profileUrl,
        visibleMedicalFields: record.visibleMedicalFields,
        indexOccurrences: record.indexOccurrences
      }))
    }
  };
}

function fallbackEnrichedDoctor(
  doctor: SorokaDoctorIndexRecord,
  sourceUrl: string,
  warning: string
): SorokaEnrichedDoctorRecord {
  return {
    ...doctor,
    profileCompleteness: "listOnly",
    profile: {
      fullName: doctor.fullName,
      academicTitle: doctor.titlePrefix,
      role: doctor.titleOrRole,
      unit: doctor.visibleMedicalFields.join("\n") || null,
      department: doctor.department,
      hospital: doctor.hospital,
      specialties: doctor.visibleMedicalFields,
      subspecialties: [],
      clinicalInterests: [],
      education: [],
      residency: [],
      fellowship: [],
      previousRoles: [],
      languages: [],
      contactDetails: { phones: [], emails: [] },
      profileImage: doctor.imageUrl,
      rawProfileText: "",
      sourceUrl,
      evidence: {
        fullName: [{ value: doctor.fullName, snippet: doctor.rawText }],
        ...(doctor.visibleMedicalFields.length > 0
          ? { specialties: doctor.visibleMedicalFields.map((value) => ({ value, snippet: doctor.rawText })) }
          : {})
      },
      warnings: [warning]
    },
    qaFlags: ["listOnlyProfile"],
    qaNotes: [warning],
    qaSeverity: "review"
  };
}

async function enrichIndexRecords(records: SorokaDoctorIndexRecord[]) {
  const enriched: SorokaEnrichedDoctorRecord[] = new Array(records.length);
  const inspections: ProfileInspectionEntry[] = [];
  const failed: Array<{ fullName: string; profileUrl: string | null; error: string }> = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < records.length) {
      const index = nextIndex;
      nextIndex += 1;
      const doctor = records[index];
      if (!doctor.profileUrl) {
        failed.push({ fullName: doctor.fullName, profileUrl: null, error: "Missing profileUrl" });
        enriched[index] = fallbackEnrichedDoctor(doctor, doctor.sourceUrl, "No public profile URL was published.");
        continue;
      }

      try {
        const html = await fetchClalitHtml(doctor.profileUrl);
        const $ = load(html);
        inspections.push(inspectProfile($, doctor.profileUrl));
        enriched[index] = enrichDoctorProfile(doctor, html, doctor.profileUrl) as SorokaEnrichedDoctorRecord;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push({ fullName: doctor.fullName, profileUrl: doctor.profileUrl, error: message });
        enriched[index] = fallbackEnrichedDoctor(doctor, doctor.profileUrl, `Public profile fetch failed: ${message}`);
      }

      await sleep(PROFILE_REQUEST_DELAY_MS);
    }
  }

  await Promise.all(Array.from({ length: PROFILE_CONCURRENCY }, () => worker()));

  return {
    enriched,
    inspections,
    failed
  };
}

function knownUnitsFor(record: SorokaEnrichedDoctorRecord) {
  return unique([
    ...(record.visibleMedicalFields ?? []),
    record.profile.unit,
    record.profile.department,
    ...record.profile.specialties
  ]);
}

export function buildSorokaIdentityMap(records: SorokaEnrichedDoctorRecord[]) {
  const entries: SorokaIdentityMapEntry[] = records.map((record) => {
    const canonicalName = record.profile.fullName ?? record.fullName;
    const normalizedName = normalizeDoctorName(canonicalName);
    const titleStrippedName = stripTitlePrefix(canonicalName);
    const knownUnits = knownUnitsFor(record);
    return {
      canonicalName,
      normalizedName,
      titleStrippedName,
      titlePrefix: titlePrefixFromName(canonicalName),
      profileUrl: record.profileUrl ?? record.profile.sourceUrl ?? null,
      knownUnits,
      knownFields: unique([...(record.visibleMedicalFields ?? []), ...record.profile.specialties]),
      sourceEvidence: unique([
        record.evidenceSnippet,
        record.rawText.slice(0, 500),
        record.profile.rawProfileText.slice(0, 500)
      ]),
      profileCompleteness: record.profileCompleteness,
      keys: {
        normalizedName,
        titleStrippedName,
        profileUrl: record.profileUrl ?? record.profile.sourceUrl ?? null,
        hebrewPunctuationVariants: punctuationVariants(canonicalName)
      }
    };
  });

  const byNormalizedName: Record<string, string[]> = {};
  const byTitleStrippedName: Record<string, string[]> = {};
  const byProfileUrl: Record<string, string> = {};

  for (const entry of entries) {
    if (entry.profileUrl) byProfileUrl[entry.profileUrl] = entry.profileUrl;
    byNormalizedName[entry.normalizedName] = unique([...(byNormalizedName[entry.normalizedName] ?? []), entry.profileUrl]);
    byTitleStrippedName[entry.titleStrippedName] = unique([
      ...(byTitleStrippedName[entry.titleStrippedName] ?? []),
      entry.profileUrl
    ]);
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceIndexUrl: SOROKA_DOCTOR_INDEX_URL,
    entries,
    byNormalizedName,
    byTitleStrippedName,
    byProfileUrl
  };
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function profileCompletenessCounts(records: SorokaEnrichedDoctorRecord[]) {
  return records.reduce(
    (counts, record) => {
      counts[record.profileCompleteness] += 1;
      return counts;
    },
    { full: 0, partial: 0, listOnly: 0 } satisfies Record<ProfileCompleteness, number>
  );
}

function mapEntriesByNormalizedName(entries: SorokaIdentityMapEntry[]) {
  const map = new Map<string, SorokaIdentityMapEntry[]>();
  for (const entry of entries) {
    const values = map.get(entry.normalizedName) ?? [];
    values.push(entry);
    map.set(entry.normalizedName, values);
  }
  return map;
}

export async function compareSorokaPilotAgainstIdentityMap(identityMap: ReturnType<typeof buildSorokaIdentityMap>) {
  const pilotConfigPath = path.join(process.cwd(), "data", "crawler", "config", "soroka-pilot.json");
  if (!(await fileExists(pilotConfigPath))) {
    return {
      skipped: true,
      reason: "data/crawler/config/soroka-pilot.json not found"
    };
  }

  const pilot = await readJson<{ ids: string[] }>(pilotConfigPath);
  const byName = mapEntriesByNormalizedName(identityMap.entries);
  const matched: Array<{
    departmentId: string;
    fullName: string;
    profileUrl: string | null;
    matchedBy: "profileUrl" | "normalizedName";
    indexProfileUrl: string | null;
  }> = [];
  const unmatched: Array<{ departmentId: string; fullName: string; profileUrl: string | null; rawText: string }> = [];
  const recoverableMissingProfileUrls: Array<{
    departmentId: string;
    fullName: string;
    indexProfileUrl: string | null;
    knownUnits: string[];
  }> = [];
  const duplicateProfileUrls = new Map<string, Array<{ departmentId: string; fullName: string }>>();
  let inputRecords = 0;
  let reviewedRecords = 0;
  let productionReadyBefore = 0;

  for (const departmentId of pilot.ids) {
    const outputDir = path.join(process.cwd(), "data", "crawler", "output", departmentId);
    const doctorsPath = path.join(outputDir, "doctors.json");
    const reviewedPath = path.join(outputDir, "doctors-reviewed.json");
    if (!(await fileExists(doctorsPath))) continue;
    const doctors = await readJson<DoctorRecord[]>(doctorsPath);
    inputRecords += doctors.length;

    if (await fileExists(reviewedPath)) {
      const reviewed = await readJson<Array<{ productionReady?: boolean }>>(reviewedPath);
      reviewedRecords += reviewed.length;
      productionReadyBefore += reviewed.filter((record) => record.productionReady).length;
    }

    for (const doctor of doctors) {
      if (doctor.profileUrl) {
        const group = duplicateProfileUrls.get(doctor.profileUrl) ?? [];
        group.push({ departmentId, fullName: doctor.fullName });
        duplicateProfileUrls.set(doctor.profileUrl, group);
      }

      const profileMatch = identityMap.entries.find((entry) => entry.profileUrl && entry.profileUrl === doctor.profileUrl);
      if (profileMatch) {
        matched.push({
          departmentId,
          fullName: doctor.fullName,
          profileUrl: doctor.profileUrl,
          matchedBy: "profileUrl",
          indexProfileUrl: profileMatch.profileUrl
        });
        continue;
      }

      const nameMatches = byName.get(normalizeDoctorName(doctor.fullName)) ?? [];
      if (nameMatches.length === 1) {
        const [match] = nameMatches;
        matched.push({
          departmentId,
          fullName: doctor.fullName,
          profileUrl: doctor.profileUrl,
          matchedBy: "normalizedName",
          indexProfileUrl: match.profileUrl
        });
        if (!doctor.profileUrl) {
          recoverableMissingProfileUrls.push({
            departmentId,
            fullName: doctor.fullName,
            indexProfileUrl: match.profileUrl,
            knownUnits: match.knownUnits
          });
        }
      } else {
        unmatched.push({
          departmentId,
          fullName: doctor.fullName,
          profileUrl: doctor.profileUrl,
          rawText: doctor.rawText.slice(0, 400)
        });
      }
    }
  }

  const duplicateProfileUrlGroups = Array.from(duplicateProfileUrls.entries())
    .filter(([, records]) => records.length > 1)
    .map(([profileUrl, records]) => ({ profileUrl, records }));

  return {
    skipped: false,
    pilotIds: pilot.ids,
    inputRecords,
    reviewedRecords,
    productionReadyBefore,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    recoverableMissingProfileUrlCount: recoverableMissingProfileUrls.length,
    duplicateProfileUrlGroupsCount: duplicateProfileUrlGroups.length,
    matched: matched.slice(0, 200),
    unmatched,
    likelyFalsePositives: unmatched.filter((record) => !isDoctorName(record.fullName) || record.rawText.length > 350),
    recoverableMissingProfileUrls,
    duplicateProfileUrlGroups
  };
}

export async function crawlSorokaDoctorIndex() {
  const html = await fetchClalitHtml(SOROKA_DOCTOR_INDEX_URL);
  const { records, inspection } = parseSorokaDoctorIndex(html);
  const { enriched, inspections, failed } = await enrichIndexRecords(records);
  const identityMap = buildSorokaIdentityMap(enriched);
  const pilotComparison = await compareSorokaPilotAgainstIdentityMap(identityMap);

  await writeJson(path.join(OUTPUT_DIR, "doctors.json"), records);
  await writeJson(path.join(OUTPUT_DIR, "inspection.json"), inspection);
  await writeJson(path.join(OUTPUT_DIR, "doctors-enriched.json"), enriched);
  await writeJson(path.join(OUTPUT_DIR, "profile-inspection.json"), {
    generatedAt: new Date().toISOString(),
    inspections,
    failed
  });
  await writeJson(path.join(OUTPUT_DIR, "identity-map.json"), identityMap);
  await writeJson(path.join(OUTPUT_DIR, "pilot-comparison.json"), pilotComparison);

  return {
    ok: failed.length === 0,
    sourceUrl: SOROKA_DOCTOR_INDEX_URL,
    indexRows: inspection.rawIndexRows,
    uniqueDoctors: records.length,
    doctorsWithProfileUrl: records.filter((record) => Boolean(record.profileUrl)).length,
    profilesFetched: enriched.length - failed.length,
    profilesFailed: failed.length,
    profileCompleteness: profileCompletenessCounts(enriched),
    coverage: profileCoverage(enriched),
    outputDir: OUTPUT_DIR,
    identityMapPath: path.join(OUTPUT_DIR, "identity-map.json"),
    pilotComparisonPath: path.join(OUTPUT_DIR, "pilot-comparison.json"),
    pilotComparison,
    first15Doctors: records.slice(0, 15).map((record) => ({
      fullName: record.fullName,
      profileUrl: record.profileUrl,
      visibleMedicalFields: record.visibleMedicalFields,
      indexOccurrences: record.indexOccurrences
    })),
    failed: failed.slice(0, 20)
  };
}
