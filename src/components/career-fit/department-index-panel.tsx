import Link from 'next/link';
import { publicDepartmentIndex } from '@/lib/career-fit/department-index';
export function DepartmentIndexPanel({department}:{department:{id:string;specialtyId:string;hospital:string|null}}) {
 const base=publicDepartmentIndex(department);
 return <section className="rounded-xl border border-slate-200 bg-slate-50 p-4" data-department-index>
  <h5 className="font-bold">מדד המחלקה של Hitmachut</h5>
  {base.score===null?<p className="mt-2 font-semibold">אין מספיק נתונים לחישוב מדד המחלקה</p>:<p dir="ltr" className="my-2 text-right text-3xl font-black">{Math.round(base.score)}/100</p>}
  <p className="text-xs">מדד משוקלל המבוסס על הנתונים הזמינים באתר; זהה לכל המשתמשים.</p>
  <p className="mt-2 text-sm">כיסוי נתונים למדד: {Math.round(base.coverage*100)}%</p>
  <details className="mt-2 text-sm"><summary className="min-h-[44px] cursor-pointer py-2 font-semibold">{base.score===null?'למה אין מדד כולל?':'למה הציון הזה?'}</summary>
   {base.components.map(c=><p key={c.family}>{c.family}: {c.score===null?'אין נתונים':Math.round(c.score)} · משקל {c.weight}</p>)}
   <p>בבדיקת הנתונים ב־1.10.2026 אין ביקורות מתמחים שפורסמו למחלקות שבקטלוג. בחינות ושחיקה הן נתוני תחום ארציים. סקר אלקטיבים היסטורי אינו מדד לחוויית התמחות. פרסומים, ביקוש, זמן המתנה וגודל אינם בונוס למדד. מידע חסר אינו ציון 0.</p>
   <p>אוכלוסייה נדרשת: מתמחים; לפחות 5 משיבים מאומתים בכל מדד סקר ובתקופה מוגדרת. תקופת ייחוס למחלקה זו: {base.period??'לא זמינה'}.</p>
   <p>גרסת שיטה: <bdi>{base.version}</bdi></p>
   <Link className="inline-flex min-h-[44px] items-center underline" href="/career-fit/methodology#department-index">איך מחושב המדד?</Link>
  </details>
 </section>;
}
