import fs from "node:fs/promises";
import path from "node:path";
import { load, type CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import { fetchClalitHtml } from "./fetch";
import { buildDuplicateDoctorContext, qaForEnrichedDoctor, summarizeQaFlags } from "./qa";
import type {
  ClalitDepartmentConfig,
  DoctorRecord,
  EnrichedDoctorRecord,
  ProfileInspectionEntry,
  SourceEvidence,
  CrawlerOutputPaths
} from "./types";
import { absoluteUrl, normalizeText, normalizeWhitespace, readJson, safeSlugFromValue, sleep, writeJson } from "./utils";

type ProfileElement = Element;

const REQUEST_DELAY_MS = 150;

const labelGroups = {
  role: ["תפקידים ומנויים", "תפקידים ומינויים", "תפקיד", "מינוי", "תפקידים"],
  unit: ["יחידה"],
  specialties: ["מומחיות", "תחומי מומחיות"],
  subspecialties: ["שטחי התעניינות מיוחדים", "תחומי עיסוק", "תחומי עניין", "תחומי התמחות"],
  clinicalInterests: ["שטחי התעניינות מיוחדים", "תחומי עיסוק", "עיסוק במחקר", "תחומי עניין"],
  education: ["לימודים", "השכלה"],
  residency: ["מקום התמחות", "התמחות"],
  fellowship: ["השתלמויות", "השתלמות", "השתלמות עמיתים", "התמחות-על", "התמחות על"],
  previousRoles: ["ניסיון מקצועי", "תפקידים קודמים", "עבר מקצועי"],
  languages: ["שפות"],
  phone: ["טלפון", "טלפונים"],
  email: ["דוא\"ל", "דואל", "דואר אלקטרוני", "מייל"]
} satisfies Record<string, string[]>;

const allKnownLabels = Array.from(new Set(Object.values(labelGroups).flat()));
const footerNoisePattern = /(footer|noindex|TopNavigation|side-navbar|breadcrumb|search|menu|hospitals-footer)/i;

function elementText($: CheerioAPI, element: ProfileElement) {
  const clone = $(element).clone();
  clone.find("br").replaceWith("\n");

  return normalizeText(clone.text());
}

function fieldEvidence(value: string, sourceText: string): SourceEvidence {
  const cleanValue = normalizeWhitespace(value);
  const cleanSource = normalizeText(sourceText);
  const index = cleanSource.indexOf(cleanValue);
  const snippet =
    index >= 0
      ? cleanSource.slice(Math.max(0, index - 80), Math.min(cleanSource.length, index + cleanValue.length + 120))
      : cleanSource.slice(0, 240);

  return {
    value: cleanValue,
    snippet
  };
}

function addEvidence(
  evidence: Record<string, SourceEvidence[]>,
  field: string,
  values: string[] | string | null | undefined,
  sourceText: string
) {
  const normalizedValues = (Array.isArray(values) ? values : values ? [values] : [])
    .map(normalizeWhitespace)
    .filter(Boolean);
  if (normalizedValues.length === 0) return;

  evidence[field] = [
    ...(evidence[field] ?? []),
    ...normalizedValues.map((value) => fieldEvidence(value, sourceText))
  ];
}

function isNoiseContainer($: CheerioAPI, element: ProfileElement) {
  const handle = $(element);
  const descriptor = `${element.tagName ?? ""} ${handle.attr("id") ?? ""} ${handle.attr("class") ?? ""}`;
  if (footerNoisePattern.test(descriptor)) return true;

  return handle.parents().toArray().some((parent) => {
    if (!isElement(parent)) return false;
    const parentHandle = $(parent);
    const parentDescriptor = `${parent.tagName ?? ""} ${parentHandle.attr("id") ?? ""} ${parentHandle.attr("class") ?? ""}`;
    return footerNoisePattern.test(parentDescriptor);
  });
}

function isElement(node: unknown): node is Element {
  return Boolean(node && typeof node === "object" && "tagName" in node);
}

function valuesFromSectionElement($: CheerioAPI, heading: ProfileElement) {
  const values: string[] = [];
  let cursor = $(heading).next();

  while (cursor.length > 0) {
    const tagName = (cursor.get(0)?.tagName ?? "").toLowerCase();
    if (/^h[1-6]$/.test(tagName)) break;

    if (tagName === "ul" || tagName === "ol") {
      cursor.find("li").each((_, item) => {
        const text = elementText($, item);
        if (text) values.push(text);
      });
    } else {
      const element = cursor.get(0);
      if (element) {
        const text = elementText($, element);
        if (text) values.push(text);
      }
    }

    cursor = cursor.next();
  }

  return values.map(normalizeWhitespace).filter(Boolean);
}

function extractSections($: CheerioAPI) {
  const sections = new Map<string, { heading: string; values: string[]; snippet: string }>();
  const content = $(".ms-rtestate-field").first();
  const root = content.length ? content : $("main, #DeltaPlaceHolderMain, body").first();

  root.find("h1,h2,h3,h4,strong,b").each((_, heading) => {
    if (!isElement(heading)) return;
    if (isNoiseContainer($, heading)) return;
    const headingText = normalizeWhitespace($(heading).text()).replace(/[:：]+$/g, "");
    if (!headingText) return;
    const matchedLabel = allKnownLabels.find((label) => headingText.includes(label));
    if (!matchedLabel) return;

    const values = valuesFromSectionElement($, heading);
    if (values.length === 0) return;

    sections.set(matchedLabel, {
      heading: headingText,
      values,
      snippet: `${headingText}\n${values.join("\n")}`.slice(0, 900)
    });
  });

  return sections;
}

function sectionValues(
  sections: Map<string, { heading: string; values: string[]; snippet: string }>,
  labels: string[]
) {
  for (const label of labels) {
    const direct = sections.get(label);
    if (direct) return direct.values;
  }

  for (const [heading, section] of sections) {
    if (labels.some((label) => heading.includes(label))) return section.values;
  }

  return [];
}

function sectionSnippet(
  sections: Map<string, { heading: string; values: string[]; snippet: string }>,
  labels: string[]
) {
  for (const label of labels) {
    const direct = sections.get(label);
    if (direct) return direct.snippet;
  }

  for (const [heading, section] of sections) {
    if (labels.some((label) => heading.includes(label))) return section.snippet;
  }

  return "";
}

function extractLabelLine($: CheerioAPI, label: string) {
  const candidates: string[] = [];

  $(".doctor-box-info, .doctor-unit, .doctor-page-content, .list-info, .box-info")
    .find("p,div,span,td,li")
    .addBack()
    .each((_, element) => {
      if (!isElement(element)) return;
      if (isNoiseContainer($, element)) return;
      const text = elementText($, element);
      if (!text.includes(label) || text.length > 500) return;
      candidates.push(text);
    });

  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const candidate of candidates.sort((left, right) => left.length - right.length)) {
    const match = candidate.match(new RegExp(`${escapedLabel}\\s*[:：]?\\s*(.+)$`));
    const value = cleanProfileValue(match?.[1] ?? null, label);
    if (value) return value;
  }

  return null;
}

