import Link from "next/link";

export function SiteFooter() {
  const links = [
    { href: "/sitemap", label: "מפת אתר" },
    { href: "/about", label: "אודות" },
    { href: "/contact", label: "יצירת קשר" },
    { href: "/faq", label: "שאלות נפוצות" },
    { href: "/terms", label: "תנאים" },
    { href: "/privacy", label: "פרטיות" },
    { href: "/cookies", label: "עוגיות" },
    { href: "/accessibility", label: "נגישות" },
    { href: "/report-abuse", label: "דיווח על פגיעה" }
  ];

  return (
    <footer className="border-t border-white/80 bg-white/75">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 text-sm text-slate-600 md:px-6">
        <div>
          <p className="font-semibold text-brand-900">מסלול למחלקה</p>
          <p className="mt-1 max-w-2xl">
            פלטפורמה בעברית לסטודנטים לרפואה ולסטאז'רים שמחפשים להבין איך מחלקות ומסלולים
            נראים באמת לפני בחירת רוטציה, סטאז', מחקר או התמחות.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-700">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-brand-700">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="text-xs leading-6 text-slate-500">
          <p>חוויות ציבוריות מתפרסמות רק אחרי בדיקה ואישור אדמיניסטרטיבי.</p>
          <p>טלפונים, קורות חיים, תמונות וקבצים נשמרים בפרטיות ונגישים רק לגורמים מורשים.</p>
        </div>
      </div>
    </footer>
  );
}
