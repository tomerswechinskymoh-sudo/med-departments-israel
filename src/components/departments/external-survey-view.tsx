import Link from "next/link";
import { Card } from "@/components/ui/card";
import { METRICS } from "@/lib/external-survey/parse";
import type { SurveySummary } from "@/lib/external-survey/presentation";
import { QuoteViewport } from "./experience-carousel";
export function ExternalSurveyView({ summary, specialtyName, departmentContext = false }: { summary: SurveySummary; specialtyName: string; departmentContext?: boolean }) {
  if (summary.state === 'empty' || summary.state === 'unavailable') return null;
  return (
    <Card dir="rtl" className="space-y-4" data-survey-state={summary.state}>
      <div>
        <h2 className="text-xl font-black text-ink">תנאים וחוויות בתחום</h2>
        <p className="mt-1 text-sm text-slate-600">{specialtyName} · הקשר ברמת תחום ההתמחות בארץ</p>
      </div>
      {departmentContext ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">הנתונים כאן מתייחסים לתחום ההתמחות כולו, ואינם ביקורת על מחלקה זו או על בית החולים שלה.</p> : null}
      {summary.state === "locked" ? (
        <div className="rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-700">
          <p>הצפייה בחוויות זמינה למשתמשים מאומתים, בהתאם להרשאות האתר.</p>
          <Link className="font-bold text-brand-800 underline underline-offset-4" href="/login">כניסה לחשבון</Link>
        </div>
      ) : (
        <>
          <dl className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))' }}>
            {Object.keys(METRICS).flatMap(key => {
              const metric = summary.metrics.find(m => m.key === key);
              if (!metric) return [];
              const definition = METRICS[metric.key];
              return [<div key={metric.key} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <dt className="text-[13px] font-bold leading-5 text-slate-700">{definition.label}</dt>
                <dd className="mt-1"><span className="text-[22px] font-black text-brand-900">{new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 }).format(metric.value)}</span> <span className="text-xs text-slate-600">{definition.unit}</span></dd>
                <dd className="mt-1 text-xs leading-5 text-slate-600">{metric.method === "MEDIAN" ? "חציון" : "ממוצע"} · {metric.respondents} משיבים<br /><bdi>{metric.startYear === metric.endYear ? metric.startYear : `${metric.startYear}–${metric.endYear}`}</bdi>{metric.calculated ? <span title="כולל ערכים שחושבו מטווח או משעות ההתחלה והסיום שדווחו" aria-label="כולל ערכים שחושבו מהדיווח"> *</span> : null}</dd>
              </div>];
            })}
          </dl>
          <p className="text-xs leading-6 text-slate-600">מקור: {summary.sourceTitle}. עיקר איסוף הסקר נערך באוגוסט 2024, עם תשובות נוספות בהמשך. אלה דיווחים היסטוריים ואינם מדידה עדכנית של התנאים כיום.</p>
          <details className="rounded-lg border border-brand-100 p-3 text-sm leading-7 text-slate-600">
            <summary className="cursor-pointer font-bold text-brand-900">איך לקרוא את הנתונים?</summary>
            <p className="mt-2">זהו מדגם של מי שבחרו להשיב לסקר חיצוני; הוא אינו בהכרח מייצג. המשיבים לא עברו את מנגנון האימות של ביקורות האתר. הנתונים אינם נכללים בדירוג הכוכבים ואינם משמשים להשוואה בין בתי חולים.</p>
            <p>לכל מדד מוצג מספר התשובות התקינות לו, ורק כאשר יש לפחות 10 משיבים ובדיקת הפרטיות מאפשרת פרסום. מדדים חסרים אינם אפס. המדדים מחושבים מכל התשובות התקינות, ללא סינון לפי חיוביות התגובה. הטקסטים נבחרו כחוויות חיוביות בעיקרן.</p>
            <p>בתורנויות ובמשך יום העבודה מוצג חציון. טווח תורנויות ברור מיוצג בנקודת האמצע שלו; תורנויות חלקיות וערכים עמומים אינם נכללים. משך יום מחושב רק משעות התחלה וסיום ברורות שדווחו, ואינו מדידת נוכחות.</p>
            <p>במדדי החוויה מוצג ממוצע בסולם המקורי 1–5; ערך גבוה משקף חוויה חיובית יותר. ברוגע בתורנויות נכללים רק דיווחים עם מספר תורנויות חיובי שניתן לפענח.</p>
            <p>בשכר מוצג חציון חודשי בשקלים, במחירי תקופת הדיווח וללא התאמה להיקף משרה או לתורנויות. ברוטו ונטו מחושבים בנפרד; השאלה המקורית ביקשה ברוטו, ורק ציון מפורש של נטו משויך לנטו. סכומים ללא יחידה ברורה אינם נכללים. טווח ברור מיוצג בנקודת האמצע שלו. אם אין לפחות 10 דיווחים תקינים לבסיס השכר, הוא אינו מוצג.</p>
          </details>
          {summary.quotes.length ? <div className="space-y-3" data-resident-survey-quotes><h3 className="font-bold text-ink">חוויות בתחום · {summary.quotes.length} תגובות</h3><QuoteViewport key={summary.quotes.map(q => q.id).join(':')} label="חוויות בתחום ההתמחות" showRating={false} canReport={false} quotes={summary.quotes.map(quote => ({ id: quote.id, year: quote.year, role: 'RESIDENT', author: null, rating: null, parts: [{ label: null, text: quote.text }], otherRatings: [], hospitalScope: false }))} /></div> : null}
        </>
      )}
    </Card>
  );
}
