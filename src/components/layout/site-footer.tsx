import Link from "next/link";
import { PUBLIC_CONTACT_EMAIL, PUBLIC_CONTACT_MAILTO } from "@/lib/contact";
import { siteIdentity, sourceCopy } from "@/lib/brand-copy";
import { SiteBrand } from "@/components/layout/site-brand";

export function SiteFooter() {
  const links = [
    { href: "/sitemap", label: "מפת אתר" },
    { href: "/about", label: "אודות" },
    { href: "/placements", label: "סבבים ואלקטיבים" },
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
            <Link href="/" aria-label={`${siteIdentity.name} — עמוד הבית`} className="inline-flex text-lg">
              <SiteBrand inverse />
            </Link>
            <p className="mt-1 text-xs text-brand-50/70">{siteIdentity.descriptor}</p>
            <p className="mt-2 max-w-xl leading-7 text-brand-50/80">
              מידע על מחלקות והכשרה רפואית בישראל, ממקורות רשמיים ומדיווחים מהשטח.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-brand-50/70">לפניות בנוגע לאתר</p>
            <a
              href={PUBLIC_CONTACT_MAILTO}
              className="inline-flex w-fit rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-brand-50 transition hover:border-white/40 hover:text-white"
            >
              {PUBLIC_CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-brand-50/88">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-xs leading-6 text-brand-50/70">
            <span className="font-semibold text-brand-50">{sourceCopy.label}:</span> {sourceCopy.summary}
          </p>
          <p className="text-xs text-brand-50/60" dir="ltr">© {new Date().getFullYear()} {siteIdentity.name}</p>
        </div>
      </div>
    </footer>
  );
}
