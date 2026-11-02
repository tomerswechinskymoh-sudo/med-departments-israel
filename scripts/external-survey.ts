/** Trusted operator CLI. No HTTP upload/import endpoint exists. */
import { parseArgs } from "node:util";
import { readFile, writeFile, realpath, mkdir } from "node:fs/promises";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { readWorkbook, normalizeRows, safeReport, SOURCE_ID, hash } from "@/server/external-survey/workbook";
import { readCatalog, importSurvey, rebuildAggregates, manualMappings } from "@/server/external-survey/importer";
import { unseal } from "@/server/external-survey/crypto";
import { aggregateRows, publicationStatus, MIN_RESPONDENTS } from "@/lib/external-survey/aggregate";
import type { Catalog, Mapping } from "@/lib/external-survey/mapping";
const { positionals, values: options } = parseArgs({ allowPositionals: true, options: { file: { type: "string" }, out: { type: "string" }, catalog: { type: "string" }, reviewer: { type: "string" } } });
const command = positionals[0];
const db = new PrismaClient({ log: [] });
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
function required(value: string | undefined, label: string) { if (!value) throw new Error(`${label} is required`); return value; }
async function privateWrite(value: unknown) {
  const output = path.resolve(required(options.out, "--out"));
  await mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
  const dir = await realpath(path.dirname(output)), root = await realpath(process.cwd());
  if (dir === root || dir.startsWith(root + path.sep) || dir.split(path.sep).includes("public")) throw new Error("Private exports must be outside the project and all public directories");
  // wx refuses symlink/file overwrite. A report cannot clobber an existing file.
  await writeFile(output, JSON.stringify(value, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ privateReportWritten: true }));
}
async function reviewer() {
  const id = required(options.reviewer, "--reviewer (existing admin user ID)");
  const user = await db.user.findUnique({ where: { id }, select: { roleKey: true } });
  if (user?.roleKey !== "ADMIN") throw new Error("Reviewer must be an existing site administrator");
  return id;
}
async function decision() {
  const reviewerId = await reviewer();
  const bytes = await readFile(required(options.file, "--file (documented human decision JSON)"));
  const data = JSON.parse(bytes.toString());
  if (data.sourceId !== SOURCE_ID || typeof data.evidenceReference !== "string" || data.evidenceReference.trim().length < 8) throw new Error("A source-specific evidence reference is required");
  const evidence = { reviewerId, reviewedAt: new Date().toISOString(), documentSha256: hash(bytes), reference: data.evidenceReference };
  await db.auditLog.create({ data: { actorUserId: reviewerId, action: `external_survey.${command}.requested`, entityType: "ExternalSurveySource", entityId: SOURCE_ID, metadata: json({ documentSha256: evidence.documentSha256 }) } });
  return { data, evidence };
}
async function locked<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(async tx => { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${SOURCE_ID}))`; return fn(tx); }, { timeout: 120000 });
}
async function main() {
  if (command === "validate" || command === "dry-run" || command === "import") {
    const workbook = await readWorkbook(required(options.file, "--file"));
    if (command === "validate") {
      console.log(JSON.stringify({ valid: true, rows: workbook.rows.length, fileHash: workbook.fileHash, columns: 12, invalidDates: workbook.rows.filter(r => !r.reportedAt).length })); return;
    }
    if (command === "import" && options.catalog) throw new Error("Import requires the live canonical database catalog");
    const catalog: Catalog = options.catalog ? JSON.parse(await readFile(options.catalog, "utf8")) : await readCatalog(db);
    const overrides = options.catalog ? [] : command === "import" ? await manualMappings(db) : [];
    const rows = normalizeRows(workbook.rows, catalog, overrides);
    if (command === "import") console.log(JSON.stringify(await importSurvey(db, rows, workbook.fileHash)));
    else {
      const aggregates = aggregateRows(rows.map(r => ({ specialtyId: r.specialty.targetId, institutionId: r.institution.targetId, reportYear: r.reportedAt?.getUTCFullYear() ?? null, normalized: r.normalized })));
      const report = { ...safeReport(rows), nationalGroupsAtThreshold: new Set(aggregates.filter(a => !a.institutionId && a.value !== null).map(a => a.groupKey)).size, institutionGroupsAtThreshold: new Set(aggregates.filter(a => a.institutionId && a.value !== null).map(a => a.groupKey)).size, nationalMetricsAtThreshold: aggregates.filter(a => !a.institutionId && a.value !== null).length };
      console.log(JSON.stringify(report));
      if (options.out) await privateWrite({ report, mappings: [...new Map(rows.flatMap(r => [r.specialty, r.institution]).map(m => [`${m.kind}:${m.rawValue}`, m])).values()], aggregates, issues: rows.filter(r => !r.specialty.targetId || !r.institution.targetId || [r.normalized.salary, r.normalized.hours, r.normalized.shifts].some(v => ["AMBIGUOUS", "INVALID"].includes(v.parseStatus))).map(r => ({ sourceRow: r.row, specialtyStatus: r.specialty.matchStatus, institutionStatus: r.institution.matchStatus, hours: r.normalized.hours, shifts: r.normalized.shifts, salary: r.normalized.salary })) });
    }
  } else if (command === "aggregate") {
    console.log(JSON.stringify(await locked(rebuildAggregates)));
  } else if (command === "status") {
    const source = await db.externalSurveySource.findUniqueOrThrow({ where: { id: SOURCE_ID }, select: { datasetHash: true, aggregateRightsStatus: true, quoteRightsStatus: true } });
    const [records, tips, metrics] = await Promise.all([
      db.externalSurveyResponse.count({ where: { sourceId: SOURCE_ID } }),
      db.externalSurveyResponse.groupBy({ by: ["tipStatus"], where: { sourceId: SOURCE_ID, hasTip: true }, _count: true }),
      db.externalSurveyAggregate.groupBy({ by: ["status"], where: { sourceId: SOURCE_ID }, _count: true }),
    ]);
    console.log(JSON.stringify({ ...source, records, tips, metrics }));
  } else if (command === "review-export") {
    await reviewer();
    const source = await db.externalSurveySource.findUniqueOrThrow({ where: { id: SOURCE_ID }, select: { datasetHash: true } });
    const [mappings, responses, aggregates] = await Promise.all([
      db.externalSurveyMapping.findMany({ where: { sourceId: SOURCE_ID } }),
      db.externalSurveyResponse.findMany({ where: { sourceId: SOURCE_ID, hasTip: true }, select: { fingerprint: true, rawEncrypted: true, tipStatus: true, tipRiskFlags: true } }),
      db.externalSurveyAggregate.findMany({ where: { sourceId: SOURCE_ID } }),
    ]);
    await privateWrite({ sourceId: SOURCE_ID, datasetHash: source.datasetHash, mappings, aggregates, tips: responses.map(r => ({ fingerprint: r.fingerprint, text: unseal<{ values: string[] }>(r.rawEncrypted, `${SOURCE_ID}:${r.fingerprint}`).values[11], status: r.tipStatus, riskFlags: r.tipRiskFlags })) });
  } else if (command === "review-mapping") {
    const { data, evidence } = await decision();
    if (!["SPECIALTY", "INSTITUTION"].includes(data.kind) || typeof data.rawValue !== "string") throw new Error("Invalid mapping kind/value");
    const catalog = await readCatalog(db);
    const target = (data.kind === "SPECIALTY" ? catalog.specialties : catalog.institutions).find(i => i.id === data.targetId);
    if (!target || typeof data.rationale !== "string" || data.rationale.length < 12) throw new Error("Existing canonical ID and documented rationale required");
    await locked(async tx => {
      await tx.externalSurveyMapping.update({ where: { sourceId_kind_rawValue: { sourceId: SOURCE_ID, kind: data.kind, rawValue: data.rawValue } }, data: { targetId: target.id, category: "type" in target && typeof target.type === "string" ? target.type : "SPECIALTY", confidence: 1, matchStatus: "MANUALLY_MATCHED", rationale: data.rationale, reviewEvidence: json(evidence) } });
      // A changed mapping must be applied by re-import before publication.
      await tx.externalSurveyAggregate.updateMany({ where: { sourceId: SOURCE_ID }, data: { status: "PENDING_PRIVACY_REVIEW", privacyReviewHash: null, privacyEvidence: Prisma.DbNull } });
    });
    console.log(JSON.stringify({ mappingSaved: true, reimportRequired: true }));
  } else if (command === "rights") {
    const { data, evidence } = await decision();
    if (!["AGGREGATES", "QUOTES"].includes(data.scope) || !["DOCUMENTED", "PENDING_PUBLICATION_RIGHTS"].includes(data.status)) throw new Error("Explicit scope and rights status required");
    if (data.status === "DOCUMENTED" && (data.authorizedBySurveyController !== true || data.permitsHitmachutPublication !== true)) throw new Error("Documented controller authorization for this site is required");
    await locked(async tx => {
      await tx.externalSurveySource.update({ where: { id: SOURCE_ID }, data: data.scope === "AGGREGATES" ? { aggregateRightsStatus: data.status, aggregateRightsEvidence: json(evidence) } : { quoteRightsStatus: data.status, quoteRightsEvidence: json(evidence) } });
      // Fail closed on any change; the explicit publish step rechecks every gate.
      await tx.externalSurveyAggregate.updateMany({ where: { sourceId: SOURCE_ID }, data: { status: "PENDING_PUBLICATION_RIGHTS" } });
      await tx.externalSurveyResponse.updateMany({ where: { sourceId: SOURCE_ID }, data: { status: "PENDING_PUBLICATION_RIGHTS" } });
    });
    console.log(JSON.stringify({ rightsRecorded: true, published: false }));
  } else if (command === "review-privacy") {
    const { data, evidence } = await decision();
    for (const check of ["indirectIdentificationChecked", "noDemographicSlices", "smallGroupsSuppressed", "noInstitutionComparisons", "historicalPeriodClear"]) if (data[check] !== true) throw new Error(`Human privacy review must cover ${check}`);
    if (!Array.isArray(data.groupKeys) || !data.groupKeys.length || data.groupKeys.some((k: unknown) => typeof k !== "string" || !k.startsWith("specialty:"))) throw new Error("Only explicit nationwide specialty groups are supported");
    await locked(async tx => {
      const source = await tx.externalSurveySource.findUniqueOrThrow({ where: { id: SOURCE_ID } });
      if (!source.datasetHash || data.datasetHash !== source.datasetHash) throw new Error("Privacy review is stale; review the current dataset");
      const n = await tx.externalSurveyAggregate.updateMany({ where: { sourceId: SOURCE_ID, groupKey: { in: data.groupKeys }, institutionId: null, respondentCount: { gte: MIN_RESPONDENTS }, value: { not: null } }, data: { privacyReviewHash: source.datasetHash, privacyEvidence: json({ ...evidence, checks: data }) } });
      if (!n.count) throw new Error("No eligible metrics in reviewed groups");
    });
    console.log(JSON.stringify({ privacyReviewRecorded: true, published: false }));
  } else if (command === "review-tip") {
    const { data, evidence } = await decision();
    if (!["APPROVED", "REJECTED"].includes(data.status)) throw new Error("Explicit human tip decision required");
    await locked(async tx => {
      const response = await tx.externalSurveyResponse.findUniqueOrThrow({ where: { sourceId_fingerprint: { sourceId: SOURCE_ID, fingerprint: data.fingerprint } } });
      if (!response.hasTip) throw new Error("Response has no tip");
      if (data.status === "APPROVED" && (data.personalInformationChecked !== true || data.patientInformationChecked !== true || data.personalAllegationsChecked !== true || data.indirectIdentificationChecked !== true || data.individualQuotePermissionVerified !== true || typeof data.individualPermissionReference !== "string" || data.individualPermissionReference.trim().length < 8)) throw new Error("Human content review and individual quotation permission are required");
      const original = unseal<{ values: string[] }>(response.rawEncrypted, `${SOURCE_ID}:${response.fingerprint}`).values[11];
      if (data.status === "APPROVED" && data.exactText !== original) throw new Error("Only the exact authentic original can be approved; no generated paraphrases");
      await tx.externalSurveyResponse.update({ where: { id: response.id }, data: { tipStatus: data.status, approvedTip: data.status === "APPROVED" ? original : null, tipReviewEvidence: json({ ...evidence, individualPermissionReference: data.individualPermissionReference ?? null }), status: "PENDING_PUBLICATION_RIGHTS" } });
    });
    console.log(JSON.stringify({ tipReviewRecorded: true, published: false }));
  } else if (command === "publish") {
    const result = await locked(async tx => {
      const source = await tx.externalSurveySource.findUniqueOrThrow({ where: { id: SOURCE_ID } });
      const aggregates = await tx.externalSurveyAggregate.findMany({ where: { sourceId: SOURCE_ID } });
      const grouped = new Map<string, string[]>();
      for (const a of aggregates) {
        const status = publicationStatus({ ...a, rights: source.aggregateRightsEvidence ? source.aggregateRightsStatus : "PENDING_PUBLICATION_RIGHTS", datasetHash: source.datasetHash, evidence: a.privacyEvidence });
        grouped.set(status, [...(grouped.get(status) ?? []), a.id]);
      }
      for (const [status, ids] of grouped) await tx.externalSurveyAggregate.updateMany({ where: { id: { in: ids } }, data: { status: status as "PUBLISHED" } });
      await tx.externalSurveyResponse.updateMany({ where: { sourceId: SOURCE_ID }, data: { status: source.quoteRightsStatus === "DOCUMENTED" ? "PENDING_PRIVACY_REVIEW" : "PENDING_PUBLICATION_RIGHTS" } });
      const publishedSpecialties = [...new Set(aggregates.filter(a => grouped.get("PUBLISHED")?.includes(a.id)).map(a => a.specialtyId))];
      let publishedTips = 0;
      if (source.quoteRightsStatus === "DOCUMENTED" && source.quoteRightsEvidence) {
        const approved = await tx.externalSurveyResponse.updateMany({ where: { sourceId: SOURCE_ID, specialtyId: { in: publishedSpecialties }, tipStatus: "APPROVED", approvedTip: { not: null }, tipReviewEvidence: { not: Prisma.DbNull } }, data: { status: "PUBLISHED" } });
        publishedTips = approved.count;
      }
      return { publishedMetrics: grouped.get("PUBLISHED")?.length ?? 0, publishedTips, aggregateRightsStatus: source.aggregateRightsStatus, quoteRightsStatus: source.quoteRightsStatus };
    });
    console.log(JSON.stringify(result));
  } else throw new Error("Usage: external-survey <validate|dry-run|import|aggregate|status|review-export|review-mapping|rights|review-privacy|review-tip|publish> [--file path] [--out private-path] [--catalog path] [--reviewer admin-id]");
}
main().catch(error => {
  // Never print Prisma parameters, original survey text, connection URLs or keys.
  const message = error instanceof Prisma.PrismaClientKnownRequestError ? `Database operation failed (${error.code})` : error instanceof Error ? error.message : "Operation failed";
  console.error(message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]")); process.exitCode = 1;
}).finally(() => db.$disconnect());
