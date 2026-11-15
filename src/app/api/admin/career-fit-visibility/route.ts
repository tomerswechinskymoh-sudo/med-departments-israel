import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { hasValidSameOrigin } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { setCareerFitVisibility } from '@/server/site-features/policy';

const schema = z.object({ enabled: z.boolean() }).strict();
const headers = { 'Cache-Control': 'private, no-store' };
export async function PATCH(request: Request) {
  const session = await getSession();
  if (session?.role !== 'admin' || !request.headers.get('origin') || !hasValidSameOrigin(request)) {
    return NextResponse.json({ error: 'גישה נדחתה.' }, { status: 403, headers });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'קלט לא תקין.' }, { status: 400, headers });
  try {
    const feature = await setCareerFitVisibility(prisma, parsed.data.enabled, session.userId);
    revalidatePath('/', 'layout');
    return NextResponse.json(feature, { headers });
  } catch {
    return NextResponse.json({ error: 'העדכון לא אושר. יש לרענן ולנסות שוב.' }, { status: 503, headers });
  }
}
