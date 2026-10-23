import Link from "next/link";
import { SiteBrand } from "./site-brand";
import { ApprovedBrand } from "./approved-brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <ApprovedBrand placement="footer" />
          <Link href="/" aria-label="hitmachut.org — עמוד הבית">
            <SiteBrand />
          </Link>
        </div>
        <div className="footer-navigation">
          <nav aria-label="מידע ויצירת קשר">
            {[["/about", "אודות"], ["/contact", "יצירת קשר"], ["/faq", "שאלות נפוצות"], ["/sitemap", "מפת אתר"]].map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <nav aria-label="מדיניות ושימוש באתר">
            {[["/terms", "תנאי שימוש"], ["/privacy", "פרטיות"], ["/cookies", "עוגיות"], ["/accessibility", "נגישות"], ["/report-abuse", "דיווח על פגיעה"]].map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}

          </nav>
        </div>
        <p className="footer-note">
          המידע מבוסס על פרסומים רשמיים, בתי חולים ושיתופים מהשטח. יש לבדוק
          עדכניות והקשר מול המקור.{" "}
          <span dir="ltr">© {new Date().getFullYear()} hitmachut.org</span>
        </p>
      </div>
    </footer>
  );
}
