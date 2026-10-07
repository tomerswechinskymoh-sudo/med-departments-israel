'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InstrumentGrid } from './instrument-grid';
import type { InstrumentDefinition } from '@/lib/career-fit/instruments';
import type { Answers } from '@/lib/career-fit/scoring';

const focus='min-h-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700 motion-reduce:transition-none';

export function QuestionnaireFlow({instrument,sections,itemIndex,answers,onAnswer,onBack,onNext,onSummary}:{
 instrument:InstrumentDefinition;sections:readonly string[];itemIndex:number;answers:Answers;
 onAnswer:(id:string,value:number|null|undefined)=>void;onBack:()=>void;onNext:()=>void;onSummary:()=>void;
}) {
 const section=instrument.items[itemIndex].section;
 const progress=useRef<HTMLDivElement>(null);
 const answered=instrument.items.filter(q=>Object.prototype.hasOwnProperty.call(answers,q.id)).length;
 const known=instrument.items.filter(q=>typeof answers[q.id]==='number').length;
 useEffect(()=>{if(progress.current&&(window.matchMedia('(max-width: 639px)').matches||progress.current.getBoundingClientRect().top<110))progress.current.scrollIntoView({block:'start',behavior:'instant'});},[itemIndex]);
 const overview=<ol className="space-y-2">{sections.map((label,index)=>{
  const items=instrument.items.filter(q=>q.section===index);
  const count=items.filter(q=>Object.prototype.hasOwnProperty.call(answers,q.id)).length;
  const complete=count===items.length;
  const current=section===index;
  return <li key={label} aria-current={current?'step':undefined} className={`flex gap-3 rounded-xl border p-3 ${current?'border-brand-200 bg-brand-50':'border-transparent'}`}>
   <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${current?'bg-brand-700 text-white':complete?'bg-teal-50 text-teal-800':'border border-slate-200 bg-white text-slate-600'}`}>{complete?'✓':index+1}</span>
   <div><p className={`text-sm font-semibold leading-6 ${current?'text-brand-900':'text-slate-600'}`}>{label}</p><p className="mt-1 text-xs text-slate-600">{current?'השלב הנוכחי · ':''}{complete?'הושלם':`${count} מתוך ${items.length} נענו`}</p></div>
  </li>;
 })}<li className="flex gap-3 rounded-xl p-3"><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-600">5</span><div><p className="text-sm font-semibold text-slate-600">סדרי עדיפויות</p><p className="mt-1 text-xs text-slate-600">לפני הצגת התוצאות</p></div></li></ol>;
 return <div className="space-y-5">
  <div ref={progress} className="scroll-mt-36 rounded-2xl border border-brand-100 bg-white px-5 py-4 sm:px-6">
   <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-brand-700">שלב {section+1} מתוך {sections.length+1} <span className="px-2 text-brand-200" aria-hidden="true">/</span>{sections[section]}</p><p className="text-sm text-slate-600">שאלה {itemIndex+1} מתוך {instrument.items.length}</p></div>
   <progress aria-label="התקדמות במענה לשאלון" max={instrument.items.length} value={answered} className="my-3 block h-2 w-full overflow-hidden rounded-full accent-teal-700 [&::-webkit-progress-bar]:bg-brand-50 [&::-webkit-progress-value]:bg-teal-700 [&::-moz-progress-bar]:bg-teal-700"/>
   <p className="text-xs text-slate-600">{answered} מתוך {instrument.items.length} שאלות נענו · {known} עם העדפה ידועה</p>
  </div>
  <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-7">
   <aside aria-label="שלבי השאלון" className="sticky top-28 hidden rounded-2xl border border-brand-100 bg-white p-3 lg:block"><h2 className="px-3 pb-3 pt-2 text-sm font-bold text-brand-900">הדרך לתוצאות שלכם</h2>{overview}<p className="px-3 pb-2 pt-4 text-xs leading-6 text-slate-600">אפשר לדלג ולחזור לשאלות. אין תשובה נכונה או לא נכונה.</p></aside>
   <div className="min-w-0 space-y-4">
    <details className="rounded-xl border border-brand-100 bg-white px-4 lg:hidden"><summary className="flex min-h-[48px] cursor-pointer items-center justify-between text-sm font-semibold text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700">כל שלבי השאלון<span aria-hidden="true">⌄</span></summary>{overview}</details>
    <Card className="!bg-white !p-5 sm:!p-7" data-question-card>
     <p className="mb-4 text-xs font-bold tracking-wide text-teal-800">העבודה שהייתי רוצה לעשות</p>
     <InstrumentGrid instrument={instrument} itemIndex={itemIndex} answers={answers} onAnswer={onAnswer}/>
     <div className="mt-4 border-t border-slate-100 pt-5">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button variant="secondary" className={focus} onClick={onBack}>חזרה</Button><Button className={`${focus} gap-3 sm:min-w-[180px]`} onClick={onNext}>{itemIndex===instrument.items.length-1?'המשך לסדרי העדיפויות':'המשך'}<span aria-hidden="true">←</span></Button></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-600">״לא יודע/ת״ ודילוג אינם העדפה בינונית.</p><button type="button" onClick={onSummary} className="min-h-[44px] rounded-lg text-sm font-semibold text-brand-700 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">סיכום ביניים</button></div>
     </div>
    </Card>
   </div>
  </div>
 </div>;
}
