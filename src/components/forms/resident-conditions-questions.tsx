import type { UseFormRegister } from 'react-hook-form';
import type { z } from 'zod';
import type { reviewSubmissionSchema } from '@/lib/validation';
import { LIKERT_SCALE } from '@/lib/external-survey/parse';

type FormValues = z.infer<typeof reviewSubmissionSchema>;
const inputClass = 'mt-2 w-full rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500';
export const optionalRatingInput = { setValueAs: (v: string) => v === '' ? undefined : Number(v) };

export function ResidentConditionsQuestions({ register, noDuties, signupContribution }: {
  register: UseFormRegister<FormValues>; noDuties: boolean; signupContribution: boolean;
}) {
  return <section className="space-y-5" aria-label="תנאי ההתמחות">
    <div><h4 className="text-xl font-black text-ink">תנאי ההתמחות</h4>
      <p className="mt-1 text-sm leading-6 text-slate-600">ספרו על התנאים במחלקה ובשנה שבחרתם. אפשר לדלג על מדד שאינו רלוונטי או שאינכם רוצים לשתף.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="block text-sm font-bold">שנת החוויה
        <input className={inputClass} type="number" min={2000} max={new Date().getFullYear()} {...register('roleDetails.residentConditions.year', { valueAsNumber: true })} />
      </label>
      <label className="block text-sm font-bold">שעת התחלה ביום ללא תורנות
        <input className={inputClass} type="time" {...register('roleDetails.residentConditions.workStart')} />
      </label>
      <label className="block text-sm font-bold">שעת סיום ביום ללא תורנות
        <input className={inputClass} type="time" {...register('roleDetails.residentConditions.workEnd')} />
      </label>
      <label className="block text-sm font-bold">מספר תורנויות בחודש
        <input className={inputClass} type="number" min={0} max={31} step={0.5} placeholder="ללא תורנויות? הזינו 0" {...register('roleDetails.residentConditions.monthlyDuties', optionalRatingInput)} />
        <span className="mt-1 block text-xs font-normal text-slate-600">מספר ממוצע בחודש, לפי הניסיון שלכם.</span>
      </label>
      <label className="block text-sm font-bold">שכר חודשי ברוטו (₪)
        <input className={inputClass} type="number" min={1000} max={100000} step={1} placeholder="למשל 18000" {...register('roleDetails.residentConditions.salaryGross', optionalRatingInput)} />
        <span className="mt-1 block text-xs font-normal text-slate-600">רשות · בשקלים מלאים, כולל התורנויות שדווחו.</span>
      </label>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      {([
        ['calm', 'כמה התורנות רגועה?'], ['peers', 'מה היחס בין המתמחים?'],
        ['seniors', 'מה היחס של הבכירים?'], ['family', 'עד כמה ניתן לשלב חיי משפחה?']
      ] as const).map(([key, label]) => <label key={key} className="block text-sm font-bold">
        {label}
        <select className={inputClass} {...register(`roleDetails.residentConditions.${key}`, optionalRatingInput)} disabled={key === 'calm' && noDuties}>
          <option value="">{key === 'calm' && noDuties ? 'לא רלוונטי — אין תורנויות' : 'בחירת דירוג / ללא תשובה'}</option>
          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{n === 1 ? ` · ${LIKERT_SCALE[key][0]}` : n === 5 ? ` · ${LIKERT_SCALE[key][1]}` : ''}</option>)}
        </select>
        <span className="mt-1 block text-xs font-normal text-slate-600">1 — {LIKERT_SCALE[key][0]} · 5 — {LIKERT_SCALE[key][1]}</span>
      </label>)}
    </div>
    <label className="block text-sm font-bold">טיפ שכדאי לדעת לפני שבוחרים במקצוע הזה
      <textarea className={`${inputClass} min-h-24`} maxLength={1500} {...register('tips')} placeholder="מה כדאי לדעת על ההתמחות במחלקה? בלי שמות או פרטים מזהים." />
      <span className="mt-1 block text-xs font-normal text-slate-600">{signupContribution ? 'לצורך הרשמה נדרש שיתוף קצר באחד משדות הטקסט.' : 'רשות'}</span>
    </label>
    <label className="block max-w-sm text-sm font-bold">המלצה כללית על המחלקה
      <select className={inputClass} {...register('overallRecommendation', optionalRatingInput)}>
        <option value="">בחירת ציון המלצה</option>
        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{n === 1 ? ' · לא ממליץ/ה' : n === 5 ? ' · ממליץ/ה מאוד' : ''}</option>)}
      </select>
      <span className="mt-1 block text-xs font-normal text-slate-600">זה הציון שיוצג בכוכבים לצד החוויה.</span>
    </label>
  </section>;
}
