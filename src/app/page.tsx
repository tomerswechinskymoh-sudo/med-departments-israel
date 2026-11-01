export const metadata = {
  title: "חיפוש והשוואת מחלקות התמחות בישראל | hitmachut.org",
  description: "הכירו מחלקות בבתי החולים בישראל, השוו נתונים, תנאי הכשרה וחוויות מהשטח, ומצאו את המקום שמתאים לכם.",
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
  primary?: boolean;
}[] = [
  {
    icon: "search",
    title: "חיפוש והשוואת מחלקות",
    text: "מחפשים לפי התמחות ואזור, ובוחנים את האפשרויות באותו הקשר ועם אותם מדדים.",
    href: "/departments",
    action: "חיפוש והשוואת מחלקות",
    primary: true,
  },
  {
    icon: "document",
    title: "מעמיקים בפרופיל המחלקה",
    text: "קוראים על ההכשרה, הנתונים וחוויות מהשטח. בודקים את המקורות ואת מה שעוד חסר.",
    href: "/departments",
    action: "למאגר המחלקות",
  },
  {
    icon: "compass",
    title: "עוד לא בחרתם תחום התמחות?",
    text: "שאלון ההתאמה הניסיוני עשוי לעזור לחדד תחומי עניין והעדפות. זהו כלי עזר נוסף, שאינו כלי מתוקף לקבלת החלטה.",
    href: "/career-fit",
    action: "לשאלון ההתאמה",
    beta: true,
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
            חיפוש והשוואת
            <br />
            מחלקות התמחות בישראל
          </h1>
          <p className="hero-description">
            הכירו מחלקות בבתי החולים בישראל, השוו נתונים, תנאי הכשרה וחוויות מהשטח, ומצאו את המקום שמתאים לכם.
          </p>
          <div className="hero-actions">
            <Link href="/departments" className="button-link">
              <HomepageIcon name="search" />
              חיפוש והשוואת מחלקות
            </Link>
            <Link href="/career-fit" className="hero-secondary-link">
              עדיין מתלבטים באיזה תחום? נסו את שאלון ההתאמה <span className="beta-badge">(Beta)</span>
            </Link>
          </div>
        </div>
      </section>
      <section className="journey-cards" aria-label="מאיפה מתחילים">
        {journeys.map((j) => (
          <article key={j.href + j.title} className={j.primary ? "journey-primary" : j.beta ? "journey-secondary" : undefined}>
            <div className="feature-heading">
              <span className="icon-tile">
                <HomepageIcon name={j.icon} />
              </span>
              <h2>
                {j.title}
                {j.beta && <> <span className="beta-badge">Beta</span></>}
              </h2>
            </div>
            <p>{j.text}</p>
            <Link href={j.href} className={j.primary ? "button-link feature-primary-link" : "feature-link"}>
              {j.action}
              <span aria-hidden="true">←</span>
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
              "מחפשים מחלקות",
              "בוחרים תחום התמחות, אזור או בית חולים ומגלים את המחלקות הרלוונטיות.",
            ],
            [
              "משווים בין האפשרויות",
              "משווים נתונים, מסלולי הכשרה ומידע על המחלקות כדי להבין את ההבדלים.",
            ],
            [
              "מעמיקים ומקבלים החלטה",
              "קוראים חוויות מהשטח, שומרים מחלקות ומתעמקים במידע לפני הבחירה.",
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
