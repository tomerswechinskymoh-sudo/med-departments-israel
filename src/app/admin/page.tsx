import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guards";
import {
  getAdminDashboardData,
  openingApplicationStatusLabel,
  reviewerTypeLabel,
  userRoleLabel
} from "@/lib/queries";
import { DepartmentManagementForm } from "@/components/admin/department-management-form";
import { InstitutionManagementForm } from "@/components/admin/hospital-management-form";
import { OpeningApplicationModerationForm } from "@/components/admin/opening-application-moderation-form";
import { ReviewModerationForm } from "@/components/admin/review-moderation-form";
import { SeedDemoButton } from "@/components/admin/seed-demo-button";
import { SpecialtyManagementForm } from "@/components/admin/specialty-management-form";
import { UserRoleForm } from "@/components/admin/user-role-form";
import { VerificationModerationForm } from "@/components/admin/verification-moderation-form";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const data = await getAdminDashboardData();

  return (
    <PageShell className="space-y-8 py-10">
      <SectionHeading
        eyebrow="דשבורד אדמין"
        title="ניהול מוסדות, מחלקות, חוויות, הרשאות ומועמדויות"
        description="מרכז הבקרה של המערכת: בדיקת תכנים, הרשאות פרסום, תחזוקת חיפוש המחלקות ותוכן רשמי."
      />

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="משתמשים" value={data.stats.users} />
        <StatCard label="מחלקות" value={data.stats.departments} />
        <StatCard label="חוויות ממתינות" value={data.stats.pendingReviewSubmissions} />
        <StatCard label="בקשות פרסום" value={data.stats.pendingPublisherRequests} />
        <StatCard label="מועמדויות פתוחות" value={data.stats.pendingOpeningApplications} />
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">סביבת דמו</h2>
            <p className="mt-2 text-sm text-slate-600">
              טוען מחדש את כל נתוני הדוגמה בעברית: מוסדות, מחלקות, פתיחות, מועמדויות,
              חוויות והרשאות.
            </p>
          </div>
          <SeedDemoButton />
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="text-xl font-bold text-ink">חוויות ממתינות לבדיקה</h2>
          <div className="mt-4 space-y-5">
            {data.pendingReviewSubmissions.length === 0 ? (
              <p className="text-sm text-slate-600">אין כרגע חוויות ממתינות.</p>
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
                    <span className="font-semibold text-ink">מה היה מאתגר: </span>
                    {submission.cons}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    <span className="font-semibold text-ink">טיפ: </span>
                    {submission.tips}
                  </p>
                  <ReviewModerationForm reviewId={submission.id} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">בקשות הרשאת פרסום</h2>
          <div className="mt-4 space-y-5">
            {data.pendingPublisherRequests.length === 0 ? (
              <p className="text-sm text-slate-600">אין כרגע בקשות הרשאה ממתינות.</p>
            ) : (
              data.pendingPublisherRequests.map((request) => (
                <div key={request.id} className="rounded-2xl bg-brand-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{request.user.fullName}</p>
                      <p className="text-sm text-slate-600">{request.user.email}</p>
                    </div>
                    <Badge tone="warning">ממתין</Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    מוסד: {request.institution?.name ?? request.department?.institution.name ?? "לא נבחר"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    מחלקה: {request.department?.name ?? "לא נבחרה מחלקה"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {request.note ?? "לא נוספה הערה לבקשה."}
                  </p>
                  <VerificationModerationForm requestId={request.id} />
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-ink">מועמדויות לפתיחות</h2>
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
                  <Badge tone="default">{openingApplicationStatusLabel(application.status)}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {reviewerTypeLabel(application.applicantType)} · {application.phone}
                  {application.email ? ` · ${application.email}` : ""}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{application.motivationText}</p>
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

        <Card>
          <h2 className="text-xl font-bold text-ink">משתמשים אחרונים</h2>
          <div className="mt-4 space-y-3">
            {data.users.map((user) => (
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
                  currentRole={user.roleKey}
                  initialIsApprovedPublisher={user.isApprovedPublisher}
                />
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
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

        <Card>
          <h2 className="text-xl font-bold text-ink">מחלקות פעילות</h2>
          <p className="mt-2 text-sm text-slate-600">
            יצירת מחלקות חדשות כוללת חיבור למוסד, תחום ותוכן בסיסי לסטודנטים וסטאז'רים.
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
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-ink">ניהול מוסדות</h2>
          <p className="mt-2 text-sm text-slate-600">בתי חולים, קופות חולים ומסגרות קהילה.</p>
          <div className="mt-4">
            <InstitutionManagementForm />
          </div>
          <div className="mt-4 space-y-3">
            {data.institutions.map((institution) => (
              <div key={institution.id} className="rounded-2xl bg-brand-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{institution.name}</p>
                  <Badge>{institution.type === "HOSPITAL" ? "בית חולים" : "קופה / קהילה"}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {institution.city ?? "ללא עיר"} · {institution.slug}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{institution.summary}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">ניהול תחומים</h2>
          <p className="mt-2 text-sm text-slate-600">תחומי מומחיות בסיסיים שמופיעים בסינון ובטפסים.</p>
          <div className="mt-4">
            <SpecialtyManagementForm />
          </div>
          <div className="mt-4 space-y-3">
            {data.specialties.map((specialty) => (
              <div key={specialty.id} className="rounded-2xl bg-brand-50 p-4">
                <p className="font-semibold text-ink">{specialty.name}</p>
                <p className="mt-1 text-sm text-slate-600">{specialty.slug}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{specialty.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
