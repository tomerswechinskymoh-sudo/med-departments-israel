import Link from "next/link";
import { HomeHeroImage } from "@/components/home/home-hero-image";
import { HomeReviewComparisonCard } from "@/components/home/home-review-comparison-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ExperienceCta } from "@/components/experience/experience-cta";
import { HomeSection } from "@/components/home/home-section";
import { HomeStickyActions } from "@/components/home/home-sticky-actions";
import { PageShell } from "@/components/layout/page-shell";
import { OpeningCard } from "@/components/openings/opening-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import {
  ClipboardHeartIcon,
  DepartmentDirectoryIcon,
  SearchPulseIcon
} from "@/components/ui/med-icons";
import { SectionHeading } from "@/components/ui/section-heading";
import { getHomePageData, getReviewFormContext } from "@/lib/queries";
import { getDepartmentHref } from "@/lib/utils";

export const dynamic = "force-dynamic";

const trustItems = [
  "חוויות מאומתות בלבד",
  "תקנים פתוחים רשמיים בלבד",
  "שמור להשוואה"
];

const decisionSteps = [
  {
    title: "בוחרים תחום התמחות",
    description: "מתחילים מהתחום שרוצים להשוות",
    icon: SearchPulseIcon
  },
  {
    title: "משווים בין מחלקות",
    description: "רואים תוכניות, ביקורות, תקנים ומחקר",
    icon: DepartmentDirectoryIcon
  },
  {
    title: "נכנסים לפרופיל מלא",
    description: "פותחים עמוד מחלקה עם תמונה מלאה",
    icon: ClipboardHeartIcon
  }
];

