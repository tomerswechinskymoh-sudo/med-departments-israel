'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { academicMetricDefinitions, ACADEMIC_MISSING_VALUE, type AcademicMetricValues } from '@/lib/department-academic-metrics';

export function DepartmentAcademicMetricsForm({ departmentId, initialValues }: { departmentId: string; initialValues: AcademicMetricValues }) {
  const [values, setValues] = useState(() => Object.fromEntries(academicMetricDefinitions.map(({ key }) => [key, initialValues[key]?.toString() ?? ''])));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  return <form id="academic-metrics" className="space-y-5 scroll-mt-24" onSubmit={async event => {
    event.preventDefault(); setPending(true); setMessage(''); setFailed(false);
    try {
      const response = await fetch(`/api/admin/departments/${departmentId}/academic-metrics`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(academicMetricDefinitions.map(({ key }) => [key, values[key].trim() === '' ? null : Number(values[key])])))
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'שמירת הנתונים נכשלה.');
      setMessage('הנתונים נשמרו ועודכנו בעמוד המחלקה.'); router.refresh();
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'שמירת הנתונים נכשלה.'); }
    finally { setPending(false); }
  }}>
    <div><h2 className="text-xl font-bold">פרופסורים ומעבר בחינות במחלקה</h2><p className="mt-2 text-sm leading-6 text-slate-600">מזינים אחוז בין 0 ל־100. שדה ריק יוצג כ״{ACADEMIC_MISSING_VALUE}״; 0 הוא נתון ממשי. נתוני התחום של הר״י מוצגים בנפרד ואינם משתנים כאן.</p></div>
    <fieldset disabled={pending} className="grid gap-4 md:grid-cols-3">
      {academicMetricDefinitions.map(({ key, label, description }) => <label key={key} className="block rounded-xl border border-slate-200 bg-slate-50 p-4">
        <span className="block text-sm font-bold">{label} (%)</span>
        <input type="number" min="0" max="100" step="any" inputMode="decimal" value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} placeholder="טרם סופק" className="mt-3 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-lg focus:border-brand-500" aria-describedby={`${key}-help`} />
        <span id={`${key}-help`} className="mt-2 block text-xs leading-5 text-slate-600">{description}</span>
      </label>)}
    </fieldset>
    <p className="text-sm text-slate-600">כותרות והסברים ניתנים לעריכה דרך סמל המידע ליד המדד בעמוד המחלקה. הצגת בחינות ושכר מנוהלת בנפרד ב<a className="font-bold underline" href="/admin#source-settings-title">הגדרות מקורות הנתונים</a>.</p>
    <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={pending} className="min-h-12 rounded-xl bg-brand-800 px-5 py-2 font-bold text-white disabled:opacity-50">{pending ? 'שומר...' : 'שמירת מדדי המחלקה'}</button><p role="status" className={`text-sm ${failed ? 'text-red-700' : 'text-emerald-800'}`}>{message}</p></div>
  </form>;
}