function cleanProfileValue(value: string | null | undefined, label?: string) {
  if (!value) return null;
  let cleanValue = normalizeWhitespace(value).replace(/^[:：\-\s]+|[:：\-\s]+$/g, "");
  if (label) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleanValue = cleanValue.replace(new RegExp(`^${escapedLabel}\\s*[:：]?\\s*`), "");
  }

  cleanValue = normalizeWhitespace(cleanValue).replace(/^[:：\-\s]+|[:：\-\s]+$/g, "");
  if (!cleanValue || cleanValue === ":" || cleanValue.length < 2) return null;
  if (!/[\p{L}\p{N}]/u.test(cleanValue)) return null;

  return cleanValue;
}

function extractProfileInfoValue($: CheerioAPI, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const labelPattern = new RegExp(`^${escapedLabel}\\s*[:：]?$`);

  for (const element of $(".doctor-box-info, .doctor-unit, .doctor-page-content").toArray()) {
    if (!isElement(element)) continue;
    if (isNoiseContainer($, element)) continue;
    const lines = elementText($, element)
      .split("\n")
      .map(normalizeWhitespace)
      .filter(Boolean);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const inlineMatch = line.match(new RegExp(`^${escapedLabel}\\s*[:：]\\s*(.+)$`));
      const inlineValue = cleanProfileValue(inlineMatch?.[1], label);
      if (inlineValue) return inlineValue;

      if (labelPattern.test(line)) {
        for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
          if (
            allKnownLabels.some((knownLabel) => {
              const escapedKnownLabel = knownLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              return new RegExp(`^${escapedKnownLabel}\\s*[:：]?$`).test(lines[nextIndex]);
            })
          ) {
            break;
          }
          const nextValue = cleanProfileValue(lines[nextIndex]);
          if (nextValue) return nextValue;
        }
      }
    }
  }

  return extractLabelLine($, label);
}

