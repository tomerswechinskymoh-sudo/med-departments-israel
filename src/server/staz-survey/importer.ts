import { publicVisibleDepartmentWhere, isRequiredMedicalArraySpecialty } from '@/lib/queries';
import type { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { seal, unseal } from '@/server/external-survey/crypto';
import { SOURCE_ID, SOURCE_TITLE, suggestMapping, type Candidate, type DepartmentOption } from '@/lib/staz-survey/domain';
import { fingerprint } from './parse';
export async function readCatalog(db: PrismaClient | Prisma.TransactionClient) {
  const rows = await db.department.findMany({ where: publicVisibleDepartmentWhere, select: { id: true, name: true, slug: true, institutionId: true, institution: { select: { name: true } }, specialty: { select: { name: true, groupAsArray: true } }, medicalArray: { select: { id: true, name: true, slug: true, hospitalId: true, specialtyId: true } }, specialtyId: true }, orderBy: [{ institution: { name: 'asc' } }, { name: 'asc' }] });
  return rows.map(d => ({ ...d, medicalArray: d.medicalArray && d.medicalArray.hospitalId === d.institutionId && d.medicalArray.specialtyId === d.specialtyId && (d.specialty.groupAsArray || isRequiredMedicalArraySpecialty(d.specialty.name)) ? d.medicalArray : null }));
}
export function dryRun(candidates: Candidate[], catalog: DepartmentOption[], existing: { sourceReviewKey: string; sourceFingerprint: string }[] = []) {
  const known = new Map(existing.map(r => [r.sourceReviewKey, r.sourceFingerprint])); const seen = new Set<string>();
  const report = { read: candidates.length, inserted: 0, existing: 0, duplicates: 0, changed: 0, needsMapping: 0, suggested: 0, withVerifiedRating: 0, withoutRating: 0, hospitalScope: 0, sourceVerified: 0, errors: 0, decisionsPreserved: true, conflicts: [] as { sourceReviewKey: string; reason: string }[] };
  for (const c of candidates) {
    if (seen.has(c.sourceReviewKey)) { report.duplicates++; continue; } seen.add(c.sourceReviewKey);
    const old = known.get(c.sourceReviewKey);
    if (old) { report.existing++; if (old !== fingerprint(c)) { report.changed++; report.conflicts.push({ sourceReviewKey: c.sourceReviewKey, reason: 'SOURCE_CHANGED_EXISTING_RECORD_PRESERVED' }); } } else report.inserted++;
    const mapping = suggestMapping(c, catalog);
    if (mapping.suggestedDepartmentId || mapping.suggestedMedicalArrayId) report.suggested++; else report.needsMapping++;
    if (c.ratings.some(r => r.verified && r.normalizedValue !== null)) report.withVerifiedRating++; else report.withoutRating++;
    if (c.sourceColumnLetter === 'BG') report.hospitalScope++;
    if (c.sourceVerified) report.sourceVerified++;
  }
  return report;
}
export async function importCandidates(db: PrismaClient, candidates: Candidate[], csvHash: string, actorUserId: string | null) {
  const catalog = await readCatalog(db);
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(72613011)`;
    // Existing sources are read only: importing cannot lock out the emergency hide.
    if (!await tx.surveyReviewSource.findUnique({ where: { id: SOURCE_ID }, select: { id: true } })) await tx.surveyReviewSource.create({ data: { id: SOURCE_ID, title: SOURCE_TITLE } });
    const existing = await tx.surveyReview.findMany({ where: { sourceId: SOURCE_ID }, select: { id: true, sourceReviewKey: true, sourceFingerprint: true, sourceVerified: true, status: true, rawEncrypted: true } });
    const report = dryRun(candidates, catalog, existing), byKey = new Map(existing.map(r => [r.sourceReviewKey, r]));
    const evidenceChecked = new Set<string>();
    for (const c of candidates) {
      const old = byKey.get(c.sourceReviewKey);
      if (!old?.sourceVerified || !c.sourceVerified || old.sourceFingerprint !== fingerprint(c) || evidenceChecked.has(c.sourceReviewKey)) continue;
      evidenceChecked.add(c.sourceReviewKey);
      const prior = unseal<Candidate>(old.rawEncrypted, c.sourceReviewKey);
      if (JSON.stringify(prior.ratings) !== JSON.stringify(c.ratings)) {
        report.changed++; report.conflicts.push({ sourceReviewKey: c.sourceReviewKey, reason: 'RATING_EVIDENCE_CHANGED_EXISTING_DECISIONS_PRESERVED' });
      }
    }
    const batch = await tx.surveyReviewImport.create({ data: { sourceId: SOURCE_ID, csvHash, workbookHash: candidates[0]?.workbookHash ?? null, actorUserId, report: report as unknown as Prisma.InputJsonValue } });
    const reviews: Prisma.SurveyReviewCreateManyInput[] = [], ratings: Prisma.SurveyReviewRatingCreateManyInput[] = [];
    const seen = new Set<string>(); let enriched = 0;
    for (const c of candidates) {
      if (seen.has(c.sourceReviewKey)) continue; seen.add(c.sourceReviewKey);
      const old = byKey.get(c.sourceReviewKey);
      if (old) {
        // Only enrich previously unverified evidence with exact matching source content.
        // Existing approval choices, text, mapping, rejection and selected metrics are never overwritten.
        if (!old.sourceVerified && c.sourceVerified && old.sourceFingerprint === fingerprint(c)) {
          await tx.surveyReview.update({ where: { id: old.id }, data: { sourceVerified: true, workbookHash: c.workbookHash, rawEncrypted: seal(c, c.sourceReviewKey), revision: { increment: 1 }, ...(old.status === 'APPROVED' ? { status: 'PENDING_REVIEW' as const } : {}) } });
          await tx.surveyReviewRating.createMany({ data: c.ratings.map(r => ({ ...r, reviewId: old.id })), skipDuplicates: true }); enriched++;
        }
        continue;
      }
      const id = randomUUID(), mapping = suggestMapping(c, catalog);
      reviews.push({ id, sourceId: SOURCE_ID, sourceReviewKey: c.sourceReviewKey, batchId: batch.id, sourceRowNumber: c.sourceRowNumber, sourceColumnLetter: c.sourceColumnLetter,
        sourceYear: c.sourceYear, originalHospital: c.originalHospital, originalDepartmentOrScope: c.originalDepartmentOrScope, sourceQuestion: c.sourceQuestion,
        rawEncrypted: seal(c, c.sourceReviewKey), sourceFingerprint: fingerprint(c), sourceVerified: c.sourceVerified, workbookHash: c.workbookHash, ...mapping,
        // All first-import records await review; mapping need is separately filterable.
        status: 'PENDING_REVIEW' });
      ratings.push(...c.ratings.map(r => ({ ...r, id: randomUUID(), reviewId: id })));
    }
    for (let i = 0; i < reviews.length; i += 200) await tx.surveyReview.createMany({ data: reviews.slice(i, i + 200) });
    for (let i = 0; i < ratings.length; i += 300) await tx.surveyReviewRating.createMany({ data: ratings.slice(i, i + 300) });
    await tx.auditLog.create({ data: { actorUserId, action: 'STAZ_SURVEY_IMPORTED', entityType: 'SurveyReviewImport', entityId: batch.id, metadata: { csvHash, inserted: reviews.length, existing: report.existing, changed: report.changed, enriched } } });
    return { batchId: batch.id, ...report, inserted: reviews.length, enriched };
  }, { timeout: 120000, maxWait: 15000 });
}
