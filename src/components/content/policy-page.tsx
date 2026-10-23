import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PUBLIC_CONTACT_EMAIL, PUBLIC_CONTACT_MAILTO } from "@/lib/contact";
import styles from "./policy-page.module.css";

type PolicySection = {
  id: string;
  title: string;
  paragraphs: string[];
  items?: string[];
  table?: { caption: string; headers: string[]; rows: string[][] };
  links?: { label: string; href: string }[];
};
export type PolicyDocument = {
  title: string;
  description: string;
  updated: string;
  summary: string[];
  sections: PolicySection[];
};

function StorageLabel({ text }: { text: string }) {
  const [identifier, ...description] = text.split(" — ");
  return <><bdi dir="ltr" className={styles.identifier}>{identifier}</bdi>{description.length > 0 && <span>{description.join(" — ")}</span>}</>;
}

export function PolicyPage({ document }: { document: PolicyDocument }) {
  return (
    <PageShell className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>מידע, זכויות ושימוש באתר</p>
        <h1>{document.title}</h1>
        <p className={styles.description}>{document.description}</p>
        <p className={styles.date}>עדכון אחרון: <time dateTime={document.updated}>{document.updated.split("-").reverse().join(".")}</time></p>
      </header>
      <section className={styles.summary} aria-labelledby="policy-summary-title">
        <h2 id="policy-summary-title">עיקרי הדברים</h2>
        <ul>{document.summary.map(text => <li key={text}>{text}</li>)}</ul>
        <p>התקציר נועד להתמצאות ואינו מחליף את המסמך המלא.</p>
      </section>
      <div className={styles.layout}>
        <nav className={styles.toc} aria-label={`תוכן עניינים — ${document.title}`}>
          <h2>בעמוד הזה</h2>
          <ol>{document.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol>
        </nav>
        <article className={styles.article} aria-label={document.title}>
          {document.sections.map((section, index) => (
            <section key={section.id} className={styles.section} aria-labelledby={section.id}>
              <h2 id={section.id} tabIndex={-1}><span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{section.title}</h2>
              {section.paragraphs.map(text => <p key={text}>{text}</p>)}
              {section.items && <ul>{section.items.map(text => <li key={text}>{text}</li>)}</ul>}
              {section.table && <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <caption>{section.table.caption}</caption>
                  <thead><tr>{section.table.headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
                  <tbody>{section.table.rows.map(row => <tr key={row[0]}>{row.map((cell, i) => i === 0 ? <th scope="row" key={i}><StorageLabel text={cell} /></th> : <td key={i}>{cell}</td>)}</tr>)}</tbody>
                </table>
                <div className={styles.mobileTable}>
                  <p className={styles.tableCaption}>{section.table.caption}</p>
                  {section.table.rows.map(row => <dl key={row[0]}>{row.map((cell, i) => <div key={i}><dt>{section.table!.headers[i]}</dt><dd>{i === 0 ? <StorageLabel text={cell} /> : cell}</dd></div>)}</dl>)}
                </div>
              </div>}
              {section.links && <ul className={styles.related}>{section.links.map(link => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>}
            </section>
          ))}
        </article>
      </div>
      <aside className={styles.contact} aria-labelledby="policy-contact-title">
        <div><h2 id="policy-contact-title">יש שאלה או בקשה?</h2><p>תומר סבצ&apos;ינסקי — מייסד האתר והגורם האחראי להפעלתו בשלב הנוכחי. לפניות בנושאי פרטיות, זכויות, נגישות ותוכן האתר.</p></div>
        <a href={PUBLIC_CONTACT_MAILTO}><bdi>{PUBLIC_CONTACT_EMAIL}</bdi></a>
      </aside>
      <nav className={styles.policies} aria-label="מסמכי מדיניות נוספים">
        <Link href="/privacy">פרטיות</Link><Link href="/cookies">עוגיות ואחסון מקומי</Link><Link href="/accessibility">נגישות</Link><Link href="/terms">תנאי שימוש</Link>
      </nav>
    </PageShell>
  );
}
