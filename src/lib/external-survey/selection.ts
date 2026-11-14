import { z } from 'zod';

// An explicitly delegated assistant review is recorded as such, never as a
// human inspection or as consent obtained separately from every respondent.
const checks = z.object({ personalInformation: z.literal(true), patientInformation: z.literal(true), personalAllegations: z.literal(true), indirectIdentification: z.literal(true) }).strict();
export const selectionSchema = z.object({
  sourceId: z.literal('resident-conditions-survey-2024'),
  datasetHash: z.string().regex(/^[a-f0-9]{64}$/),
  fileHash: z.string().regex(/^[a-f0-9]{64}$/),
  reviewMethod: z.literal('ASSISTANT_REVIEW_UNDER_OWNER_INSTRUCTION'),
  ownerInstructionReference: z.string().min(20),
  sourcePermissionReference: z.string().min(20),
  groupKeys: z.array(z.string().regex(/^(specialty:[^:]+|institution:[^:]+:specialty:[^:]+)$/)).min(1),
  aggregateChecks: z.object({ allValidResponsesIncluded: z.literal(true), noDemographicSlices: z.literal(true), singleRespondentAuthorized: z.literal(true), institutionSpecialtyScopeReviewed: z.literal(true), historicalPeriodClear: z.literal(true), salaryBasesSeparated: z.literal(true), indirectIdentification: z.literal(true) }).strict(),
  tips: z.array(z.object({
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    exactText: z.string().min(1),
    sentiment: z.enum(['POSITIVE_OVERALL', 'NON_NEGATIVE', 'NEGATIVE', 'UNCERTAIN']),
    status: z.enum(['APPROVED', 'REJECTED', 'PENDING_REVIEW']),
    rationale: z.string().min(8),
    privacyChecks: checks.optional(),
  }).strict()).min(1),
}).strict().superRefine((plan, ctx) => {
  if (new Set(plan.tips.map(t => t.fingerprint)).size !== plan.tips.length) ctx.addIssue({ code: 'custom', message: 'Duplicate tip decision' });
  if (new Set(plan.groupKeys).size !== plan.groupKeys.length) ctx.addIssue({ code: 'custom', message: 'Duplicate group decision' });
  for (const tip of plan.tips) if (tip.status === 'APPROVED' && (!['POSITIVE_OVERALL', 'NON_NEGATIVE'].includes(tip.sentiment) || !tip.privacyChecks)) ctx.addIssue({ code: 'custom', message: 'Approval requires non-negative sentiment and a documented content/privacy review' });
});
export type SurveySelection = z.infer<typeof selectionSchema>;
