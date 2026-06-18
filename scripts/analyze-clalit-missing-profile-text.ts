import fs from "node:fs/promises";
import path from "node:path";
import { load, type CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import type { ClalitDepartmentConfig, EnrichedDoctorRecord } from "@/crawler/clalit/types";
import { normalizeText, normalizeWhitespace, safeSlugFromValue } from "@/crawler/clalit/utils";

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, "data", "crawler", "config", "clalit-departments.json");
const OUTPUT_PATH = path.join(ROOT, "data", "crawler", "qa", "missing-profile-text-analysis.json");

const CURRENT_SELECTORS = [".doctor-box-info", ".ms-rtestate-field"];
const CONTENT_SELECTORS = [
  ".doctor-box-info",
  ".ms-rtestate-field",
  ".doctor-page-content",
  ".doctor-info",
  ".article-content",
  ".article-body",
  ".ms-rte-layoutszone-inner",
  ".ms-webpart-zone",
  "[data-sp-webpart]",
  "main",
  "article",
  "#DeltaPlaceHolderMain"
];
const OMITTED_KNOWN_PROFILE_SELECTORS = [
  ".doctor-page-content",
  ".doctor-info",
  ".article-content",
  ".article-body",
  ".ms-rte-layoutszone-inner"
];
const RICH_PROFILE_LABELS = [
  "תפקידים ומנויים",
  "תפקידים ומינויים",
  "תפקיד",
  "מומחיות",
  "תחומי מומחיות",
  "תחומי עיסוק",
  "תחומי עניין",
  "לימודים",
  "השכלה",
  "מקום התמחות",
  "התמחות",
  "השתלמויות",
  "השתלמות",
  "ניסיון מקצועי",
  "תפקידים קודמים",
  "שפות",
  "טלפון",
  "דוא\"ל",
  "דואר אלקטרוני"
];

type Category =
  | "truly empty profile page"
  | "profile content in different HTML structure"
  | "content hidden in SharePoint component"
  | "iframe/embed"
  | "parsing bug"
  | "fetch failure"
  | "unknown";

type BlockDiagnostic = {
  selector: string;
  count: number;
  nonEmptyCount: number;
  totalTextLength: number;
  maxTextLength: number;
  richLabelHits: number;
  containsDoctorName: boolean;
  preview: string | null;
};

type AnalysisRecord = {
  departmentId: string;
  doctorName: string;
  profileUrl: string | null;
  profileHtmlSize: number;
  titleTag: string | null;
  h1Values: string[];
  h2Values: string[];
  visibleTextLength: number;
  extractedRawProfileTextLength: number;
  contentBlocksDetected: BlockDiagnostic[];
  extractionStrategyUsed: string;
  failureReasonGuess: string;
  category: Category;
  automaticallyRecoverable: boolean;
  recoveryHint: string | null;
  htmlPatterns: string[];
};

