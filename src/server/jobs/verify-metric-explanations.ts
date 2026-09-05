import assert from "node:assert/strict";
import {
  canManageMetricExplanations,
  resolveMetricExplanation,
  type MetricExplanationOverrideRecord
} from "@/lib/metric-explanations";

const context = { specialtyId: "dermatology", departmentId: "dermatology-a" };
const overrides: MetricExplanationOverrideRecord[] = [
  {
    id: "global",
    metricKey: "relativeDemandIndex",
    scopeType: "GLOBAL",
    scopeKey: "GLOBAL",
    specialtyId: null,
    departmentId: null,
    text: "B"
  },
  {
    id: "specialty",
    metricKey: "relativeDemandIndex",
    scopeType: "SPECIALTY",
    scopeKey: "dermatology",
    specialtyId: "dermatology",
    departmentId: null,
    text: "C"
  },
  {
    id: "department",
    metricKey: "relativeDemandIndex",
    scopeType: "DEPARTMENT",
    scopeKey: "dermatology-a",
    specialtyId: "dermatology",
    departmentId: "dermatology-a",
    text: "D"
  }
];

assert.equal(resolveMetricExplanation("relativeDemandIndex", context, [], "A").text, "A");
assert.equal(resolveMetricExplanation("relativeDemandIndex", context, overrides.slice(0, 1), "A").text, "B");
assert.equal(resolveMetricExplanation("relativeDemandIndex", context, overrides.slice(0, 2), "A").text, "C");
assert.equal(resolveMetricExplanation("relativeDemandIndex", context, overrides, "A").text, "D");
assert.equal(resolveMetricExplanation("relativeDemandIndex", context, overrides.slice(0, 2), "A").text, "C");
assert.equal(resolveMetricExplanation("relativeDemandIndex", context, overrides.slice(0, 1), "A").text, "B");
assert.equal(resolveMetricExplanation("relativeDemandIndex", context, [], "A").text, "A");
assert.equal(
  resolveMetricExplanation(
    "relativeDemandIndex",
    { specialtyId: "pediatrics", departmentId: "pediatrics-a" },
    overrides,
    "A"
  ).text,
  "B",
  "specialty override must not leak"
);
assert.equal(
  resolveMetricExplanation(
    "relativeDemandIndex",
    { specialtyId: "dermatology", departmentId: "dermatology-b" },
    overrides,
    "A"
  ).text,
  "C",
  "department override must not leak"
);
assert.equal(canManageMetricExplanations(null), false);
assert.equal(canManageMetricExplanations({ role: "student" }), false);
assert.equal(canManageMetricExplanations({ role: "admin" }), true);

console.log(JSON.stringify({ status: "PASS", checks: 10 }));
