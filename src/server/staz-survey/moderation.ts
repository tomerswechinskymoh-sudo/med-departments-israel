import { publicVisibleDepartmentWhere } from '@/lib/queries';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { SOURCE_ID, sourceAllowsPublication } from '@/lib/staz-survey/domain';
import { sanitizePlainText } from '@/lib/security';
export const decisionSchema = z.object({
  revision: z.number().int().nonnegative(), action: z.enum(['SAVE','APPROVE','REJECT','NEEDS_MAPPING']),
  targetDepartmentId: z.string().max(150).nullable(), mappingConfirmed: z.boolean(), mappingExceptionReason: z.string().max(1000),
  approvedPublicText: z.string().max(12000), publishText: z.boolean(), publishRatings: z.boolean(), selectedMetricIds: z.array(z.string().max(150)).max(20), privacyReviewed: z.boolean(), adminNotes: z.string().max(2000)
}).strict();
export type Decision = z.infer<typeof decisionSchema>;
export class ModerationError extends Error { constructor(public code: string, public status = 400) { super(code); } }
export const componentActionSchema = z.object({
  revision: z.number().int().nonnegative(), component: z.enum(['TEXT', 'RATING']), action: z.enum(['PUBLISH', 'HIDE']),
  targetDepartmentId: z.string().max(150).nullable(), mappingExceptionReason: z.string().max(1000), reviewed: z.literal(true),
  text: z.string().max(12000).optional(), metricId: z.string().max(150).optional()
}).strict();
export type ComponentAction = z.infer<typeof componentActionSchema>;
type ComponentRow = Pick<Decision, 'revision' | 'targetDepartmentId' | 'mappingConfirmed' | 'publishText' | 'publishRatings' | 'privacyReviewed'> & {
  status: string; mappingExceptionReason: string | null; approvedPublicText: string | null; adminNotes: string | null;
  ratings: { id: string; selected: boolean }[];
};
// One explicit click approves only the displayed component. Never inherit pending selections.
export function componentDecision(row: ComponentRow, action: ComponentAction): { decision: Decision; otherComponentReset: boolean } {
  const publishing = action.action === 'PUBLISH';
  const sameMapping = row.targetDepartmentId === action.targetDepartmentId && (row.mappingExceptionReason ?? '') === action.mappingExceptionReason.trim();
  const preserve = row.status === 'APPROVED' && (!publishing || sameMapping);
  let publishText = preserve && row.publishText;
  let selectedMetricIds = preserve && row.publishRatings ? row.ratings.filter(r => r.selected).map(r => r.id) : [];
  let text = row.approvedPublicText ?? '';
  if (action.component === 'TEXT') {
    publishText = publishing;
    if (publishing) { if (action.text === undefined) throw new ModerationError('TEXT_REQUIRED'); text = action.text; }
  } else {
    if (!action.metricId || !row.ratings.some(r => r.id === action.metricId)) throw new ModerationError('INVALID_RATING_EVIDENCE');
    selectedMetricIds = selectedMetricIds.filter(id => id !== action.metricId);
    if (publishing) selectedMetricIds.push(action.metricId);
  }
  return { otherComponentReset: publishing && row.status === 'APPROVED' && !sameMapping && (action.component === 'TEXT' ? row.publishRatings : row.publishText), decision: {
    revision: action.revision, action: publishText || selectedMetricIds.length ? 'APPROVE' : 'SAVE',
    targetDepartmentId: publishing ? action.targetDepartmentId : row.targetDepartmentId,
    mappingConfirmed: publishing ? true : row.mappingConfirmed,
    mappingExceptionReason: publishing ? action.mappingExceptionReason : row.mappingExceptionReason ?? '',
    approvedPublicText: text, publishText, publishRatings: selectedMetricIds.length > 0, selectedMetricIds,
    privacyReviewed: publishing ? action.reviewed : row.privacyReviewed, adminNotes: row.adminNotes ?? ''
  } };
}
export async function moderate(db: PrismaClient, id: string, input: Decision | ComponentAction, actor: { userId: string; name: string }) {
  const component = 'component' in input ? componentActionSchema.parse(input) : null;
  const fullDecision = component ? null : decisionSchema.parse(input);
  return db.$transaction(async tx => {
    // Shared source lock serializes imports, per-item decisions and source changes.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(72613011)`;
    const row = await tx.surveyReview.findUnique({ where: { id }, include: { ratings: true } });
    if (!row || row.sourceId !== SOURCE_ID) throw new ModerationError('NOT_FOUND', 404);
    const quick = component ? componentDecision(row, component) : null;
    const d = quick?.decision ?? fullDecision!;
    if (row.revision !== d.revision) throw new ModerationError('STALE_REVISION', 409);
    const target = d.targetDepartmentId ? await tx.department.findFirst({ where: { id: d.targetDepartmentId, ...publicVisibleDepartmentWhere }, select: { id: true, institutionId: true } }) : null;
    if (d.targetDepartmentId && !target) throw new ModerationError('INVALID_DEPARTMENT');
    const mismatch = Boolean(target && (!row.mappedInstitutionId || target.institutionId !== row.mappedInstitutionId));
    if (d.mappingConfirmed && mismatch && d.mappingExceptionReason.trim().length < 12) throw new ModerationError('HOSPITAL_EXCEPTION_REASON_REQUIRED');
    const selected = row.ratings.filter(r => d.selectedMetricIds.includes(r.id));
    if (new Set(d.selectedMetricIds).size !== d.selectedMetricIds.length || selected.length !== d.selectedMetricIds.length || selected.some(r => !r.verified || r.normalizedValue === null || r.sourceRowNumber !== row.sourceRowNumber || (row.sourceColumnLetter === 'BL' ? r.sourceColumn !== 'BK' : row.sourceColumnLetter === 'BP' ? r.sourceColumn !== 'BO' : true))) throw new ModerationError('INVALID_RATING_EVIDENCE');
    const text = sanitizePlainText(d.approvedPublicText, 12000);
    // The full editor saves changed payloads for re-review. Component buttons are an
    // explicit approval of the visible component; the other component is retained
    // only when its already-approved mapping is unchanged.
    const changed = row.targetDepartmentId !== d.targetDepartmentId || row.approvedPublicText !== (text || null) || row.publishText !== d.publishText || row.publishRatings !== d.publishRatings || row.mappingConfirmed !== d.mappingConfirmed || row.privacyReviewed !== d.privacyReviewed || row.ratings.some(r => r.selected !== d.selectedMetricIds.includes(r.id)) || (row.mappingExceptionReason ?? '') !== d.mappingExceptionReason.trim();
    const approvalInvalidated = !component && row.status === 'APPROVED' && changed;
    let status: 'PENDING_REVIEW' | 'NEEDS_MAPPING' | 'APPROVED' | 'REJECTED' = d.action === 'REJECT' ? 'REJECTED' : d.action === 'NEEDS_MAPPING' ? 'NEEDS_MAPPING' : 'PENDING_REVIEW';
    if (d.action === 'APPROVE' && !approvalInvalidated) {
      if (!row.sourceVerified) throw new ModerationError('WORKBOOK_VERIFICATION_REQUIRED');
      if (!target || !d.mappingConfirmed) throw new ModerationError('MAPPING_CONFIRMATION_REQUIRED');
      if (!d.privacyReviewed) throw new ModerationError('PRIVACY_REVIEW_REQUIRED');
      if (!d.publishText && !d.publishRatings) throw new ModerationError('SELECT_CONTENT');
      if (d.publishText && !text) throw new ModerationError('TEXT_REQUIRED');
      if (d.publishRatings && !selected.length) throw new ModerationError('SELECT_VERIFIED_METRIC');
      if (row.sourceColumnLetter === 'BG' && d.publishRatings) throw new ModerationError('HOSPITAL_RATING_NOT_DEPARTMENT');
      if (row.sourceColumnLetter === 'BG' && d.mappingExceptionReason.trim().length < 12) throw new ModerationError('HOSPITAL_SCOPE_REASON_REQUIRED');
      status = 'APPROVED';
    }
    await tx.surveyReviewRating.updateMany({ where: { reviewId: id }, data: { selected: false } });
    if (selected.length) await tx.surveyReviewRating.updateMany({ where: { reviewId: id, id: { in: selected.map(r => r.id) } }, data: { selected: true } });
    const updated = await tx.surveyReview.update({ where: { id }, data: { targetDepartmentId: target?.id ?? null, mappingConfirmed: d.mappingConfirmed, mappingExceptionReason: sanitizePlainText(d.mappingExceptionReason, 1000) || null,
      approvedPublicText: text || null, publishText: d.publishText, publishRatings: d.publishRatings, privacyReviewed: d.privacyReviewed, adminNotes: sanitizePlainText(d.adminNotes, 2000),
      status, reviewedByUserId: actor.userId, reviewedByName: actor.name, reviewedAt: new Date(), revision: { increment: 1 } } });
    await tx.auditLog.create({ data: { actorUserId: actor.userId, action: 'STAZ_REVIEW_' + (component ? component.action + '_' + component.component : approvalInvalidated ? 'APPROVAL_INVALIDATED' : d.action), entityType: 'SurveyReview', entityId: id, metadata: { previousStatus: row.status, status, revision: updated.revision, targetDepartmentId: target?.id ?? null, publishText: d.publishText, publishRatings: d.publishRatings, selectedMetricIds: selected.map(r => r.id), privacyReviewed: d.privacyReviewed, otherComponentReset: quick?.otherComponentReset ?? false, previousTextHash: createHash('sha256').update(row.approvedPublicText ?? '').digest('hex'), textHash: createHash('sha256').update(text).digest('hex') } } });
    return { id, status, revision: updated.revision, approvalInvalidated, otherComponentReset: quick?.otherComponentReset ?? false };
  });
}
export const sourceSchema = z.object({ revision: z.number().int().nonnegative(), action: z.enum(['HIDE','ENABLE','CONFIRM_PERMISSION','REVOKE_PERMISSION']), confirmed: z.literal(true), evidence: z.string().max(2000).optional(), authorizedByController: z.boolean().optional(), permitsTextAndRatings: z.boolean().optional() }).strict();
export async function changeSource(db: PrismaClient, input: z.infer<typeof sourceSchema>, actorUserId: string) {
  const d = sourceSchema.parse(input);
  return db.$transaction(async tx => {
    // Emergency hiding must not wait behind a long-running import.
    if (d.action !== 'HIDE') await tx.$executeRaw`SELECT pg_advisory_xact_lock(72613011)`;
    const row = await tx.surveyReviewSource.findUniqueOrThrow({ where: { id: SOURCE_ID } });
    // Emergency hide always wins, even from a stale tab.
    if (d.action !== 'HIDE' && row.revision !== d.revision) throw new ModerationError('STALE_REVISION', 409);
    if (d.action === 'ENABLE' && !sourceAllowsPublication({ ...row, isPublicEnabled: true })) throw new ModerationError('PERMISSION_REQUIRED');
    if (d.action === 'CONFIRM_PERMISSION' && (!d.authorizedByController || !d.permitsTextAndRatings || (d.evidence?.trim().length ?? 0) < 12)) throw new ModerationError('DOCUMENTED_PERMISSION_REQUIRED');
    const updated = await tx.surveyReviewSource.update({ where: { id: SOURCE_ID, ...(d.action === 'HIDE' ? {} : { revision: d.revision }) }, data: { revision: { increment: 1 }, ...(d.action === 'ENABLE' ? { isPublicEnabled: true } : { isPublicEnabled: false }),
      ...(d.action === 'CONFIRM_PERMISSION' ? { permissionConfirmedAt: new Date(), permissionConfirmedBy: actorUserId, permissionEvidence: sanitizePlainText(d.evidence, 2000) } : {}),
      ...(d.action === 'REVOKE_PERMISSION' ? { permissionConfirmedAt: null, permissionConfirmedBy: null, permissionEvidence: null } : {}) } });
    await tx.auditLog.create({ data: { actorUserId, action: 'STAZ_SOURCE_' + d.action, entityType: 'SurveyReviewSource', entityId: SOURCE_ID, metadata: { previousEnabled: row.isPublicEnabled, enabled: updated.isPublicEnabled, revision: updated.revision, permissionEvidence: d.action === 'CONFIRM_PERMISSION' ? updated.permissionEvidence : row.permissionEvidence } } });
    return updated;
  });
}
