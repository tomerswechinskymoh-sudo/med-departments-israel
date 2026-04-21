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
  sections: readonly StaticSection[],
  themeClasses: (typeof themeMap)[keyof typeof themeMap]
) {
  return (
    <div className="space-y-5">
      {sections.map((section, index) => (
        <div
          key={section.title}
          id={`section-${index + 1}`}
          className={cn(
            "grid gap-4 lg:grid-cols-[88px_1fr] lg:items-start",
            index % 2 === 1 && "lg:grid-cols-[1fr_88px]"
          )}
        >
          <div className={cn("flex lg:justify-center", index % 2 === 1 && "lg:order-2")}>
            <div
              className={cn(
                "inline-flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold shadow-panel",
                themeClasses.number
              )}
            >
              {index + 1}
            </div>
          </div>
          <Card
            className={cn(
              "rounded-[1.75rem]",
              index % 2 === 1 && "lg:order-1",
              index % 2 === 0 ? "bg-white/94" : "bg-gradient-to-b from-white to-brand-50/55"
            )}
          >
            {section.eyebrow ? (
              <p className="text-sm font-semibold text-brand-600">{section.eyebrow}</p>
            ) : null}
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">{section.title}</h2>
            <div className="mt-4">{renderParagraphs(section.body)}</div>
          </Card>
        </div>
      ))}
    </div>
  );
}

function renderFaqSections(
  sections: readonly StaticSection[],
  themeClasses: (typeof themeMap)[keyof typeof themeMap]
) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className={cn("rounded-[1.75rem]", themeClasses.panel)}>
        <p className="text-sm font-semibold text-white/72">בקצרה</p>
        <h2 className="mt-2 text-2xl font-bold">מה חשוב לדעת?</h2>
        <div className="mt-4 space-y-3 text-sm leading-7 text-white/82">
          <p>לא חייבים חשבון כדי לשתף חוויה.</p>
          <p>שיתופים עולים רק אחרי בדיקה.</p>
          <p>פרטים מזהים נשמרים בפרטיות אם בחרת בעילום שם.</p>
        </div>
      </Card>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <details
            key={section.title}
            id={`section-${index + 1}`}
            open={index === 0}
            className="rounded-[1.75rem] border border-brand-100/80 bg-white/94 p-5 shadow-panel"
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
    </div>
  );
}

function renderPolicySections(
  sections: readonly StaticSection[],
  themeClasses: (typeof themeMap)[keyof typeof themeMap]
) {
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <Card className="h-fit rounded-[1.75rem] lg:sticky lg:top-24">
        <p className="text-sm font-semibold text-brand-700">ניווט מהיר</p>
        <nav className="mt-4 grid gap-2">
          {sections.map((section, index) => (
            <a
              key={section.title}
              href={`#section-${index + 1}`}
              className="rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-white"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </Card>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <Card key={section.title} id={`section-${index + 1}`} className="rounded-[1.75rem]">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold shadow-panel",
                  themeClasses.number
                )}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                {section.eyebrow ? (
                  <p className="text-sm font-semibold text-brand-600">{section.eyebrow}</p>
                ) : null}
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">{section.title}</h2>
                <div className="mt-4">{renderParagraphs(section.body)}</div>
              </div>
            </div>
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
    <PageShell className="space-y-8 py-10 md:py-12">
      <section className={cn("overflow-hidden rounded-[2rem] border p-6 shadow-panel md:p-8", themeClasses.hero)}>
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-semibold text-brand-700">{eyebrow}</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-ink md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700 md:text-lg">
              {description}
            </p>

            {heroChips.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {heroChips.map((chip) => (
                  <span
                    key={chip}
                    className={cn(
                      "rounded-full border px-4 py-2 text-xs font-semibold shadow-sm",
                      themeClasses.chip
                    )}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <Card className={cn("rounded-[1.75rem] p-6", themeClasses.panel)}>
            {heroPanel?.eyebrow ? (
              <p
                className={cn(
                  "text-sm font-semibold",
                  theme === "brand" || theme === "teal" ? "text-white/72" : "text-slate-800/70"
                )}
              >
                {heroPanel.eyebrow}
              </p>
            ) : null}
            <h2 className="mt-1 text-2xl font-bold tracking-tight">{heroPanel?.title ?? "במבט מהיר"}</h2>
            <p
              className={cn(
                "mt-3 text-sm leading-7",
                theme === "brand" || theme === "teal" ? "text-white/84" : "text-slate-800/80"
              )}
            >
              {heroPanel?.body ?? "כאן תמצאו את הגרסה הקצרה והברורה של מה שחשוב לדעת."}
            </p>
            {heroPanel?.items?.length ? (
              <div className="mt-4 space-y-2 text-sm leading-7">
                {heroPanel.items.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            ) : null}
          </Card>
        </div>
      </section>

      {kind === "faq"
        ? renderFaqSections(sections, themeClasses)
        : kind === "policy"
          ? renderPolicySections(sections, themeClasses)
          : kind === "sitemap"
            ? renderSitemapSections(sections)
            : renderStorySections(sections, themeClasses)}

      {cta ? (
        <Card className="flex flex-col gap-4 rounded-[1.75rem] bg-gradient-to-l from-brand-900 via-brand-800 to-teal-700 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-100">ממשיכים מכאן</p>
            <p className="mt-2 text-sm leading-7 text-white/84">
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
    </PageShell>
  );
}
