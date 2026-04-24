import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";

const principles = [
  {
    title: "להראות תמונה ברורה יותר",
    text: "פחות שמועות וקבוצות ווטסאפ, יותר מידע שאפשר להחליט איתו."
  },
  {
    title: "להישאר סטודנט-first",
    text: "העמודים, החיפוש והשפה נבנו קודם כל למי שעוד בודק/ת כיוון."
  },
  {
    title: "לא להעלות תוכן בלי בדיקה",
    text: "שיתופים, תקנים פתוחים ושינויי מחלקה עוברים קודם אישור."
  }
];

const buildingBlocks = [
  "חיפוש מחלקות לפי מוסד, תחום ועיר",
  "שיתופים מהשטח שעולים רק אחרי אישור",
  "תקנים פתוחים רשמיים עם מועד ועדה ודגשים למחלקה",
  "נציגי מחלקה שנוצרים על ידי אדמין בלבד"
];

export default function AboutPage() {
  return (
    <PageShell className="space-y-8 py-10 md:py-12">
      <section className="overflow-hidden rounded-[2rem] border border-brand-100/70 bg-gradient-to-br from-[#f8fbff] via-white to-[#e6f4ff] shadow-panel">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-6 md:p-8">
            <p className="text-sm font-semibold text-brand-700">אודות</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-ink md:text-5xl">
              למה הקמנו את הדרך להתמחות
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700 md:text-lg">
              כי לבחור מחלקה לפי תחושת בטן בלבד זה לא מספיק. רצינו מקום שמרכז מידע, שיתופים
              ותקנים פתוחים, בצורה שעוזרת להבין אם מחלקה באמת מתאימה לך.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["סטודנטים וסטאז'רים קודם", "תוכן רשמי מאושר", "שפה ברורה ולא טקסית"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-brand-100 bg-white/85 px-4 py-2 text-xs font-semibold text-brand-900"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="p-6 pt-0 md:p-8 md:pt-0">
            <div className="grid h-full gap-4 rounded-[1.75rem] bg-brand-900 p-6 text-white shadow-panel">
              <div>
                <p className="text-sm font-semibold text-brand-100">בקצרה</p>
                <h2 className="mt-2 text-2xl font-bold">פחות ניחושים, יותר החלטות טובות</h2>
                <p className="mt-3 text-sm leading-7 text-brand-50">
                  האתר לא מחליף ביקור, שיחה או היכרות עם מחלקה, אבל הוא כן נותן נקודת פתיחה
                  הרבה יותר חכמה.
                </p>
              </div>
              <div className="grid gap-3">
                {buildingBlocks.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-white/88"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {principles.map((principle, index) => (
          <Card
            key={principle.title}
            className={index === 1 ? "bg-gradient-to-b from-white to-brand-50/60" : "bg-white/94"}
          >
            <p className="text-sm font-semibold text-brand-600">עיקרון {index + 1}</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">{principle.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">{principle.text}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <p className="text-sm font-semibold text-brand-700">למי זה נבנה</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">קודם כל לסטודנטים ולסטאז'רים</h2>
          <div className="mt-5 space-y-4 text-sm leading-8 text-slate-700">
            <p>
              הניווט, החיפוש ודפי המחלקות נבנו קודם כל למי שעוד בודק/ת כיוון. זו הסיבה
              שהעמודים הציבוריים מתמקדים במה חשוב לדעת לפני שמגיעים, איך נראית המחלקה,
              ואילו תקנים פתוחים או הזדמנויות מחקר באמת קיימים.
            </p>
            <p>
              מתמחים ונציגי מחלקות מוסיפים שכבת תוכן חשובה, אבל הם לא עומדים במרכז המוצר. הם
              נכנסים דרך זרימות מאושרות שמאחורי התחברות והרשאות.
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-b from-white to-slate-50">
          <p className="text-sm font-semibold text-brand-700">איך שומרים על אמון</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">שום דבר רגיש לא עולה ישר לאוויר</h2>
          <div className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
            <p>שיתופים מהשטח עולים רק אחרי בדיקה.</p>
            <p>תקנים פתוחים ושינויי מחלקה נשלחים על ידי נציגים משויכים בלבד, ורק אחרי אישור אדמין.</p>
            <p>קורות חיים, תמונות ופרטי מועמדות נשמרים בפרטיות ונגישים רק לגורמים מורשים.</p>
          </div>
        </Card>
      </section>

      <section className="rounded-[2rem] bg-gradient-to-l from-brand-900 via-brand-800 to-teal-700 p-6 text-white shadow-panel md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-brand-100">ממשיכים מכאן</p>
            <h2 className="mt-2 text-3xl font-bold">רוצים לראות איך זה נראה בפועל?</h2>
            <p className="mt-3 text-sm leading-7 text-white/84">
              הכי טוב להתחיל מחיפוש מחלקות, ואז לעבור לתקנים, חוויות ומה שחשוב לדעת לפני שמגיעים.
            </p>
          </div>
          <Link
            href="/departments"
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-900 transition hover:bg-brand-50"
          >
            לחיפוש מחלקות
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
