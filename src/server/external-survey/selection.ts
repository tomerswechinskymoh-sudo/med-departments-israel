import { Prisma, type PrismaClient } from '@prisma/client';
import { selectionSchema } from '@/lib/external-survey/selection';
import { aggregateRows, MIN_RESPONDENTS } from '@/lib/external-survey/aggregate';
import { readWorkbook, normalizeRows, hash, SOURCE_ID } from './workbook';
import { readCatalog, manualMappings, withoutRaw, stableJson, rebuildAggregates } from './importer';

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export async function recordSelection(db: PrismaClient, document: string, workbookPath: string, actorUserId: string) {
  const plan = selectionSchema.parse(JSON.parse(document));
  if ((await db.user.findUnique({ where: { id: actorUserId }, select: { roleKey: true } }))?.roleKey !== 'ADMIN') throw new Error('Existing administrator required');
  const workbook = await readWorkbook(workbookPath);
  if (workbook.fileHash !== plan.fileHash) throw new Error('Source workbook differs from reviewed file');
  const rows = normalizeRows(workbook.rows, await readCatalog(db), await manualMappings(db));
  const originals = new Map(rows.map(row => [row.fingerprint, row]));
  const tips = rows.filter(row => row.tip.trim());
  if (tips.length !== plan.tips.length || plan.tips.some(tip => originals.get(tip.fingerprint)?.tip !== tip.exactText)) throw new Error('Selection must cover every original tip with its exact source text');
  const evidence = { reviewMethod: plan.reviewMethod, ownerInstructionReference: plan.ownerInstructionReference, sourcePermissionReference: plan.sourcePermissionReference, documentSha256: hash(document), actorUserId, reviewedAt: new Date().toISOString() };
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${SOURCE_ID}))`;
    const source = await tx.externalSurveySource.findUniqueOrThrow({ where: { id: SOURCE_ID } });
    if (source.datasetHash !== plan.datasetHash) throw new Error('Selection is stale');
    if (source.aggregateRightsStatus !== 'DOCUMENTED' || source.quoteRightsStatus !== 'DOCUMENTED' || !source.aggregateRightsEvidence || !source.quoteRightsEvidence) throw new Error('Documented controller permission for both uses is required');
    const stored = await tx.externalSurveyResponse.findMany({ where: { sourceId: SOURCE_ID } });
    if (stored.length !== originals.size || stored.some(row => {
      const original = originals.get(row.fingerprint);
      return !original || row.specialtyId !== original.specialty.targetId || row.institutionId !== original.institution.targetId || row.reportYear !== original.reportedAt?.getUTCFullYear() || stableJson(row.normalized) !== stableJson(withoutRaw(original.normalized));
    })) throw new Error('Stored rows or mappings differ from the original reviewed evidence');
    await rebuildAggregates(tx);
    // Verify every stored metric against an independent recomputation from the
    // original workbook, including values from negative and non-text responses.
    const expected = aggregateRows(rows.map(r => ({ specialtyId: r.specialty.targetId, institutionId: r.institution.targetId, reportYear: r.reportedAt?.getUTCFullYear() ?? null, normalized: r.normalized })));
    const aggregates = await tx.externalSurveyAggregate.findMany({ where: { sourceId: SOURCE_ID } });
    if (aggregates.length !== expected.length) throw new Error(`Aggregate count mismatch: ${aggregates.length}/${expected.length}`);
    for (const a of aggregates) {
      const e = expected.find(e => e.groupKey === a.groupKey && e.metricKey === a.metricKey);
      if (!e) throw new Error('Unexpected aggregate');
      for (const [key, value] of Object.entries(e)) {
        const actual = (a as Record<string, unknown>)[key];
        if (actual !== value && !(key === 'value' && typeof actual === 'number' && typeof value === 'number' && Math.abs(actual - value) < 1e-10)) throw new Error(`Aggregate reconciliation failed for ${a.metricKey}/${key}`);
      }
    }
    const eligible = aggregates.filter(a => a.value !== null && a.respondentCount >= MIN_RESPONDENTS);
    const eligibleGroups = new Set(eligible.map(a => a.groupKey));
    if (plan.groupKeys.length !== eligibleGroups.size || plan.groupKeys.some(key => !eligibleGroups.has(key))) throw new Error('Explicit review must cover all eligible national and institution-specialty groups');
    const reviewed = await tx.externalSurveyAggregate.updateMany({ where: { id: { in: eligible.map(a => a.id) } }, data: { privacyReviewHash: source.datasetHash, privacyEvidence: json({ ...evidence, checks: plan.aggregateChecks }) } });
    const priorSame = stored.every(r => !r.hasTip || (r.tipReviewEvidence as { documentSha256?: string } | null)?.documentSha256 === evidence.documentSha256);
    if (!priorSame) {
      const decisions = plan.tips.map(tip => {
        const record = stored.find(row => row.fingerprint === tip.fingerprint)!;
        if (record.tipStatus !== 'PENDING_REVIEW' && (record.tipReviewEvidence as { reviewMethod?: string } | null)?.reviewMethod !== plan.reviewMethod) throw new Error('Existing independent decision requires explicit reconciliation');
        return { fingerprint: tip.fingerprint, status: tip.status, approved: tip.status === 'APPROVED' ? tip.exactText : null, evidence: { ...evidence, sentiment: tip.sentiment, rationale: tip.rationale, privacyChecks: tip.privacyChecks ?? null } };
      });
      // One bound batch keeps the atomic review within the transaction deadline
      // even when the database is remote. No source text enters SQL identifiers.
      const count = await tx.$executeRaw`UPDATE "ExternalSurveyResponse" AS r
        SET tip_status = d.status, approved_tip = d.approved, tip_review_evidence = d.evidence,
            status = 'PENDING_PRIVACY_REVIEW', updated_at = CURRENT_TIMESTAMP
        FROM jsonb_to_recordset(${JSON.stringify(decisions)}::jsonb)
          AS d(fingerprint text, status text, approved text, evidence jsonb)
        WHERE r.source_id = ${SOURCE_ID} AND r.fingerprint = d.fingerprint`;
      if (count !== decisions.length) throw new Error('Incomplete decision update');
    }
    await tx.auditLog.create({ data: { actorUserId, action: 'external_survey.selection.recorded', entityType: 'ExternalSurveySource', entityId: SOURCE_ID, metadata: json({ ...evidence, metricsReviewed: reviewed.count, tipsReviewed: tips.length, decisions: { approved: plan.tips.filter(t => t.status === 'APPROVED').length, rejected: plan.tips.filter(t => t.status === 'REJECTED').length, pending: plan.tips.filter(t => t.status === 'PENDING_REVIEW').length } }) } });
    return { metricsReviewed: reviewed.count, tipsReviewed: tips.length, identicalSelection: priorSame, publishedByThisOperation: false };
  }, { timeout: 120000, maxWait: 15000 });
}
