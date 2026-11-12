import assert from 'node:assert/strict';
import { Prisma, type PrismaClient } from '@prisma/client';
import { SOURCE_ID, effectiveCandidate, suggestMapping, type Candidate } from '@/lib/staz-survey/domain';
import { seal, unseal } from '@/server/external-survey/crypto';
import { fingerprint } from './parse';
import { electiveContextHash } from './association';
import { readCatalog } from './importer';

// Explicit operator repair, separate from idempotent import. The source must stay
// hidden. Original response identity, text and moderation choices are immutable.
export async function repairElectiveAssociations(db: PrismaClient, candidates: Candidate[], execute = false) {
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(72613011)`;
    const source = await tx.surveyReviewSource.findUniqueOrThrow({ where: { id: SOURCE_ID } });
    assert.equal(source.isPublicEnabled, false, 'SOURCE_MUST_BE_HIDDEN');
    const catalog = await readCatalog(tx);
    const rows = await tx.surveyReview.findMany({ where: { sourceId: SOURCE_ID }, include: { ratings: true } });
    const byKey = new Map(rows.map(r => [r.sourceReviewKey, r]));
    const decisions = () => rows.map(r => [r.id, r.status, r.publishText, r.publishRatings, r.approvedPublicText, r.privacyReviewed, r.reviewedAt, r.reviewedByUserId, r.reviewedByName, r.adminNotes, r.ratings.map(v => [v.id, v.selected]).sort()]);
    const priorDecisions = JSON.stringify(decisions());
    const enrichments: { id: string; rawEncrypted: string }[] = [];
    const report = { execute, reviewed: candidates.length, corrections: 0, contextEnriched: 0, alreadyCurrent: 0, ratingsReassociated: 0, numericRatingsChanged: 0, manualTargetsRequired: 0, approvedCorrections: 0, approvalsPreserved: rows.filter(r => r.status === 'APPROVED').length, sourceEnabled: false, decisionsPreserved: true, details: [] as Record<string, unknown>[] };
    const seen = new Set<string>();
    for (const c of candidates) {
      assert.ok(!seen.has(c.sourceReviewKey), 'DUPLICATE_SOURCE_KEY'); seen.add(c.sourceReviewKey);
      const row = byKey.get(c.sourceReviewKey); assert.ok(row, 'EXISTING_REVIEW_REQUIRED');
      assert.ok(c.sourceVerified && row.sourceVerified && c.workbookHash === row.workbookHash && row.sourceFingerprint === fingerprint(c), 'SOURCE_EVIDENCE_CHANGED');
      if (c.sourceColumnLetter === 'BG') continue;
      const prior = unseal<Candidate>(row.rawEncrypted, row.sourceReviewKey);
      assert.equal(fingerprint(prior), fingerprint(c), 'ORIGINAL_SOURCE_CHANGED');
      assert.equal(prior.originalText, c.originalText, 'ORIGINAL_TEXT_CHANGED');
      if (prior.electives) assert.equal(electiveContextHash(prior), electiveContextHash(c), 'ELECTIVE_CONTEXT_CHANGED');
      if (prior.electiveCorrection) assert.deepEqual(prior.electiveCorrection, c.electiveCorrection, 'EXISTING_CORRECTION_CONFLICT');
      const needsCorrection = Boolean(c.electiveCorrection && !prior.electiveCorrection);
      const needsContext = !prior.electives;
      if (!needsCorrection && !needsContext) { report.alreadyCurrent++; continue; }
      if (needsContext) report.contextEnriched++;
      if (execute) enrichments.push({ id: row.id, rawEncrypted: seal({ ...prior, electives: c.electives, ...(c.electiveCorrection ? { electiveCorrection: c.electiveCorrection } : {}) }, row.sourceReviewKey) });
      if (!needsCorrection) continue;
      const effective = effectiveCandidate(c), mapping = suggestMapping(c, catalog), evidence = effective.ratings[0];
      assert.equal(row.ratings.length, 1, 'UNEXPECTED_RATING_COUNT');
      const oldRating = row.ratings[0];
      assert.equal(oldRating.metricCode, evidence.metricCode);
      assert.equal(oldRating.sourceRowNumber, evidence.sourceRowNumber);
      assert.equal(oldRating.sourceColumn, prior.ratings[0].sourceColumn, 'RATING_CHANGED_SINCE_IMPORT');
      assert.equal(oldRating.rawAnswer, prior.ratings[0].rawAnswer, 'RATING_CHANGED_SINCE_IMPORT');
      assert.equal(oldRating.normalizedValue, prior.ratings[0].normalizedValue, 'RATING_CHANGED_SINCE_IMPORT');
      const hadTarget = Boolean(row.targetDepartmentId || row.targetMedicalArrayId);
      const newTarget = hadTarget ? { targetDepartmentId: mapping.suggestedDepartmentId, targetMedicalArrayId: mapping.suggestedMedicalArrayId, mappingConfirmed: row.mappingConfirmed && Boolean(mapping.suggestedDepartmentId || mapping.suggestedMedicalArrayId) } : {};
      const after = { originalHospital: effective.originalHospital, originalDepartmentOrScope: effective.originalDepartmentOrScope, ...mapping, ...newTarget };
      const before = { originalHospital: row.originalHospital, originalDepartmentOrScope: row.originalDepartmentOrScope, suggestedDepartmentId: row.suggestedDepartmentId, suggestedMedicalArrayId: row.suggestedMedicalArrayId, mappedInstitutionId: row.mappedInstitutionId, mappingConfidence: row.mappingConfidence, mappingReason: row.mappingReason, targetDepartmentId: row.targetDepartmentId, targetMedicalArrayId: row.targetMedicalArrayId, mappingConfirmed: row.mappingConfirmed, rating: oldRating };
      report.corrections++; report.ratingsReassociated++;
      if (oldRating.normalizedValue !== evidence.normalizedValue) report.numericRatingsChanged++;
      if (!mapping.suggestedDepartmentId && !mapping.suggestedMedicalArrayId) report.manualTargetsRequired++;
      if (row.status === 'APPROVED') report.approvedCorrections++;
      report.details.push({ sourceReviewKey: row.sourceReviewKey, previousHospital: row.originalHospital, previousDepartment: row.originalDepartmentOrScope, hospital: effective.originalHospital, department: effective.originalDepartmentOrScope, previousRatingColumn: oldRating.sourceColumn, ratingColumn: evidence.sourceColumn, previousRating: oldRating.normalizedValue, rating: evidence.normalizedValue, requiresManualTarget: !mapping.suggestedDepartmentId && !mapping.suggestedMedicalArrayId });
      if (execute) {
        await tx.surveyReview.update({ where: { id: row.id }, data: after });
        // Keep the rating row ID and selected flag: a correction must not lose an
        // admin's separate decision to include or exclude that metric.
        await tx.surveyReviewRating.update({ where: { id: oldRating.id }, data: evidence });
        await tx.auditLog.create({ data: { action: 'STAZ_ELECTIVE_ASSOCIATION_CORRECTED', entityType: 'SurveyReview', entityId: row.id, metadata: { authorizationChannel: 'user-chat', authorizationDate: '2026-11-12', executedBy: 'Codex', correction: c.electiveCorrection, before, after: { ...after, rating: evidence }, originalFingerprint: row.sourceFingerprint, decisionsPreserved: true } as unknown as Prisma.InputJsonValue } });
      }
    }
    if (execute && enrichments.length) {
      // Bound batches avoid thousands of network round trips. SQL only touches
      // the encrypted evidence envelope and optimistic-lock revision.
      for (let i = 0; i < enrichments.length; i += 100) {
        const payload = JSON.stringify(enrichments.slice(i, i + 100));
        const count = await tx.$executeRaw`UPDATE "SurveyReview" r SET "rawEncrypted"=e."rawEncrypted", revision=r.revision+1, "updatedAt"=now() FROM jsonb_to_recordset(${payload}::jsonb) AS e(id text, "rawEncrypted" text) WHERE r.id=e.id AND r."sourceId"=${SOURCE_ID}`;
        assert.equal(count, enrichments.slice(i, i + 100).length);
      }
      const afterRows = await tx.surveyReview.findMany({ where: { sourceId: SOURCE_ID }, include: { ratings: true } });
      const afterById = new Map(afterRows.map(r => [r.id, r]));
      const afterDecisions = rows.map(r => { const n = afterById.get(r.id)!; return [n.id, n.status, n.publishText, n.publishRatings, n.approvedPublicText, n.privacyReviewed, n.reviewedAt, n.reviewedByUserId, n.reviewedByName, n.adminNotes, n.ratings.map(v => [v.id, v.selected]).sort()]; });
      assert.equal(JSON.stringify(afterDecisions), priorDecisions, 'MODERATION_DECISIONS_CHANGED');
      assert.equal((await tx.surveyReviewSource.findUniqueOrThrow({ where: { id: SOURCE_ID } })).isPublicEnabled, false);
      const { details: _details, ...summary } = report;
      await tx.auditLog.create({ data: { action: 'STAZ_ELECTIVE_REPAIR_COMPLETED', entityType: 'SurveyReviewSource', entityId: SOURCE_ID, metadata: { ...summary, authorizationChannel: 'user-chat' } as unknown as Prisma.InputJsonValue } });
    }
    return report;
  }, { timeout: 120000, maxWait: 15000 });
}
