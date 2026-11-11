'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SourceVisibility } from '@/lib/source-visibility';
export function SourceVisibilityControls({ initial }: { initial: SourceVisibility }) {
  const [flags, setFlags] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function toggle(source: 'ima' | 'duns100') {
    setPending(true); setMessage('');
    try {
      const response = await fetch('/api/admin/source-visibility', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({source, enabled: !flags[source]}) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setFlags(payload.settings); setMessage('ההגדרה נשמרה. התצוגה הציבורית עודכנה.'); router.refresh();
    } catch { setMessage('העדכון לא אושר. יש לרענן את העמוד ולנסות שוב.'); }
    finally { setPending(false); }
  }
  return <section className="rounded-2xl border border-brand-100 bg-white p-5 space-y-4" aria-labelledby="source-settings-title">
    <h2 id="source-settings-title" className="text-xl font-bold">מקורות נתונים בתצוגה הציבורית</h2>
    <p>הנתונים נשמרים במערכת גם כאשר התצוגה כבויה.</p>
    <div className="flex flex-wrap gap-3">{([['ima','הצגת נתוני הר״י'],['duns100','הצגת נתוני DUNS100']] as const).map(([key,label]) =>
      <button key={key} type="button" role="switch" aria-checked={flags[key]} disabled={pending} onClick={() => toggle(key)} className="min-h-12 rounded-xl border border-brand-300 px-4 py-2 text-brand-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
        {label}<span aria-hidden="true"> · {flags[key] ? 'פעיל' : 'כבוי'}</span>
      </button>)}</div><p role="status">{message}</p>
  </section>;
}
