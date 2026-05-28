import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";

const storySections = [
  {
    title: "למה זה קיים",
    body: [
      "בחירת התמחות היא אחת ההחלטות המשמעותיות ביותר במסלול הרפואי, ובכל זאת הרבה מהמידע שמוביל אליה עדיין עובר בשיחות מסדרון, קבוצות סגורות או זיכרונות חלקיים של מי שהיה שם קודם.",
      "הדרך להתמחות נולדה כדי להפוך את השלב הזה לפחות מעורפל. המטרה היא לרכז במקום אחד נתונים על מחלקות, תקנים, מחקר, עומסים וחוויות מהשטח, כדי שסטודנטים, סטאז׳רים ומתמחים יוכלו להתחיל את הבדיקה שלהם ממידע ברור יותר."
    ]
  },
  {
    title: "איך זה עובד",
    body: [
      "האתר מחבר בין נתונים מיובאים ממקורות ציבוריים ורשמיים, מידע שמופיע באתרי מוסדות רפואיים, מדדי מחקר משוערים ושיתופים שעוברים בדיקה לפני פרסום.",
      "במקום להציג המלצה אחת או דירוג פשטני, הדפים בנויים כדי לעזור להשוות: מה ידוע על המחלקה, מה חסר עדיין, מה מגיע ברמת תחום ההתמחות, ומה באמת מתייחס למחלקה עצמה."
    ]
  },
  {
    title: "מי עומד מאחורי זה",
    body: [
      "הפרויקט נוסד על ידי תומר סווצ׳ינסקי, סטודנט לרפואה ועובד משרד הבריאות, מתוך היכרות אישית עם הקושי למצוא תמונה אמינה ומסודרת על מסלולי התמחות בישראל.",
      "היוזמה מקבלת תמיכה וספונסרשיפ ממשרד הבריאות ומחטיבת תכנון כוח אדם, אך נשארת יוזמה עצמאית ומובלת מייסד. הכיוון המקצועי הוא ציבורי ושיתופי, והעבודה המוצרית נשארת קרובה לצרכים של מי שבאמת משתמשים באתר."
    ]
  },
  {
    title: "מקורות נתונים ואחריות",
    body: [
      "המידע באתר משלב מקורות שונים: משרד הבריאות, הר״י, נתונים ציבוריים, אתרי בתי חולים, OpenAlex ושיתופי משתמשים שעוברים בדיקה. כשנתון חסר, מיושן או משוער, אנחנו משתדלים לסמן זאת בבירור.",
      "האתר נועד לעזור בקבלת החלטות ולהעלות שקיפות, לא להחליף ביקור במחלקה, שיחה עם אנשי צוות או בדיקה רשמית מול מוסד רפואי. האחריות שלנו היא לשפר את איכות המידע, לעדכן אותו בזהירות, ולהפריד בין עובדות, הערכות וחוויות."
    ]
  },
  {
    title: "יצירת קשר",
    body: [
      "אפשר לפנות אלינו לגבי תיקוני מידע, שיתופי פעולה, בקשות להסרת תוכן, שאלות פרטיות או הצעות לשיפור.",
      "כתובת הפנייה הציבורית היא contact@hitmachut.org. אם הפנייה קשורה למחלקה מסוימת, כדאי לצרף קישור לעמוד ושתי שורות על מה שצריך לתקן או להוסיף."
    ]
  }
];

export default function AboutPage() {
  return (
    <PageShell className="space-y-6 py-8 md:py-10">
      <section className="rounded-2xl border border-brand-100 bg-white px-5 py-6 shadow-panel md:px-7 md:py-8">
        <p className="text-sm font-semibold text-brand-700">אודות</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-ink md:text-5xl">
          שקיפות טובה יותר בדרך להתמחות
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
          הדרך להתמחות היא יוזמה שנועדה לעזור לסטודנטים, סטאז׳רים ומתמחים להבין טוב יותר
          את מרחב האפשרויות לפני שהם בוחרים מחלקה, סבב או מסלול התמחות.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {["מידע ציבורי", "שיתופים מאומתים", "עצמאי ומגובה מקצועית"].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-xs font-bold text-brand-900"
            >
              {chip}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit rounded-2xl !p-4 lg:sticky lg:top-24">
          <p className="text-sm font-black text-ink">בעמוד הזה</p>
          <nav className="mt-3 grid gap-2">
            {storySections.map((section) => (
              <a
                key={section.title}
                href={`#${section.title.replace(/\s+/g, "-")}`}
                className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-white"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </Card>

        <div className="space-y-4">
          {storySections.map((section) => (
            <Card key={section.title} id={section.title.replace(/\s+/g, "-")} className="rounded-2xl !p-5">
              <h2 className="text-2xl font-bold text-ink">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-8 text-slate-700">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.title === "יצירת קשר" ? (
                <a
                  href="mailto:contact@hitmachut.org"
                  className="mt-5 inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
                >
                  contact@hitmachut.org
                </a>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-[#06121f] px-5 py-5 text-white shadow-panel md:px-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-100">ממשיכים לבדיקה</p>
            <p className="mt-2 text-sm leading-7 text-white/78">
              הדרך הכי טובה להבין את האתר היא לבחור תחום התמחות ולהשוות בין מחלקות.
            </p>
          </div>
          <Link
            href="/departments"
            className="inline-flex w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-900 transition hover:bg-brand-50"
          >
            למאגר המחלקות
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
