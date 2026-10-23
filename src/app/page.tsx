export const metadata = {
  title: "הדרך להתמחות שלך | hitmachut.org",
  alternates: { canonical: "/" },
};
import Link from "next/link";
import styles from "@/components/home/homepage.module.css";
import { HomepageImage } from "@/components/home/homepage-image";
import {
  HomepageIcon,
  type HomepageIconName,
} from "@/components/home/homepage-icon";
const journeys: {
  icon: HomepageIconName;
  title: string;
  text: string;
  href: string;
  action: string;
  beta?: boolean;
}[] = [
  {
    icon: "compass",
    title: "בוחרים כיוון להתמחות",
    text: "מבררים תחומי עניין והעדפות בעזרת שאלון ניסיוני. נקודת פתיחה למחשבה ולשיחה.",
    href: "/career-fit",
    action: "להתחלת השאלון",
    beta: true,
  },
  {
    icon: "compare",
    title: "משווים בין מחלקות",
    text: "מחפשים לפי התמחות ואזור, ובוחנים את האפשרויות באותו הקשר ועם אותם מדדים.",
    href: "/departments",
    action: "לחיפוש מחלקות",
  },
  {
    icon: "document",
    title: "מעמיקים בפרופיל המחלקה",
    text: "קוראים על ההכשרה, הנתונים וחוויות מהשטח. בודקים את המקורות ואת מה שעוד חסר.",
    href: "/departments",
    action: "למאגר המחלקות",
  },
];
export default function HomePage() {
  return (
    <div className={styles.root} data-homepage-release="01">
      <main id="main-content" tabIndex={-1} className="home-page">
      <section className="home-hero">
        <HomepageImage
          priority
          className="home-hero-image"
          sizes="100vw"
        />
        <div className="home-hero-copy">
          <h1>
            הדרך לבחור
            <br />
            התמחות בישראל
          </h1>
          <p className="hero-description">
            מכירים את האפשרויות, משווים נתונים וקוראים חוויות מהשטח — כדי להגיע
            לבחירה שלכם עם תמונה רחבה יותר.
          </p>
          <div className="hero-actions">
            <Link href="/departments" className="button-link">
              <HomepageIcon name="search" />
              למאגר המחלקות
            </Link>
            <Link href="/career-fit" className="button-link secondary">
              התחילו בשאלון <span className="beta-badge">Beta</span>
            </Link>
          </div>
        </div>
      </section>
      <section className="journey-cards" aria-label="מאיפה מתחילים">
        {journeys.map((j, i) => (
          <article key={j.href + j.title}>
            <div className="feature-heading">
              <span className="icon-tile">
                <HomepageIcon name={j.icon} />
              </span>
              <h2>
                {i + 1}. {j.title}
              </h2>
            </div>
            <p>{j.text}</p>
            <Link href={j.href} className="feature-link">
              {j.action}
              <span aria-hidden="true">←</span>
              {j.beta && <span className="beta-badge">Beta</span>}
            </Link>
          </article>
        ))}
      </section>
      <section className="home-story" aria-labelledby="home-story-title">
        <div><h2 id="home-story-title">מבעיה אישית לפתרון מערכתי</h2>
        <p>הצורך להבין את אפשרויות ההתמחות הפך לרצון להנגיש מידע מסודר לכל מי שבוחר את דרכו ברפואה.</p></div>
        <Link className="text-link" href="/about">הסיפור מאחורי האתר ←</Link>
      </section>
      <section className="process-section">
        <div className="section-intro">
          <h2>איך זה עובד</h2>
          <p>שלושה צעדים לבירור ממוקד של האפשרויות שלכם.</p>
        </div>
        <ol className="process-grid">
          {[
            [
              "מגדירים מה מחפשים",
              "תחום התמחות, אזור ובית חולים. אפשר להתחיל גם מהשאלון הניסיוני.",
            ],
            [
              "משווים ובודקים",
              "בודקים מקורות, הגדרות ומידע חסר. משווים מחלקות מאותו תחום.",
            ],
            [
              "מעמיקים ושואלים",
              "שומרים מחלקות, קוראים חוויות ומשלימים את התמונה בשיחה עם המחלקה.",
            ],
          ].map(([title, text], i) => (
            <li key={title}>
              <span className="step-number">{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="home-sources">
        <div className="section-intro">
          <h2>יודעים מאיפה המידע מגיע</h2>
          <p>
            המידע באתר משלב נתונים רשמיים ממשרד הבריאות וממקורות נוספים, לצד מידע וחוויות מהשטח. מומלץ להתייחס לכל נתון בהתאם למקורו, למועד עדכונו ולמגבלותיו.
          </p>
        </div>
        <div className="source-cards">
          {(
            [
              [
                "database",
                "פרסומים רשמיים",
                "משרד הבריאות, הר״י וגופים מקצועיים.",
              ],
              [
                "building",
                "בתי חולים ומחלקות",
                "מידע ציבורי על ההכשרה והפעילות.",
              ],
              [
                "people",
                "ניסיון מהשטח",
                "שיתופי קהילה לאחר בדיקה, לצד הנתונים.",
              ],
              [
                "shield",
                "שקיפות והקשר",
                "מקור, רמת פירוט וסימון של מידע חסר או משוער.",
              ],
            ] as const
          ).map(([icon, title, text]) => (
            <article key={title}>
              <HomepageIcon name={icon} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <Link className="text-link" href="/about">
          על האתר ומקורות המידע ←
        </Link>
      </section>
    </main>
    </div>
  );
}
