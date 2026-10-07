'use client';

import { useEffect, useRef } from 'react';
import type { InstrumentDefinition } from '@/lib/career-fit/instruments';
import type { Answers } from '@/lib/career-fit/scoring';

/** Presentation only: original item, choices, null and clear semantics are preserved. */
export function InstrumentGrid({instrument,itemIndex,answers,onAnswer}:{instrument:InstrumentDefinition;itemIndex:number;answers:Answers;onAnswer:(id:string,value:number|null|undefined)=>void}) {
 const item=instrument.items[itemIndex];
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[itemIndex]);
 const options=[...item.choices,...(instrument.unknownLabel?[{value:null,label:instrument.unknownLabel}]:[])];
 return <fieldset className="min-w-0" aria-describedby={`${item.id}-help`}>
  <legend className="w-full"><h2 ref={heading} tabIndex={-1} className="text-xl font-bold leading-8 text-ink outline-none sm:text-2xl sm:leading-9">{item.text}</h2></legend>
  <p id={`${item.id}-help`} className="mb-5 mt-3 text-sm text-slate-600">בחרו תשובה אחת. אפשר לשנות, לדלג או לבחור ״לא יודע/ת״.</p>
  <div className="grid gap-3 sm:grid-cols-2">
   {options.map(option=>{
    const selected=answers[item.id]===option.value;
    return <label key={option.value??'unknown'} className={`flex min-h-[64px] cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm leading-6 transition-colors motion-reduce:transition-none has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-700 ${selected?'border-brand-700 bg-brand-50 font-semibold text-brand-900':'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/50'}`}>
     <input type="radio" name={item.id} value={option.value??'unknown'} checked={selected} onChange={()=>onAnswer(item.id,option.value)} className="peer sr-only"/>
     <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected?'border-brand-700 bg-brand-700 text-white':'border-slate-500 bg-white'}`}>{selected?'✓':''}</span>
     <span className="flex-1">{option.label}</span>
     {selected&&<span className="sr-only"> — נבחרה</span>}
    </label>;
   })}
  </div>
  {instrument.allowClear&&<button type="button" onClick={()=>onAnswer(item.id,undefined)} className="mt-3 min-h-[44px] rounded-lg px-1 text-sm font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">דלג/י על השאלה ונקה/י תשובה</button>}
 </fieldset>;
}
