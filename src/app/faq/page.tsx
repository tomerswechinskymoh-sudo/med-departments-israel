import { FaqAccordion } from "@/components/content/faq-accordion";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { staticPages } from "@/lib/static-pages";

export default function FaqPage() {
  const page = staticPages.faq;

  return (
    <PageShell className="space-y-8 py-8 md:py-10">
      <section className="border-b border-brand-100 pb-8">
        <p className="text-sm font-semibold text-brand-700">{page.eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-ink md:text-5xl">
          {page.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-700">
          {page.description}
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <Card className="h-fit rounded-2xl !p-4 lg:sticky lg:top-24">
          <p className="text-sm font-semibold text-brand-700">ניווט מהיר</p>
          <div className="mt-4 grid gap-3">
            {page.sections.map((section, index) => (
              <a
                key={section.title}
                href={`#faq-${index + 1}`}
                className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-white"
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
