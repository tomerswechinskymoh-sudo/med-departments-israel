import { FaqAccordion } from "@/components/content/faq-accordion";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import {
  ClipboardHeartIcon,
  QuestionSparkIcon,
  ReviewBubbleIcon,
  ShieldCheckIcon
} from "@/components/ui/med-icons";
import { staticPages } from "@/lib/static-pages";

const spotlightCards = [
  {
    title: "שיתופים מהשטח",
    body: "אפשר לשתף גם בלי חשבון, אבל כל שיתוף עובר בדיקה לפני פרסום.",
    icon: ReviewBubbleIcon
  },
  {
    title: "פרטיות ואימות",
    body: "אפשר להישאר בעילום שם. פרטי האימות נשארים פרטיים ולא מוצגים באתר.",
    icon: ShieldCheckIcon
  },
  {
    title: "תוכן רשמי",
    body: "תקנים, מחקר ועדכונים רשמיים עולים רק דרך נציגים מורשים ובאישור אדמין.",
    icon: ClipboardHeartIcon
  }
];

export default function FaqPage() {
  const page = staticPages.faq;

  return (
    <PageShell className="space-y-8 py-10 md:py-12">
      <section className="overflow-hidden rounded-[2rem] border border-teal-100/80 bg-gradient-to-br from-white via-teal-50/80 to-brand-50/65 p-6 shadow-panel md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-semibold text-brand-700">{page.eyebrow}</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-ink md:text-5xl">
              {page.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-700 md:text-base">
              {page.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {page.heroChips?.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-teal-100 bg-white/85 px-4 py-2 text-xs font-semibold text-teal-900"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <Card className="rounded-[1.75rem] border border-teal-100/90 bg-teal-900 text-white">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <QuestionSparkIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white/75">{page.heroPanel?.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-bold">{page.heroPanel?.title}</h2>
              </div>
            </div>
            <p className="mt-5 text-sm leading-8 text-white/85">{page.heroPanel?.body}</p>
            <div className="mt-5 grid gap-3">
              {page.heroPanel?.items?.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.25rem] border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white/90"
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {spotlightCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="rounded-[1.75rem] bg-white/95">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-900">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-xl font-bold text-ink">{card.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">{card.body}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <Card className="h-fit rounded-[1.75rem] lg:sticky lg:top-24">
          <p className="text-sm font-semibold text-brand-700">ניווט מהיר</p>
          <div className="mt-4 grid gap-3">
            {page.sections.map((section, index) => (
              <a
                key={section.title}
                href={`#faq-${index + 1}`}
                className="rounded-[1.25rem] border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-white"
              >
                {section.title}
              </a>
            ))}
          </div>

          {page.cta ? (
            <Link
              href={page.cta.href}
              className="mt-5 inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              {page.cta.label}
            </Link>
          ) : null}
        </Card>

        <FaqAccordion items={page.sections} />
      </section>
    </PageShell>
  );
}
