import Link from "next/link";
import { DepartmentCard } from "@/components/departments/department-card";
import { ReviewCard } from "@/components/departments/review-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ExperienceCta } from "@/components/experience/experience-cta";
import { HomeSection } from "@/components/home/home-section";
import { HomeStickyActions } from "@/components/home/home-sticky-actions";
import { PageShell } from "@/components/layout/page-shell";
import { PlaceholderVisual } from "@/components/media/placeholder-visual";
import { OpeningCard } from "@/components/openings/opening-card";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getHomePageData, getReviewFormContext } from "@/lib/queries";

export const dynamic = "force-dynamic";

const trustItems = [
  "חוויות עולות רק אחרי בדיקה",
  "פתיחות רשמיות בלבד",
  "שומרים מחלקות להשוואה"
];

const decisionSteps = [
  {
    title: "מחפשים",
    description: "לפי מוסד, תחום או עיר."
  },
  {
    title: "משווים",
    description: "אווירה, עומס, פתיחות ומחקר."
  },
  {
    title: "שומרים וחוזרים",
    description: "בונים רשימה קצרה בלי ללכת לאיבוד."
  }
];

export default async function HomePage() {
  const [data, reviewContext] = await Promise.all([getHomePageData(), getReviewFormContext()]);

  return (
    <PageShell className="space-y-8 py-8 pb-28 md:py-12 md:pb-12">
      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/88 shadow-panel">
        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="space-y-6 p-6 md:p-8 lg:p-10">
            <p className="text-sm font-semibold text-brand-700">לפני שבוחרים, בודקים</p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-bold leading-tight text-ink md:text-6xl">
                לדעת איך מחלקה באמת נראית
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-700 md:text-lg">
                מחלקות, תקנים, מחקר ושיתופים מהשטח. קצר, ברור, ועוזר להבין אם זה מתאים לך.
              </p>
            </div>

            <form
              id="home-search"
              action="/departments"
              className="rounded-[1.75rem] border border-brand-100 bg-white/96 p-3 shadow-panel"
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
                  חיפוש מחלקות
                </button>
              </div>
            </form>

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

          <div className="grid gap-4 p-6 pt-0 md:p-8 md:pt-0 lg:p-10 lg:pr-0">
            <PlaceholderVisual
              label="מבט מהיר על מחלקות, פתיחות וחוויות"
              caption="מקום אחד שמשלב מידע פרקטי, תוכן רשמי וחוויות מהשטח"
              variant="hero"
              className="aspect-[1.1/1] w-full"
            />

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <Card className="bg-brand-900 text-white">
                <p className="text-xs font-semibold text-brand-100">מה באמת קורה שם</p>
                <p className="mt-2 text-sm leading-7 text-brand-50">
                  איפה לומדים טוב, איך נראה היום־יום, ומה פתוח עכשיו.
                </p>
              </Card>
              <Card>
                <p className="text-xs font-semibold text-brand-700">לא רק לשמוע</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  לראות תמונה ברורה לפני שנכנסים לעומק.
                </p>
              </Card>
              <Card>
                <p className="text-xs font-semibold text-brand-700">למה זה עוזר</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  להבין מהר אם מחלקה שווה בדיקה רצינית.
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
        <StatCard label="פתיחות פעילות" value={data.stats.officialOpenings} />
      </section>

      <HomeSection tone="plain" className="space-y-6">
        <SectionHeading
          eyebrow="להתחיל מכאן"
          title="מחלקות שכדאי לבדוק"
          description="עמודים עם מספיק מידע כדי להבין מהר אם שווה להעמיק."
        />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {data.featuredDepartments.map((department) => (
            <DepartmentCard key={department.id} department={department} />
          ))}
        </div>
      </HomeSection>

      <HomeSection tone="soft" className="space-y-6">
        <SectionHeading
          eyebrow="פתוח עכשיו"
          title="תקנים והזדמנויות ששווה לראות"
          description="מה פתוח, מתי ועדה, ומה באמת חשוב למחלקה."
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
          title="מה אומרים מי שהיו שם"
          description="מה עבד, מה פחות, ומה חשוב לדעת לפני שמגיעים."
        />
        <div className="grid gap-4 xl:grid-cols-3">
          {data.latestReviews.map((review) => (
            <div key={review.id} className="space-y-2">
              <ReviewCard review={review} canReport={false} />
              <p className="px-2 text-xs text-slate-500">
                {review.department.institution.name} · {review.department.name}
              </p>
            </div>
          ))}
        </div>
      </HomeSection>

      <HomeSection tone="soft" className="space-y-6">
        <SectionHeading eyebrow="איך משתמשים" title="3 צעדים להחלטה טובה יותר" />
        <div className="grid gap-4 md:grid-cols-3">
          {decisionSteps.map((step, index) => (
            <Card key={step.title} className="bg-white">
              <p className="text-sm font-semibold text-brand-600">צעד {index + 1}</p>
              <h3 className="mt-2 text-xl font-bold text-ink">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">{step.description}</p>
            </Card>
          ))}
        </div>
      </HomeSection>

      <section className="rounded-[2rem] border border-brand-100 bg-gradient-to-l from-brand-900 via-brand-800 to-brand-700 p-6 text-white shadow-panel md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-brand-100">ממשיכים מכאן</p>
            <h2 className="mt-2 text-3xl font-bold">יש לך כמה כיוונים בראש?</h2>
            <p className="mt-3 text-sm leading-7 text-brand-50 md:text-base">
              תתחילו בחיפוש. תוך דקה כבר רואים תמונה הרבה יותר ברורה.
            </p>
          </div>
          <Link
            href="/departments"
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition hover:bg-brand-50"
          >
            חיפוש מחלקות
          </Link>
        </div>
      </section>

      <HomeStickyActions departments={reviewContext.departments} />
    </PageShell>
  );
}