export default async function HomePage() {
  const [data, reviewContext] = await Promise.all([getHomePageData(), getReviewFormContext()]);
  const showcaseDepartment = data.featuredDepartments[0];

  return (
    <PageShell className="space-y-8 py-6 pb-28 md:space-y-10 md:py-10 md:pb-12">
      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/88 shadow-panel">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
          <div className="space-y-6 p-5 md:p-7 lg:p-8">
            <p className="text-sm font-semibold text-brand-700">לפני שבוחרים, בודקים</p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-bold leading-tight text-ink md:text-5xl lg:text-[3.4rem]">
                לדעת איך מחלקה באמת נראית, לפני שנכנסים אליה
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-700">
                מחלקות, תקנים, מחקר ושיתופים מהשטח.
                <br className="hidden md:block" />
                כל מה שצריך כדי להבין אם זה מתאים לך, בלי ניחושים.
              </p>
            </div>

            <form
              id="home-search"
              action="/departments"
              className="rounded-[1.5rem] border border-brand-100 bg-white/96 p-3 shadow-panel"
            >
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  type="text"
                  name="search"
                  placeholder="חפשו מחלקה, בית חולים או תחום"
                  className="min-h-14 w-full rounded-full border border-brand-100 bg-surface px-5 py-3 text-sm outline-none transition focus:border-brand-300 md:flex-1"
                />
                <button
                  type="submit"
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
                >
                  חפש מחלקה
                </button>
              </div>
            </form>

            <div className="grid gap-2 md:grid-cols-3">
              {decisionSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3"
                >
                  <p className="text-xs font-black text-brand-700">שלב {index + 1}</p>
                  <p className="mt-1 text-sm font-bold text-ink">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>

            <ExperienceCta
              departments={reviewContext.departments}
              buttonClassName="inline-flex items-center justify-center rounded-full border border-amber-200 bg-gradient-to-l from-amber-300 via-amber-200 to-orange-100 px-6 py-3 text-sm font-semibold text-amber-950 shadow-lg shadow-amber-200/50 transition hover:-translate-y-0.5"
            />

            <div className="flex flex-wrap gap-2">
              {trustItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-brand-100 bg-brand-50/70 px-4 py-2 text-xs font-semibold text-brand-800"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 p-5 pt-0 md:p-7 md:pt-0 lg:p-8 lg:pr-0">
            <HomeHeroImage />

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <Card className="bg-brand-900 py-5 text-white">
                <p className="text-xs font-semibold text-brand-100">מבפנים</p>
                <p className="mt-2 text-sm leading-7 text-brand-50">
                  להבין את המחלקה מבפנים
                </p>
              </Card>
              <Card className="py-5">
                <p className="text-xs font-semibold text-brand-700">ביום־יום</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  לראות איך זה באמת מרגיש ביום־יום
                </p>
              </Card>
              <Card className="py-5">
                <p className="text-xs font-semibold text-brand-700">לפני שנכנסים</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  לדעת למה לצפות לפני שנכנסים
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="מוסדות" value={data.stats.institutions} />
        <StatCard label="מחלקות" value={data.stats.departments} />
        <StatCard label="שיתופים שעלו" value={data.stats.publishedReviews} />
        <StatCard label="תקנים פתוחים" value={data.stats.officialOpenings} />
      </section>

      <HomeSection tone="plain" className="space-y-6">
        <SectionHeading
          eyebrow="כך נראה עמוד מחלקה"
          title="דוגמה אחת שמראה את עומק המוצר"
          description="במקום להציף רשימה בעמוד הבית, מציגים איך נראה פרופיל מחלקה שאפשר לפתוח, להשוות ולשמור."
        />
        {showcaseDepartment ? (
          <Card className="overflow-hidden rounded-[2rem] border border-brand-100 bg-white p-0 shadow-panel">
            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-5 p-5 md:p-7">
                <div className="flex flex-wrap gap-2">
                  <Badge>{showcaseDepartment.specialtyName}</Badge>
                  {showcaseDepartment.region ? <Badge tone="default">{showcaseDepartment.region}</Badge> : null}
                  {showcaseDepartment.hasOpenResidency ? <Badge tone="success">תקנים פתוחים</Badge> : null}
                  {showcaseDepartment.hasResearch ? <Badge tone="success">מחקר פתוח</Badge> : null}
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-700">תצוגת פרופיל לדוגמה</p>
                  <h3 className="mt-2 text-3xl font-black leading-tight text-ink">
                    {showcaseDepartment.name}
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    {showcaseDepartment.institutionName}
                    {showcaseDepartment.city ? ` · ${showcaseDepartment.city}` : ""}
                    {showcaseDepartment.region ? ` · ${showcaseDepartment.region}` : ""}
                  </p>
                </div>
                <p className="max-w-2xl text-sm leading-8 text-slate-700">
                  {showcaseDepartment.shortSummary}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <RatingStars value={showcaseDepartment.averageOverall || 0} />
                  <span className="text-sm font-bold text-slate-600">
                    {showcaseDepartment.reviewCount} שיתופים מאושרים
                  </span>
                </div>
                <Link
                  href={getDepartmentHref(showcaseDepartment)}
                  className="inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-800"
                >
                  לפתיחת עמוד המחלקה
                </Link>
              </div>
              <div className="border-t border-brand-100 bg-gradient-to-br from-brand-50 via-white to-amber-50/60 p-5 md:p-7 lg:border-r lg:border-t-0">
                <p className="text-sm font-black text-ink">מה רואים בפרופיל מלא?</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white bg-white/86 px-4 py-4 shadow-sm">
                    <p className="text-xs font-bold text-slate-500">נתונים אובייקטיביים</p>
                    <p className="mt-2 text-2xl font-black text-ink">
                      {showcaseDepartment.residentsCount ?? 18}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">מתמחים פעילים</p>
                  </div>
                  <div className="rounded-2xl border border-white bg-white/86 px-4 py-4 shadow-sm">
                    <p className="text-xs font-bold text-slate-500">מעבר שלב א׳</p>
                    <p className="mt-2 text-2xl font-black text-ink">
                      {showcaseDepartment.shlavAlephPassRate ?? 82}%
                    </p>
                    <p className="mt-1 text-xs text-slate-500">נתון להשוואה מהירה</p>
                  </div>
                  <div className="rounded-2xl border border-white bg-white/86 px-4 py-4 shadow-sm sm:col-span-2">
                    <p className="text-xs font-bold text-slate-500">מה המחלקה מחפשת</p>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">
                      {showcaseDepartment.candidatePreferences ??
                        "מועמדים עם אחריות קלינית, סקרנות, עבודת צוות ועניין במחקר."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : null}
      </HomeSection>

      <HomeSection tone="soft" className="space-y-6">
        <SectionHeading
          eyebrow="פתוח עכשיו"
          title="מה פתוח עכשיו, ומה הסיכוי שלך להיכנס"
          description="תקנים פתוחים, מועדי ועדה ומה באמת חשוב למחלקה"
        />
        <div className="grid gap-4 xl:grid-cols-2">
          {data.featuredOpenings.map((opening) => (
            <OpeningCard key={opening.id} opening={opening} />
          ))}
        </div>
      </HomeSection>

      <HomeSection tone="contrast" className="space-y-6">
        <SectionHeading
          eyebrow="מהשטח"
          title="מה באמת קורה בפנים"
          description="סקירה מהירה שמקלה להשוות בין מחלקות לפי הוראה, עומס, מחקר, זמינות בכירים והמלצה כוללת"
        />
        <div className="grid gap-4 xl:grid-cols-2">
          {data.latestReviews.map((review) => (
            <HomeReviewComparisonCard key={review.id} review={review} />
          ))}
        </div>
      </HomeSection>

      <HomeSection tone="soft" className="space-y-6">
        <SectionHeading eyebrow="איך משתמשים" title="3 צעדים להחלטה טובה יותר" />
        <div className="grid gap-4 md:grid-cols-3">
          {decisionSteps.map((step, index) => (
            <Card key={step.title} className="bg-white py-5">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-900">
                <step.icon className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-brand-600">צעד {index + 1}</p>
              <h3 className="mt-2 text-xl font-bold text-ink">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">{step.description}</p>
            </Card>
          ))}
        </div>
      </HomeSection>

      <section className="rounded-[2rem] border border-brand-100 bg-gradient-to-l from-brand-900 via-brand-800 to-brand-700 p-5 text-white shadow-panel md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-brand-100">ממשיכים מכאן</p>
            <h2 className="mt-2 text-3xl font-bold">יש לך כמה כיוונים בראש?</h2>
            <p className="mt-3 text-sm leading-7 text-brand-50 md:text-base">
              תתחיל בחיפוש. תוך דקה כבר רואים תמונה הרבה יותר ברורה
            </p>
          </div>
          <Link
            href="/departments"
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition hover:bg-brand-50"
          >
            חפש מחלקה
          </Link>
        </div>
      </section>

      <HomeStickyActions departments={reviewContext.departments} />
    </PageShell>
  );
}
