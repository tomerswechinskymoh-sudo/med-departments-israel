import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SOURCE_ID } from '@/lib/staz-survey/domain';
import { parseCandidates, hash, MAX_CSV_BYTES } from '@/server/staz-survey/parse';
import { dryRun, readCatalog, importCandidates } from '@/server/staz-survey/importer';
import { adminRequest, fail, noStore, limitedBody } from '@/server/staz-survey/http';
export const maxDuration = 180;
export async function POST(request: Request) {
  try {
    const session = await adminRequest(request, true);
    if (!request.headers.get('content-type')?.includes('multipart/form-data') || Number(request.headers.get('content-length')) > MAX_CSV_BYTES + 20000) return NextResponse.json({ error: 'FILE_LIMIT' }, { status: 413, headers: noStore });
    const body = await limitedBody(request, MAX_CSV_BYTES + 20000);
    const form = await new Response(body as BodyInit, { headers: { 'Content-Type': request.headers.get('content-type')! } }).formData(), file = form.get('file');
    if (!(file instanceof File) || !/\.csv$/i.test(file.name) || file.size > MAX_CSV_BYTES) return NextResponse.json({ error: 'CSV_REQUIRED' }, { status: 400, headers: noStore });
    const bytes = Buffer.from(await file.arrayBuffer()), candidates = parseCandidates(bytes), csvHash = hash(bytes);
    if (!candidates.length) return NextResponse.json({ error: 'EMPTY_FILE' }, { status: 400, headers: noStore });
    if (form.get('commit') === 'true') {
      if (form.get('previewHash') !== csvHash) return NextResponse.json({ error: 'PREVIEW_REQUIRED' }, { status: 400, headers: noStore });
      return NextResponse.json(await importCandidates(prisma, candidates, csvHash, session.userId), { headers: noStore });
    }
    const [catalog, existing] = await Promise.all([readCatalog(prisma), prisma.surveyReview.findMany({ where: { sourceId: SOURCE_ID }, select: { sourceReviewKey: true, sourceFingerprint: true } })]);
    return NextResponse.json({ ...dryRun(candidates, catalog, existing), previewHash: csvHash, note: 'CSV לבדו אינו מאמת ציונים. רשומות חדשות חסומות לאישור עד להצלבה עם XLSM בייבוא המקומי המאובטח.' }, { headers: noStore });
  } catch (e) { return fail(e); }
}
