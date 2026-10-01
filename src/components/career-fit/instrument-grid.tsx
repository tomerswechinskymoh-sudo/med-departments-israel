'use client';
import type { InstrumentDefinition } from '@/lib/career-fit/instruments';
import type { Answers } from '@/lib/career-fit/scoring';
export function InstrumentGrid({instrument,section,answers,onAnswer}:{instrument:InstrumentDefinition;section:number;answers:Answers;onAnswer:(id:string,value:number|null|undefined)=>void}) {
 const items=instrument.items.filter(q=>q.section===section);
 const choices=items[0]?.choices??[];
 const uniform=items.every(q=>JSON.stringify(q.choices)===JSON.stringify(choices));
 const columns=choices.length+(instrument.unknownLabel?1:0);
 // The renderer uses the supplied choices; it never creates a neutral default or a new scale.
 const grid=uniform?{gridTemplateColumns:`minmax(200px,2.2fr) repeat(${columns},minmax(0,1fr))`}:undefined;
 return <div className="rounded-2xl border border-brand-100 bg-white shadow-panel">
  {uniform&&<div aria-hidden="true" className="sticky top-20 z-10 hidden items-center gap-1 rounded-t-2xl border-b bg-brand-50 px-3 py-2 text-center text-xs font-semibold lg:grid" style={grid}><span className="text-right">העבודה שהייתי רוצה לעשות</span>{choices.map(c=><span key={c.value}>{c.label}</span>)}{instrument.unknownLabel&&<span>{instrument.unknownLabel}</span>}</div>}
  {items.map(q=><fieldset key={q.id} className="border-b border-slate-200 p-3 last:border-b-0">
   <legend className="sr-only">{q.text}</legend>
   <div className={uniform?'items-center gap-1 lg:grid':''} style={grid}>
    <div><p className="mb-2 font-semibold leading-6 lg:mb-0" aria-hidden="true">{q.text}</p>{instrument.allowClear&&<button type="button" className="min-h-[44px] px-1 text-xs text-brand-700 underline" onClick={()=>onAnswer(q.id,undefined)}>דלג/י על השאלה ונקה/י תשובה</button>}</div>
    <div className={uniform?'grid grid-cols-3 gap-1 lg:contents':'grid grid-cols-2 gap-1 sm:grid-cols-3'}>
     {q.choices.map(c=><label key={c.value} className={`flex min-h-[44px] cursor-pointer items-center justify-center gap-1 rounded-lg border p-2 text-center text-xs has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-700 ${answers[q.id]===c.value?'border-brand-700 bg-brand-100 font-bold':'border-slate-200 hover:bg-slate-50'}`}><input className="h-4 w-4 shrink-0 accent-teal-800" type="radio" name={q.id} value={c.value} checked={answers[q.id]===c.value} onChange={()=>onAnswer(q.id,c.value)}/><span className={uniform?'lg:sr-only':''}>{c.label}</span></label>)}
     {instrument.unknownLabel&&<label className={`flex min-h-[44px] cursor-pointer items-center justify-center gap-1 rounded-lg border p-2 text-center text-xs ${answers[q.id]===null?'border-brand-700 bg-brand-100 font-bold':'border-slate-200'}`}><input className="h-4 w-4 shrink-0 accent-teal-800" type="radio" name={q.id} value="unknown" checked={answers[q.id]===null} onChange={()=>onAnswer(q.id,null)}/><span className={uniform?'lg:sr-only':''}>{instrument.unknownLabel}</span></label>}
    </div>
   </div>
  </fieldset>)}
 </div>;
}
