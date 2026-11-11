import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { hasValidSameOrigin } from '@/lib/security';
import { changeMarketingConsent } from '@/lib/server/marketing';
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !hasValidSameOrigin(request)) return NextResponse.json({error:'גישה נדחתה.'},{status:403});
  const body = await request.json().catch(() => null);
  if (typeof body?.consent !== 'boolean') return NextResponse.json({error:'קלט לא תקין.'},{status:400});
  try { await changeMarketingConsent(session.userId, body.consent, 'account'); return NextResponse.json({message:'העדפת הדיוור נשמרה.'}); }
  catch { return NextResponse.json({error:'העדכון נכשל. יש לנסות שוב.'},{status:503}); }
}
