import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/layout/logout-button";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-brand-900">
            מסלול למחלקה
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-slate-700 md:flex">
            <Link href="/departments" className="transition hover:text-brand-700">
              מאגר מחלקות
            </Link>
            <Link href="/faq" className="transition hover:text-brand-700">
              שאלות נפוצות
            </Link>
            <Link href="/about" className="transition hover:text-brand-700">
              אודות
            </Link>
            <Link href="/favorites" className="transition hover:text-brand-700">
              מועדפים
            </Link>
            {session && (
              <Link href="/dashboard" className="transition hover:text-brand-700">
                האזור האישי
              </Link>
            )}
            {session && (session.role === "admin" || session.isApprovedPublisher) ? (
              <Link href="/representative" className="transition hover:text-brand-700">
                פרסום רשמי
              </Link>
            ) : null}
            {session?.role === "admin" ? (
              <Link href="/admin" className="transition hover:text-brand-700">
                אדמין
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/reviews/new"
            className="hidden rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:border-brand-300 hover:bg-brand-50 md:inline-flex"
          >
            רוצה לספר על החוויה שלך?
          </Link>
          {session ? (
            <>
              <div className="hidden text-left md:block">
                <p className="text-sm font-semibold text-ink">{session.fullName}</p>
                <p className="text-xs text-slate-500">{session.email}</p>
              </div>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:border-brand-300 hover:bg-brand-50"
              >
                התחברות
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                הרשמה
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
