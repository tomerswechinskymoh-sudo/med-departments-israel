import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { hasValidSameOrigin } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { PUBLIC_DATA_CACHE_TAGS, clearPublicDataMemoryCache } from '@/lib/public-data-cache';
const schema = z.object({ source: z.enum(['ima','duns100']), enabled: z.boolean() }).strict();
export async function PATCH(request: Request) {
  const session = await getSession();
  if (session?.role !== 'admin' || !hasValidSameOrigin(request)) return NextResponse.json({ error: 'גישה נדחתה.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'קלט לא תקין.' }, { status: 400 });
  try {
    const settings = await prisma.sourceVisibility.update({ where: { id: 'global' }, data: {
      [parsed.data.source]: parsed.data.enabled, revision: { increment: 1 }
    }});
    clearPublicDataMemoryCache();
    for (const tag of Object.values(PUBLIC_DATA_CACHE_TAGS)) revalidateTag(tag);
    revalidatePath('/', 'layout');
    return NextResponse.json({ settings, message: 'ההגדרה נשמרה.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'לא התקבל אישור לעדכון התצוגה. יש לרענן ולנסות שוב.' }, { status: 503 });
  }
}
