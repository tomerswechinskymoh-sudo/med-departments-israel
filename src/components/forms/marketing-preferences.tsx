'use client';
import { useState } from 'react';
import { MARKETING_CONSENT_COPY, SERVICE_EMAIL_COPY } from '@/lib/marketing-consent';
export function MarketingPreferences({ initial }: { initial: boolean }) {
 const [checked,setChecked]=useState(initial), [busy,setBusy]=useState(false), [message,setMessage]=useState('');
 async function save(consent:boolean) {
  setBusy(true);setMessage('');
  try {const response=await fetch('/api/account/marketing-consent',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent})});if(!response.ok) throw new Error();setChecked(consent);setMessage('העדפת הדיוור נשמרה.');}
  catch {setMessage('השמירה נכשלה. יש לנסות שוב.');} finally {setBusy(false);}
 }
 return <section className="rounded-2xl border border-brand-100 bg-white p-5 space-y-3"><h2 className="text-xl font-bold">העדפות דואר</h2><label className="flex items-start gap-3"><input type="checkbox" checked={checked} disabled={busy} onChange={e=>save(e.target.checked)} aria-describedby="service-email-note"/><span>{MARKETING_CONSENT_COPY}</span></label><p id="service-email-note">{SERVICE_EMAIL_COPY}</p><p role="status">{message}</p></section>;
}
