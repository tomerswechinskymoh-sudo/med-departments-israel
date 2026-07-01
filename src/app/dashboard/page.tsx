import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { requireAuth } from "@/lib/auth-guards";
import { getDepartmentOptions, getUserDashboardData, userRoleLabel } from "@/lib/queries";
import { getDepartmentHref } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ExperienceCta } from "@/components/experience/experience-cta";
import { InstitutionLogo } from "@/components/departments/institution-logo";

export const dynamic = "force-dynamic";

function verificationStatusLabel(status: string) {
  switch (status) {
    case "PENDING_EMAIL_VERIFICATION":
      return "ממתין לאימות מייל";
    case "PENDING_ADMIN_REVIEW":
      return "ממתין לאישור אדמין";
    case "VERIFIED":
      return "מאומת";
    case "REJECTED":
      return "נדחה";
    case "PENDING_PROOF":
      return "ממתין למסמך";
    default:
      return "בבדיקה";
  }
}

function professionalRoleStatusLabel(value: string | null) {
  switch (value) {
    case "medical_student":
      return "סטודנט/ית לרפואה";
    case "intern":
      return "סטאז'ר/ית";
    case "resident":
      return "מתמחה";
    case "specialist":
      return "מומחה/ית";
    case "other":
      return "אחר";
    default:
      return "לא צוין";
  }
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const [data, reviewDepartments] = await Promise.all([
    getUserDashboardData(session.userId),
    getDepartmentOptions()
  ]);

  if (!data) {
    return null;
  }

  const isRepresentative = session.role === "representative";

  return (
    <PageShell className="space-y-8 py-10">
      <section className="rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-panel">
        <p className="text-sm font-semibold text-brand-600">האזור האישי</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{data.fullName}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {data.email} · {userRoleLabel(data.roleKey)}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/favorites"
            className="rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white"
          >
            הרשימה שלי
          </Link>
          <Link
            href="/departments"
            className="rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-800"
          >
            לחיפוש מחלקות
          </Link>
          {isRepresentative ? (
            <Link
              href="/representative"
              className="rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-800"
            >
              אזור נציגים
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink">הרשימה שלי</h2>
            <Link href="/favorites" className="text-sm font-semibold text-brand-700">
              לכל הרשימה
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {data.favorites.length === 0 ? (
              <EmptyState
                title="אין עדיין מחלקות שמורות"
                description="שמרו מחלקות להשוואה מתוך חיפוש המחלקות כדי לחזור אליהן מהר."
                ctaHref="/departments"
                ctaLabel="לחיפוש מחלקות"
              />
            ) : (
              data.favorites.slice(0, 4).map((favorite) => (
                <div key={favorite.departmentId} className="flex gap-3 rounded-2xl bg-brand-50 p-4">
                  <InstitutionLogo institution={favorite.department.institution} size="sm" />
                  <div className="min-w-0">
                    <Link
                      href={getDepartmentHref(favorite.department)}
                      className="font-semibold text-ink"
                    >
                      {favorite.department.institution.name} · {favorite.department.name}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">{favorite.department.shortSummary}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">סטטוס חשבון</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            <p>
              <span className="font-semibold text-ink">תפקיד נוכחי: </span>
              {userRoleLabel(data.roleKey)}
            </p>
            <div className="rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3">
              <p>
                <span className="font-semibold text-ink">סטטוס מקצועי: </span>
                {professionalRoleStatusLabel(data.roleStatus)}
              </p>
              <p>
                <span className="font-semibold text-ink">אימות חשבון: </span>
                {verificationStatusLabel(data.verificationStatus)}
              </p>
              {data.verificationStatus === "REJECTED" && data.verificationRejectionReason ? (
                <p>
                  <span className="font-semibold text-ink">סיבת דחייה: </span>
                  {data.verificationRejectionReason}
                </p>
              ) : null}
            </div>
            <p>
              חשבון רגיל מספיק כדי לגלוש, לשמור מחלקות להשוואה ולהגיש מועמדות מתוך חשבון
              מחובר. תפקיד נציג/ת מחלקה לא נפתח בהרשמה עצמית ונוצר רק על ידי אדמין.
            </p>
            {isRepresentative ? (
              <div className="rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3">
                <p className="font-semibold text-ink">מחלקות משויכות</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.representativeAssignments.map((assignment) => (
                    <Badge key={assignment.id} tone="success">
                      {assignment.department.institution.name} · {assignment.department.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3">
                אם את/ה עובד/ת מטעם מחלקה וצריך גישת נציג/ה, זה נעשה ידנית על ידי צוות
                המערכת ולא דרך טופס הרשמה.
              </p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-ink">קיצורי דרך</h2>
          <div className="mt-4 grid gap-4">
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="font-semibold text-ink">רוצה לספר על החוויה שלך?</p>
              <p className="mt-1 text-sm text-slate-600">
                לשתף מהשטח, באותו עמוד, עם בדיקה לפני שזה עולה.
              </p>
              <ExperienceCta
                departments={reviewDepartments}
                className="mt-3"
                buttonClassName="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800"
              />
            </div>
            <Link href="/faq" className="rounded-2xl bg-brand-50 p-4 transition hover:bg-brand-100">
              <p className="font-semibold text-ink">איך משתמשים באתר</p>
              <p className="mt-1 text-sm text-slate-600">
                תשובות קצרות על הרשמה, שיתופים מהשטח, פרטיות ומשרות פתוחות.
              </p>
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">מה חשוב לדעת</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            <p>חוויות מהמחלקה עולות רק אחרי אישור אדמין.</p>
            <p>מועמדות למשרה פתוחה דורשת חשבון מחובר, ונשמרת פרטית למחלקה.</p>
            <p>משרות פתוחות ועדכוני מחלקה נשלחים מאזור נציגים בלבד ורק אחרי אישור אדמין.</p>
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
