import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FavoriteToggleButton } from "@/components/departments/favorite-toggle-button";
import { OfficialUpdatesList } from "@/components/departments/official-updates-list";
import { ReviewCard } from "@/components/departments/review-card";
import { ExperienceCta } from "@/components/experience/experience-cta";
import { PlaceholderVisual } from "@/components/media/placeholder-visual";
import { OpeningCard } from "@/components/openings/opening-card";
import { OpeningCriteriaGrid } from "@/components/openings/opening-criteria-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RatingStars } from "@/components/ui/rating-stars";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDepartmentPageData, getReviewFormContext } from "@/lib/queries";
import { buildDepartmentHref } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DepartmentDetailsPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);
  const reviewContext = await getReviewFormContext(slug);
  const department = await getDepartmentPageData(slug, session?.userId);

  if (!department) {
    notFound();
  }

  const visibleReviews = session ? department.reviews : department.reviews.slice(0, 3);
  const departmentHref = buildDepartmentHref(department.slug);
  const contactEmails = (department.publicContactEmail ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const hasOfficialDepartmentContent =
    department.heads.length > 0 ||
    department.officialUpdates.length > 0 ||
    department.researchOpportunities.length > 0 ||
    department.representativeAssignments.length > 0 ||
    department.residencyOpenings.length > 0;

  return (
    <PageShell className="space-y-8 py-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-panel">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="p-5 lg:p-6">
            <PlaceholderVisual
              label={department.name}
              caption={`${department.institution.name} · ${department.specialty.name}`}
              variant="department"
              className="aspect-[1/1.1] w-full"
            />
          </div>

          <div className="p-6 lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{department.institution.name}</Badge>
              <Badge>{department.specialty.name}</Badge>
              <Badge tone={department.residencyOpenings.length > 0 ? "success" : "warning"}>
                {department.residencyOpenings.length > 0 ? "יש תקנים פתוחים" : "אין תקנים פתוחים כרגע"}
              </Badge>
              <Badge tone={department.researchOpportunities.length > 0 ? "success" : "default"}>
                {department.researchOpportunities.length > 0 ? "יש הזדמנויות מחקר" : "ללא הזדמנויות מחקר"}
              </Badge>
            </div>

            <h1 className="mt-5 text-4xl font-bold text-ink">{department.name}</h1>
            <p className="mt-3 text-lg leading-8 text-slate-700">{department.shortSummary}</p>
            <p className="mt-5 text-sm leading-8 text-slate-700">{department.about}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="text-sm text-slate-500">שיתופים מהשטח</p>
                <p className="mt-2 text-2xl font-bold text-ink">{department.summary.reviewCount}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="text-sm text-slate-500">המלצה כוללת</p>
                <div className="mt-2">
                  <RatingStars value={department.summary.overallRecommendation || 0} />
                </div>
              </div>
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="text-sm text-slate-500">אווירת עבודה</p>
                <div className="mt-2">
                  <RatingStars value={department.summary.workAtmosphere || 0} />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <ExperienceCta
                departments={reviewContext.departments}
                selectedDepartmentId={department.id}
              />
              {session ? (
                <FavoriteToggleButton
                  departmentId={department.id}
                  initialFavorite={department.isFavorite}
                />
              ) : (
                <Link
                  href={`/login?next=${encodeURIComponent(departmentHref)}`}
                  className="rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-800"
                >
                  התחברות לשמירה להשוואה
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {!hasOfficialDepartmentContent ? (
        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border border-brand-100 bg-gradient-to-b from-brand-50/85 to-white">
            <p className="text-sm font-semibold text-brand-700">עדיין אין מידע רשמי</p>
            <h2 className="mt-2 text-2xl font-bold text-ink">עמוד המחלקה כבר פעיל, גם לפני שתוכן רשמי עלה</h2>
            <p className="mt-3 text-sm leading-8 text-slate-700">
              אפשר כבר להבין באיזה מוסד ובאיזה תחום מדובר, לשתף חוויה אישית מהמחלקה, ולחזור
              לכאן כשתתווסף בהמשך נוכחות רשמית של המחלקה.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-brand-100 bg-white px-4 py-4">
                <p className="text-xs font-semibold text-slate-500">מוסד</p>
                <p className="mt-2 font-semibold text-ink">{department.institution.name}</p>
              </div>
              <div className="rounded-2xl border border-brand-100 bg-white px-4 py-4">
                <p className="text-xs font-semibold text-slate-500">תחום</p>
                <p className="mt-2 font-semibold text-ink">{department.specialty.name}</p>
              </div>
              <div className="rounded-2xl border border-brand-100 bg-white px-4 py-4">
                <p className="text-xs font-semibold text-slate-500">שם העמוד</p>
                <p className="mt-2 font-semibold text-ink">{department.name}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/94">
            <p className="text-sm font-semibold text-brand-700">אפשר לעשות כבר עכשיו</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              <p>לקרוא את פרטי הבסיס של המחלקה והמוסד.</p>
              <p>לשתף חוויה אישית כדי לעזור לאחרים להבין איך זה נראה מבפנים.</p>
              <p>לחזור לכאן בהמשך כשתתווסף נוכחות רשמית, עדכונים או תקנים פתוחים.</p>
            </div>
            <div className="mt-5">
              <ExperienceCta
                departments={reviewContext.departments}
                selectedDepartmentId={department.id}
                className="w-full"
                buttonClassName="inline-flex w-full items-center justify-center rounded-full border border-amber-200 bg-gradient-to-l from-amber-300 via-amber-200 to-orange-100 px-6 py-4 text-sm font-semibold text-amber-950 shadow-lg shadow-amber-200/50 transition hover:-translate-y-0.5"
              />
            </div>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <SectionHeading
            title="מה כדאי לדעת לפני שמגיעים"
            description="חלק פרקטי שנועד לעזור להבין אם המחלקה מתאימה לסגנון הלמידה, לעומס ולחשיפה שאתם מחפשים."
          />
          <p className="mt-5 text-sm leading-8 text-slate-700">{department.practicalInfo}</p>
        </Card>

        <Card>
          <SectionHeading title="פרטי קשר בעמוד" description="מופיעים אם הוזנו על ידי המחלקה או נקלטו בייבוא רשמי." />
          <div className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
            <div>
              <span className="font-semibold text-ink">אימייל: </span>
              {contactEmails.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {contactEmails.map((email) => (
                    <a
                      key={email}
                      href={`mailto:${email}`}
                      className="rounded-full border border-brand-100 bg-brand-50/70 px-3 py-1.5 text-xs font-semibold text-brand-900"
                    >
                      {email}
                    </a>
                  ))}
                </div>
              ) : (
                <span>לא פורסם</span>
              )}
            </div>
            <p>
              <span className="font-semibold text-ink">טלפון: </span>
              {department.publicContactPhone ?? "לא פורסם"}
            </p>
            <p className="rounded-2xl bg-brand-50/70 p-4 text-xs leading-6 text-slate-600">
              תקנים פתוחים מתפרסמים רק דרך נציגים מאושרים של המחלקה, ורק אחרי אישור אדמין.
              אם ראיתם תקן בדף, הוא לא הגיע מטופס פתוח לכולם.
            </p>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <SectionHeading title="ראשי המחלקה" />
          <div className="grid gap-4">
            {department.heads.length === 0 ? (
              <EmptyState
                title="עדיין לא פורסמו ראשי מחלקה"
                description="כשהעמוד יתעדכן בתוכן רשמי, כאן יוצגו ראשי המחלקה או בעלי תפקיד רלוונטיים."
              />
            ) : (
              department.heads.map((head) => (
              <Card key={head.id} className="grid gap-4 md:grid-cols-[116px_1fr] md:items-center">
                <PlaceholderVisual
                  label={head.name}
                  caption={head.role ?? head.title}
                  variant="head"
                  circle
                  className="mx-auto w-28"
                />
                <div>
                  <p className="text-lg font-bold text-ink">{head.name}</p>
                  <p className="mt-1 text-sm font-semibold text-brand-700">{head.title}</p>
                  {head.role ? <p className="mt-1 text-sm text-slate-600">{head.role}</p> : null}
                  <p className="mt-3 text-sm leading-7 text-slate-700">{head.bio}</p>
                </div>
              </Card>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <SectionHeading title="עדכונים רשמיים" />
          <OfficialUpdatesList updates={department.officialUpdates} />
        </div>

        <div className="space-y-6">
          <SectionHeading
            title="נציג/ת המחלקה"
            description="איש/אשת הקשר לתוכן הרשמי של המחלקה. לא חייב/ת להיות ראש/ת המחלקה."
          />
          <div className="grid gap-4">
            {department.representativeAssignments.length === 0 ? (
              <Card>
                <p className="text-sm text-slate-600">עדיין לא פורסם נציג/ת מחלקה בעמוד הזה.</p>
              </Card>
            ) : (
              department.representativeAssignments.map((assignment) => (
                <Card key={assignment.id}>
                  <p className="text-lg font-bold text-ink">{assignment.user.fullName}</p>
                  <p className="mt-1 text-sm font-semibold text-brand-700">
                    {assignment.user.representativeProfile?.title ?? "נציג/ת מחלקה"}
                  </p>
                  {assignment.user.representativeProfile?.note ? (
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {assignment.user.representativeProfile.note}
                    </p>
                  ) : null}
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    {assignment.user.representativeProfile?.contactDetails ? (
                      <p>{assignment.user.representativeProfile.contactDetails}</p>
                    ) : null}
                    {assignment.user.email ? <p>אימייל: {assignment.user.email}</p> : null}
                    {assignment.user.phone ? <p>טלפון: {assignment.user.phone}</p> : null}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          title="תקנים פתוחים והזדמנויות"
          description="תוכן רשמי שנשלח דרך נציגים מאושרים בלבד, עם הסבר מה חשוב למחלקה ומה המועמד/ת צריך/ה לדעת מראש."
        />
        {department.residencyOpenings.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600">עדיין לא פורסמו תקנים פתוחים למחלקה הזו.</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {department.residencyOpenings.map((opening) => (
              <OpeningCard
                key={opening.id}
                opening={{
                  ...opening,
                  department: {
                    name: department.name,
                    institution: {
                      name: department.institution.name
                    },
                    specialty: {
                      name: department.specialty.name
                    }
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      {department.residencyOpenings[0]?.acceptanceCriteria ? (
        <section className="space-y-6">
          <SectionHeading
            title="מה בדרך כלל חשוב למחלקה"
            description="הנה דוגמה מתוך אחד התקנים הפעילים או העתידיים של המחלקה. בעמוד התקן עצמו אפשר לראות את כל הפירוט."
          />
          <Card>
            <OpeningCriteriaGrid criteria={department.residencyOpenings[0].acceptanceCriteria} />
          </Card>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeading title="הזדמנויות מחקר" />
          <div className="mt-5 space-y-4">
            {department.researchOpportunities.length === 0 ? (
              <p className="text-sm text-slate-600">כרגע לא פורסמו הזדמנויות מחקר פתוחות.</p>
            ) : (
              department.researchOpportunities.map((opportunity) => (
                <div key={opportunity.id} className="rounded-2xl bg-brand-50 p-4">
                  <p className="font-semibold text-ink">{opportunity.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{opportunity.summary}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{opportunity.description}</p>
                  {opportunity.contactInfo ? (
                    <p className="mt-3 text-xs font-semibold text-brand-700">
                      איש קשר: {opportunity.contactInfo}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="bg-gradient-to-b from-white to-brand-50/60">
          <SectionHeading
            title="לשתף גם את מי שמגיעים אחריך"
            description="אם הייתם כאן כסטודנטים, סטאז'רים או מתמחים, אפשר לשתף חוויה כדי לעזור למי שמתלבטים עכשיו."
          />
          <div className="mt-6">
            <ExperienceCta
              departments={reviewContext.departments}
              selectedDepartmentId={department.id}
              className="w-full"
              buttonClassName="inline-flex w-full items-center justify-center rounded-full border border-amber-200 bg-gradient-to-l from-amber-300 via-amber-200 to-orange-100 px-6 py-4 text-sm font-semibold text-amber-950 shadow-lg shadow-amber-200/50 transition hover:-translate-y-0.5"
            />
          </div>
        </Card>
      </section>

      <section className="space-y-6">
        <SectionHeading
          title="שיתופים מהשטח"
          description={
            session
              ? "כאן רואים את כל השיתופים שאושרו לעלייה."
              : "ללא התחברות מוצגת טעימה קצרה. חשבון עוזר בעיקר לשמור מחלקות להשוואה ולעקוב בנוחות."
          }
        />
        <div className="grid gap-4">
          {visibleReviews.map((review) => (
            <ReviewCard key={review.id} review={review} canReport={Boolean(session)} />
          ))}
          {!session && department.reviews.length > visibleReviews.length ? (
            <Card className="text-center">
              <p className="text-sm text-slate-600">
                יש עוד שיתופים מהשטח למחלקה הזו. התחברות נועדה בעיקר לשמירה להשוואה, מעקב ונוחות
                שימוש, לא כתנאי לקריאת עיקר המידע.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(departmentHref)}`}
                className="mt-4 inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white"
              >
                התחברות
              </Link>
            </Card>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
