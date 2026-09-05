import assert from "node:assert/strict";
import {
  canManageMetricExplanations,
  isValidMetricSourceUrl,
  metricRichTextToPlainText,
  parseMetricRichText,
  resolveMetricContent,
  toggleMetricBoldMarkup,
  type MetricExplanationOverrideRecord
} from "@/lib/metric-explanations";

const context = { specialtyId: "dermatology", departmentId: "dermatology-a" };
const defaults = {
  title: "A-title",
  explanation: "B-explanation",
  sourceLabel: "C-source",
  sourceUrl: "https://example.org/default"
};
const overrides: MetricExplanationOverrideRecord[] = [
  {
    id: "global",
    metricKey: "relativeDemandIndex",
    scopeType: "GLOBAL",
    scopeKey: "GLOBAL",
    specialtyId: null,
    departmentId: null,
    text: null,
    title: "Global title",
    explanation: null,
    sourceLabel: null,
    sourceUrl: null
  },
  {
    id: "specialty",
    metricKey: "relativeDemandIndex",
    scopeType: "SPECIALTY",
    scopeKey: "dermatology",
    specialtyId: "dermatology",
    departmentId: null,
    text: null,
    title: null,
    explanation: "Specialty explanation",
    sourceLabel: null,
    sourceUrl: null
  },
  {
    id: "department",
    metricKey: "relativeDemandIndex",
    scopeType: "DEPARTMENT",
    scopeKey: "dermatology-a",
    specialtyId: "dermatology",
    departmentId: "dermatology-a",
    text: null,
    title: null,
    explanation: null,
    sourceLabel: "Department source",
    sourceUrl: "https://example.org/department"
  }
];

const defaultOnly = resolveMetricContent("relativeDemandIndex", context, [], defaults);
assert.deepEqual(
  [defaultOnly.title, defaultOnly.explanation, defaultOnly.sourceLabel, defaultOnly.sourceUrl],
  ["A-title", "B-explanation", "C-source", "https://example.org/default"]
);

const globalOnly = resolveMetricContent("relativeDemandIndex", context, overrides.slice(0, 1), defaults);
assert.equal(globalOnly.title, "Global title");
assert.equal(globalOnly.explanation, "B-explanation");
assert.equal(globalOnly.sourceLabel, "C-source");
assert.equal(globalOnly.provenance.title.source, "GLOBAL");
assert.equal(globalOnly.provenance.explanation.source, "DEFAULT");

const specialty = resolveMetricContent("relativeDemandIndex", context, overrides.slice(0, 2), defaults);
assert.equal(specialty.title, "Global title");
assert.equal(specialty.explanation, "Specialty explanation");
assert.equal(specialty.sourceLabel, "C-source");
assert.equal(specialty.provenance.explanation.source, "SPECIALTY");

const department = resolveMetricContent("relativeDemandIndex", context, overrides, defaults);
assert.equal(department.title, "Global title");
assert.equal(department.explanation, "Specialty explanation");
assert.equal(department.sourceLabel, "Department source");
assert.equal(department.sourceUrl, "https://example.org/department");
assert.equal(department.provenance.sourceLabel.source, "DEPARTMENT");

const resetDepartment = resolveMetricContent("relativeDemandIndex", context, overrides.slice(0, 2), defaults);
assert.equal(resetDepartment.sourceLabel, "C-source");
const resetSpecialty = resolveMetricContent("relativeDemandIndex", context, overrides.slice(0, 1), defaults);
assert.equal(resetSpecialty.explanation, "B-explanation");

const noLinkOverride: MetricExplanationOverrideRecord = {
  ...overrides[2],
  id: "department-no-link",
  sourceLabel: null,
  sourceUrl: ""
};
const withoutInheritedLink = resolveMetricContent(
  "relativeDemandIndex",
  context,
  [...overrides.slice(0, 2), noLinkOverride],
  defaults
);
assert.equal(withoutInheritedLink.sourceLabel, "C-source");
assert.equal(withoutInheritedLink.sourceUrl, null);
assert.equal(withoutInheritedLink.provenance.sourceUrl.source, "DEPARTMENT");

assert.equal(
  resolveMetricContent(
    "relativeDemandIndex",
    { specialtyId: "pediatrics", departmentId: "pediatrics-a" },
    overrides,
    defaults
  ).explanation,
  "B-explanation",
  "specialty override must not leak"
);
assert.equal(
  resolveMetricContent(
    "relativeDemandIndex",
    { specialtyId: "dermatology", departmentId: "dermatology-b" },
    overrides,
    defaults
  ).sourceLabel,
  "C-source",
  "department override must not leak"
);

assert.deepEqual(parseMetricRichText("טקסט רגיל"), [{ text: "טקסט רגיל", bold: false }]);
assert.deepEqual(parseMetricRichText("ערך **גבוה מ־1** כעת"), [
  { text: "ערך ", bold: false },
  { text: "גבוה מ־1", bold: true },
  { text: " כעת", bold: false }
]);
assert.deepEqual(parseMetricRichText("<script>alert(1)</script>"), [
  { text: "<script>alert(1)</script>", bold: false }
]);
assert.deepEqual(parseMetricRichText("מלל **לא סגור"), [{ text: "מלל **לא סגור", bold: false }]);
assert.equal(metricRichTextToPlainText("כותרת **מודגשת**"), "כותרת מודגשת");
const toggled = toggleMetricBoldMarkup("כותרת מודגשת", 6, 12);
assert.equal(toggled.value, "כותרת **מודגשת**");
assert.equal(toggleMetricBoldMarkup(toggled.value, toggled.selectionStart, toggled.selectionEnd).value, "כותרת מודגשת");

assert.equal(isValidMetricSourceUrl(null), true);
assert.equal(isValidMetricSourceUrl(""), true);
assert.equal(isValidMetricSourceUrl("https://www.health.gov.il/report"), true);
assert.equal(isValidMetricSourceUrl("http://example.org"), true);
assert.equal(isValidMetricSourceUrl("not a url"), false);
assert.equal(isValidMetricSourceUrl("javascript:alert(1)"), false);
assert.equal(isValidMetricSourceUrl("data:text/html,test"), false);
assert.equal(isValidMetricSourceUrl("https://user:secret@example.org"), false);

const legacyOverride: MetricExplanationOverrideRecord = {
  id: "legacy",
  metricKey: "relativeDemandIndex",
  scopeType: "GLOBAL",
  scopeKey: "GLOBAL",
  specialtyId: null,
  departmentId: null,
  text: "Existing production explanation",
  title: null,
  explanation: null,
  sourceLabel: null,
  sourceUrl: null
};
assert.equal(
  resolveMetricContent("relativeDemandIndex", context, [legacyOverride], defaults).explanation,
  "Existing production explanation"
);

assert.equal(canManageMetricExplanations(null), false);
assert.equal(canManageMetricExplanations({ role: "student" }), false);
assert.equal(canManageMetricExplanations({ role: "admin" }), true);

console.log(JSON.stringify({ status: "PASS", checks: 41 }));
