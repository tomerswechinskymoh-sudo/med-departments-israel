import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SOURCE_ID, suggestMapping, type Candidate } from '@/lib/staz-survey/domain';
import { unseal } from '@/server/external-survey/crypto';
import { readCatalog } from '@/server/staz-survey/importer';
import { moderate } from '@/server/staz-survey/moderation';
import { adminRequest, fail, noStore, invalidateSurvey, limitedJson } from '@/server/staz-survey/http';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await adminRequest(request); const { id } = await context.params;
    const row = await prisma.surveyReview.findFirst({ where: { id, sourceId: SOURCE_ID }, include: { ratings: true } });
    if (!row) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404, headers: noStore });
    const { rawEncrypted, ...safe } = row;
    const original = unseal<Candidate>(rawEncrypted, row.sourceReviewKey);
    const audit = await prisma.auditLog.findMany({ where: { entityType: 'SurveyReview', entityId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, action: true, createdAt: true, metadata: true, actor: { select: { fullName: true } } } });
    return NextResponse.json({ ...safe, ...(!row.mappingConfirmed ? suggestMapping(original, await readCatalog(prisma)) : {}), text: row.approvedPublicText ?? original.proposedText, privacyFlags: original.privacyFlags, original, audit }, { headers: noStore });
  } catch (e) { return fail(e); }
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await adminRequest(request, true); const { id } = await context.params;
    if (Number(request.headers.get('content-length')) > 64000) return NextResponse.json({ error: 'TOO_LARGE' }, { status: 413 });
    const result = await moderate(prisma, id, await limitedJson(request), { userId: session.userId, name: session.fullName });
    invalidateSurvey(); return NextResponse.json(result, { headers: noStore });
  } catch (e) { return fail(e); }
}
