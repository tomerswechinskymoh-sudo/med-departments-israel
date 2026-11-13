import { NextResponse } from 'next/server';
import type { Prisma, SurveyReviewStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { SOURCE_ID, SOURCE_TITLE, sourceAllowsPublication, suggestMapping, mappingOptions, type Candidate } from '@/lib/staz-survey/domain';
import { readCatalog } from '@/server/staz-survey/importer';
import { unseal } from '@/server/external-survey/crypto';
import { publicSurveyWhere } from '@/server/staz-survey/public';
import { adminRequest, fail, noStore } from '@/server/staz-survey/http';
import { automationQueueWhere } from '@/server/staz-survey/queue';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    await adminRequest(request);
    const p = new URL(request.url).searchParams, page = Math.max(1, Math.min(300, Number(p.get('page')) || 1));
    const cursor = p.get('cursor')?.slice(0, 150);
    const where: Prisma.SurveyReviewWhereInput = { sourceId: SOURCE_ID, AND: [automationQueueWhere(p.get('view'))] };
    const status = p.get('status'); if (status && ['PENDING_REVIEW','NEEDS_MAPPING','APPROVED','REJECTED'].includes(status)) where.status = status as SurveyReviewStatus;
    for (const [parameter, field] of [['hospital','originalHospital'],['department','originalDepartmentOrScope'],['question','sourceQuestion']] as const) if (p.get(parameter)) where[field] = p.get(parameter)!.slice(0, 500);
    if (p.get('target')) where.OR = [{ targetDepartmentId: p.get('target')! }, { targetMedicalArrayId: p.get('target')! }];
    if (/^202[0-5]$/.test(p.get('year') ?? '')) where.sourceYear = Number(p.get('year'));
    if (p.get('unmapped') === 'true') where.mappingConfirmed = false;
    if (p.get('ratings') === 'true') where.ratings = { some: { verified: true } };
    const q = p.get('q')?.trim().slice(0, 150).toLocaleLowerCase();
    if (q) {
      const searchRows = await prisma.surveyReview.findMany({ where, select: { id: true, sourceReviewKey: true, rawEncrypted: true, originalHospital: true, originalDepartmentOrScope: true, approvedPublicText: true } });
      where.id = { in: searchRows.filter(r => [r.originalHospital, r.originalDepartmentOrScope, r.approvedPublicText ?? '', unseal<Candidate>(r.rawEncrypted, r.sourceReviewKey).proposedText].some(v => v.toLocaleLowerCase().includes(q))).map(r => r.id) };
    }
    const [source, total, rows, grouped, catalog, facets, withRatings, displayed, latestImports, mappingRequired, uncertain, blocked, excluded] = await Promise.all([
      prisma.surveyReviewSource.findUnique({ where: { id: SOURCE_ID } }), prisma.surveyReview.count({ where }),
      prisma.surveyReview.findMany({ where, orderBy: [{ sourceRowNumber: 'asc' }, { sourceColumnLetter: 'asc' }], ...(cursor ? { cursor: { id: cursor }, skip: 1 } : { skip: (page - 1) * 20 }), take: 20,
        select: { id: true, revision: true, sourceReviewKey: true, sourceYear: true, sourceColumnLetter: true, originalHospital: true, originalDepartmentOrScope: true, sourceQuestion: true, status: true, mappingConfidence: true, mappingReason: true, suggestedDepartmentId: true, suggestedMedicalArrayId: true, targetDepartmentId: true, targetMedicalArrayId: true, mappedInstitutionId: true, mappingConfirmed: true, mappingExceptionReason: true, sourceVerified: true, rawEncrypted: true, approvedPublicText: true, publishText: true, publishRatings: true, ratings: true, automationCategory: true, automationReason: true } }),
      prisma.surveyReview.groupBy({ by: ['status'], where: { sourceId: SOURCE_ID }, _count: true }), readCatalog(prisma),
      prisma.surveyReview.findMany({ where: { sourceId: SOURCE_ID }, distinct: ['originalHospital','originalDepartmentOrScope','sourceQuestion','sourceYear'], select: { originalHospital: true, originalDepartmentOrScope: true, sourceQuestion: true, sourceYear: true } }),
      prisma.surveyReview.count({ where: { sourceId: SOURCE_ID, ratings: { some: { verified: true } } } }), prisma.surveyReview.count({ where: publicSurveyWhere() }),
      prisma.surveyReviewImport.findMany({ where: { sourceId: SOURCE_ID }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, createdAt: true, report: true } }),
      prisma.surveyReview.count({ where: { sourceId: SOURCE_ID, suggestedDepartmentId: null, suggestedMedicalArrayId: null, mappingConfirmed: false } }),
      ...['uncertain','blocked','excluded'].map(view=>prisma.surveyReview.count({where:{sourceId:SOURCE_ID,...automationQueueWhere(view)}}))
    ]);
    const counts = Object.fromEntries(grouped.map(g => [g.status, g._count]));
    const queueRows = rows.map(({ rawEncrypted, approvedPublicText, ...row }) => {
      const original = unseal<Candidate>(rawEncrypted, row.sourceReviewKey);
      return { ...row, ...(!row.mappingConfirmed ? suggestMapping(original, catalog) : {}), text: approvedPublicText ?? original.proposedText, privacyFlags: original.privacyFlags, electiveCorrection: original.electiveCorrection ?? null };
    });
    return NextResponse.json({ source: source ?? { id: SOURCE_ID, title: SOURCE_TITLE, isPublicEnabled: false, permissionConfirmedAt: null, permissionEvidence: null, revision: 0 }, rows: queueRows, total, page, nextCursor: rows.length === 20 ? rows.at(-1)!.id : null, catalog: mappingOptions(catalog),
      counts: { ...counts, mappingRequired, displayed, hiddenBySource: source && sourceAllowsPublication(source) ? 0 : counts.APPROVED ?? 0, withRatings, uncertain, blocked, excluded },
      facets: { hospitals: [...new Set(facets.map(r => r.originalHospital))].sort(), departments: [...new Set(facets.map(r => r.originalDepartmentOrScope))].sort(), questions: [...new Set(facets.map(r => r.sourceQuestion))].sort(), years: [...new Set(facets.map(r => r.sourceYear))].sort() }, latestImports }, { headers: noStore });
  } catch (e) { return fail(e); }
}
