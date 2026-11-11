import { NextResponse } from 'next/server';
import { readUnsubscribeToken, changeMarketingConsent } from '@/lib/server/marketing';
export const dynamic = 'force-dynamic';
const headers = {'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"};
function page(text: string, form = false, status = 200) {
  return new NextResponse(`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>העדפת דיוור | Hitmachut</title><main><h1>דיוור שיווקי</h1><p>${text}</p>${form ? '<form method="post"><button type="submit">ביטול הסכמה לדיוור שיווקי</button></form>' : ''}</main></html>`,{status,headers});
}
export async function GET(request: Request) {
  const userId = readUnsubscribeToken(new URL(request.url).searchParams.get('token') ?? '');
  return userId ? page('אפשר לבטל כאן ללא התחברות. הודעות שירות נחוצות ימשיכו להישלח לפי הצורך.',true) : page('הקישור אינו תקין.',false,400);
}
export async function POST(request: Request) {
  const userId = readUnsubscribeToken(new URL(request.url).searchParams.get('token') ?? '');
  if (!userId) return page('הקישור אינו תקין.',false,400);
  try { await changeMarketingConsent(userId,false,'email-unsubscribe'); return page('ההסכמה לדיוור שיווקי בוטלה. הודעות שירות נחוצות ימשיכו להישלח לפי הצורך.'); }
  catch { return page('הביטול לא הושלם. יש לנסות שוב.',true,503); }
}
