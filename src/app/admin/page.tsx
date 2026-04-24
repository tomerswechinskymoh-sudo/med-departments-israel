import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guards";
import {
  getAdminDashboardData,
  openingApplicationStatusLabel,
  reviewerTypeLabel,
  userRoleLabel
} from "@/lib/queries";
import { DepartmentChangeReviewForm } from "@/components/admin/department-change-review-form";
import { DepartmentManagementForm } from "@/components/admin/department-management-form";
import { InstitutionManagementForm } from "@/components/admin/hospital-management-form";
import { OpeningApplicationModerationForm } from "@/components/admin/opening-application-moderation-form";
import { OpeningReviewForm } from "@/components/admin/opening-review-form";
import { RepresentativeAssignmentForm } from "@/components/admin/representative-assignment-form";
import { RepresentativeCreationForm } from "@/components/admin/representative-creation-form";
import { ReviewModerationForm } from "@/components/admin/review-moderation-form";
import { SeedDemoButton } from "@/components/admin/seed-demo-button";
import { SpecialtyManagementForm } from "@/components/admin/specialty-management-form";
import { UserRoleForm } from "@/components/admin/user-role-form";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatDate } from "@/lib/utils";

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

export default async function AdminPage() {
  await requireAdmin();
  const data = await getAdminDashboardData();

  return (
    <PageShell className="space-y-8 py-10">
      <SectionHeading
        eyebrow="דשבורד אדמין"
        title="אישורים, שיוכים ופיקוח על התוכן"
        description="כאן מנהלים נציגים, משייכים מחלקות, מאשרים תוכן רשמי ומטפלים בשיתופים ובמועמדויות."
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="משתמשים" value={data.stats.users} />
        <StatCard label="מחלקות" value={data.stats.departments} />
        <StatCard label="חוויות ממתינות" value={data.stats.pendingReviewSubmissions} />
        <StatCard label="תקנים לאישור" value={data.stats.pendingOpeningApprovals} />
        <StatCard label="שינויי מחלקה" value={data.stats.pendingDepartmentChangeRequests} />
        <StatCard label="מועמדויות פעילות" value={data.stats.pendingOpeningApplications} />
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">סביבת דמו</h2>
            <p className="mt-2 text-sm text-slate-600">
              טוען מחדש את נתוני הדוגמה בעברית: מוסדות, מחלקות, תקנים פתוחים, שיתופים,
              נציגים, שיוכים ומועמדויות.
            </p>
          </div>
          <SeedDemoButton />
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-ink">חוויות ממתינות לאישור</h2>
          <div className="mt-4 space-y-5">
            {data.pendingReviewSubmissions.length === 0 ? (
              <p className="text-sm text-slate-600">אין כרגע חוויות שממתינות לטיפול.</p>
            ) : (
              data.pendingReviewSubmissions.map((submission) => (
                <div key={submission.id} className="rounded-2xl bg-brand-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">
                        {submission.department.institution.name} · {submission.department.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {reviewerTypeLabel(submission.reviewerType)} · {submission.phone}
                        {submission.email ? ` · ${submission.email}` : ""}
                      </p>
                    </div>
                    <Badge tone="warning">ממתין</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    <span className="font-semibold text-ink">מה עבד טוב: </span>
                    {submission.pros}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    <span className="font-semibold text-ink">מה פחות עבד: </span>
                    {submission.cons}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    <span className="font-semibold text-ink">טיפ למי שמגיע/ה: </span>
                    {submission.tips}
                  </p>
                  <ReviewModerationForm reviewId={submission.id} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">תקנים פתוחים שממתינים לאישור</h2>
          <div className="mt-4 space-y-5">
            {data.pendingOpeningApprovals.length === 0 ? (
              <p className="text-sm text-slate-600">אין כרגע תקנים פתוחים שממתינים לאישור.</p>
            ) : (
              data.pendingOpeningApprovals.map((opening) => {
                const status = openingStatusLabel(opening.status);
                return (
                  <div key={opening.id} className="rounded-2xl bg-brand-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{opening.title}</p>
                        <p className="text-sm text-slate-600">
                          {opening.department.institution.name} · {opening.department.name}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="warning">ממתין</Badge>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{opening.summary}</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm">
                        <p className="text-xs font-semibold text-slate-500">מועד ועדה</p>
                        <p className="mt-1 font-semibold text-ink">{formatDate(opening.committeeDate)}</p>
                      </div>
                      <div className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm">
                        <p className="text-xs font-semibold text-slate-500">נוצר על ידי</p>
                        <p className="mt-1 font-semibold text-ink">
                          {opening.createdBy?.fullName ?? "נציג/ה לא זמין/ה"}
                        </p>
                      </div>
                    </div>
                    <OpeningReviewForm openingId={opening.id} />
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-ink">שינויי מחלקה שממתינים לאישור</h2>
          <div className="mt-4 space-y-5">
            {data.pendingDepartmentChangeRequests.length === 0 ? (
              <p className="text-sm text-slate-600">אין כרגע שינויי מחלקה שממתינים לטיפול.</p>
            ) : (
              data.pendingDepartmentChangeRequests.map((request) => (
                <div key={request.id} className="rounded-2xl bg-brand-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">
                        {request.department.institution.name} · {request.department.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        נשלח על ידי {request.submittedBy.fullName}
                      </p>
                    </div>
                    <Badge tone="warning">ממתין</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {request.summary ?? "עדכון עמוד מחלקה"}
                  </p>
                  <DepartmentChangeReviewForm requestId={request.id} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">מועמדויות אחרונות</h2>
          <div className="mt-4 space-y-4">
            {data.recentOpeningApplications.map((application) => (
              <div key={application.id} className="rounded-2xl bg-brand-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{application.fullName}</p>
                    <p className="text-sm text-slate-600">
                      {application.opening.department.institution.name} · {application.opening.department.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {application.isTopMatch ? <Badge tone="warning">Top match</Badge> : null}
                    {application.matchScore !== null ? (
                      <Badge tone="success">התאמה {application.matchScore}/100</Badge>
                    ) : null}
                    <Badge tone="default">{openingApplicationStatusLabel(application.status)}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {reviewerTypeLabel(application.applicantType)} · {application.phone}
                  {application.email ? ` · ${application.email}` : ""}
                </p>
                {application.matchShortSummary ? (
                  <p className="mt-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm leading-7 text-slate-700">
                    <span className="font-semibold text-ink">סיכום התאמה: </span>
                    {application.matchShortSummary}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  {application.files.map((file) => (
                    <Link
                      key={file.id}
                      href={`/api/files/${file.id}`}
                      className="rounded-full border border-brand-200 px-3 py-2 font-semibold text-brand-800"
                    >
                      {file.originalName}
                    </Link>
                  ))}
                </div>
                <OpeningApplicationModerationForm
                  openingId={application.openingId}
                  applicationId={application.id}
                  currentStatus={application.status}
                />
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <SectionHeading
            title="יצירת נציג/ת מחלקה"
            description="נציגים נוצרים רק מכאן. אין מסלול הרשמה עצמי לתפקיד הזה."
          />
          <div className="mt-6">
            <RepresentativeCreationForm
              departments={data.departments.map((department) => ({
                id: department.id,
                name: department.name,
                institution: {
                  name: department.institution.name
                }
              }))}
            />
          </div>
        </Card>

        <Card>
          <SectionHeading
            title="נציגים ושיוכי מחלקות"
            description="לכל נציג/ה בוחרים קודם מוסד, ואז מחלקות מתוך אותו מוסד. רק המחלקות האלו יהיו זמינות לפרסום ולהגשת שינויים."
          />
          <div className="mt-6 space-y-5">
            {data.representativeUsers.length === 0 ? (
              <p className="text-sm text-slate-600">עדיין לא נוצרו נציגי מחלקה.</p>
            ) : (
              data.representativeUsers.map((user) => (
                <div key={user.id} className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{user.fullName}</p>
                      <p className="text-sm text-slate-600">{user.email}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {user.representativeProfile?.title ?? "ללא טייטל ציבורי"}
                      </p>
                    </div>
                    <Badge tone="success">נציג/ת מחלקה</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {user.representativeAssignments.map((assignment) => (
                      <span
                        key={assignment.id}
                        className="rounded-full border border-brand-100 bg-white px-3 py-2 text-xs font-semibold text-brand-900"
                      >
                        {assignment.department.institution.name} · {assignment.department.name}
                      </span>
                    ))}
                  </div>
                  <RepresentativeAssignmentForm
                    userId={user.id}
                    initialDepartmentIds={user.representativeAssignments.map(
                      (assignment) => assignment.departmentId
                    )}
                    departments={data.departments.map((department) => ({
                      id: department.id,
                      name: department.name,
                      institution: {
                        id: department.institution.id,
                        name: department.institution.name
                      }
                    }))}
                  />
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-ink">משתמשים אחרונים</h2>
          <div className="mt-4 space-y-3">
            {data.users
              .filter((user) => user.roleKey !== "REPRESENTATIVE")
              .map((user) => (
                <div key={user.id} className="rounded-2xl bg-brand-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{user.fullName}</p>
                      <p className="text-sm text-slate-600">{user.email}</p>
                    </div>
                    <div className="text-left">
                      <Badge>{userRoleLabel(user.roleKey)}</Badge>
                      <p className="mt-2 text-xs text-slate-500">{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                  <UserRoleForm
                    userId={user.id}
                    currentRole={user.roleKey as "STUDENT" | "RESIDENT" | "ADMIN"}
                  />
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">לוג פעילות</h2>
          <div className="mt-4 space-y-3">
            {data.auditLogs.map((log) => (
              <div key={log.id} className="rounded-2xl bg-brand-50 p-4">
                <p className="font-semibold text-ink">{log.action}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {log.actor?.fullName ?? "מערכת"} · {log.entityType}
                </p>
                <p className="mt-2 text-xs text-slate-500">{formatDate(log.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-ink">מחלקות פעילות</h2>
          <p className="mt-2 text-sm text-slate-600">
            יצירת מחלקה חדשה עדיין נעשית מכאן, אבל כל שינוי ציבורי שמגיע מנציג/ה יעבור קודם
            לאישור אדמין.
          </p>
          <div className="mt-4">
            <DepartmentManagementForm
              institutions={data.institutions.map((institution) => ({
                id: institution.id,
                name: institution.name,
                type: institution.type
              }))}
              specialties={data.specialties.map((specialty) => ({
                id: specialty.id,
                name: specialty.name
              }))}
            />
          </div>
          <div className="mt-4 grid gap-4">
            {data.departments.map((department) => (
              <div key={department.id} className="rounded-2xl bg-brand-50 p-4">
                <p className="font-semibold text-ink">
                  {department.institution.name} · {department.name}
                </p>
                <p className="mt-1 text-sm text-slate-600">{department.specialty.name}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{department.shortSummary}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">ניהול מוסדות ותחומים</h2>
          <div className="mt-5 space-y-6">
            <div>
              <p className="text-sm font-semibold text-ink">מוסדות</p>
              <p className="mt-1 text-sm text-slate-600">בתי חולים, קופות חולים ומסגרות קהילה.</p>
              <div className="mt-4">
                <InstitutionManagementForm />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">תחומים</p>
              <p className="mt-1 text-sm text-slate-600">מופיעים בחיפוש, בטפסים ובדפי המחלקות.</p>
              <div className="mt-4">
                <SpecialtyManagementForm />
              </div>
            </div>
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
