"use client";
import {
  ProductIcon,
  type ProductIconName,
} from "@/components/ui/product-icon";
import Link from "next/link";
import { useState } from "react";
import { PUBLIC_CONTACT_MAILTO } from "@/lib/contact";
type FaqItem = { title: string; body: readonly string[] };
const extras = [
  {
    title: "איך משתמשים בהשוואת מחלקות?",
    body: [
      "במאגר המחלקות בוחרים עד ארבע מחלקות מאותו תחום. בחירת המחלקות נשמרת במכשיר; טבלת ההשוואה זמינה לאחר התחברות. נתונים חסרים מסומנים במפורש.",
    ],
    category: "שימוש באתר",
    href: "/departments",
  },
  {
    title: "האם צריך חשבון כדי לצפות במידע?",
    body: [
      "חיפוש המחלקות ומידע ציבורי זמינים ללא חשבון. שמירת מחלקות, השוואה ופרטים מוגנים כפופים להתחברות ולהרשאות. יצירת חשבון כוללת אימות מייל ובדיקת הסטטוס המקצועי.",
    ],
    category: "הרשמה ואימות",
    href: "/signup",
  },
  {
    title: "אילו קבצים ניתן להעלות לאימות?",
    body: [
      "PDF, JPG או PNG בהתאם למגבלת הגודל שמופיעה בטופס ההרשמה. העלו רק מסמך הנדרש לאימות הסטטוס המקצועי. המסמך פרטי ואינו נשלח לאנליטיקה.",
    ],
    category: "הרשמה ואימות",
    href: "/privacy",
  },
  {
    title: "מהו שאלון בחירת התמחות (Beta)?",
    body: [
      "כלי ניסיוני בן 30 שאלות ושישה תחומי עניין. הוא טרם עבר תיקוף מדעי ואינו מחליף ייעוץ מקצועי. כל השאלות נדרשות לדירוג; דילוג אינו תשובה ניטרלית.",
    ],
    category: "שאלון Beta",
    href: "/career-fit",
  },
  {
    title: "היכן נשמרות תשובות השאלון?",
    body: [
      "במכשיר ובדפדפן שבהם השתמשתם. טיוטה בת יותר מ־30 יום מהעדכון האחרון נמחקת בבדיקה הבאה כשפותחים את השאלון, ולא באמצעות מחיקה מתוזמנת כשהדפדפן סגור. התשובות, הציונים וההמלצות אינם נשלחים לשרת או לאנליטיקה. אפשר למחוק את ההתקדמות מתוך השאלון.",
    ],
    category: "פרטיות",
    href: "/cookies",
  },
  {
    title: "האם נתון חסר אומר שהמחלקה פחות טובה?",
    body: [
      "לא. נתון חסר אינו אפס. חשוב לבדוק את המקור, שנת הנתון והאם הוא מתייחס למחלקה או לכלל תחום ההתמחות.",
    ],
    category: "מקורות מידע",
    href: "/about",
  },
];
export function FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("הכל");
  const all = [
    ...items.map((i) => ({
      ...i,
      category: i.title.includes("נתונ")
        ? "מקורות מידע"
        : i.title.includes("אנונימ")
          ? "פרטיות"
          : "שימוש באתר",
      href: "/contact",
    })),
    ...extras,
  ];
  const filtered = all.filter(
    (i) =>
      (category === "הכל" || i.category === category) &&
      `${i.title} ${i.body.join(" ")}`.includes(query.trim()),
  );
  return (
    <>
      <label className="faq-search">
        <span className="sr-only">חיפוש בשאלות נפוצות</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפשו שאלה או נושא…"
        />
        {query && (
          <button
            type="button"
            className="text-link"
            onClick={() => setQuery("")}
          >
            ניקוי
          </button>
        )}
      </label>
      <div className="faq-categories" role="group" aria-label="קטגוריות">
        {[
          "הכל",
          "שימוש באתר",
          "מקורות מידע",
          "הרשמה ואימות",
          "פרטיות",
          "שאלון Beta",
        ].map((c) => (
          <button
            key={c}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c !== "הכל" && (
              <ProductIcon
                name={
                  (
                    {
                      "שימוש באתר": "search",
                      "מקורות מידע": "database",
                      "הרשמה ואימות": "people",
                      פרטיות: "shield",
                      "שאלון Beta": "compare",
                    } as Record<string, ProductIconName>
                  )[c]
                }
              />
            )}
            {c}
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm text-slate-600" role="status">
        {filtered.length} תשובות
      </p>
      <div className="faq-grid">
        <div>
          {filtered.map((item, index) => (
            <details
              className="faq-item"
              key={item.title}
              open={query || index === 0 ? true : undefined}
            >
              <summary>{item.title}</summary>
              <div className="faq-answer">
                {item.body.map((p) => (
                  <p key={p} className="mb-3">
                    {p}
                  </p>
                ))}
                <Link className="text-link" href={item.href}>
                  למידע נוסף ←
                </Link>
              </div>
            </details>
          ))}
          {!filtered.length && (
            <div className="rounded-xl border bg-white p-6">
              <h2 className="font-bold">לא נמצאה תשובה מתאימה</h2>
              <p className="my-3">נסו ניסוח אחר או בחרו בכל הקטגוריות.</p>
              <button
                className="button-link secondary"
                onClick={() => {
                  setQuery("");
                  setCategory("הכל");
                }}
              >
                איפוס החיפוש
              </button>
            </div>
          )}
        </div>
        <aside className="faq-aside">
          <section className="faq-contact">
            <span className="icon-tile">
              <ProductIcon name="mail" />
            </span>
            <h2>עדיין יש לכם שאלות?</h2>
            <p>
              אנחנו כאן לעזור. אפשר לפנות עם שאלה, תיקון מידע או הצעה לשיפור.
            </p>
            <a className="button-link" href={PUBLIC_CONTACT_MAILTO}>
              <ProductIcon name="mail" />
              פנייה באמצעות אימייל
            </a>
          </section>
          <section>
            <ProductIcon name="database" />
            <h2>שקיפות ואמינות המידע</h2>
            <p>
              לצד הנתונים חשוב להבין מהיכן הגיעו, מה הם מתארים ומה עדיין חסר.
            </p>
            <Link className="text-link" href="/about">
              למידע על המקורות ←
            </Link>
          </section>
          <section>
            <ProductIcon name="shield" />
            <h2>פרטיות והגנת מידע</h2>
            <p>
              מסמכי האימות אינם מוצגים לציבור. קראו על המידע שנשמר ועל הבחירות
              שלכם.
            </p>
            <Link className="text-link" href="/privacy">
              למדיניות הפרטיות ←
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
