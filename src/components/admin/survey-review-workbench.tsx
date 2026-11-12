'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ReviewCard } from '@/components/departments/review-card';
import { SurveyReviewQuickCard, type SurveyQueueRow } from './survey-review-quick-card';
import { DISCLOSURE, type Candidate, type DepartmentOption, type RatingEvidence } from '@/lib/staz-survey/domain';
import type { ComponentAction, Decision } from '@/server/staz-survey/moderation';
const labels: Record<string, string> = { PENDING_REVIEW: 'ממתינות לבדיקה', NEEDS_MAPPING: 'דורשות שיוך', APPROVED: 'מאושרות', REJECTED: 'נדחו', mappingRequired: 'ללא הצעת שיוך בטוחה', displayed: 'מוצגות כרגע', hiddenBySource: 'מאושרות המוסתרות באמצעות המקור', withRatings: 'עם דירוג מאומת מוצע' };
const errors: Record<string, string> = { FORBIDDEN: 'נדרשת כניסת אדמין.', INVALID_ORIGIN: 'הבקשה נדחתה. רעננו את העמוד.', STALE_REVISION: 'הרשומה השתנתה בחלון אחר. יש לפתוח אותה שוב.', WORKBOOK_VERIFICATION_REQUIRED: 'נדרשת הצלבה עם קובץ המקור בייבוא המקומי לפני אישור.', MAPPING_CONFIRMATION_REQUIRED: 'יש לבחור ולאשר מחלקת יעד.', HOSPITAL_EXCEPTION_REASON_REQUIRED: 'המוסד אינו תואם או אינו מזוהה. יש לכתוב נימוק חריג מפורט.', HOSPITAL_SCOPE_REASON_REQUIRED: 'זו תגובה על כלל בית החולים. נדרש נימוק מפורש להצגתה במחלקה.', PRIVACY_REVIEW_REQUIRED: 'יש להשלים בדיקת פרטיות ידנית.', SELECT_CONTENT: 'יש לבחור טקסט, דירוגים או את שניהם.', TEXT_REQUIRED: 'יש להזין טקסט לפרסום.', SELECT_VERIFIED_METRIC: 'יש לבחור לפחות מדד מאומת אחד.', PERMISSION_REQUIRED: 'הפרסום חסום עד לתיעוד היתר שימוש במקור.', DOCUMENTED_PERMISSION_REQUIRED: 'נדרשים אסמכתה ושני אישורי זכויות מפורשים.', INVALID_RATING_EVIDENCE: 'המדד אינו שייך לרשומה או אינו מאומת.' };
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
type QueueRow = SurveyQueueRow;
type Source = { isPublicEnabled: boolean; permissionConfirmedAt: string | null; permissionEvidence: string | null; revision: number };
type Queue = { source: Source; rows: QueueRow[]; total: number; page: number; nextCursor: string | null; counts: Record<string, number>; catalog: DepartmentOption[]; facets: { hospitals: string[]; departments: string[]; questions: string[]; years: number[] }; latestImports: { id: string; createdAt: string; report: Record<string, unknown> }[] };
type Detail = Omit<QueueRow, 'ratings'> & { original: Candidate; revision: number; approvedPublicText: string | null; publishText: boolean; publishRatings: boolean; privacyReviewed: boolean; mappingExceptionReason: string | null; adminNotes: string | null; mappedInstitutionId: string | null; reviewedByName: string | null; reviewedAt: string | null; ratings: (RatingEvidence & { id: string; selected: boolean })[]; audit: { id: string; action: string; createdAt: string; actor: { fullName: string } | null }[] };
async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, { cache: 'no-store', ...init }); const body = await r.json();
  if (!r.ok) throw new Error(errors[body.error] ?? 'הפעולה לא הושלמה. בדקו את הקלט ונסו שוב.'); return body;
}
function date(v: string) { return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(new Date(v)); }
function Report({ report }: { report: Record<string, unknown> }) {
  const names: Record<string, string> = { read: 'שורות שנקראו', inserted: 'חדשות', existing: 'קיימות', duplicates: 'כפילויות בקובץ', changed: 'מקור שונה — הרשומה הקיימת נשמרה', needsMapping: 'ללא הצעת שיוך בטוחה', suggested: 'עם הצעת שיוך', withVerifiedRating: 'עם דירוג אישי מאומת', withoutRating: 'ללא דירוג אישי מתאים', hospitalScope: 'כלל בית החולים', sourceVerified: 'מקור מאומת', errors: 'שגיאות', enriched: 'הצלבות מקור שנוספו' };
  return <div className="space-y-2"><dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">{Object.entries(names).filter(([k]) => report[k] !== undefined).map(([k, name]) => <div key={k} className="rounded bg-slate-50 p-2 text-sm"><dt>{name}</dt><dd className="font-bold">{String(report[k])}</dd></div>)}</dl>{typeof report.note === 'string' && <p className="text-sm text-amber-800">{report.note}</p>}{Array.isArray(report.conflicts) && report.conflicts.length > 0 && <details><summary>רשומות עם שינוי מקור</summary><pre dir="ltr" className="max-h-48 overflow-auto text-xs">{JSON.stringify(report.conflicts, null, 2)}</pre></details>}</div>;
}
export function SurveyReviewWorkbench() {
  const [data, setData] = useState<Queue | null>(null), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ page: '1' }), [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null), [decision, setDecision] = useState<Decision | null>(null), [targetSearch, setTargetSearch] = useState('');
  const [busy, setBusy] = useState(false), [file, setFile] = useState<File | null>(null), [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [evidence, setEvidence] = useState(''), [rights, setRights] = useState(false), [scope, setScope] = useState(false);
  const requestId = useRef(0), detailId = useRef(0), dialogRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null), moreBusy = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false), [moreError, setMoreError] = useState('');
  useEffect(() => {
    if (!detail) return;
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialogRef.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, [detail?.id]);
  const load = useCallback(async () => {
    const n = ++requestId.current; setLoading(true); setMoreError('');
    try { const value = await api('/api/admin/survey-reviews?' + new URLSearchParams(filters)); if (n === requestId.current) setData(value); }
    catch (e) { if (n === requestId.current) setError((e as Error).message); }
    finally { if (n === requestId.current) setLoading(false); }
  }, [filters]);
  useEffect(() => { void load(); }, [load]);
  const loadMore = useCallback(async () => {
    if (!data?.nextCursor || moreBusy.current || loading) return;
    const generation = requestId.current; moreBusy.current = true; setLoadingMore(true); setMoreError('');
    try {
      const value: Queue = await api('/api/admin/survey-reviews?' + new URLSearchParams({ ...filters, cursor: data.nextCursor }));
      if (generation === requestId.current) setData(current => current ? { ...current, nextCursor: value.nextCursor, counts: value.counts, rows: [...current.rows, ...value.rows.filter(r => !current.rows.some(old => old.id === r.id))] } : current);
    } catch (e) { if (generation === requestId.current) setMoreError((e as Error).message); }
    finally { moreBusy.current = false; setLoadingMore(false); }
  }, [data?.nextCursor, filters, loading]);
  useEffect(() => {
    if (!moreRef.current || !data?.nextCursor || moreError) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) void loadMore(); }, { rootMargin: '600px' });
    observer.observe(moreRef.current); return () => observer.disconnect();
  }, [loadMore, data?.nextCursor, moreError]);
  async function saveComponent(id: string, action: ComponentAction) {
    const result = await api('/api/admin/survey-reviews/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) });
    const updated: QueueRow = await api('/api/admin/survey-reviews/' + id);
    // Keep the card in place so its second button remains available, even in a status filter.
    setData(current => {
      if (!current) return current;
      const old = current.rows.find(r => r.id === id), counts = { ...current.counts };
      if (old && old.status !== updated.status) { counts[old.status] = Math.max(0, (counts[old.status] ?? 0) - 1); counts[updated.status] = (counts[updated.status] ?? 0) + 1; }
      return { ...current, counts, rows: current.rows.map(r => r.id === id ? updated : r) };
    });
    return result;
  }
  const filter = (key: string, value: string) => setFilters(v => ({ ...v, [key]: value, page: '1' }));
  async function run(fn: () => Promise<void>) { setBusy(true); setError(''); setMessage(''); try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function open(id: string) {
    const n = ++detailId.current; setDetail(null); setDecision(null); setTargetSearch('');
    await run(async () => { const r: Detail = await api('/api/admin/survey-reviews/' + id); if (n !== detailId.current) return; setDetail(r); setDecision({ revision: r.revision, action: 'SAVE', targetDepartmentId: r.targetDepartmentId, mappingConfirmed: r.mappingConfirmed,
      mappingExceptionReason: r.mappingExceptionReason ?? '', approvedPublicText: r.approvedPublicText ?? r.original.proposedText, publishText: r.publishText, publishRatings: r.publishRatings,
      selectedMetricIds: r.ratings.filter(v => v.selected).map(v => v.id), privacyReviewed: r.privacyReviewed, adminNotes: r.adminNotes ?? '' }); });
  }
  async function sourceAction(action: string) {
    if (!data || !window.confirm(action === 'HIDE' ? 'להסתיר מיד את כל הטקסטים והדירוגים מהסקר, גם אלה שכבר אושרו? הנתונים וההחלטות יישמרו.' : action === 'ENABLE' ? 'להפעיל את המקור? רק רשומות שאושרו ידנית וכוללות הרשאת שימוש יוצגו.' : 'לשמור את החלטת הזכויות? שינוי זה משאיר את המקור כבוי עד להפעלה נפרדת.')) return;
    await run(async () => { await api('/api/admin/survey-reviews/source', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: data.source.revision, action, confirmed: true, evidence, authorizedByController: rights, permitsTextAndRatings: scope }) }); setMessage('הגדרת המקור נשמרה.'); await load(); });
  }
  async function upload(commit: boolean) {
    if (!file) return;
    await run(async () => { const form = new FormData(); form.set('file', file); form.set('commit', String(commit)); if (commit) form.set('previewHash', String(report?.previewHash ?? '')); const result = await api('/api/admin/survey-reviews/import', { method: 'POST', body: form }); setReport(result); if (commit) { setMessage('הייבוא הושלם. לא פורסם תוכן.'); await load(); } });
  }
  async function save(action: Decision['action']) {
    if (!detail || !decision) return;
    if (action === 'APPROVE' && !window.confirm('לאשר את הפריט היחיד הזה לפי בחירת הטקסט והמדדים? הפרסום בפועל עדיין מותנה בזכויות ובמתג המקור.')) return;
    await run(async () => { const result = await api('/api/admin/survey-reviews/' + detail.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...decision, action }) });
      setDetail(null); setDecision(null); setMessage(result.approvalInvalidated ? 'השינוי נשמר והפריט הוחזר לבדיקה. יש לפתוח ולאשר שוב את הגרסה החדשה.' : 'ההחלטה נשמרה: ' + labels[result.status]); await load(); });
  }
  const target = data?.catalog.find(d => d.id === decision?.targetDepartmentId);
  const targetOptions = data?.catalog.filter(d => !targetSearch || `${d.institution.name} ${d.name} ${d.specialty.name}`.includes(targetSearch)).slice(0, 150) ?? [];
  const departmentLabel = (id: string | null) => { const d = data?.catalog.find(c => c.id === id); return d ? `${d.institution.name} · ${d.name}` : 'לא נקבע'; };
  return <div dir="rtl" className="space-y-6">
    <Link href="/admin" className="text-sm underline">חזרה לניהול</Link>
    <header><p className="text-xs font-bold text-brand-700">ניהול חוויות</p><h1 className="mt-1 text-3xl font-black text-ink">תגובות סקר הסטאז׳</h1><p className="mt-2 text-sm leading-7 text-slate-600">קוראים, בודקים את המחלקה ומפרסמים. התגובה והציון נבחרים בנפרד, ישירות ברשימה.</p></header>
    <div aria-live="polite">{error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-800">{error}</p>}{message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-800">{message}</p>}{loading && <p>טוען את התור…</p>}</div>
    {data && <>
      <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-brand-900">{data.source.isPublicEnabled ? 'מקור הסקר פעיל' : 'מקור הסקר כבוי — אישורים נשמרים ללא פרסום'}</p><p className="mt-1 text-xs leading-6 text-slate-600">{data.source.permissionConfirmedAt ? 'היתר שימוש מתועד.' : 'זכויות השימוש טרם אושרו.'} פרסום בפועל דורש היתר והפעלת המקור.</p></div><Button variant="secondary" className="text-rose-800" disabled={busy} onClick={() => sourceAction('HIDE')}>הסתר את כל חוויות סקר הסטאז׳ מהאתר</Button></div>
        <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-brand-800">הגדרות מקור, זכויות וייבוא</summary><div className="mt-4 space-y-4 border-t border-brand-200 pt-4">
        <Button variant="secondary" disabled={busy || !data.source.permissionConfirmedAt || data.source.isPublicEnabled} onClick={() => sourceAction('ENABLE')}>הפעל רק תוכן שאושר</Button>
        <details><summary className="cursor-pointer font-bold">תיעוד זכויות השימוש</summary><div className="mt-3 space-y-3">
          {data.source.permissionEvidence && <p className="text-sm">אסמכתה קיימת: {data.source.permissionEvidence}</p>}
          <label className="block text-sm">אסמכתה להיתר מבעל השליטה בסקר<textarea value={evidence} onChange={e => setEvidence(e.target.value)} className={field} maxLength={2000} placeholder="מסמך / תאריך / היקף ההרשאה שנבדקו" /></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)} />בדקתי היתר מפורש מבעל השליטה בסקר; הסכמה עקרונית אינה היתר.</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={scope} onChange={e => setScope(e.target.checked)} />ההיתר מכסה פרסום טקסטים ודירוגים נבחרים ב־hitmachut.org.</label>
          <div className="flex flex-wrap gap-2"><Button disabled={busy || !rights || !scope || evidence.trim().length < 12} onClick={() => sourceAction('CONFIRM_PERMISSION')}>שמור היתר והשאר מקור כבוי</Button><Button variant="secondary" disabled={busy || !data.source.permissionConfirmedAt} onClick={() => sourceAction('REVOKE_PERMISSION')}>בטל היתר והסתר מקור</Button></div>
        </div></details>
      <Card><details><summary className="cursor-pointer text-lg font-bold">ייבוא CSV ודוחות קליטה</summary><div className="mt-4 space-y-4">
        <p className="text-sm leading-6">עד 3MB. תחילה בדיקת קובץ ותצוגת דוח, ורק לאחר מכן קליטה. ייבוא חוזר שומר החלטות. קובץ XLSM מוצלב מקומית בלבד ללא הפעלת מאקרו; רשומות חדשות מ־CSV בלבד חסומות לאישור עד להצלבה.</p>
        <label className="block text-sm">קובץ מועמדות<input type="file" accept=".csv,text/csv" className={field} onChange={e => { setFile(e.target.files?.[0] ?? null); setReport(null); }} /></label>
        <div className="flex flex-wrap gap-2"><Button disabled={!file || busy} onClick={() => upload(false)}>בדוק והצג דוח</Button><Button variant="secondary" disabled={!report?.previewHash || busy} onClick={() => upload(true)}>קלוט לתור הפרטי</Button></div>
        {report && <Report report={report} />}
        {data.latestImports.map(r => <details key={r.id}><summary className="cursor-pointer text-sm">דוח ייבוא · {date(r.createdAt)}</summary><Report report={r.report} /></details>)}
      </div></details></Card>
        </div></details>
      </div>
      <section aria-label="תור התגובות" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-4 text-sm"><span><strong>{data.counts.PENDING_REVIEW ?? 0}</strong> בהמתנה</span><span><strong>{data.counts.APPROVED ?? 0}</strong> מאושרות</span><span><strong>{data.total}</strong> בתוצאה</span></div><button type="button" className="min-h-9 px-2 text-xs text-brand-800 underline" disabled={loading} onClick={() => void load()}>רענון התור</button></div>
        <details className="rounded-lg border border-brand-100 bg-white p-3"><summary className="cursor-pointer text-sm font-semibold text-brand-800">חיפוש וסינון התגובות</summary>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); filter('q', String(new FormData(e.currentTarget).get('q') ?? '')); }}>
          <label className="text-sm">חיפוש בטקסט ובמקור<div className="flex gap-1"><input name="q" className={field} maxLength={150} placeholder="טקסט לחיפוש" /><Button type="submit" variant="secondary">חפש</Button></div></label>
          <label className="text-sm">סטטוס<select aria-label="סטטוס" className={field} value={filters.status ?? ''} onChange={e => filter('status', e.target.value)}><option value="">כל הסטטוסים</option>{['PENDING_REVIEW','NEEDS_MAPPING','APPROVED','REJECTED'].map(v => <option key={v} value={v}>{labels[v]}</option>)}</select></label>
          {([['hospital','בית חולים',data.facets.hospitals],['department','מחלקת מקור',data.facets.departments],['question','שאלת מקור',data.facets.questions],['year','שנת סקר',data.facets.years.map(String)]] as const).map(([key, label, values]) => <label key={key} className="text-sm">{label}<select aria-label={label} className={field} value={filters[key] ?? ''} onChange={e => filter(key, e.target.value)}><option value="">הכול</option>{values.map(v => <option key={v}>{v}</option>)}</select></label>)}
          <label className="text-sm">מחלקת יעד<select className={field} value={filters.target ?? ''} onChange={e => filter('target', e.target.value)}><option value="">כל היעדים</option>{data.catalog.map(d => <option key={d.id} value={d.id}>{d.institution.name} · {d.name}</option>)}</select></label>
          <div className="space-y-2 pt-5"><label className="flex gap-2 text-sm"><input type="checkbox" checked={filters.unmapped === 'true'} onChange={e => filter('unmapped', String(e.target.checked))} />רק ללא שיוך מאושר</label><label className="flex gap-2 text-sm"><input type="checkbox" checked={filters.ratings === 'true'} onChange={e => filter('ratings', String(e.target.checked))} />רק עם דירוג מוצע מאומת</label></div>
        </form>
        </details>
        <div className="space-y-5">{data.rows.map(r => <SurveyReviewQuickCard key={r.id} row={r} catalog={data.catalog} enabled={Boolean(data.source.isPublicEnabled && data.source.permissionConfirmedAt)} save={saveComponent} inspect={open} />)}</div>
        {!data.rows.length && <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">לא נמצאו תגובות בסינון הזה.</p>}
        <div ref={moreRef} className="flex justify-center py-4" aria-live="polite">{data.nextCursor ? <div className="text-center">{moreError && <p role="alert" className="mb-2 text-sm text-rose-800">{moreError}</p>}<Button variant="secondary" disabled={loading || loadingMore} onClick={() => void loadMore()}>{loadingMore ? 'טוען תגובות נוספות…' : 'טעינת תגובות נוספות'}</Button><p className="mt-2 text-xs text-slate-500">התגובות הבאות נטענות אוטומטית בגלילה.</p></div> : data.rows.length > 0 && <p className="text-sm text-slate-500">הגעתם לסוף הרשימה.</p>}</div>
      </section>
    </>}
    {detail && decision && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-2 sm:p-6" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="review-title" onKeyDown={e => {
      if (e.key === 'Escape' && !busy) setDetail(null);
      if (e.key === 'Tab') {
        const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href]')).filter(el => el.getClientRects().length > 0);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === e.currentTarget)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === e.currentTarget)) { e.preventDefault(); first?.focus(); }
      }
    }}><div className="mx-auto max-w-5xl space-y-5 rounded-xl bg-white p-4 shadow-xl sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><h2 id="review-title" className="text-2xl font-black">בדיקת תגובה · {detail.originalHospital}</h2><p className="mt-1 text-sm">{detail.originalDepartmentOrScope} · {detail.sourceYear} · {labels[detail.status]}</p><p dir="ltr" className="mt-1 text-xs text-slate-500">{detail.sourceReviewKey}</p></div><Button variant="secondary" disabled={busy} onClick={() => setDetail(null)}>סגור</Button></div>
      {error && <p role="alert" className="rounded bg-rose-50 p-3 text-rose-800">{error}</p>}
      {!detail.sourceVerified && <p className="rounded bg-amber-50 p-3 text-sm">המקור טרם הוצלב עם XLSM. ניתן לערוך ולשייך, אך האישור חסום.</p>}
      <div className="grid gap-4 md:grid-cols-2"><section><h3 className="font-bold">טקסט המקור — לשימוש פנימי</h3><p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-7">{detail.original.originalText}</p><p className="mt-2 text-xs">מקור: {detail.original.rawHospital} · {detail.original.rawDepartment || 'כלל בית החולים'} · {detail.sourceQuestion}</p></section>
        <label className="block font-bold">טקסט מנוקה לפרסום<textarea className={field + ' mt-2 min-h-48 leading-7'} value={decision.approvedPublicText} maxLength={12000} onChange={e => setDecision({ ...decision, approvedPublicText: e.target.value, privacyReviewed: false })} /><span className="text-xs font-normal">יש להסיר פרטים מזהים בלי לשנות את משמעות התגובה.</span></label></div>
      <section className="space-y-3 rounded-lg border border-slate-200 p-4"><h3 className="font-bold">שיוך מקור מול יעד</h3><p className="text-sm">הצעה: {departmentLabel(detail.suggestedDepartmentId)} · ביטחון: {{ EXACT_NAME: 'גבוהה — שם מדויק', UNIQUE_SPECIALTY: 'התמחות יחידה במוסד', NEEDS_MAPPING: 'דורש בירור' }[detail.mappingConfidence] ?? detail.mappingConfidence}</p><p className="text-sm text-slate-600">{detail.mappingReason}</p>
        <label className="block text-sm">חיפוש מחלקת יעד קיימת<input value={targetSearch} onChange={e => setTargetSearch(e.target.value)} className={field} placeholder="בית חולים, מחלקה או התמחות" /></label>
        <label className="block text-sm">מחלקת יעד<select className={field} value={decision.targetDepartmentId ?? ''} onChange={e => setDecision({ ...decision, targetDepartmentId: e.target.value || null, mappingConfirmed: false })}><option value="">בחרו במפורש מחלקה</option>{target && !targetOptions.some(d => d.id === target.id) && <option value={target.id}>{departmentLabel(target.id)}</option>}{targetOptions.map(d => <option key={d.id} value={d.id}>{d.institution.name} · {d.name} · {d.specialty.name}</option>)}</select></label><p className="text-xs text-slate-500">מוצגות עד 150 התאמות. צמצמו את החיפוש לפי הצורך.</p>
        {target && target.institutionId !== detail.mappedInstitutionId && <p role="alert" className="rounded bg-amber-50 p-3 text-sm text-amber-900">אזהרה: מוסד היעד שונה ממוסד המקור או שמוסד המקור אינו מזוהה. נדרש אישור חריג מנומק.</p>}
        {detail.original.sourceColumnLetter === 'BG' && <p className="rounded bg-amber-50 p-3 text-sm">התגובה מתייחסת לכלל בית החולים. אין דירוג מחלקה. שיוך ידני דורש נימוק ותווית ההקשר תישאר גלויה.</p>}
        <label className="block text-sm">נימוק חריג / הקשר כלל בית החולים<textarea className={field} value={decision.mappingExceptionReason} maxLength={1000} onChange={e => setDecision({ ...decision, mappingExceptionReason: e.target.value })} /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={decision.mappingConfirmed} onChange={e => setDecision({ ...decision, mappingConfirmed: e.target.checked })} />בדקתי ואישרתי בעצמי את שיוך המקור למחלקת היעד, לרבות חריג מנומק אם נדרש.</label>
      </section>
      <section className="space-y-3 rounded-lg border border-slate-200 p-4"><h3 className="font-bold">בחירת רכיבים לפרסום</h3><div className="flex flex-wrap gap-5"><label className="flex gap-2"><input type="checkbox" checked={decision.publishText} onChange={e => setDecision({ ...decision, publishText: e.target.checked })} />פרסם טקסט</label><label className="flex gap-2"><input type="checkbox" disabled={detail.original.sourceColumnLetter === 'BG' || !detail.ratings.some(r => r.verified)} checked={decision.publishRatings} onChange={e => setDecision({ ...decision, publishRatings: e.target.checked })} />פרסם דירוגים שנבחרו</label></div>
        <p className="text-sm text-slate-600">בחירת טקסט אינה מאשרת ציונים. דירוג בלבד משפיע רק על מדד הסקר המתאים ואינו יוצר כרטיס טקסט ריק.</p>
        {!detail.ratings.length && <p className="text-sm">ללא דירוג מחלקה מתאים.</p>}
        {detail.ratings.map(r => <label key={r.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm"><input type="checkbox" className="mt-1" disabled={!r.verified || r.normalizedValue === null} checked={decision.selectedMetricIds.includes(r.id)} onChange={e => setDecision({ ...decision, selectedMetricIds: e.target.checked ? [...decision.selectedMetricIds, r.id] : decision.selectedMetricIds.filter(id => id !== r.id) })} /><span><strong>{r.label} · {r.normalizedValue ?? 'ללא ציון תקף'}</strong><span className="block">תשובת המקור: {r.rawAnswer || 'ריק'}</span><span className="block">{r.question}</span><span className="block text-xs text-slate-500">{r.questionCode} · {r.sourceColumn}{r.sourceRowNumber} · {r.rotationContext} · {r.scale} · {r.confidence}</span></span></label>)}
      </section>
      <section className="space-y-3"><h3 className="font-bold">בדיקת פרטיות ידנית</h3><p className="text-sm leading-7">יש לבדוק שמות, אנשי צוות ומטופלים, פרטי קשר, פרטים מזהים, אירועים נדירים והקשרים המאפשרים זיהוי. הסיווג החיובי והסימון האוטומטי אינם אישור פרטיות.</p><p className="text-xs text-amber-800">דגלי בדיקה: {detail.original.privacyFlags.join(' · ')}</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={decision.privacyReviewed} onChange={e => setDecision({ ...decision, privacyReviewed: e.target.checked })} />בדקתי ידנית את הטקסט, הדירוגים וההקשר ואין בהם פרטים מזהים או מידע על מטופלים לפרסום.</label><label className="block text-sm">הערות פנימיות<textarea className={field} maxLength={2000} value={decision.adminNotes} onChange={e => setDecision({ ...decision, adminNotes: e.target.value })} /></label></section>
      <details><summary className="cursor-pointer font-bold">תצוגה מקדימה בכרטיס החוויה הקיים</summary><div className="mt-3"><p className="mb-3 text-xs">{DISCLOSURE}</p>{decision.publishText ? <ReviewCard survey={{ id: detail.id, year: detail.sourceYear, text: decision.approvedPublicText, hospitalScope: detail.original.sourceColumnLetter === 'BG', ratings: decision.publishRatings ? detail.ratings.filter(r => decision.selectedMetricIds.includes(r.id) && r.verified && r.normalizedValue !== null).map(r => ({ code: r.metricCode, label: r.label, value: r.normalizedValue! })) : [] }} /> : <p className="rounded-lg bg-slate-50 p-4 text-sm">לא יפורסם כרטיס טקסט. רק מדדים שנבחרו ואושרו ייכללו בסיכום האלקטיב.</p>}</div></details>
      {detail.reviewedByName && <p className="text-xs text-slate-500">בדיקה אחרונה: {detail.reviewedByName} · {detail.reviewedAt ? date(detail.reviewedAt) : ''}</p>}
      <details><summary className="cursor-pointer text-sm">יומן החלטות</summary>{detail.audit.map(a => <p key={a.id} className="mt-2 text-xs">{date(a.createdAt)} · {a.actor?.fullName ?? 'מפעיל מערכת'} · {a.action}</p>)}</details>
      <div className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-white py-4"><Button disabled={busy || !detail.sourceVerified} onClick={() => save('APPROVE')}>אשר את הפריט</Button><Button variant="secondary" disabled={busy} onClick={() => save('SAVE')}>שמור והחזר לבדיקה</Button><Button variant="secondary" disabled={busy} onClick={() => save('NEEDS_MAPPING')}>נדרשת התאמה</Button><Button variant="danger" disabled={busy} onClick={() => save('REJECT')}>דחה</Button></div>
    </div></div>}
  </div>;
}
