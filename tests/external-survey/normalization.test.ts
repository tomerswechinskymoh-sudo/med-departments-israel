import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { parseShifts, parseHours, parseSalary, parseLikert, tipRiskFlags, type Normalized } from "../../src/lib/external-survey/parse";
import { mapValue, type Catalog } from "../../src/lib/external-survey/mapping";
import { aggregateRows, canReadSurvey, publicationStatus } from "../../src/lib/external-survey/aggregate";
import { publicMetric } from "../../src/lib/external-survey/presentation";
import { readWorkbook, normalizeRows, safeReport } from "../../src/server/external-survey/workbook";
import { seal, unseal } from "../../src/server/external-survey/crypto";
import { withoutRaw, stableJson } from "../../src/server/external-survey/importer";

test("shifts: exact, ranges, calculated midpoint and half shifts retain semantics", () => {
  assert.equal(parseShifts("5").estimate, 5);
  assert.equal(parseShifts("5-6").estimate, 5.5);
  assert.equal(parseShifts("4 עד 6").estimate, 5);
  assert.equal(parseShifts("5-6").calculated, true);
  assert.deepEqual([parseShifts("6 מלאות + 2 חצי").min, parseShifts("6 מלאות + 2 חצי").max, parseShifts("6 מלאות + 2 חצי").estimate, parseShifts("6 מלאות + 2 חצי").parseStatus], [6, 8, 7, "PARTIAL_EQUIVALENT"]);
  assert.equal(parseShifts("0").estimate, 0);
  for (const value of [null, "", "משתנה", "0 (ברוטציות עד 4)", "5-3", "100"]) assert.equal(parseShifts(value).estimate, null);
});
test("hours: only clear daytime intervals contribute; ambiguous clock does not", () => {
  for (const value of ["8-16", "08:00-16:00", "7:30-15:30", "0730-1530"]) assert.equal(parseHours(value).estimate, 8);
  for (const value of ["8 עד 4", "8-16/17", "8-16 אבל גמיש", "15:00", "36 שעות בשבוע", "27:00-28:00", "16:00-18:00", null]) assert.equal(parseHours(value).estimate, null);
});
test("salary: units and gross/net are explicit, unknown units remain missing", () => {
  assert.equal(parseSalary("18000", 2024).estimate, 18000);
  assert.equal(parseSalary("22k", 2024).estimate, 22000);
  assert.equal(parseSalary("22-23k", 2024).estimate, 22500);
  assert.equal(parseSalary("18", 2024).estimate, null);
  assert.equal(parseSalary("נטו 19,000", 2024).basis, "NET");
  assert.equal(parseSalary("14000 נטו", 2024).estimate, 14000);
  assert.equal(parseSalary("22000. נטו 13במקרה הטוב.", 2024).estimate, null);
  assert.equal(parseSalary("נטו 18 לא זוכרת ברוטו", 2024).basis, "UNKNOWN");
  assert.equal(parseSalary("25,000-27,0000", 2024).estimate, null);
  assert.equal(parseSalary("18", 2024).reportYear, 2024);
});
test("Likert values preserve 1–5 direction and reject out-of-range/missing", () => {
  assert.equal(parseLikert("1 - זוועה").estimate, 1);
  assert.equal(parseLikert("5 - חלום").estimate, 5);
  for (const value of ["0", "6", "", null, "3.5"]) assert.equal(parseLikert(value).estimate, null);
});
test("PII triage never approves a tip, even if no heuristic matches", () => {
  assert.deepEqual(tipRiskFlags(""), []);
  assert.deepEqual(tipRiskFlags("טיפ כללי"), ["HUMAN_REVIEW_REQUIRED"]);
  assert.ok(tipRiskFlags("מטופל, מנהל המחלקה").includes("POSSIBLE_PATIENT_INFORMATION"));
});
test("encrypted raw rows are authenticated and bound to their source fingerprint", () => {
  process.env.EXTERNAL_SURVEY_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  const original = { text: " טקסט מקורי\nללא שינוי ", values: ["a", "b"] }, encrypted = seal(original, "source:hash");
  assert.deepEqual(unseal(encrypted, "source:hash"), original);
  assert.ok(!encrypted.includes(original.text));
  assert.throws(() => unseal(encrypted, "other:hash"));
  assert.throws(() => unseal(encrypted.slice(0, -4) + "ABCD", "source:hash"));
});
test("publication requires rights and current human review; local slices never publish", () => {
  const input = { respondentCount: 10, value: 3, institutionId: null, rights: "DOCUMENTED", datasetHash: "current", privacyReviewHash: "current", evidence: { reference: "review" } };
  assert.equal(publicationStatus(input), "PUBLISHED");
  assert.equal(publicationStatus({ ...input, respondentCount: 9 }), "SUPPRESSED");
  assert.equal(publicationStatus({ ...input, rights: "PENDING_PUBLICATION_RIGHTS" }), "PENDING_PUBLICATION_RIGHTS");
  assert.equal(publicationStatus({ ...input, privacyReviewHash: "stale" }), "PENDING_PRIVACY_REVIEW");
  assert.equal(publicationStatus({ ...input, institutionId: "hospital" }), "PENDING_PRIVACY_REVIEW");
  assert.equal(publicationStatus({ ...input, evidence: null }), "PENDING_PRIVACY_REVIEW");
});
test("the existing verified-user rule is preserved", () => {
  assert.equal(canReadSurvey(null), false);
  assert.equal(canReadSurvey({ role: "resident", emailVerified: true, verificationStatus: "PENDING_PROOF" }), false);
  assert.equal(canReadSurvey({ role: "student", emailVerified: false, verificationStatus: "VERIFIED" }), false);
  assert.equal(canReadSurvey({ role: "resident", emailVerified: true, verificationStatus: "VERIFIED" }), true);
  assert.equal(canReadSurvey({ role: "admin", emailVerified: false, verificationStatus: "PENDING_PROOF" }), true);
});
test("public DTO rejects suppressed groups and contains only allowlisted aggregate fields", () => {
  const row = { metricKey: "peers", respondentCount: 10, value: 3.33333, method: "MEAN", calculatedCount: 0, periodStartYear: 2024, periodEndYear: 2024, status: "PUBLISHED", institutionId: null, datasetHash: "hash", privacyReviewHash: "hash", rawEncrypted: "secret", gender: "secret", reportedAt: "secret", approvedTip: "secret" };
  assert.deepEqual(publicMetric(row, "hash"), { key: "peers", respondents: 10, value: 3.3, method: "MEAN", calculated: false, startYear: 2024, endYear: 2024 });
  assert.equal(publicMetric({ ...row, respondentCount: 9 }, "hash"), null);
  assert.equal(publicMetric({ ...row, metricKey: "salary" }, "hash"), null);
  assert.equal(publicMetric(row, "other"), null);
  assert.equal(publicMetric({ ...row, status: "PENDING_PUBLICATION_RIGHTS" }, "hash"), null);
});
const source = process.env.SURVEY_SOURCE_PATH, catalogPath = process.env.SURVEY_CATALOG_PATH;
test("real source: 365 rows, 28 specialties, 88 authentic tips, exact preservation and dates", { skip: !source || !catalogPath }, async () => {
  const { rows, fileHash } = await readWorkbook(source!);
  const catalog: Catalog = JSON.parse(await readFile(catalogPath!, "utf8"));
  const normalized = normalizeRows(rows, catalog), report = safeReport(normalized);
  assert.equal(rows.length, 365); assert.equal(report.distinctSpecialties, 28); assert.equal(report.matchedSpecialties, 26); assert.equal(report.comments, 88);
  assert.equal(report.distinctInstitutionValues, 105); assert.equal(report.exactDuplicateRows, 0); assert.equal(report.reportMonths["2024-08"], 350);
  assert.equal(fileHash, "ef103a6fb9dc048b41db5713513bb624b5a96cbedb8a86b64304e0d8adb30424");
  for (const row of normalized) {
    assert.equal(row.tip, row.values[11]);
    assert.ok(!("departmentId" in row));
    assert.equal(row.normalized.scale.direction, "HIGHER_IS_BETTER");
    assert.ok(Object.values(withoutRaw(row.normalized)).every(v => !("rawValue" in v) || v.rawValue === null));
  }
  assert.notEqual(mapValue("SPECIALTY", "פסיכיאטריה של המבוגר", catalog).targetId, mapValue("SPECIALTY", "פסיכיאטריה ילד ומתבגר", catalog).targetId);
  for (const value of ["הדסה", "אסותא", "ירושלים", "ממשלתי", "ציבורי", "רבין", "שייא"]) assert.equal(mapValue("INSTITUTION", value, catalog).targetId, null);
  for (const [a, b] of [["שיבא", "תל השומר"], ["רמבם", 'רמב"ם'], ["נהריה", "המרכז הרפואי לגליל"], ["אסף הרופא", "שמיר"], ["בילינסון", "בלינסון"]]) assert.equal(mapValue("INSTITUTION", a, catalog).targetId, mapValue("INSTITUTION", b, catalog).targetId);
  assert.equal(mapValue("INSTITUTION", "כללית", catalog).category, "HMO");
  const aggregates = aggregateRows(normalized.map(r => ({ specialtyId: r.specialty.targetId, institutionId: r.institution.targetId, reportYear: r.reportedAt?.getUTCFullYear() ?? null, normalized: r.normalized })));
  assert.equal(new Set(aggregates.filter(a => !a.institutionId && a.value !== null).map(a => a.groupKey)).size, 11);
  assert.equal(aggregates.filter(a => !a.institutionId && a.value !== null).length, 57);
  assert.ok(aggregates.every(a => a.respondentCount >= 10 || a.value === null));
  const one = normalized[0].normalized;
  const sparse = Array.from({ length: 10 }, (_, i) => ({ specialtyId: "same-specialty", institutionId: null, reportYear: 2024, normalized: { ...one, shifts: parseShifts(i === 0 ? null : "5"), hours: parseHours("8-16"), peers: parseLikert("4") } as Normalized }));
  const group = aggregateRows(sparse);
  assert.equal(group.find(m => m.metricKey === "shifts")?.value, null);
  assert.equal(group.find(m => m.metricKey === "peers")?.respondentCount, 10);
});
test("idempotency compares canonical JSON, independent of PostgreSQL property order", () => {
  assert.equal(stableJson({ b: [2, { z: 1, a: 2 }], a: 1 }), stableJson({ a: 1, b: [2, { a: 2, z: 1 }] }));
});
test("survey boundary preserves moderation, auth, questionnaire, metric calculations and comparison layout", () => {
  // Review form accessibility and public source projection are intentionally changed by
  // the 2026-11-10 task; their behavior is covered in tests/privacy-sources.
  const files = [ "src/components/departments/department-experience-tabs.tsx", "src/app/api/reviews/route.ts", "src/app/api/admin/reviews/[reviewId]/route.ts", "src/lib/auth.ts", "src/app/compare/page.tsx", "src/lib/specialty-metrics.ts", "src/lib/career-fit/evidence/scoring.ts", "src/lib/career-fit/evidence/model.ts", "src/components/career-fit/evidence-questionnaire.tsx"];
  for (const file of files) {
    const original = execFileSync("git", ["show", `d55f195b6efa7370bb5ab27f3d500f33355e05a2:${file}`]);
    const current = execFileSync("git", ["hash-object", file], { encoding: "utf8" }).trim();
    const oldHash = execFileSync("git", ["hash-object", "--stdin"], { input: original, encoding: "utf8" }).trim();
    assert.equal(current, oldHash, file);
  }
});
