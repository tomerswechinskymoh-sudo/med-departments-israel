import Link from "next/link";
import { ContentStatus, SubmissionStatus } from "@prisma/client";
import { requireRepresentative } from "@/lib/auth-guards";
import { getRepresentativeDashboardData, getUserDashboardData } from "@/lib/queries";
import { departmentEditorSchema } from "@/lib/validation";
import { DepartmentEditorForm } from "@/components/forms/department-editor-form";
import { RepresentativeProfileForm } from "@/components/forms/representative-profile-form";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function openingStatusLabel(status: "OPEN" | "UPCOMING" | "CLOSED") {
  if (status === "OPEN") {
    return { label: "פתוח להגשה", tone: "success" as const };
  }

  if (status === "UPCOMING") {
    return { label: "עתידי", tone: "warning" as const };
  }

  return { label: "סגור", tone: "default" as const };
}

function contentStatusLabel(status: ContentStatus) {
  if (status === ContentStatus.PENDING_REVIEW) {
    return { label: "ממתין לאישור", tone: "warning" as const };
  }

  if (status === ContentStatus.PUBLISHED) {
    return { label: "מפורסם", tone: "success" as const };
  }

  return { label: "לא פעיל", tone: "default" as const };
}

function requestStatusLabel(status: SubmissionStatus) {
  if (status === SubmissionStatus.APPROVED) {
    return { label: "אושר", tone: "success" as const };
  }

  if (status === SubmissionStatus.REJECTED) {
    return { label: "נדחה", tone: "danger" as const };
  }

  return { label: "ממתין לאישור", tone: "warning" as const };
}

