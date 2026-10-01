import { DepartmentIndexPanel } from './department-index-panel';
import { publicDepartmentIndex } from '@/lib/career-fit/department-index';
import type { Department, matchDepartments } from '@/lib/career-fit/scoring';
type Row=ReturnType<typeof matchDepartments>['comparable'][number];
const names={region:'אזור',hospital:'מוסד',type:'סוג מסגרת'};
export function DepartmentScores({department,row}:{department:Department;row:Row}) {
 const base=publicDepartmentIndex(department);
 return <div className="my-4 grid gap-3 sm:grid-cols-2">
  <DepartmentIndexPanel department={department}/>
  <section className="rounded-xl border border-brand-200 bg-brand-50 p-4"><h5 className="font-bold">התאמה להעדפות שלך</h5>{row.score===null?<p className="mt-2 font-semibold">{row.group==='unverified'?'תנאי חובה שטרם אומתו':row.group==='insufficient'?'אין כיסוי מלא להעדפות שנבחרו':'בחר/י העדפה ומשקל לחישוב'}</p>:<p dir="ltr" className="my-2 text-right text-3xl font-black text-brand-800" data-personal-score>{Math.round(row.score*100)}/100</p>}<p className="text-xs">התאמה לערכים שסימנת בלבד; אינה איכות, סיכוי קבלה או הצלחה. אינה תלויה בשאלון התחומים.</p><details className="mt-2 text-sm"><summary className="min-h-[44px] cursor-pointer py-2 font-semibold">למה הציון הזה?</summary>{row.contributions.map(c=><p key={c.factor}>{names[c.factor]}: {c.matches?'תואם (1)':'אינו תואם (0)'} × משקל {c.weight}; תרומה {Number((c.contribution*100).toFixed(2))} נקודות.</p>)}<p>{row.facts.some(f=>!f.hard)?`כיסוי העדפות נתמכות: ${Math.round(row.coverage*100)}%.`:'אין העדפות רכות פעילות.'} תנאי חובה מסננים בנפרד. מכנה קבוע: סכום כל משקלי ההעדפות הרכות הנתמכות שנבחרו. חוסר בנתון מונע ציון כולל; אין הקטנת המכנה.</p><p>מקור: הקטלוג הציבורי; שנת מדידה אינה זמינה. הוראה, מחקר, חשיפה, גודל וסביבת עבודה אינם בחישוב. גרסה <bdi>{base.version}</bdi>.</p></details></section>
 </div>;
}
