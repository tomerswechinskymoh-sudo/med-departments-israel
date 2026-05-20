import Image from "next/image";
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
    <footer className="border-t border-brand-900/20 bg-gradient-to-b from-brand-900 to-[#06121f] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm md:px-6">
        <div>
          <p className="font-semibold text-white">הדרך להתמחות</p>
          <p className="mt-2 max-w-2xl leading-7 text-brand-50/88">
            הדרך להתמחות, מקום אחד להבין איך מחלקות באמת נראות לפני שבוחרים סבב, מחקר
            או התמחות.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white px-4 py-2 text-brand-950">
            <Image
              src="/logos/ministry-of-health-logo-he.jpg"
              alt="לוגו משרד הבריאות"
              width={132}
              height={42}
              className="h-9 w-auto object-contain"
            />
          </div>
          <p className="max-w-2xl text-xs leading-6 text-brand-50/78">
            הפלטפורמה פועלת בשיתוף משרד הבריאות ובשילוב נתונים ציבוריים ונתונים שיימסרו ע״י
            בתי החולים. אין באמור כדי להציג את האתר כאתר רשמי של משרד הבריאות.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-brand-50/88">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-xs leading-6 text-brand-50/78 md:grid-cols-2">
          <p>שיתופים מהשטח עולים רק אחרי בדיקה כדי לשמור על תוכן אמין.</p>
          <p>פרטים אישיים וקבצים נשמרים בפרטיות ונגישים רק לגורמים מורשים.</p>
        </div>
      </div>
    </footer>
  );
}
