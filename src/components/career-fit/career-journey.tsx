'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ClipboardHeartIcon, DepartmentDirectoryIcon, HospitalBuildingIcon } from '@/components/ui/med-icons';

const focus = 'min-h-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700 motion-reduce:transition-none';

export function CareerJourney({onStart,onDepartments,startDisabled=false}:{onStart:()=>void;onDepartments:()=>void;startDisabled?:boolean}) {
 return <div className="space-y-8">
  <ol aria-label="המסע שלכם להתמחות" className="relative grid gap-4 lg:grid-cols-3 lg:gap-6">
   <li className="relative">
    <Card className="relative flex h-full flex-col !border-brand-700 !bg-white !p-6 sm:!p-7">
     <div className="mb-6 flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white"><ClipboardHeartIcon className="h-7 w-7"/></span><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">כאן מתחילים</span></div>
     <p className="text-sm font-bold text-brand-600">שלב 01</p>
     <h2 className="mt-2 text-2xl font-bold text-ink">בחירת תחום התמחות</h2>
     <p className="mt-3 leading-7 text-slate-600">גלו אילו תחומי התמחות כדאי לבדוק לפי ההעדפות שלכם ואופי העבודה שמעניין אתכם.</p>
     <p className="mt-3 text-sm font-semibold text-brand-700">30 שאלות · כ-4–6 דקות</p>
     <ul className="my-6 space-y-2 text-sm text-brand-900">{['שאלון להיכרות עם ההעדפות שלכם','היכרות עם תחומי ההתמחות','כיוונים אישיים להמשך בירור'].map(text=><li key={text} className="flex gap-2"><span aria-hidden="true" className="font-bold text-teal-700">✓</span>{text}</li>)}</ul>
     <Button disabled={startDisabled} onClick={onStart} className={`${focus} mt-auto w-full gap-3`}>התחילו את שאלון ההתאמה<span aria-hidden="true">←</span></Button>
    </Card>
   </li>
   {[
    {step:'02',title:'הכנה להתמחות',description:'כלים שיסייעו לכם להתכונן לתהליך הקבלה ולבנות אסטרטגיית מועמדות.',Icon:DepartmentDirectoryIcon,detail:'התהליך הבא במסע שלכם'},
    {step:'03',title:'בחירת תוכנית',description:'השוו בין מחלקות ותוכניות התמחות בעזרת נתונים אמיתיים.',Icon:HospitalBuildingIcon,detail:'מהתחום המתאים למקום המתאים'}
   ].map(({step,title,description,Icon,detail})=><li key={step} className="relative pt-4 lg:pt-0">
    <span aria-hidden="true" className="absolute -top-3 right-1/2 h-6 w-px bg-brand-200 lg:-right-6 lg:top-14 lg:h-px lg:w-6"/>
    <Card className="flex h-full flex-col !border-brand-200 !bg-brand-50/60 !p-6 !shadow-none sm:!p-7">
     <div className="mb-6 flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-200 bg-white text-brand-700"><Icon className="h-7 w-7"/></span><span className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-bold text-brand-700">בקרוב</span></div>
     <p className="text-sm font-bold text-brand-600">שלב {step}</p><h2 className="mt-2 text-2xl font-bold text-ink">{title}</h2><p className="mt-3 leading-7 text-slate-600">{description}</p><p className="mt-auto pt-8 text-sm text-brand-700">{detail}</p>
    </Card>
   </li>)}
  </ol>
  <div className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
   <div><h2 className="font-bold text-ink">כבר יש לכם תחום בראש?</h2><p className="mt-1 text-sm text-slate-600">כלי ההעדפות הקיים למחלקות זמין כבר עכשיו, ללא מילוי השאלון.</p></div>
   <Button variant="secondary" onClick={onDepartments} className={`${focus} shrink-0`}>ישירות להעדפות מחלקה</Button>
  </div>
 </div>;
}
