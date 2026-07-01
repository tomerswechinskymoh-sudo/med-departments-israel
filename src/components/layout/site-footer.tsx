import Image from "next/image";
import Link from "next/link";
import { PUBLIC_CONTACT_EMAIL, PUBLIC_CONTACT_MAILTO } from "@/lib/contact";

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
    <footer className="border-t border-brand-900/20 bg-[#06121f] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 text-sm md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-semibold text-white">הדרך להתמחות</p>
            <p className="mt-2 max-w-xl leading-7 text-brand-50/80">
              מקום אחד להבין איך מחלקות באמת נראות לפני שבוחרים סבב, מחקר או התמחות.
            </p>
          </div>
          <a
            href={PUBLIC_CONTACT_MAILTO}
            className="w-fit rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-brand-50 transition hover:border-white/40 hover:text-white"
          >
            {PUBLIC_CONTACT_EMAIL}
          </a>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-brand-50/88">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white px-4 py-2">
            <Image
              src="/logos/ministry-of-health-logo-he.jpg"
              alt="לוגו משרד הבריאות"
              width={132}
              height={42}
              className="h-9 w-auto object-contain"
            />
          </div>
          <p className="text-xs text-brand-50/60">© {new Date().getFullYear()} הדרך להתמחות</p>
        </div>
      </div>
    </footer>
  );
}
