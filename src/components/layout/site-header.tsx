import Link from "next/link";
import { getSession } from "@/lib/auth";
import { SiteBrand } from "./site-brand";
import { ApprovedBrand } from "./approved-brand";
import { PublicNavigation } from "./public-navigation";
import { LogoutButton } from "./logout-button";
export async function SiteHeader() {
  const session = await getSession();
  const items =
    session?.role === "admin"
      ? [{ href: "/admin", label: "ניהול האתר" }]
      : [
          { href: "/departments", label: "חיפוש מחלקות" },
          { href: "/career-fit", label: "בחירת התמחות" },
          { href: "/about", label: "אודות" },
          { href: "/faq", label: "שאלות נפוצות" },
          { href: "/favorites", label: "הרשימה שלי" },
          ...(session ? [{ href: "/dashboard", label: "האזור האישי" }] : []),
          ...(session?.role === "representative"
            ? [{ href: "/representative", label: "אזור נציגים" }]
            : []),
        ];
  return (
    <header className="site-header">
      <div className="header-inner">
        <ApprovedBrand />
        <Link
          href="/"
          className="brand-home"
          aria-label="hitmachut.org — עמוד הבית"
        >
          <SiteBrand />
        </Link>
        <PublicNavigation items={items} />
        <div className="header-account">
          {session ? (
            <LogoutButton />
          ) : (
            <>
              <Link className="button-link secondary" href="/login">
                התחברות
              </Link>
              <Link className="button-link" href="/signup">
                הרשמה
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
