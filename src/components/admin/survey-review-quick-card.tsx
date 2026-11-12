'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { DepartmentOption, RatingEvidence } from '@/lib/staz-survey/domain';
import type { ComponentAction } from '@/server/staz-survey/moderation';

export type SurveyQueueRow = {
  id: string; revision: number; sourceReviewKey: string; sourceYear: number; sourceColumnLetter: string;
  originalHospital: string; originalDepartmentOrScope: string; sourceQuestion: string; status: string;
  mappingConfidence: string; mappingReason: string; suggestedDepartmentId: string | null; targetDepartmentId: string | null;
  mappedInstitutionId: string | null; mappingConfirmed: boolean; mappingExceptionReason: string | null; sourceVerified: boolean;
  text: string; privacyFlags: string[]; publishText: boolean; publishRatings: boolean;
  ratings: (RatingEvidence & { id: string; selected: boolean })[];
};
const field = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100';

export function SurveyReviewQuickCard({ row, catalog, enabled, save, inspect }: {
  row: SurveyQueueRow; catalog: DepartmentOption[]; enabled: boolean;
  save: (id: string, action: ComponentAction) => Promise<{ otherComponentReset: boolean }>;
  inspect: (id: string) => void;
}) {
  const uid = useId();
  const [targetId, setTargetId] = useState(row.targetDepartmentId ?? row.suggestedDepartmentId ?? '');
  const [text, setText] = useState(row.text), [editing, setEditing] = useState(false), [choosing, setChoosing] = useState(false), [search, setSearch] = useState('');
  const [reason, setReason] = useState(row.mappingExceptionReason ?? ''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  useEffect(() => {
    setTargetId(row.targetDepartmentId ?? row.suggestedDepartmentId ?? ''); setReason(row.mappingExceptionReason ?? '');
  }, [row.revision, row.targetDepartmentId, row.suggestedDepartmentId, row.mappingExceptionReason]);
  // Publishing a rating must not discard an unrelated text draft.
  useEffect(() => { setText(row.text); }, [row.text]);
  const target = catalog.find(d => d.id === targetId);
  const options = useMemo(() => catalog.filter(d => `${d.institution.name} ${d.name} ${d.specialty.name}`.includes(search.trim()))
    .sort((a, b) => Number(b.institutionId === row.mappedInstitutionId) - Number(a.institutionId === row.mappedInstitutionId)).slice(0, 60), [catalog, search, row.mappedInstitutionId]);
  const hospitalScope = row.sourceColumnLetter === 'BG';
  const exception = Boolean(target && (hospitalScope || target.institutionId !== row.mappedInstitutionId));
  const mappingChanged = row.targetDepartmentId !== targetId || (row.mappingExceptionReason ?? '') !== reason.trim();
  const textApproved = row.status === 'APPROVED' && row.publishText;
  const ready = row.sourceVerified && Boolean(target) && (!exception || reason.trim().length >= 12);
  const validRatings = row.ratings.filter(r => r.verified && r.normalizedValue !== null);
  async function act(component: ComponentAction['component'], action: ComponentAction['action'], metricId?: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await save(row.id, { revision: row.revision, component, action, targetDepartmentId: targetId || null, mappingExceptionReason: reason, reviewed: true,
        ...(component === 'TEXT' && action === 'PUBLISH' ? { text } : {}), ...(metricId ? { metricId } : {}) });
      setEditing(false);
      setMessage(action === 'HIDE' ? 'האישור לרכיב בוטל.' : (enabled ? 'פורסם.' : 'אושר. יוצג רק לאחר אישור זכויות והפעלת המקור.') + (result.otherComponentReset ? ' השיוך השתנה — הרכיב השני דורש אישור מחדש.' : ''));
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <article aria-label={`תגובה: ${row.originalHospital}, ${row.originalDepartmentOrScope}`} className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm" data-review-id={row.id}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-6">
      <p className="text-sm font-semibold text-ink">{row.originalHospital}<span className="mx-2 text-slate-300" aria-hidden="true">/</span>{row.originalDepartmentOrScope}</p>
      <span className="text-xs text-slate-500">סקר {row.sourceYear}{hospitalScope ? ' · כלל בית החולים' : ''}</span>
    </div>
    <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-8">
      <div className="min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-bold text-slate-500">התגובה</h3><button type="button" className="min-h-9 px-2 text-xs font-semibold text-brand-800 underline underline-offset-4" disabled={busy} onClick={() => setEditing(v => !v)}>{editing ? 'סיום עריכה' : 'עריכת טקסט'}</button></div>
        {editing ? <label className="block text-sm">טקסט לפרסום<textarea className={`${field} mt-2 min-h-32`} value={text} maxLength={12000} onChange={e => setText(e.target.value)} /></label> : <p className="whitespace-pre-wrap break-words text-base leading-8 text-ink">{text}</p>}
        {text !== row.text && <p className="text-xs text-amber-900">השינוי בטקסט יישמר רק בלחיצה על פרסום התגובה.</p>}
        {row.privacyFlags.some(flag => flag !== 'HUMAN_PRIVACY_REVIEW_REQUIRED') && <p className="text-xs leading-6 text-amber-900">זוהה הקשר שעשוי לכלול פרטים מזהים. יש לבדוק ולהסיר אותם לפני פרסום.</p>}
        <div className="rounded-lg bg-brand-50/60 p-3">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{row.mappingConfirmed && !mappingChanged ? 'מחלקה שנבחרה' : 'המחלקה המוצעת'}</p><p className="mt-1 break-words text-sm font-bold text-brand-900">{target ? `${target.institution.name} · ${target.name}` : 'לא נמצאה התאמה בטוחה — בחרו מחלקה'}</p></div>{target && <button type="button" className="min-h-9 shrink-0 px-2 text-sm font-semibold text-brand-800 underline underline-offset-4" disabled={busy} onClick={() => setChoosing(v => !v)}>{choosing ? 'סגירה' : 'החלפה'}</button>}</div>
          {(choosing || !target) && <div className="mt-3 space-y-2"><label htmlFor={`${uid}-search`} className="block text-xs">חיפוש מחלקה או בית חולים</label><input id={`${uid}-search`} className={field} value={search} onChange={e => setSearch(e.target.value)} placeholder="הקלידו שם מחלקה או בית חולים" />
            <label htmlFor={`${uid}-target`} className="block text-xs">מחלקה לפרסום</label><select id={`${uid}-target`} className={field} value={targetId} onChange={e => { setTargetId(e.target.value); setChoosing(false); setError(''); }}><option value="">בחרו מחלקה</option>{target && !options.some(d => d.id === target.id) && <option value={target.id}>{target.institution.name} · {target.name}</option>}{options.map(d => <option key={d.id} value={d.id}>{d.institution.name} · {d.name}</option>)}</select><p className="text-xs text-slate-500">עד 60 התאמות. חיפוש ממוקד מציג מחלקות נוספות.</p></div>}
          {exception && <label className="mt-3 block text-xs leading-6 text-amber-900">{hospitalScope ? 'תגובה על כלל בית החולים: הסבירו מדוע היא מתאימה למחלקה זו.' : 'המוסד שונה או אינו מזוהה: נדרש נימוק לשיוך.'}<textarea className={`${field} mt-1`} value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} placeholder="נימוק השיוך (12 תווים לפחות)" /></label>}
          {!row.sourceVerified && <p className="mt-2 text-xs text-amber-900">נדרשת הצלבה עם קובץ הסקר לפני אישור.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={busy || !ready || !text.trim() || (textApproved && !mappingChanged && text === row.text)} onClick={() => act('TEXT', 'PUBLISH')}>{textApproved && !mappingChanged && text === row.text ? (enabled ? 'התגובה פורסמה ✓' : 'התגובה אושרה ✓') : textApproved ? 'פרסום התגובה המעודכנת' : 'פרסום תגובה'}</Button>
          {textApproved && <button type="button" disabled={busy} className="min-h-11 px-2 text-xs text-slate-600 underline underline-offset-4" onClick={() => act('TEXT', 'HIDE')}>ביטול אישור התגובה</button>}
        </div>
      </div>
      <div className="min-w-0 space-y-4 border-t border-slate-100 pt-4 lg:border-r lg:border-t-0 lg:pr-6 lg:pt-0">
        <h3 className="text-xs font-bold text-slate-500">ציון המלצה</h3>
        {validRatings.length ? validRatings.map(r => {
          const approved = row.status === 'APPROVED' && row.publishRatings && r.selected;
          return <div key={r.id} className="space-y-3"><div className="flex items-baseline gap-2"><span className="text-4xl font-black tracking-tight text-brand-900">{r.normalizedValue}</span><span className="text-sm text-slate-500">מתוך 5</span></div><p className="text-sm text-slate-600">{r.label}</p>
            <Button className="w-full" variant="secondary" disabled={busy || !ready || (approved && !mappingChanged)} onClick={() => act('RATING', 'PUBLISH', r.id)}>{approved && !mappingChanged ? (enabled ? 'הציון פורסם ✓' : 'הציון אושר ✓') : 'פרסום ציון המלצה'}</Button>
            {approved && <button type="button" disabled={busy} className="min-h-9 text-xs text-slate-600 underline underline-offset-4" onClick={() => act('RATING', 'HIDE', r.id)}>ביטול אישור הציון</button>}
          </div>;
        }) : <p className="text-sm leading-7 text-slate-500">{hospitalScope ? 'תגובה כללית על בית החולים, ללא ציון מחלקה.' : 'אין ציון המלצה תקף לתגובה זו.'}</p>}
        <p className="text-xs leading-6 text-slate-500">התגובה והציון מאושרים בנפרד.</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 sm:px-6"><p className="max-w-3xl text-xs leading-6 text-slate-600">לחיצה על פרסום מאשרת שבדקתם את השיוך ואת הרכיב הנבחר, ושהוא אינו חושף פרטים מזהים או מידע על מטופלים.</p><button type="button" className="min-h-9 px-2 text-xs text-brand-800 underline underline-offset-4" disabled={busy} onClick={() => inspect(row.id)}>מקור ואפשרויות נוספות</button></div>
    {(busy || message || error) && <div className="border-t border-slate-100 px-4 py-3 text-sm sm:px-6" aria-live="polite">{busy && <p>שומר…</p>}{error ? <p role="alert" className="text-rose-800">{error}</p> : message && <p role="status" className="text-brand-800">{message}</p>}</div>}
  </article>;
}