function isElement(value: unknown): value is Element {
  return Boolean(value && typeof value === "object" && "tagName" in value);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function cleanText(value: string) {
  return normalizeText(value).replace(/\s+/g, " ").trim();
}

function doctorNameTokens(name: string) {
  return normalizeWhitespace(name)
    .replace(/^(?:פרופ['׳]?|פרופסור|ד["״']?ר|ד״ר)\s*/u, "")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function containsDoctorName(text: string, doctorName: string) {
  const normalized = normalizeWhitespace(text);
  const tokens = doctorNameTokens(doctorName);
  return tokens.length > 0 && tokens.every((token) => normalized.includes(token));
}

function richLabelHits(text: string) {
  return RICH_PROFILE_LABELS.filter((label) => text.includes(label)).length;
}

function textForElement($: CheerioAPI, element: Element, removeHidden: boolean) {
  const clone = $(element).clone();
  clone.find("script,style,noscript,template,svg,nav,header,footer").remove();
  if (removeHidden) {
    clone
      .find(
        "[hidden],[aria-hidden='true'],[style*='display:none'],[style*='display: none'],[style*='visibility:hidden'],[style*='visibility: hidden'],.ms-hide,.hidden"
      )
      .remove();
  }
  clone.find("br").replaceWith("\n");
  return cleanText(clone.text());
}

function selectorDiagnostic($: CheerioAPI, selector: string, doctorName: string): BlockDiagnostic {
  const elements = $(selector)
    .toArray()
    .filter((element): element is Element => isElement(element));
  const texts = elements.map((element) => textForElement($, element, true)).filter(Boolean);
  const longest = [...texts].sort((left, right) => right.length - left.length)[0] ?? "";
  const allText = unique(texts).join("\n");

  return {
    selector,
    count: elements.length,
    nonEmptyCount: texts.length,
    totalTextLength: allText.length,
    maxTextLength: longest.length,
    richLabelHits: richLabelHits(allText),
    containsDoctorName: containsDoctorName(allText, doctorName),
    preview: longest ? longest.slice(0, 280) : null
  };
}

function textValues($: CheerioAPI, selector: string) {
  return unique(
    $(selector)
      .toArray()
      .filter((element): element is Element => isElement(element))
      .map((element) => cleanText($(element).text()))
  );
}

function bodyVisibleText($: CheerioAPI) {
  const body = $("body").first();
  if (!body.length) return "";
  const clone = body.clone();
  clone
    .find(
      "script,style,noscript,template,svg,[hidden],[aria-hidden='true'],[style*='display:none'],[style*='display: none'],[style*='visibility:hidden'],[style*='visibility: hidden'],.ms-hide,.hidden"
    )
    .remove();
  return cleanText(clone.text());
}

function hiddenText($: CheerioAPI) {
  return cleanText(
    $(
      "[hidden],[aria-hidden='true'],[style*='display:none'],[style*='display: none'],[style*='visibility:hidden'],[style*='visibility: hidden'],.ms-hide,.hidden"
    )
      .toArray()
      .filter((element): element is Element => isElement(element))
      .map((element) => textForElement($, element, false))
      .join("\n")
  );
}

function classify(input: {
  htmlExists: boolean;
  htmlSize: number;
  title: string;
  extractedLength: number;
  visibleText: string;
  currentText: string;
  hiddenProfileText: string;
  scriptText: string;
  iframeUrls: string[];
  blocks: BlockDiagnostic[];
  doctorName: string;
}) {
  const patterns: string[] = [];
  const currentBlock = input.blocks.find((block) => block.selector === ".doctor-box-info");
  const rteBlock = input.blocks.find((block) => block.selector === ".ms-rtestate-field");
  const currentBlocksPresent = Boolean(
    (currentBlock?.nonEmptyCount ?? 0) > 0 || (rteBlock?.nonEmptyCount ?? 0) > 0
  );
  const bodyProfileLabels = richLabelHits(input.visibleText);
  const hiddenProfileLabels = richLabelHits(input.hiddenProfileText);
  const scriptProfileLabels = richLabelHits(input.scriptText);
  const knownOmittedRichBlock = input.blocks.find(
    (block) =>
      OMITTED_KNOWN_PROFILE_SELECTORS.includes(block.selector) &&
      block.maxTextLength >= 120 &&
      block.richLabelHits >= 2 &&
      block.containsDoctorName
  );
  const otherRichBlock = input.blocks.find(
    (block) =>
      !CURRENT_SELECTORS.includes(block.selector) &&
      block.maxTextLength >= 160 &&
      block.richLabelHits >= 2 &&
      block.containsDoctorName
  );
  const onlyNameAndUnit =
    input.extractedLength < 100 &&
    containsDoctorName(input.currentText, input.doctorName) &&
    richLabelHits(input.currentText) === 0 &&
    /(?:שם|יחידה)\s*:/u.test(input.currentText);

  if (!input.htmlExists) patterns.push("raw-html-missing");
  if (input.htmlSize > 0 && input.htmlSize < 2_000) patterns.push("small-html-response");
  if (/404|not found|access denied|שגיאה|הדף אינו קיים/i.test(input.title)) patterns.push("error-page-title");
  if (currentBlock?.nonEmptyCount) patterns.push("doctor-box-info-present");
  else patterns.push("doctor-box-info-absent");
  if (currentBlock && currentBlock.maxTextLength < 100) patterns.push("doctor-box-info-short");
  if (rteBlock?.nonEmptyCount) patterns.push("ms-rtestate-field-present");
  else patterns.push("ms-rtestate-field-absent");
  if ((input.blocks.find((block) => block.selector === ".doctor-page-content")?.nonEmptyCount ?? 0) > 0) {
    patterns.push("doctor-page-content-present");
  }
  if ((input.blocks.find((block) => block.selector === "#DeltaPlaceHolderMain")?.nonEmptyCount ?? 0) > 0) {
    patterns.push("sharepoint-delta-main-present");
  }
  if (input.iframeUrls.length > 0) patterns.push("iframe-present");
  if (hiddenProfileLabels >= 2 || scriptProfileLabels >= 2) patterns.push("hidden-profile-labels");
  if (knownOmittedRichBlock || otherRichBlock) patterns.push("alternate-rich-profile-block");
  if (currentBlocksPresent) patterns.push("selected-blocks-suppressed-body-fallback");
  else patterns.push("body-fallback-used");
  if (containsDoctorName(input.title, input.doctorName)) patterns.push("title-matches-doctor");
  if (onlyNameAndUnit) patterns.push("name-and-unit-only");

  if (
    !input.htmlExists ||
    input.htmlSize === 0 ||
    input.htmlSize < 2_000 ||
    /404|not found|access denied|שגיאה|הדף אינו קיים/i.test(input.title)
  ) {
    return {
      category: "fetch failure" as Category,
      reason: "The saved response is missing, truncated, or appears to be an HTTP/error shell rather than a doctor profile.",
      recoverable: true,
      recoveryHint: "Retry fetch with response diagnostics and browser fallback.",
      patterns
    };
  }

  if (input.iframeUrls.length > 0 && input.extractedLength < 100) {
    return {
      category: "iframe/embed" as Category,
      reason: "The profile shell is short and embeds one or more iframe sources that the current parser does not inspect.",
      recoverable: true,
      recoveryHint: "Fetch and parse same-domain iframe content.",
      patterns
    };
  }

  if (input.currentText.length >= 100 && input.extractedLength < 100) {
    return {
      category: "parsing bug" as Category,
      reason: "Current selector blocks contain useful text, but the stored rawProfileText is shorter than the same blocks now produce.",
      recoverable: true,
      recoveryHint: "Correct current-selector normalization/join behavior.",
      patterns
    };
  }

  if (knownOmittedRichBlock) {
    return {
      category: "parsing bug" as Category,
      reason: `Useful profile text exists in ${knownOmittedRichBlock.selector}, but profileMainText does not include that selector.`,
      recoverable: true,
      recoveryHint: `Add ${knownOmittedRichBlock.selector} to profileMainText candidate selectors.`,
      patterns
    };
  }

  if (otherRichBlock) {
    return {
      category: "profile content in different HTML structure" as Category,
      reason: `Profile-specific text exists in ${otherRichBlock.selector}, outside the current extraction structure.`,
      recoverable: true,
      recoveryHint: `Add a structure-specific selector/fallback for ${otherRichBlock.selector}.`,
      patterns
    };
  }

  if ((hiddenProfileLabels >= 2 || scriptProfileLabels >= 2) && bodyProfileLabels < 2) {
    return {
      category: "content hidden in SharePoint component" as Category,
      reason: "Profile labels exist in hidden DOM or SharePoint script payloads but are absent from useful visible content.",
      recoverable: true,
      recoveryHint: "Decode the SharePoint component payload or render the component before parsing.",
      patterns
    };
  }

  if (
    input.extractedLength < 100 &&
    !knownOmittedRichBlock &&
    !otherRichBlock &&
    hiddenProfileLabels < 2 &&
    scriptProfileLabels < 2 &&
    (onlyNameAndUnit || bodyProfileLabels < 2)
  ) {
    return {
      category: "truly empty profile page" as Category,
      reason: "The public profile contains only a name/unit shell or similarly minimal content; no richer profile evidence was found in visible, hidden, or embedded structures.",
      recoverable: false,
      recoveryHint: null,
      patterns
    };
  }

  return {
    category: "unknown" as Category,
    reason: "The page is non-empty, but local HTML evidence does not identify a reliable alternate extraction path.",
    recoverable: false,
    recoveryHint: "Manual DOM inspection required before changing extraction.",
    patterns
  };
}

async function analyzeRecord(departmentId: string, doctor: EnrichedDoctorRecord): Promise<AnalysisRecord> {
  const profileUrl = doctor.profileUrl ?? doctor.profile.sourceUrl ?? null;
  const htmlPath = profileUrl
    ? path.join(ROOT, "data", "crawler", "output", departmentId, "raw", "profiles", `${safeSlugFromValue(profileUrl)}.html`)
    : null;
  let html = "";
  let htmlExists = false;

  if (htmlPath) {
    try {
      html = await fs.readFile(htmlPath, "utf8");
      htmlExists = true;
    } catch {
      htmlExists = false;
    }
  }

  const $ = load(html || "<html><body></body></html>");
  const titleTag = cleanText($("title").first().text()) || null;
  const h1Values = textValues($, "h1");
  const h2Values = textValues($, "h2");
  const visibleText = bodyVisibleText($);
  const hiddenProfileText = hiddenText($);
  const scriptText = cleanText($("script").text());
  const iframeUrls = unique(
    $("iframe")
      .toArray()
      .filter((element): element is Element => isElement(element))
      .map((element) => $(element).attr("src") ?? "")
  );
  const blocks = CONTENT_SELECTORS.map((selector) => selectorDiagnostic($, selector, doctor.fullName)).filter(
    (block) => block.count > 0
  );
  const currentText = unique(
    CURRENT_SELECTORS.flatMap((selector) =>
      $(selector)
        .toArray()
        .filter((element): element is Element => isElement(element))
        .map((element) => textForElement($, element, true))
    )
  ).join("\n");
  const currentBlocksPresent = currentText.length > 0;
  const classification = classify({
    htmlExists,
    htmlSize: Buffer.byteLength(html),
    title: titleTag ?? "",
    extractedLength: doctor.profile.rawProfileText.length,
    visibleText,
    currentText,
    hiddenProfileText,
    scriptText,
    iframeUrls,
    blocks,
    doctorName: doctor.fullName
  });

  return {
    departmentId,
    doctorName: doctor.fullName,
    profileUrl,
    profileHtmlSize: Buffer.byteLength(html),
    titleTag,
    h1Values,
    h2Values,
    visibleTextLength: visibleText.length,
    extractedRawProfileTextLength: doctor.profile.rawProfileText.length,
    contentBlocksDetected: blocks,
    extractionStrategyUsed: currentBlocksPresent
      ? "Joined non-empty .doctor-box-info and .ms-rtestate-field blocks; body fallback suppressed."
      : "No current selector blocks found; used normalized body text fallback.",
    failureReasonGuess: classification.reason,
    category: classification.category,
    automaticallyRecoverable: classification.recoverable,
    recoveryHint: classification.recoveryHint,
    htmlPatterns: unique(classification.patterns)
  };
}

async function main() {
  const configs = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as ClalitDepartmentConfig[];
  const records: AnalysisRecord[] = [];

  for (const config of configs) {
    const enrichedPath = path.join(ROOT, "data", "crawler", "output", config.id, "doctors-enriched.json");
    let enriched: EnrichedDoctorRecord[];
    try {
      enriched = JSON.parse(await fs.readFile(enrichedPath, "utf8")) as EnrichedDoctorRecord[];
    } catch {
      continue;
    }

    for (const doctor of enriched) {
      if (doctor.profileCompleteness !== "listOnly" && !doctor.qaFlags.includes("missingRawProfileText")) continue;
      records.push(await analyzeRecord(config.id, doctor));
    }
  }

  const countByCategory = records.reduce<Record<Category, number>>(
    (counts, record) => {
      counts[record.category] += 1;
      return counts;
    },
    {
      "truly empty profile page": 0,
      "profile content in different HTML structure": 0,
      "content hidden in SharePoint component": 0,
      "iframe/embed": 0,
      "parsing bug": 0,
      "fetch failure": 0,
      unknown: 0
    }
  );
  const patternCounts = records
    .flatMap((record) => record.htmlPatterns)
    .reduce<Record<string, number>>((counts, pattern) => {
      counts[pattern] = (counts[pattern] ?? 0) + 1;
      return counts;
    }, {});
  const topRecurringHtmlPatterns = Object.entries(patternCounts)
    .map(([pattern, count]) => ({ pattern, count, percent: Number(((count / records.length) * 100).toFixed(1)) }))
    .sort((left, right) => right.count - left.count || left.pattern.localeCompare(right.pattern));
  const automaticallyRecoverableCount = records.filter((record) => record.automaticallyRecoverable).length;

  const report = {
    generatedAt: new Date().toISOString(),
    sourceFlag: "profileCompleteness=listOnly (legacy fallback: missingRawProfileText)",
    currentFlagRule: "normalized rawProfileText is empty or shorter than 100 characters",
    methodology: {
      scope: "Local Clalit/Rabin HTML snapshots only; no network requests or extraction changes.",
      currentExtraction: "Join .doctor-box-info and .ms-rtestate-field; fall back to body text only when both are empty.",
      recoverabilityRule:
        "Recoverable when richer profile evidence is present in an omitted visible block, hidden SharePoint payload, iframe, retryable response, or demonstrable parser mismatch."
    },
    summary: {
      flaggedDoctors: records.length,
      countByCategory,
      automaticallyRecoverableCount,
      automaticallyRecoverablePercent: Number(((automaticallyRecoverableCount / Math.max(records.length, 1)) * 100).toFixed(1)),
      notAutomaticallyRecoverableCount: records.length - automaticallyRecoverableCount,
      topRecurringHtmlPatterns
    },
    records
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        outputPath: path.relative(ROOT, OUTPUT_PATH),
        flaggedDoctors: records.length,
        countByCategory,
        automaticallyRecoverableCount,
        automaticallyRecoverablePercent: report.summary.automaticallyRecoverablePercent,
        topRecurringHtmlPatterns: topRecurringHtmlPatterns.slice(0, 12)
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
