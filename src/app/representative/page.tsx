import Link from "next/link";
import { requireApprovedPublisher } from "@/lib/auth-guards";
import { getRepresentativeDashboardData } from "@/lib/queries";
import { DepartmentEditorForm } from "@/components/forms/department-editor-form";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function openingStatusLabel(status: "OPEN" | "UPCOMING" | "CLOSED") {
  if (status === "OPEN") {
    return { label: "פתוח", tone: "success" as const };
  }

  if (status === "UPCOMING") {
    return { label: "צפוי", tone: "warning" as const };
  }

  return { label: "סגור", tone: "default" as const };
}

export default async function RepresentativePage() {
  const session = await requireApprovedPublisher();
  const assignments = await getRepresentativeDashboardData(session.userId, {
    includeAllDepartments: session.role === "admin"
  });

  return (
    <PageShell className="space-y-8 py-10">
      <SectionHeading
        eyebrow="אזור פרסום רשמי"
        title="ניהול עמודי מחלקה, פתיחות, מחקר ומועמדויות"
        description={
          session.role === "admin"
            ? "כאדמין אפשר לנהל את כל שכבת הפרסום הרשמית ולעבור בין מחלקות שונות."
            : "האזור הזה מיועד רק לנציגים מאושרים. כל פרסום פתיחות נעשה מכאן ולא דרך ה-homepage הציבורי."
        }
      />

      {assignments.length === 0 ? (
        <EmptyState
          title="אין מחלקות מורשות לחשבון הזה"
          description="אם זה חשבון חדש, ייתכן שהבקשה עדיין ממתינה לאישור או שלא שויכה מחלקה."
          ctaHref="/verification"
          ctaLabel="לבדיקת בקשות"
        />
      ) : (
        <div className="space-y-8">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="space-y-6">
              <Card className="bg-brand-900 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-brand-100">ניהול מחלקה</p>
                    <h2 className="mt-2 text-2xl font-bold">
                      {assignment.institution.name} · {assignment.name}
                    </h2>
                    <p className="mt-2 text-sm text-brand-50">{assignment.specialty.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/representative/openings/new?departmentId=${assignment.id}`}
                      className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-900"
                    >
                      פתיחה חדשה
                    </Link>
                    <Link
                      href={`/departments/${assignment.slug}`}
                      className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white"
                    >
                      לעמוד הציבורי
                    </Link>
                  </div>
                </div>
              </Card>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card>
                  <SectionHeading
                    title="עריכת עמוד המחלקה"
                    description="התוכן הזה פונה לסטודנטים וסטאז'רים: מה הם יראו, מה חשוב להם לדעת, ואיך ליצור קשר."
                  />
                  <div className="mt-6">
                    <DepartmentEditorForm
                      initialValues={{
                        departmentId: assignment.id,
                        departmentName: assignment.name,
                        institutionName: assignment.institution.name,
                        specialtyName: assignment.specialty.name,
                        shortSummary: assignment.shortSummary,
                        about: assignment.about,
                        practicalInfo: assignment.practicalInfo,
                        publicContactEmail: assignment.publicContactEmail ?? "",
                        publicContactPhone: assignment.publicContactPhone ?? "",
                        heads: assignment.heads.map((head) => ({
                          id: head.id,
                          name: head.name,
                          title: head.title,
                          bio: head.bio,
                          profileImageUrl: head.profileImageUrl ?? ""
                        })),
                        officialUpdates: assignment.officialUpdates.map((update) => ({
                          id: update.id,
                          title: update.title,
                          body: update.body
                        })),
                        researchOpportunities: assignment.researchOpportunities.map((opportunity) => ({
                          id: opportunity.id,
                          title: opportunity.title,
                          summary: opportunity.summary,
                          description: opportunity.description,
                          contactInfo: opportunity.contactInfo ?? ""
                        }))
                      }}
                    />
                  </div>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <div className="flex items-center justify-between gap-4">
                      <SectionHeading
                        title="פתיחות פעילות ועתידיות"
                        description="פתיחות מתפרסמות רק דרך האזור המאושר הזה."
                      />
                      <Link
                        href={`/representative/openings/new?departmentId=${assignment.id}`}
                        className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800"
                      >
                        פתיחה חדשה
                      </Link>
                    </div>

                    <div className="mt-5 space-y-4">
                      {assignment.residencyOpenings.length === 0 ? (
                        <p className="text-sm text-slate-600">עדיין לא פורסמו פתיחות למחלקה הזו.</p>
                      ) : (
                        assignment.residencyOpenings.map((opening) => {
                          const status = openingStatusLabel(opening.status);
                          const bestScore = opening.applications.reduce<number | null>(
                            (best, application) =>
                              application.matchScore === null
                                ? best
                                : best === null || application.matchScore > best
                                  ? application.matchScore
                                  : best,
                            null
                          );
                          const topMatchesCount = opening.applications.filter(
                            (application) => application.isTopMatch
                          ).length;

                          return (
                            <div key={opening.id} className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-ink">{opening.title}</p>
                                  <p className="mt-1 text-sm text-slate-600">{opening.summary}</p>
                                </div>
                                <Badge tone={status.tone}>{status.label}</Badge>
                              </div>
                              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                <span>{opening._count.applications} מועמדויות</span>
                                <span>ועדה: {opening.committeeDate ? new Date(opening.committeeDate).toLocaleDateString("he-IL") : "לא הוגדר"}</span>
                                {bestScore !== null ? <span>התאמה מובילה: {bestScore}/100</span> : null}
                                {topMatchesCount > 0 ? <span>Top matches: {topMatchesCount}</span> : null}
                              </div>
                              <div className="mt-4 flex flex-wrap gap-3">
                                <Link
                                  href={`/representative/openings/${opening.id}`}
                                  className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
                                >
                                  ניהול פתיחה
                                </Link>
                                <Link
                                  href={`/openings/${opening.id}`}
                                  className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800"
                                >
                                  תצוגה ציבורית
                                </Link>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
