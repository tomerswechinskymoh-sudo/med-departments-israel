import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

type StaticSection = {
  title: string;
  body: readonly string[];
};

type StaticPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  sections: readonly StaticSection[];
  cta?: {
    href: string;
    label: string;
  };
};

export function StaticPage({ eyebrow, title, description, sections, cta }: StaticPageProps) {
  return (
    <PageShell className="space-y-8 py-10">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />

      <div className="grid gap-4">
        {sections.map((section) => (
          <Card key={section.title}>
            <h2 className="text-xl font-bold text-ink">{section.title}</h2>
            <div className="mt-4 space-y-3 text-sm leading-8 text-slate-700">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {cta ? (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm leading-7 text-slate-700">
            צריכים פעולה ישירה? אפשר להמשיך מכאן למסלול המתאים.
          </p>
          <Link
            href={cta.href}
            className="rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white"
          >
            {cta.label}
          </Link>
        </Card>
      ) : null}
    </PageShell>
  );
}
