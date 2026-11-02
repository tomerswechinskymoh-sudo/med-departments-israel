import { Prisma, PrismaClient } from "@prisma/client";
import { aggregateRows, publicationStatus, type AggregateInput } from "@/lib/external-survey/aggregate";
import type { Mapping } from "@/lib/external-survey/mapping";
import type { Normalized } from "@/lib/external-survey/parse";
import { SOURCE_ID, SOURCE_TITLE, IMPORT_VERSION, hash, safeReport, type SurveyRow } from "./workbook";
import { seal } from "./crypto";
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export function withoutRaw(normalized: Normalized): Normalized {
  return Object.fromEntries(Object.entries(normalized).map(([key, value]) => [key, key === "scale" ? value : { ...value, rawValue: null }])) as Normalized;
}
export async function importSurvey(db: PrismaClient, rows: SurveyRow[], fileHash: string) {
  // Encrypt before opening a transaction; missing/invalid keys fail before writes.
  const uniqueRows = [...new Map(rows.map(row => [row.fingerprint, row])).values()];
  const prepared = uniqueRows.map(row => ({ row, rawEncrypted: seal({ values: row.values, normalized: row.normalized }, `${SOURCE_ID}:${row.fingerprint}`) }));
  return db.$transaction(async tx => {
    // Serialize source writes, re-aggregation and approvals using this same lock.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${SOURCE_ID}))`;
    await tx.externalSurveySource.upsert({ where: { id: SOURCE_ID }, create: { id: SOURCE_ID, title: SOURCE_TITLE, importVersion: IMPORT_VERSION }, update: { importVersion: IMPORT_VERSION } });
    const existing = await tx.externalSurveyResponse.findMany({ where: { sourceId: SOURCE_ID }, select: { fingerprint: true, specialtyId: true, institutionId: true, normalized: true } });
    const known = new Map(existing.map(r => [r.fingerprint, r]));
    const records = prepared.map(({ row, rawEncrypted }) => ({
      sourceId: SOURCE_ID, fingerprint: row.fingerprint, rawEncrypted,
      reportedAt: row.reportedAt, reportYear: row.reportedAt?.getUTCFullYear() ?? null,
      specialtyId: row.specialty.targetId, institutionId: row.institution.targetId,
      specialtyDetail: row.values[2], matchLevel: row.specialty.targetId ? row.institution.targetId ? "INSTITUTION_SPECIALTY" : "SPECIALTY" : "UNMATCHED",
      normalized: json(withoutRaw(row.normalized)), hasTip: Boolean(row.tip.trim()), tipStatus: row.tip.trim() ? "PENDING_REVIEW" : "NONE",
      tipRiskFlags: json(row.tipRiskFlags), importVersion: IMPORT_VERSION,
    }));
    const inserted = await tx.externalSurveyResponse.createMany({ data: records.filter(r => !known.has(r.fingerprint)), skipDuplicates: true });
    let updated = 0;
    for (const record of records) {
      const before = known.get(record.fingerprint);
      if (before && (before.specialtyId !== record.specialtyId || before.institutionId !== record.institutionId || stableJson(before.normalized) !== stableJson(record.normalized))) {
        await tx.externalSurveyResponse.update({ where: { sourceId_fingerprint: { sourceId: SOURCE_ID, fingerprint: record.fingerprint } }, data: { specialtyId: record.specialtyId, institutionId: record.institutionId, matchLevel: record.matchLevel, normalized: record.normalized, importVersion: IMPORT_VERSION } });
        updated++;
      }
    }
    const mappings = [...new Map(rows.flatMap(r => [r.specialty, r.institution]).map(m => [`${m.kind}:${m.rawValue}`, m])).values()];
    await tx.externalSurveyMapping.createMany({ data: mappings.map(m => ({ ...m, sourceId: SOURCE_ID })), skipDuplicates: true });
    for (const mapping of mappings.filter(m => m.matchStatus === "MANUALLY_MATCHED")) await tx.externalSurveyMapping.update({ where: { sourceId_kind_rawValue: { sourceId: SOURCE_ID, kind: mapping.kind, rawValue: mapping.rawValue } }, data: mapping });
    const summary = await rebuildAggregates(tx);
    await tx.externalSurveyImport.create({ data: { sourceId: SOURCE_ID, fileHash, importVersion: IMPORT_VERSION, rowCount: rows.length, insertedCount: inserted.count, report: json({ ...safeReport(rows), updated, ...summary }) } });
    return { read: rows.length, inserted: inserted.count, updated, ...summary };
  }, { timeout: 120000, maxWait: 15000 });
}
export async function rebuildAggregates(tx: Prisma.TransactionClient) {
  const source = await tx.externalSurveySource.findUniqueOrThrow({ where: { id: SOURCE_ID } });
  const stored = await tx.externalSurveyResponse.findMany({ where: { sourceId: SOURCE_ID }, select: { fingerprint: true, specialtyId: true, institutionId: true, reportYear: true, normalized: true } });
  const input = stored.map(r => ({ ...r, normalized: r.normalized as unknown as Normalized }));
  const datasetHash = hash(stableJson(input.sort((a, b) => a.fingerprint.localeCompare(b.fingerprint))));
  const aggregates = aggregateRows(input as AggregateInput[]);
  const changed = datasetHash !== source.datasetHash;
  if (changed) {
    await tx.externalSurveyAggregate.deleteMany({ where: { sourceId: SOURCE_ID } });
    await tx.externalSurveySource.update({ where: { id: SOURCE_ID }, data: { datasetHash } });
    await tx.externalSurveyResponse.updateMany({ where: { sourceId: SOURCE_ID }, data: { status: source.aggregateRightsStatus === "DOCUMENTED" ? "PENDING_PRIVACY_REVIEW" : "PENDING_PUBLICATION_RIGHTS" } });
    await tx.externalSurveyAggregate.createMany({ data: aggregates.map(aggregate => ({ ...aggregate, sourceId: SOURCE_ID, datasetHash, status: publicationStatus({ ...aggregate, rights: source.aggregateRightsStatus, datasetHash, privacyReviewHash: null, evidence: null }) })) });
  }
  return { stored: stored.length, datasetHash, nationalGroupsAtThreshold: new Set(aggregates.filter(a => !a.institutionId && a.value !== null).map(a => a.groupKey)).size, institutionGroupsAtThreshold: new Set(aggregates.filter(a => a.institutionId && a.value !== null).map(a => a.groupKey)).size, nationalMetricsAtThreshold: aggregates.filter(a => !a.institutionId && a.value !== null).length };
}
export async function readCatalog(db: PrismaClient) {
  const [specialties, institutions] = await Promise.all([
    db.specialty.findMany({ select: { id: true, name: true, slug: true } }),
    db.institution.findMany({ select: { id: true, name: true, slug: true, type: true } }),
  ]);
  return { specialties, institutions };
}
export async function manualMappings(db: PrismaClient): Promise<Mapping[]> {
  return await db.externalSurveyMapping.findMany({ where: { sourceId: SOURCE_ID, matchStatus: "MANUALLY_MATCHED" }, select: { kind: true, rawValue: true, targetId: true, category: true, confidence: true, matchStatus: true, rationale: true } }) as Mapping[];
}
