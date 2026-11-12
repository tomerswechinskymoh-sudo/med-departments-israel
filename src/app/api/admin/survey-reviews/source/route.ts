import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { changeSource } from '@/server/staz-survey/moderation';
import { adminRequest, fail, noStore, invalidateSurvey, limitedJson } from '@/server/staz-survey/http';
export async function PATCH(request: Request) {
  try {
    const session = await adminRequest(request, true);
    const result = await changeSource(prisma, await limitedJson(request), session.userId);
    invalidateSurvey(); return NextResponse.json(result, { headers: noStore });
  } catch (e) { return fail(e); }
}