function resolveDepartmentFormValues(assignment: Awaited<ReturnType<typeof getRepresentativeDashboardData>>[number]) {
  const pendingRequest = assignment.departmentChangeRequests.find(
    (request) => request.status === SubmissionStatus.PENDING_REVIEW
  );

  if (pendingRequest) {
    const parsed = departmentEditorSchema.safeParse(pendingRequest.payload);

    if (parsed.success) {
      return parsed.data;
    }
  }

  return {
    departmentId: assignment.id,
    shortSummary: assignment.shortSummary,
    about: assignment.about,
    practicalInfo: assignment.practicalInfo,
    publicContactEmail: assignment.publicContactEmail ?? "",
    publicContactPhone: assignment.publicContactPhone ?? "",
    heads: assignment.heads.map((head) => ({
      id: head.id,
      name: head.name,
      title: head.title,
      role: head.role ?? "",
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
  };
}

export default async function RepresentativePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRepresentative();
  const params = await searchParams;
  const linkedinError = typeof params.linkedinError === "string" ? params.linkedinError : null;
  const linkedinSuccess = params.linkedin === "connected";
  const [assignments, profile] = await Promise.all([
    getRepresentativeDashboardData(session.userId),
    getUserDashboardData(session.userId)
  ]);

  return (
    <PageShell className="space-y-8 py-10">
      <SectionHeading
        eyebrow="אזור נציגי מחלקה"
        title="ניהול תוכן רשמי למחלקות המשויכות"
        description="כאן מגישים שינויים לעמודי מחלקה ולתקנים פתוחים. שום דבר לא עולה לציבור לפני אישור אדמין."
      />

      <Card>
        <SectionHeading
          title="פרופיל נציג/ת המחלקה"
          description="הפרופיל הזה מייצג את איש/אשת הקשר של המחלקה. הוא לא חייב להיות זהה לראש/ת המחלקה."
        />
        <div className="mt-6">
          <RepresentativeProfileForm
            initialValues={{
              fullName: profile?.fullName ?? session.fullName,
              email: profile?.email ?? session.email,
              phone: profile?.phone ?? "",
              profile: {
                title: profile?.representativeProfile?.title ?? "",
                contactDetails: profile?.representativeProfile?.contactDetails ?? "",
                note: profile?.representativeProfile?.note ?? ""
              }
            }}
            linkedinConnected={Boolean(profile?.linkedinId)}
            linkedinEmail={profile?.email ?? session.email}
            linkedinError={linkedinError}
            linkedinSuccess={linkedinSuccess}
          />
        </div>
      </Card>

      {assignments.length === 0 ? (
        <EmptyState
          title="עדיין לא שויכו מחלקות לחשבון הזה"
          description="כדי לנהל תוכן רשמי צריך שאדמין ישייך אותך לפחות למחלקה אחת. אם משהו חסר, כדאי לפנות לצוות המערכת."
        />
      ) : (
        <div className="space-y-8">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="space-y-6">
              <Card className="bg-brand-900 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-brand-100">מחלקה משויכת</p>
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
                      תקן פתוח חדש
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

              <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
                <Card>
                  <SectionHeading
                    title="עדכון עמוד המחלקה"
                    description="הטופס הזה שומר את כל השינויים כבקשת עדכון. רק אחרי אישור אדמין הם יופיעו לציבור."
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {assignment.departmentChangeRequests.map((request) => {
                      const status = requestStatusLabel(request.status);
                      return (
                        <Badge key={request.id} tone={status.tone}>
                          {status.label}
                        </Badge>
                      );
                    })}
                  </div>
                  <div className="mt-6">
                    <DepartmentEditorForm
                      initialValues={{
                        ...resolveDepartmentFormValues(assignment),
                        departmentName: assignment.name,
                        institutionName: assignment.institution.name,
                        specialtyName: assignment.specialty.name
                      }}
                    />
                  </div>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <div className="flex items-center justify-between gap-4">
                      <SectionHeading
                        title="תקנים פתוחים"
                        description="רק המחלקות המשויכות לחשבון הזה זמינות לפרסום ולעדכון."
                      />
                      <Link
                        href={`/representative/openings/new?departmentId=${assignment.id}`}
                        className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800"
                      >
                        תקן פתוח חדש
                      </Link>
                    </div>

                    <div className="mt-5 space-y-4">
                      {assignment.residencyOpenings.length === 0 ? (
                        <p className="text-sm text-slate-600">עדיין לא נוצרו תקנים פתוחים למחלקה הזו.</p>
                      ) : (
                        assignment.residencyOpenings.map((opening) => {
                          const status = openingStatusLabel(opening.status);
                          const contentStatus = contentStatusLabel(opening.contentStatus);
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
                          const pendingRevisionId = opening.pendingRevisions[0]?.id;

                          return (
                            <div
                              key={opening.id}
                              className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-ink">{opening.title}</p>
                                  <p className="mt-1 text-sm text-slate-600">{opening.summary}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge tone={contentStatus.tone}>{contentStatus.label}</Badge>
                                  <Badge tone={status.tone}>{status.label}</Badge>
                                  {pendingRevisionId ? <Badge tone="warning">יש עדכון ממתין</Badge> : null}
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                <span>{opening._count.applications} מועמדויות</span>
                                <span>
                                  מועד ועדה:{" "}
                                  {opening.committeeDate
                                    ? new Date(opening.committeeDate).toLocaleDateString("he-IL")
                                    : "לא הוגדר"}
                                </span>
                                {bestScore !== null ? <span>התאמה מובילה: {bestScore}/100</span> : null}
                                {topMatchesCount > 0 ? <span>Top matches: {topMatchesCount}</span> : null}
                              </div>
                              <div className="mt-4 flex flex-wrap gap-3">
                                <Link
                                  href={`/representative/openings/${pendingRevisionId ?? opening.id}`}
                                  className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
                                >
                                  ניהול תקן פתוח
                                </Link>
                                {opening.contentStatus === ContentStatus.PUBLISHED ? (
                                  <Link
                                    href={`/openings/${opening.id}`}
                                    className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800"
                                  >
                                    תצוגה ציבורית
                                  </Link>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Card>

                  <Card>
                    <SectionHeading
                      title="נציגי המחלקה בעמוד הציבורי"
                      description="אפשר להציג יותר מנציג/ה אחת. הפרטים האלו נפרדים מראשי המחלקה."
                    />
                    <div className="mt-5 space-y-3">
                      {assignment.representativeAssignments.map((representative) => (
                        <div key={representative.id} className="rounded-2xl bg-brand-50 px-4 py-3">
                          <p className="font-semibold text-ink">{representative.user.fullName}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {representative.user.representativeProfile?.title ?? "נציג/ת מחלקה"}
                          </p>
                        </div>
                      ))}
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
