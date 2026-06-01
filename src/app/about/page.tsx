import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

const navItems = ["למה זה קיים", "איך זה עובד", "מי עומד מאחורי זה", "מקורות נתונים ואחריות", "יצירת קשר"];

const storySections = [
  {
    title: "למה זה קיים",
    body: [
      "בחירת התמחות היא החלטה שמעצבת שנים קדימה: איפה עובדים, ממי לומדים, כמה תמיכה מקבלים, ואיך נראים החיים מחוץ לבית החולים. למרות זאת, חלק גדול מהמידע עדיין עובר בשיחות מסדרון, קבוצות סגורות או המלצות נקודתיות.",
      "הדרך להתמחות נבנתה כדי להפוך את השלב הזה לשקוף ומסודר יותר. במקום להתחיל משמועות, אפשר להתחיל מנתונים, הקשר וחוויות שנאספות בזהירות."
    ]
  },
  {
    title: "מי עומד מאחורי זה",
    body: [
      "האתר נוסד ונבנה על ידי תומר סבצ׳ינסקי, סטודנט לרפואה ועובד משרד הבריאות, מתוך היכרות אישית עם הפער בין חשיבות ההחלטה לבין איכות המידע הזמין למועמדים.",
      "היוזמה מפותחת בליווי ותמיכה מקצועית של משרד הבריאות ושל חטיבת תכנון כוח אדם, אך נשארת יוזמה עצמאית ומובלת מייסד. המטרה היא ציבורית וברורה: לעזור לסטודנטים, סטאז׳רים ומתמחים לקבל החלטות מושכלות יותר."
    ]
  },
  {
    title: "מקורות נתונים ואחריות",
    body: [
      "המידע באתר משלב נתונים ממשרד הבריאות, הר״י, בתי חולים, מקורות ציבוריים, מדדי מחקר משוערים ושיתופי משתמשים שעוברים בדיקה לפני פרסום.",
      "כאשר נתון חסר, משוער או מגיע ברמת תחום ההתמחות ולא ברמת המחלקה הספציפית, אנחנו משתדלים לסמן זאת בצורה ברורה. האתר נועד לסייע בקבלת החלטות, לא להחליף בירור רשמי מול מוסד רפואי או שיחה עם מי שמכיר את המחלקה מקרוב."
    ]
  },
  {
    title: "יצירת קשר",
    body: [
      "אפשר לפנות לגבי תיקוני מידע, שיתופי פעולה, שאלות פרטיות, בקשות להסרת תוכן או רעיונות לשיפור.",
      "אם הפנייה קשורה למחלקה מסוימת, כדאי לצרף קישור לעמוד ושתי שורות על מה שצריך לבדוק."
    ]
  }
];

const phoneScreens = [
  {
    title: "דף תחום",
    subtitle: "תמונת מצב ארצית",
    rows: ["משך התמחות", "פער שכר", "מתמחים חדשים"]
  },
  {
    title: "דף מחלקה",
    subtitle: "נתונים, קשר וחוויות",
    rows: ["כוח אדם", "הנהלה", "מחקר ופרסומים"]
  },
  {
    title: "השוואת מחלקות",
    subtitle: "סריקה מהירה בין אפשרויות",
    rows: ["מוסד", "אזור", "מדדים מרכזיים"]
  }
];

function anchorFor(title: string) {
  return title.replace(/\s+/g, "-");
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[270px]" aria-label="תצוגה מקדימה של מסכי האתר">
      <div className="rounded-[2.2rem] border border-slate-200 bg-slate-950 p-3 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.85)]">
        <div className="overflow-hidden rounded-[1.65rem] bg-[#f7fafc] p-3">
          <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-slate-300" />
          <div className="relative h-[390px]">
            {phoneScreens.map((screen, index) => (
              <div
                key={screen.title}
                className="about-phone-panel absolute inset-0 rounded-[1.35rem] bg-white p-4 shadow-sm"
                style={{ animationDelay: `${index * 3.5}s` }}
              >
                <p className="text-xs font-black text-brand-700">{screen.subtitle}</p>
                <h3 className="mt-2 text-2xl font-black text-ink">{screen.title}</h3>
                <div className="mt-5 space-y-3">
                  {screen.rows.map((row, rowIndex) => (
                    <div key={row} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-700">{row}</span>
                        <span className="h-2 w-10 rounded-full bg-brand-300" />
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-teal-600"
                          style={{ width: `${52 + rowIndex * 16}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((item) => (
                    <span
                      key={item}
                      className={`h-1.5 rounded-full ${item === index ? "bg-brand-700" : "bg-slate-200"}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <PageShell className="space-y-8 py-8 md:py-10">
      <section className="scroll-reveal grid items-center gap-8 border-b border-brand-100 pb-8 lg:grid-cols-[1fr_340px]">
        <div>
          <p className="text-sm font-semibold text-brand-700">אודות</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight text-ink md:text-5xl">
            מידע טוב יותר לרגע שבו בוחרים התמחות
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-9 text-slate-700">
            הדרך להתמחות מרכזת נתונים, הקשר וחוויות מהשטח כדי לעזור לדור העתיד של
            הרופאים בישראל להשוות בין אפשרויות, לשאול שאלות טובות יותר, ולקבל החלטות
            מתוך תמונה רחבה יותר.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["עצמאי ומוביל מייסד", "בליווי מקצועי", "נתונים ושיתופים במקום אחד"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-brand-100 bg-white px-4 py-2 text-xs font-bold text-brand-900 shadow-sm"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
        <PhoneMockup />
      </section>

      <nav className="sticky top-16 z-20 -mx-2 flex gap-2 overflow-x-auto rounded-2xl border border-white/80 bg-white/82 p-2 shadow-sm backdrop-blur transition-colors duration-300">
        {navItems.map((item) => (
          <a
            key={item}
            href={`#${anchorFor(item)}`}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-brand-50 hover:text-brand-900"
          >
            {item}
          </a>
        ))}
      </nav>

      <section id="איך-זה-עובד" className="scroll-reveal grid gap-7 rounded-2xl bg-white px-5 py-6 shadow-panel md:px-7 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-semibold text-brand-700">איך זה עובד?</p>
          <h2 className="mt-2 text-3xl font-black text-ink">מתחילים מהתחום, ממשיכים למחלקה</h2>
          <p className="mt-4 text-sm leading-8 text-slate-700">
            האתר בנוי כמו מסע קצר: קודם מבינים את תחום ההתמחות ברמה ארצית, אחר כך
            עוברים להשוואה בין מחלקות ומוסדות, ובסוף קוראים חוויות ודיווחים שמוסיפים
            הקשר אנושי לנתונים.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {phoneScreens.map((screen, index) => (
            <div key={screen.title} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
              <p className="text-xs font-black text-brand-700">0{index + 1}</p>
              <h3 className="mt-2 text-lg font-black text-ink">{screen.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{screen.subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-0 rounded-2xl bg-white px-5 py-2 shadow-panel md:px-7">
        {storySections.map((section) => (
          <article
            key={section.title}
            id={anchorFor(section.title)}
            className="scroll-reveal border-b border-slate-100 py-7 last:border-b-0"
          >
            <h2 className="text-3xl font-black text-ink">{section.title}</h2>
            <div className="mt-4 max-w-4xl space-y-3 text-sm leading-8 text-slate-700">
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
          </article>
        ))}
      </section>

      <section className="scroll-reveal rounded-2xl bg-[#06121f] px-5 py-5 text-white shadow-panel md:px-7">
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
