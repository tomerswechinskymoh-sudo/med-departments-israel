import Link from 'next/link';
export function EvidenceAttribution({full=false}:{full?:boolean}) {
 return <section aria-label="מקורות והתאמות" className="space-y-3 rounded-xl border border-brand-100 bg-white p-4 text-sm leading-7 text-slate-600">
  <p>פריטי עניין רפואיים מקוריים על בסיס מסגרת RIASEC, בהשוואה ניסיונית לנתוני מאפייני מקצוע. אין טענה לתיקוף בעברית או לאישור מטעם מחברי המקורות. <Link className="font-semibold text-brand-700 underline" href="/career-fit/sources">מקורות, שיטה ומגבלות</Link></p>
  {full&&<><p dir="ltr" className="text-left text-xs leading-6">This page includes information from the <a className="underline" href="https://www.onetcenter.org/database.html">O*NET® 31.0 Database</a> by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> license. O*NET® is a trademark of USDOL/ETA. Hitmachut selected physician occupation rows and added an Israeli specialty crosswalk; original interest values are unchanged. USDOL/ETA has not approved, endorsed, or tested these modifications.</p><p>הניסוחים הרפואיים הם מקוריים ואינם תרגום של פריטי Interest Profiler. השימוש בנתוני המקצוע נפרד משאלון זה. פרטי המיפויים והערכים המקוריים מופיעים בטבלת הכיסוי.</p></>}
 </section>;
}
