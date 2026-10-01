import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDepartmentOptions } from "@/lib/queries";
import { ExperienceCta } from "@/components/experience/experience-cta";
import { LogoutButton } from "@/components/layout/logout-button";
import { SiteBrand } from "@/components/layout/site-brand";
import { siteIdentity } from "@/lib/brand-copy";

export async function SiteHeader() {
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const reviewDepartments = isAdmin || !process.env.DATABASE_URL ? [] : await getDepartmentOptions();
  const navItems = isAdmin
    ? [{ href: "/admin", label: "אדמין" }]
    : [
        { href: "/departments", label: "חיפוש מחלקות" },
        { href: "/placements", label: "סבבים ואלקטיבים" },
        { href: "/faq", label: "שאלות נפוצות" },
        { href: "/about", label: "אודות" },
        { href: "/favorites", label: "הרשימה שלי" }
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/78 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6 lg:flex-nowrap lg:gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            aria-label={`${siteIdentity.name} — עמוד הבית`}
            className="inline-flex items-center rounded-full border border-brand-100/70 bg-white/85 px-3 py-1.5 text-lg shadow-panel transition hover:border-brand-300"
          >
            <SiteBrand />
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-slate-700 lg:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-brand-700">
                {item.label}
              </Link>
            ))}
            {session && !isAdmin ? (
              <Link href="/dashboard" className="transition hover:text-brand-700">
                האזור האישי
              </Link>
            ) : null}
            {session?.role === "representative" ? (
              <Link href="/representative" className="transition hover:text-brand-700">
                אזור נציגים
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!isAdmin ? (
            <ExperienceCta
              departments={reviewDepartments}
              className="hidden lg:block"
              buttonClassName="inline-flex rounded-full border border-amber-200 bg-gradient-to-l from-amber-300 via-amber-200 to-orange-100 px-4 py-2 text-sm font-semibold text-amber-950 shadow-lg shadow-amber-200/45 transition hover:-translate-y-0.5"
            />
          ) : null}
          {session ? (
            <>
              <div className="hidden text-left lg:block">
                <p className="text-sm font-semibold text-ink">{session.fullName}</p>
                <p className="text-xs text-slate-500">{session.email}</p>
              </div>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-brand-200 bg-white/80 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:border-brand-300 hover:bg-brand-50"
              >
                התחברות
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-gradient-to-l from-brand-700 to-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-brand-800 hover:to-teal-700"
              >
                הרשמה
              </Link>
            </>
          )}
        </div>
      </div>
      {!isAdmin ? (
        <div className="border-t border-brand-100/70 px-4 py-2 text-sm font-semibold text-brand-800 lg:hidden">
          <Link href="/placements" className="inline-flex min-h-8 items-center hover:text-teal-700">
            סבבים ואלקטיבים
          </Link>
        </div>
      ) : null}
    </header>
  );
}
