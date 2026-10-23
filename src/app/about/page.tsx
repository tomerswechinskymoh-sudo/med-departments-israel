import Link from "next/link";
import { ProductIcon } from "@/components/ui/product-icon";
import { PageShell } from "@/components/layout/page-shell";
import { PageIntro } from "@/components/ui/page-intro";
import { ApprovedBrand } from "@/components/layout/approved-brand";
import { PUBLIC_CONTACT_MAILTO } from "@/lib/contact";

export const metadata = {
  title: "אודות — מבעיה אישית לפתרון מערכתי | hitmachut.org",
  description: "הסיפור מאחורי התמחות.org: מהצורך להבין את אפשרויות ההתמחות בישראל להנגשת מידע, השוואת מחלקות ובחירה מושכלת.",
  alternates: { canonical: "/about" },
};
export default function AboutPage() {
  return (
    <PageShell className="about-page">
      <PageIntro eyebrow="אודות" title="מבעיה אישית לפתרון מערכתי" image="people"
        description="מהצורך להבין את אפשרויות ההתמחות בישראל, לרצון לתת לכל רופאה ורופא תמונה ברורה יותר של הדרך שלפניהם." />
      <section className="about-vision" aria-labelledby="story-title">
        <h2 id="story-title">הסיפור מאחורי האתר</h2>
        <p>מה שהתחיל בצורך אישי להבין טוב יותר את אפשרויות ההתמחות בישראל, הפך לרעיון רחב יותר: לרכז מידע, להנגיש נתונים ולאפשר לסטודנטים לרפואה, לסטאז׳רים ולרופאים לבחור את דרכם על בסיס תמונה ברורה ומבוססת יותר.</p>
        <p>האתר נוסד ונבנה על ידי תומר סבצ׳ינסקי, סטודנט לרפואה. הוא נולד מתוך השאלות שמלוות את הבחירה: מה ההבדלים בין המחלקות, אילו הזדמנויות הן מציעות, ומה חשוב לברר לפני שמחליטים.</p>
      </section>
      <section aria-labelledby="possibilities-title">
        <h2 id="possibilities-title" className="sr-only">מה האתר מאפשר</h2>
        <div className="about-values">
          {([
            ["compass", "בחירה מושכלת", "מכירים את תחומי ההתמחות ואת המחלקות, ובונים רשימה שמתאימה לשאלות ולצרכים שלכם."],
            ["document", "שקיפות והקשר", "רואים מה ידוע, מה מקור המידע ומה עדיין חסר — בלי להפוך חוסר מידע לציון."],
            ["database", "מידע במקום אחד", "משווים מחלקות באותו תחום על בסיס מדדים מוגדרים ונתונים ממקורות שונים."],
            ["people", "ניסיון מהקהילה", "מוסיפים לנתונים את ההקשר של חוויות מהשטח, שעוברות בדיקה לפני פרסום."],
          ] as const).map(([icon,title,text]) => <article key={title}><ProductIcon name={icon}/><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>
      <section className="about-process">
        <div className="section-intro"><h2>פחות מידע מפוזר. יותר מקום לבחירה.</h2><p>המידע על ההתמחות מפוזר בין פרסומים, אתרי בתי חולים ושיחות עם עמיתים. אנחנו מנסים לחבר בין המקורות ולהפוך את הבירור למסודר ונגיש.</p></div>
        <ol className="process-grid">
          {[["מוצאים כיוון", "מחפשים לפי תחום ואזור. אפשר להתחיל גם משאלון בחירת ההתמחות הניסיוני (Beta)."], ["משווים ובודקים", "בוחנים נתונים ומקורות, שומרים מחלקות ומזהים אילו שאלות עדיין פתוחות."], ["משלימים את התמונה", "קוראים חוויות, פונים למחלקה ומקבלים החלטה מתוך ההקשר האישי והמקצועי שלכם."]].map(([title,text],i)=><li key={title}><span className="step-number">{i+1}</span><h3>{title}</h3><p>{text}</p></li>)}
        </ol>
      </section>
      <section className="about-sources" id="sources">
        <div className="section-intro"><h2>מקורות המידע והדרך שבה הוא מוצג</h2><p>מקור ועדכניות הם חלק מהמידע, ולא הערת שוליים.</p></div>
        <div className="about-source-grid">
          <article><ProductIcon name="database"/><h3>פרסומים רשמיים</h3><p>נתונים ופרסומים של משרד הבריאות, הר״י ובתי החולים. כשנתון מתייחס לכלל תחום ההתמחות או למערך, הדבר מצוין לצד התצוגה.</p></article>
          <article><ProductIcon name="people"/><h3>חוויות ומידע מהשטח</h3><p>שיתופי משתמשים עוברים בדיקה לפני פרסום. חוויה אישית מוסיפה הקשר, ואינה מחליפה בירור ישיר עם המחלקה.</p></article>
          <article><ProductIcon name="document"/><h3>מקורות ומגבלות</h3><p>מידע חסר או משוער מסומן. מדדי מחקר והערכות מוצגים לפי הגדרותיהם; מומלץ לבדוק את תאריך העדכון ואת המקור.</p></article>
        </div>
      </section>
      <div className="about-contribute">
        <section><h2>עוזרים להשלים ולדייק</h2><p>מכירים את המחלקה מקרוב? אפשר לשתף חוויה או לדווח על טעות בעמוד המחלקה. צרפו קישור ומקור לבדיקה; העדכונים נבדקים לפני פרסום.</p><a className="text-link" href={PUBLIC_CONTACT_MAILTO}>ליצירת קשר ולתיקוני מידע ←</a></section>
        <section className="about-ministry"><ApprovedBrand placement="account"/><h2>הקשר למשרד הבריאות</h2><p>האתר נמצא באחריות משרד הבריאות. האחריות על האתר משתלבת במטרה להנגיש לרופאים מידע ברור ושימושי על אפשרויות ההתמחות בישראל.</p></section>
      </div>
      <section className="about-next"><h2>מוכנים להתחיל?</h2><p>חפשו מחלקות, שמרו את האפשרויות שמעניינות אתכם והשוו ביניהן.</p><div className="hero-actions"><Link className="button-link" href="/departments"><ProductIcon name="search"/>למאגר המחלקות</Link><Link className="button-link secondary" href="/compare"><ProductIcon name="compare"/>להשוואת מחלקות</Link></div></section>
    </PageShell>
  );
}
