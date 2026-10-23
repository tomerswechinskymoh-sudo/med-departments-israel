import { FaqAccordion } from "@/components/content/faq-accordion";
import { PageShell } from "@/components/layout/page-shell";
import { PageIntro } from "@/components/ui/page-intro";
import { staticPages } from "@/lib/static-pages";
export const metadata = {
  title: "שאלות נפוצות | hitmachut.org",
  alternates: { canonical: "/faq" },
};
export default function FaqPage() {
  return (
    <PageShell className="faq-page">
      <PageIntro
        title="שאלות נפוצות"
        image="people"
        description="על חיפוש והשוואת מחלקות, מקורות המידע, הרשמה ופרטיות. תשובות שיעזרו לכם להמשיך בדרך."
      />
      <FaqAccordion items={staticPages.faq.sections} />
    </PageShell>
  );
}
