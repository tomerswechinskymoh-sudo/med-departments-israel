'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CareerFitVisibilityControl({ initial }: { initial: { enabled: boolean; available: boolean } }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function toggle() {
    setPending(true); setMessage('');
    try {
      const response = await fetch('/api/admin/career-fit-visibility', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !enabled })
      });
      const result = await response.json();
      if (!response.ok || typeof result.enabled !== 'boolean') throw new Error('Update failed');
      setEnabled(result.enabled);
      setMessage(result.enabled ? 'השאלון מוצג כעת באתר.' : 'השאלון הוסתר מהאתר. אפשר להחזיר אותו כאן בכל עת.');
      router.refresh();
    } catch { setMessage('העדכון לא אושר. יש לרענן את העמוד ולנסות שוב.'); }
    finally { setPending(false); }
  }
  return <section data-career-fit-control className="rounded-2xl border border-brand-100 bg-white p-5" aria-labelledby="career-fit-visibility-title">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 id="career-fit-visibility-title" className="text-xl font-bold">שאלון בחירת התמחות (Beta)</h2>
        <p className="mt-1 text-sm text-slate-600">{enabled ? 'מוצג באתר' : 'מוסתר מהאתר'} · ההסתרה אינה מוחקת את השאלון.</p></div>
      <button type="button" disabled={pending || !initial.available} onClick={toggle} className="min-h-11 rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700">
        {pending ? 'שומר…' : enabled ? 'הסתרת השאלון מהאתר' : 'הצגת השאלון באתר'}
      </button>
    </div>
    <p role="status" className="mt-2 text-sm">{initial.available ? message : 'לא ניתן לקרוא את ההגדרה כרגע. יש לרענן את העמוד.'}</p>
  </section>;
}
