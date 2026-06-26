import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StaticSection = {
  title: string;
  eyebrow?: string;
  body: readonly string[];
};

type StaticPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  kind?: "story" | "faq" | "policy" | "sitemap";
  theme?: "brand" | "teal" | "warm" | "rose";
  heroChips?: readonly string[];
  heroPanel?: {
    eyebrow?: string;
    title: string;
    body: string;
    items?: readonly string[];
  };
  sections: readonly StaticSection[];
  cta?: {
    href: string;
    label: string;
  };
};

const themeMap = {
  brand: {
    hero:
      "border-brand-100/70 bg-gradient-to-br from-white via-brand-50/80 to-teal-50/70",
    panel: "border-brand-100/80 bg-brand-900 text-white",
    chip: "border-brand-100 bg-white/80 text-brand-900",
    number: "bg-brand-900 text-white"
  },
  teal: {
    hero:
      "border-teal-100/70 bg-gradient-to-br from-white via-teal-50/80 to-brand-50/70",
    panel: "border-teal-100/80 bg-teal-800 text-white",
    chip: "border-teal-100 bg-white/80 text-teal-900",
    number: "bg-teal-700 text-white"
  },
  warm: {
    hero:
      "border-amber-200/80 bg-gradient-to-br from-white via-amber-50/85 to-brand-50/70",
    panel: "border-amber-200/80 bg-amber-100/90 text-amber-950",
    chip: "border-amber-200 bg-white/85 text-amber-950",
    number: "bg-amber-300 text-amber-950"
  },
  rose: {
    hero:
      "border-rose-100/80 bg-gradient-to-br from-white via-rose-50/80 to-brand-50/70",
    panel: "border-rose-100/80 bg-rose-100/90 text-rose-950",
    chip: "border-rose-100 bg-white/85 text-rose-900",
    number: "bg-rose-500 text-white"
  }
} as const;

function renderParagraphs(paragraphs: readonly string[]) {
  return (
    <div className="space-y-3 text-sm leading-8 text-slate-700">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

function renderStorySections(
  sections: readonly StaticSection[]
) {
  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <Card key={section.title} id={`section-${index + 1}`} className="rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-sm md:p-6">
          {section.eyebrow ? (
            <p className="text-sm font-semibold text-brand-600">{section.eyebrow}</p>
          ) : null}
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">{section.title}</h2>
          <div className="mt-4">{renderParagraphs(section.body)}</div>
        </Card>
      ))}
    </div>
  );
}

function renderFaqSections(sections: readonly StaticSection[]) {
  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <details
          key={section.title}
          id={`section-${index + 1}`}
          open={index === 0}
          className="rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-sm"
        >
          <summary className="flex cursor-pointer items-center justify-between gap-4">
            <span className="text-lg font-bold text-ink">{section.title}</span>
            <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
              לפתוח
            </span>
          </summary>
          <div className="mt-4">{renderParagraphs(section.body)}</div>
        </details>
      ))}
    </div>
  );
}

function renderPolicySections(sections: readonly StaticSection[]) {
  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <Card className="h-fit rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-sm lg:sticky lg:top-24">
        <p className="text-sm font-semibold text-brand-700">ניווט מהיר</p>
        <nav className="mt-3 grid gap-2">
          {sections.map((section, index) => (
            <a
              key={section.title}
              href={`#section-${index + 1}`}
              className="rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-white"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </Card>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <Card key={section.title} id={`section-${index + 1}`} className="rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-sm md:p-6">
            {section.eyebrow ? (
              <p className="text-sm font-semibold text-brand-600">{section.eyebrow}</p>
            ) : null}
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">{section.title}</h2>
            <div className="mt-4">{renderParagraphs(section.body)}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function renderSitemapSections(sections: readonly StaticSection[]) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {sections.map((section, index) => (
        <Card
          key={section.title}
          id={`section-${index + 1}`}
          className={cn(
            "rounded-[1.75rem]",
            index % 2 === 0 ? "bg-white/94" : "bg-gradient-to-b from-white to-brand-50/55"
          )}
        >
          <h2 className="text-2xl font-bold tracking-tight text-ink">{section.title}</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {section.body.map((item) =>
              item.startsWith("/") ? (
                <Link
                  key={item}
                  href={item}
                  className="rounded-full border border-brand-100 bg-brand-50/70 px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-white"
                >
                  {item}
                </Link>
              ) : (
                <p key={item} className="text-sm leading-7 text-slate-700">
                  {item}
                </p>
              )
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function StaticPage({
  eyebrow,
  title,
  description,
  kind = "story",
  theme = "brand",
  heroChips = [],
  heroPanel,
  sections,
  cta
}: StaticPageProps) {
  const themeClasses = themeMap[theme];

  return (
    <PageShell className="py-6 md:py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-sm md:p-7">
          <div className={cn("grid gap-5", heroPanel && "lg:grid-cols-[1fr_280px] lg:items-start")}>
            <div>
              <p className="text-sm font-semibold text-brand-700">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink md:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-8 text-slate-700">
                {description}
              </p>

              {heroChips.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {heroChips.map((chip) => (
                    <span
                      key={chip}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm",
                        themeClasses.chip
                      )}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {heroPanel ? (
              <Card className="rounded-2xl border border-brand-100 bg-brand-50/65 p-4 shadow-none">
                {heroPanel.eyebrow ? (
                  <p className="text-sm font-semibold text-brand-700">{heroPanel.eyebrow}</p>
                ) : null}
                <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">{heroPanel.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-700">{heroPanel.body}</p>
                {heroPanel.items?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-sm leading-7 text-slate-700">
                    {heroPanel.items.map((item) => (
                      <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-900">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Card>
            ) : null}
          </div>
        </section>

        {kind === "faq"
          ? renderFaqSections(sections)
          : kind === "policy"
            ? renderPolicySections(sections)
            : kind === "sitemap"
              ? renderSitemapSections(sections)
              : renderStorySections(sections)}

        {cta ? (
          <Card className="flex flex-col gap-4 rounded-2xl bg-gradient-to-l from-brand-900 via-brand-800 to-teal-700 p-5 text-white md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-100">ממשיכים מכאן</p>
              <p className="mt-1 text-sm leading-7 text-white/84">
                אם צריך פעולה ישירה, זה הקיצור המתאים.
              </p>
            </div>
            <Link
              href={cta.href}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-900 transition hover:bg-brand-50"
            >
              {cta.label}
            </Link>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
