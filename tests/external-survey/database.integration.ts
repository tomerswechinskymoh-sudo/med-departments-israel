// Run only against a disposable branch. Uses the real source file, never seeds production reviews.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { readWorkbook, normalizeRows, SOURCE_ID } from "../../src/server/external-survey/workbook";
import { importSurvey, readCatalog } from "../../src/server/external-survey/importer";
import { unseal } from "../../src/server/external-survey/crypto";
async function main() {
  const host = new URL(process.env.DATABASE_URL!).hostname;
  assert.ok(process.env.SURVEY_TEST_DATABASE_HOST && host === process.env.SURVEY_TEST_DATABASE_HOST && !host.startsWith("ep-odd-pine-"), "Isolated test branch required");
  process.env.EXTERNAL_SURVEY_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  const db = new PrismaClient({ log: [] });
  try {
    const before = await baseline(db);
    const { rows, fileHash } = await readWorkbook(process.env.SURVEY_SOURCE_PATH!);
    const normalized = normalizeRows(rows, await readCatalog(db));
    const first = await importSurvey(db, normalized, fileHash);
    assert.equal(first.inserted, 365); assert.equal(first.stored, 365);
    const second = await importSurvey(db, [...normalized].reverse(), fileHash);
    assert.equal(second.inserted, 0); assert.equal(second.updated, 0); assert.equal(second.stored, 365); assert.equal(second.datasetHash, first.datasetHash);
    const stored = await db.externalSurveyResponse.findMany({ where: { sourceId: SOURCE_ID } });
    for (const row of stored) {
      const original = normalized.find(r => r.fingerprint === row.fingerprint)!;
      assert.deepEqual(unseal<{ values: string[] }>(row.rawEncrypted, `${SOURCE_ID}:${row.fingerprint}`).values, original.values);
      assert.equal(row.status, "PENDING_PUBLICATION_RIGHTS"); assert.equal(row.approvedTip, null);
      assert.equal(row.reportYear, original.reportedAt?.getUTCFullYear());
      assert.ok(!("departmentId" in row));
    }
    assert.equal(stored.filter(r => r.hasTip).length, 88);
    assert.ok(stored.filter(r => r.hasTip).every(r => r.tipStatus === "PENDING_REVIEW"));
    assert.equal(await db.externalSurveyAggregate.count({ where: { status: "PUBLISHED" } }), 0);
    const small = await db.externalSurveyAggregate.findFirstOrThrow({ where: { respondentCount: { lt: 10 } } });
    await assert.rejects(db.externalSurveyAggregate.update({ where: { id: small.id }, data: { status: "PUBLISHED", value: 5, privacyReviewHash: first.datasetHash, privacyEvidence: { testOnly: true } } }));
    const large = await db.externalSurveyAggregate.findFirstOrThrow({ where: { respondentCount: { gte: 10 }, institutionId: null, value: { not: null } } });
    await assert.rejects(db.externalSurveyAggregate.update({ where: { id: large.id }, data: { status: "PUBLISHED", privacyEvidence: { testOnly: true } } }));
    const person = stored.find(r => r.hasTip)!;
    await assert.rejects(db.externalSurveyResponse.update({ where: { id: person.id }, data: { status: "PUBLISHED" } }));
    const after = await baseline(db); assert.deepEqual(after, before);
    console.log(JSON.stringify({ passed: true, first, second, tipsPreserved: 88, published: 0, databaseConstraintsPassed: 3, baselineUnchanged: true, baseline: after }));
  } finally { await db.$disconnect(); }
}
async function baseline(db: PrismaClient) {
  const names = ['Review','ReviewSubmission','User','Department','SpecialtyMetric','SpecialtyYearlyMetric','DepartmentMetric','DepartmentYearlyMetric'];
  const result: Record<string, unknown> = {};
  for (const name of names) result[name] = await db.$queryRawUnsafe(`SELECT count(*)::int AS count, md5(string_agg(to_jsonb(r)::text, '' ORDER BY id)) AS digest FROM "${name}" r`);
  return result;
}
main().catch(e => { console.error(e instanceof assert.AssertionError ? e.message : e.code ?? e.name); process.exitCode = 1; });
