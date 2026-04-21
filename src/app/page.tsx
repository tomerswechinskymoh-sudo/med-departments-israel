import Link from "next/link";
import { DepartmentCard } from "@/components/departments/department-card";
import { ReviewCard } from "@/components/departments/review-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ExperienceCta } from "@/components/experience/experience-cta";
import { PlaceholderVisual } from "@/components/media/placeholder-visual";
import { OpeningCard } from "@/components/openings/opening-card";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getHomePageData, getReviewFormContext } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [data, reviewContext] = await Promise.all([getHomePageData(), getReviewFormContext()]);

  return (
    <PageShell className="space-y-12 py-10 md:py-14">
      <section className="grid gap-6 rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-panel md:grid-cols-[1.1fr_0.9fr] md:p-8 lg:p-10">
        <div>
          <Badge tone="success">נבנה קודם כל לסטודנטים וסטאז'רים</Badge>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight text-ink md:text-6xl">
            להבין מחלקות בישראל לפני שבוחרים רוטציה, מחקר, סטאז' או כיוון להתמחות.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700 md:text-lg">
            מקום אחד שמרכז מחלקות, מוסדות, פתיחות רשמיות, מחקר וחוויות מאומתות מהשטח,
            בשפה שעוזרת לקבל החלטה פרקטית ולא רק "להרגיש" את המקום מרחוק.
          </p>

          <form action="/departments" className="mt-8 flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              name="search"
              placeholder="חפשו מחלקה, מוסד, עיר או תחום"
              className="w-full rounded-full border border-brand-100 bg-white px-5 py-3 text-sm outline-none transition focus:border-brand-300 md:max-w-xl"
            />
            <button
              type="submit"
              className="rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              חיפוש במאגר
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-3">
            <ExperienceCta
              departments={reviewContext.departments}
              buttonClassName="inline-flex items-center justify-center rounded-full border border-amber-200 bg-gradient-to-l from-amber-300 via-amber-200 to-orange-100 px-6 py-3 text-sm font-semibold text-amber-950 shadow-lg shadow-amber-200/50 transition hover:-translate-y-0.5"
            />
            <Link
              href="/departments"
              className="rounded-full border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-900 transition hover:bg-brand-50"
            >
              לעיון בכל המחלקות
            </Link>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.5rem] bg-brand-50/80 p-4">
              <p className="text-sm font-semibold text-brand-700">לגלות</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">לחפש לפי מוסד, תחום, עיר וסגנון הזדמנות.</p>
            </div>
            <div className="rounded-[1.5rem] bg-brand-50/80 p-4">
              <p className="text-sm font-semibold text-brand-700">להבין</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">לקרוא מידע פרקטי, פתיחות רשמיות וקריטריונים לקבלה.</p>
            </div>
            <div className="rounded-[1.5rem] bg-brand-50/80 p-4">
              <p className="text-sm font-semibold text-brand-700">להחליט</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">לשמור מועדפים ולחזור לרשימת ה-shortlist האישית.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <PlaceholderVisual
            label="תמונה רחבה וברורה לפני שמתחייבים למסלול"
            caption="עם מרחב למחקר, פתיחות רשמיות וחוויות אמיתיות מהשטח"
            variant="hero"
            className="aspect-[1.15/1] w-full"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-brand-900 text-white">
              <p className="text-sm font-semibold text-brand-100">מה רואים כאן</p>
              <p className="mt-3 text-sm leading-7 text-brand-50">
                מי ראשי המחלקה, מה חשוב להם בגיוס, אילו תקנים פתוחים ומה אומרים מי שכבר היו שם.
              </p>
            </Card>
            <Card className="bg-white/95">
              <p className="text-sm font-semibold text-brand-700">למה זה עוזר</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                כי במקום לשאול בעשר קבוצות שונות, אפשר להתחיל מתמונה מסודרת ולהעמיק רק במה שרלוונטי.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="מוסדות" value={data.stats.institutions} />
        <StatCard label="מחלקות" value={data.stats.departments} />
        <StatCard label="חוויות שפורסמו" value={data.stats.publishedReviews} />
        <StatCard label="פתיחות רשמיות" value={data.stats.officialOpenings} />
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="מחלקות נבחרות"
          title="נקודות פתיחה טובות להשוואה"
          description="מחלקות עם מידע מעודכן, חוויות שפורסמו ותוכן רשמי שעוזר להבין מהר אם שווה להעמיק."
        />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {data.featuredDepartments.map((department) => (
            <DepartmentCard key={department.id} department={department} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <SectionHeading
            eyebrow="פתיחות והזדמנויות"
            title="תקנים ומסלולים שכדאי להכיר עכשיו"
            description="פתיחות רשמיות שמפורסמות על ידי נציגים מאושרים בלבד, עם מידע שעוזר להבין מה חשוב למחלקה."
          />
          <div className="grid gap-4">
            {data.featuredOpenings.map((opening) => (
              <OpeningCard key={opening.id} opening={opening} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <SectionHeading
            eyebrow="חוויות מהשטח"
            title="מה מספרים מי שכבר היו שם"
            description="כל חוויה נשמרת עם פרטי אימות פרטיים, עוברת בדיקה ורק אז מתפרסמת."
          />
          <div className="grid gap-4">
            {data.latestReviews.map((review) => (
              <div key={review.id} className="space-y-2">
                <ReviewCard review={review} canReport={false} />
                <p className="px-2 text-xs text-slate-500">
                  {review.department.institution.name} · {review.department.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <SectionHeading
            eyebrow="מחקר"
            title="איפה יש כרגע מקום להיכנס פנימה"
            description="לא רק משרות. גם הזדמנויות מחקר שמתאימות לסטודנטים וסטאז'רים שרוצים להתחיל לבנות כיוון."
          />
          <div className="grid gap-4">
            {data.latestResearchOpportunities.map((opportunity) => (
              <Card key={opportunity.id}>
                <p className="text-lg font-bold text-ink">{opportunity.title}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {opportunity.department.institution.name} · {opportunity.department.name}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{opportunity.summary}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{opportunity.description}</p>
                {opportunity.contactInfo ? (
                  <p className="mt-3 text-xs font-semibold text-brand-700">
                    איש קשר: {opportunity.contactInfo}
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        </div>

        <Card className="bg-gradient-to-b from-white to-brand-50/60">
          <SectionHeading
            eyebrow="איך זה עובד"
            title="שלושה צעדים פשוטים"
            description="הניווט והתוכן מכוונים לסטודנטים וסטאז'רים, גם כשהתוכן מגיע מתושבים או מנציגי מחלקות."
          />
          <div className="mt-6 grid gap-4">
            <div className="rounded-[1.5rem] border border-brand-100 bg-white p-4">
              <p className="text-lg font-bold text-ink">1. מוצאים</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">מחלקות ומוסדות לפי מה שחשוב לך כרגע.</p>
            </div>
            <div className="rounded-[1.5rem] border border-brand-100 bg-white p-4">
              <p className="text-lg font-bold text-ink">2. משווים</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">פתיחות, מחקר, קריטריונים לקבלה וחוויות מאושרות.</p>
            </div>
            <div className="rounded-[1.5rem] border border-brand-100 bg-white p-4">
              <p className="text-lg font-bold text-ink">3. פועלים</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">שומרים מועדפים, מגישים חוויה או מועמדות כשזה רלוונטי.</p>
            </div>
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
