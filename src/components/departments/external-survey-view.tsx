import Link from "next/link";
import { Card } from "@/components/ui/card";
import { METRICS } from "@/lib/external-survey/parse";
import type { SurveySummary } from "@/lib/external-survey/presentation";
export function ExternalSurveyView({ summary, specialtyName, departmentContext = false }: { summary: SurveySummary; specialtyName: string; departmentContext?: boolean }) {
  if (summary.state === 'empty' || summary.state === 'unavailable') return null;
  return (
    <Card dir="rtl" className="space-y-4" data-survey-state={summary.state}>
      <div>
        <h2 className="text-xl font-black text-ink">חוויות בתחום</h2>
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
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.keys(METRICS).flatMap(key => {
              const metric = summary.metrics.find(m => m.key === key);
              if (!metric) return [];
              const definition = METRICS[metric.key];
              return [<div key={metric.key} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <dt className="text-sm font-bold text-slate-700">{definition.label}</dt>
                <dd className="mt-2"><span className="text-2xl font-black text-brand-900">{new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 }).format(metric.value)}</span> <span className="text-sm text-slate-600">{definition.unit}</span></dd>
                <dd className="mt-1 text-xs leading-6 text-slate-600">{metric.method === "MEDIAN" ? "חציון" : "ממוצע"} · {metric.respondents} משיבים<br />תקופת דיווח: <bdi>{metric.startYear === metric.endYear ? metric.startYear : `${metric.startYear}–${metric.endYear}`}</bdi>{metric.calculated ? <><br />כולל ערכים שחושבו מהדיווח</> : null}</dd>
              </div>];
            })}
          </dl>
          <p className="text-xs leading-6 text-slate-600">מקור: {summary.sourceTitle}. עיקר איסוף הסקר נערך באוגוסט 2024, עם תשובות נוספות בהמשך. אלה דיווחים היסטוריים ואינם מדידה עדכנית של התנאים כיום.</p>
          <details className="rounded-lg border border-brand-100 p-3 text-sm leading-7 text-slate-600">
            <summary className="cursor-pointer font-bold text-brand-900">איך לקרוא את הנתונים?</summary>
            <p className="mt-2">זהו מדגם של מי שבחרו להשיב לסקר חיצוני; הוא אינו בהכרח מייצג. המשיבים לא עברו את מנגנון האימות של ביקורות האתר. הנתונים אינם נכללים בדירוג הכוכבים ואינם משמשים להשוואה בין בתי חולים.</p>
            <p>לכל מדד מוצג מספר התשובות התקינות לו, ורק כאשר יש לפחות 10 משיבים ובדיקת הפרטיות מאפשרת פרסום. מדדים חסרים אינם אפס. שכר ופרטים אישיים אינם מוצגים כאן.</p>
            <p>בתורנויות ובמשך יום העבודה מוצג חציון. טווח תורנויות ברור מיוצג בנקודת האמצע שלו; תורנויות חלקיות וערכים עמומים אינם נכללים. משך יום מחושב רק משעות התחלה וסיום ברורות שדווחו, ואינו מדידת נוכחות.</p>
            <p>במדדי החוויה מוצג ממוצע בסולם המקורי 1–5; ערך גבוה משקף חוויה חיובית יותר. ברוגע בתורנויות נכללים רק דיווחים עם מספר תורנויות חיובי שניתן לפענח.</p>
          </details>
          {summary.quotes.length ? <div className="space-y-3"><h3 className="font-bold text-ink">טיפים מהסקר שאושרו לפרסום</h3>{summary.quotes.map((quote, index) => <blockquote key={index} className="whitespace-pre-wrap border-r-4 border-brand-200 pr-4 text-sm leading-7 text-slate-700">{quote}</blockquote>)}</div> : null}
        </>
      )}
    </Card>
  );
}