function splitSpecialtyText(values: string[]) {
  return values
    .flatMap((value) => value.split(/[;•\n]+/))
    .map(normalizeWhitespace)
    .filter(Boolean);
}

function academicTitleFromName(name: string | null) {
  if (!name) return null;
  const match = name.match(/^(פרופ['׳]?|פרופסור|ד["״']?ר|ד״ר|ד"ר)/);

  return match?.[1] ?? null;
}

function profileName($: CheerioAPI, fallbackName: string) {
  const directName =
    extractProfileInfoValue($, "שם") ??
    cleanProfileValue(normalizeWhitespace($(".doctor-name, .article-title").first().text())) ??
    fallbackName;

  return directName || fallbackName;
}

function profileMainText($: CheerioAPI) {
  const blocks = [".doctor-box-info", ".ms-rtestate-field"]
    .flatMap((selector) => $(selector).toArray())
    .filter((element): element is Element => isElement(element))
    .filter((element) => !isNoiseContainer($, element))
    .map((element) => elementText($, element))
    .map(normalizeText)
    .filter(Boolean);

  const uniqueBlocks = Array.from(new Set(blocks));
  return normalizeText(uniqueBlocks.join("\n\n")) || normalizeText($("body").text());
}

function profileImage($: CheerioAPI, sourceUrl: string, fallbackImage: string | null) {
  const imageCandidates = [
    ".doctor-info img",
    ".doctor-page-content img",
    ".doctor-box-info img",
    ".article-image img",
    "img[alt*='ד']",
    "img[title*='ד']"
  ];

  for (const selector of imageCandidates) {
    const image = $(selector).first();
    const source =
      image.attr("src") ??
      image.attr("data-src") ??
      image.attr("data-original") ??
      image.attr("data-lazy-src") ??
      null;
    const absolute = absoluteUrl(source, sourceUrl);
    if (absolute) return absolute;
  }

  return fallbackImage;
}

function extractPhones(text: string) {
  return Array.from(
    new Set(
      (text.match(/(?:\+972[-\s]?)?0\d{1,2}[-\s]?\d{6,7}(?:\/\d{1,4})?/g) ?? [])
        .map(normalizeWhitespace)
        .filter(Boolean)
    )
  );
}

function extractEmails(text: string, $: CheerioAPI) {
  const fromText = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const mailto = $("a[href^='mailto:']")
    .toArray()
    .filter((link): link is Element => isElement(link))
    .filter((link) => !isNoiseContainer($, link))
    .map((link) => $(link).attr("href")?.replace(/^mailto:/i, "").split("?")[0] ?? "");

  return Array.from(new Set([...fromText, ...mailto].map((email) => email.trim()).filter(Boolean)));
}

function classifyProfileCompleteness(input: {
  rawProfileText: string;
  roleValues: string[];
  subspecialties: string[];
  clinicalInterests: string[];
  education: string[];
  residency: string[];
  fellowship: string[];
  previousRoles: string[];
  contactDetails: { phones: string[]; emails: string[] };
}) {
  const richStructuredSections = [
    input.subspecialties,
    input.clinicalInterests,
    input.education,
    input.residency,
    input.fellowship,
    input.previousRoles
  ].some((values) => values.length > 0);
  const detailedRole = input.roleValues.join(" ").length >= 120;
  const richBiography = input.rawProfileText.length >= 500;

  if (richStructuredSections || detailedRole || richBiography) return "full" as const;

  const hasPublicContact = input.contactDetails.phones.length > 0 || input.contactDetails.emails.length > 0;
  const hasLimitedMetadata = input.roleValues.length > 0 || input.rawProfileText.length >= 100;
  if (hasPublicContact || hasLimitedMetadata) return "partial" as const;

  return "listOnly" as const;
}

export function inspectProfile($: CheerioAPI, sourceUrl: string): ProfileInspectionEntry {
  const labelsFound: Record<string, number> = {};
  const fullText = normalizeText($("body").text());

  for (const label of allKnownLabels) {
    labelsFound[label] = (fullText.match(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
  }

  const sectionHeadings = $(".ms-rtestate-field h1,.ms-rtestate-field h2,.ms-rtestate-field h3,.ms-rtestate-field h4")
    .toArray()
    .map((heading) => normalizeWhitespace($(heading).text()))
    .filter(Boolean);
  const candidateBlocks = $(".doctor-page-content,.doctor-box-info,.ms-rtestate-field,.list-info,.box-info")
    .toArray()
    .filter((element): element is Element => isElement(element))
    .filter((element) => !isNoiseContainer($, element))
    .map((element) => {
      const text = elementText($, element);

      return {
        selector: `${element.tagName}.${($(element).attr("class") ?? "").trim().replace(/\s+/g, ".")}`,
        textLength: text.length,
        textPreview: text.slice(0, 500)
      };
    })
    .filter((block) => block.textLength > 0)
    .sort((left, right) => right.textLength - left.textLength)
    .slice(0, 8);

  return {
    sourceUrl,
    labelsFound,
    sectionHeadings,
    candidateBlocks
  };
}

export function enrichDoctorProfile(doctor: DoctorRecord, html: string, sourceUrl: string): EnrichedDoctorRecord {
  const $ = load(html);
  const sections = extractSections($);
  const evidence: Record<string, SourceEvidence[]> = {};
  const rawProfileText = profileMainText($);
  const fullName = profileName($, doctor.fullName);
  const roleValues = sectionValues(sections, labelGroups.role);
  const unit = extractProfileInfoValue($, "יחידה") ?? doctor.titleOrRole?.replace(/^יחידה:\s*/, "") ?? null;
  const education = sectionValues(sections, labelGroups.education);
  const residency = sectionValues(sections, labelGroups.residency);
  const fellowshipSection = sectionValues(sections, labelGroups.fellowship);
  const fellowship =
    fellowshipSection.length > 0
      ? fellowshipSection
      : rawProfileText
          .split("\n")
          .map(normalizeWhitespace)
          .filter((line) => line.length < 450 && /השתלמות|התמחות\s*-?על|fellow/i.test(line));
  const specialties =
    splitSpecialtyText(sectionValues(sections, labelGroups.specialties)).length > 0
      ? splitSpecialtyText(sectionValues(sections, labelGroups.specialties))
      : splitSpecialtyText((doctor.rawText.split("\n")[1] ? [doctor.rawText.split("\n")[1]] : []));
  const subspecialties = splitSpecialtyText(sectionValues(sections, labelGroups.subspecialties));
  const clinicalInterests = splitSpecialtyText(sectionValues(sections, labelGroups.clinicalInterests));
  const previousRoles = sectionValues(sections, labelGroups.previousRoles);
  const languages = splitSpecialtyText(sectionValues(sections, labelGroups.languages));
  const contactText = rawProfileText;
  const contactDetails = {
    phones: extractPhones(contactText),
    emails: extractEmails(contactText, $)
  };
  const profileCompleteness = classifyProfileCompleteness({
    rawProfileText,
    roleValues,
    subspecialties,
    clinicalInterests,
    education,
    residency,
    fellowship,
    previousRoles,
    contactDetails
  });
  const profileImageUrl = profileImage($, sourceUrl, doctor.imageUrl);
  const warnings: string[] = [];

  if (rawProfileText.length < 100) warnings.push("Profile text is short.");
  if (roleValues.length === 0) warnings.push("Role/position section not found.");

  addEvidence(evidence, "fullName", fullName, rawProfileText);
  addEvidence(evidence, "role", roleValues, sectionSnippet(sections, labelGroups.role) || rawProfileText);
  addEvidence(evidence, "unit", unit, rawProfileText);
  addEvidence(evidence, "specialties", specialties, doctor.rawText);
  addEvidence(evidence, "subspecialties", subspecialties, sectionSnippet(sections, labelGroups.subspecialties));
  addEvidence(evidence, "clinicalInterests", clinicalInterests, sectionSnippet(sections, labelGroups.clinicalInterests));
  addEvidence(evidence, "education", education, sectionSnippet(sections, labelGroups.education));
  addEvidence(evidence, "residency", residency, sectionSnippet(sections, labelGroups.residency));
  addEvidence(evidence, "fellowship", fellowship, sectionSnippet(sections, labelGroups.fellowship) || rawProfileText);
  addEvidence(evidence, "previousRoles", previousRoles, sectionSnippet(sections, labelGroups.previousRoles));
  addEvidence(evidence, "languages", languages, sectionSnippet(sections, labelGroups.languages));
  addEvidence(evidence, "contactDetails.phones", contactDetails.phones, contactText);
  addEvidence(evidence, "contactDetails.emails", contactDetails.emails, contactText);
  addEvidence(evidence, "profileImage", profileImageUrl, profileImageUrl ?? "");

  return {
    ...doctor,
    profileCompleteness,
    profile: {
      fullName,
      academicTitle: academicTitleFromName(fullName),
      role: roleValues.join("\n") || doctor.titleOrRole,
      unit,
      department: doctor.department,
      hospital: doctor.hospital,
      specialties,
      subspecialties,
      clinicalInterests,
      education,
      residency,
      fellowship: Array.from(new Set(fellowship)),
      previousRoles,
      languages,
      contactDetails,
      profileImage: profileImageUrl,
      rawProfileText,
      sourceUrl,
      evidence,
      warnings
    },
    qaFlags: [...(doctor.qaFlags ?? [])],
    qaNotes: [...(doctor.qaNotes ?? [])],
    qaSeverity: doctor.qaSeverity ?? "ok"
  };
}

export function profileCoverage(records: EnrichedDoctorRecord[]) {
  const count = (predicate: (record: EnrichedDoctorRecord) => boolean) => records.filter(predicate).length;

  return {
    roleCount: count((record) => Boolean(record.profile.role)),
    specialtyCount: count((record) => record.profile.specialties.length > 0),
    subspecialtyCount: count((record) => record.profile.subspecialties.length > 0),
    educationCount: count((record) => record.profile.education.length > 0),
    fellowshipCount: count((record) => record.profile.fellowship.length > 0),
    contactCount: count(
      (record) => record.profile.contactDetails.phones.length > 0 || record.profile.contactDetails.emails.length > 0
    )
  };
}

function listOnlyEnrichedDoctor(
  doctor: DoctorRecord,
  sourceUrl: string,
  warning: string
): EnrichedDoctorRecord {
  return {
    ...doctor,
    profileCompleteness: "listOnly",
    profile: {
      fullName: doctor.fullName,
      academicTitle: academicTitleFromName(doctor.fullName),
      role: doctor.titleOrRole,
      unit: doctor.sectionHeading ?? null,
      department: doctor.department,
      hospital: doctor.hospital,
      specialties: [],
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
        ...(doctor.titleOrRole
          ? { role: [{ value: doctor.titleOrRole, snippet: doctor.rawText }] }
          : {})
      },
      warnings: [warning]
    },
    qaFlags: [...(doctor.qaFlags ?? [])],
    qaNotes: [...(doctor.qaNotes ?? [])],
    qaSeverity: doctor.qaSeverity ?? "review"
  };
}

export async function enrichClalitDepartmentProfiles(config: ClalitDepartmentConfig, paths: CrawlerOutputPaths) {
  await fs.mkdir(paths.rawProfilesDir, { recursive: true });
  const doctors = await readJson<DoctorRecord[]>(paths.doctorsPath);
  const duplicateContext = buildDuplicateDoctorContext(doctors);
  const enriched: EnrichedDoctorRecord[] = [];
  const failed: Array<{ fullName: string; profileUrl: string | null; error: string }> = [];
  const inspections: ProfileInspectionEntry[] = [];

  for (const doctor of doctors) {
    if (!doctor.profileUrl) {
      failed.push({ fullName: doctor.fullName, profileUrl: null, error: "Missing profileUrl" });
      const listOnly = listOnlyEnrichedDoctor(doctor, doctor.sourceUrl, "No public profile URL was published.");
      const qa = qaForEnrichedDoctor(listOnly, config, duplicateContext);
      enriched.push({ ...listOnly, qaFlags: qa.flags, qaNotes: qa.notes, qaSeverity: qa.qaSeverity });
      continue;
    }

    try {
      const rawPath = path.join(paths.rawProfilesDir, `${safeSlugFromValue(doctor.profileUrl)}.html`);
      let html: string;
      try {
        html = await fs.readFile(rawPath, "utf8");
      } catch {
        html = await fetchClalitHtml(doctor.profileUrl);
        await fs.writeFile(rawPath, html, "utf8");
      }

      const $ = load(html);
      inspections.push(inspectProfile($, doctor.profileUrl));
      const enrichedDoctor = enrichDoctorProfile(doctor, html, doctor.profileUrl);
      const qa = qaForEnrichedDoctor(enrichedDoctor, config, duplicateContext);
      enriched.push({
        ...enrichedDoctor,
        qaFlags: qa.flags,
        qaNotes: qa.notes,
        qaSeverity: qa.qaSeverity
      });
      await sleep(REQUEST_DELAY_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failed.push({
        fullName: doctor.fullName,
        profileUrl: doctor.profileUrl,
        error: message
      });
      const listOnly = listOnlyEnrichedDoctor(doctor, doctor.profileUrl, `Public profile fetch failed: ${message}`);
      const qa = qaForEnrichedDoctor(listOnly, config, duplicateContext);
      enriched.push({ ...listOnly, qaFlags: qa.flags, qaNotes: qa.notes, qaSeverity: qa.qaSeverity });
    }
  }

  await writeJson(paths.enrichedPath, enriched);
  await writeJson(paths.inspectionPath, inspections);

  return {
    ok: failed.length === 0,
    inputDoctors: doctors.length,
    profilesFetched: enriched.length,
    profilesFailed: failed.length,
    enrichedDoctors: enriched.length,
    outputPath: paths.enrichedPath,
    inspectionPath: paths.inspectionPath,
    rawProfilesDir: paths.rawProfilesDir,
    coverage: profileCoverage(enriched),
    qaFlagsSummary: summarizeQaFlags(enriched),
    failed,
    first3: enriched.slice(0, 3)
  };
}
