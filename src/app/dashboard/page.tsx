import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { requireAuth } from "@/lib/auth-guards";
import { getUserDashboardData, userRoleLabel } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function requestStatusLabel(status: "PENDING" | "APPROVED" | "REJECTED") {
  if (status === "APPROVED") {
    return { label: "אושר", tone: "success" as const };
  }

  if (status === "REJECTED") {
    return { label: "נדחה", tone: "danger" as const };
  }

  return { label: "ממתין", tone: "warning" as const };
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const data = await getUserDashboardData(session.userId);

  if (!data) {
    return null;
  }

  const canPublish = session.role === "admin" || session.isApprovedPublisher;

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
            מועדפים
          </Link>
          <Link
            href="/departments"
            className="rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-800"
          >
            למאגר המחלקות
          </Link>
          <Link
            href={canPublish ? "/representative" : "/verification"}
            className="rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-800"
          >
            {canPublish ? "ניהול פרסום רשמי" : "בקשת הרשאת פרסום"}
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink">מחלקות מועדפות</h2>
            <Link href="/favorites" className="text-sm font-semibold text-brand-700">
              לכל המועדפים
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {data.favorites.length === 0 ? (
              <EmptyState
                title="אין עדיין מחלקות שמורות"
                description="שמרו מחלקות ממאגר המחלקות כדי לחזור אליהן מהר."
                ctaHref="/departments"
                ctaLabel="למאגר המחלקות"
              />
            ) : (
              data.favorites.slice(0, 4).map((favorite) => (
                <div key={favorite.departmentId} className="rounded-2xl bg-brand-50 p-4">
                  <Link href={`/departments/${favorite.department.slug}`} className="font-semibold text-ink">
                    {favorite.department.institution.name} · {favorite.department.name}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">{favorite.department.shortSummary}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">בקשות הרשאת פרסום</h2>
          <div className="mt-4 space-y-4">
            {data.publisherRequests.length === 0 ? (
              <EmptyState
                title="אין בקשות פעילות"
                description="אם תרצו לפרסם עדכוני מחלקה, משרות או הזדמנויות מחקר, הגישו בקשה לאישור."
                ctaHref="/verification"
                ctaLabel="הגשת בקשה"
              />
            ) : (
              data.publisherRequests.map((request) => {
                const status = requestStatusLabel(request.status);

                return (
                  <div key={request.id} className="rounded-2xl bg-brand-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">
                          {request.department?.name ?? request.institution?.name ?? "בקשת פרסום"}
                        </p>
                        <p className="text-sm text-slate-600">
                          {request.institution?.name ?? "ללא מוסד"}
                        </p>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {request.note ?? "לא נוספה הערה לבקשה."}
                    </p>
                    {request.adminNote ? (
                      <p className="mt-2 text-xs leading-6 text-slate-500">
                        הערת אדמין: {request.adminNote}
                      </p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-ink">קיצורי דרך</h2>
          <div className="mt-4 grid gap-4">
            <Link href="/reviews/new" className="rounded-2xl bg-brand-50 p-4 transition hover:bg-brand-100">
              <p className="font-semibold text-ink">רוצה לספר על החוויה שלך?</p>
              <p className="mt-1 text-sm text-slate-600">
                שליחת חוויה לצוות האתר לצורך אימות ובדיקה לפני פרסום.
              </p>
            </Link>
            <Link href="/faq" className="rounded-2xl bg-brand-50 p-4 transition hover:bg-brand-100">
              <p className="font-semibold text-ink">איך להשתמש באתר</p>
              <p className="mt-1 text-sm text-slate-600">
                שאלות נפוצות על הרשמה, ביקורות, פרסום הזדמנויות ומדיניות האתר.
              </p>
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-ink">סטטוס חשבון</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            <p>
              <span className="font-semibold text-ink">תפקיד נוכחי: </span>
              {userRoleLabel(data.roleKey)}
            </p>
            <p>
              <span className="font-semibold text-ink">הרשאת פרסום רשמי: </span>
              {data.isApprovedPublisher ? "מאושר/ת" : "לא פעיל"}
            </p>
            <p>
              חשבון רגיל מספיק כדי לגלוש, לשמור מועדפים ולעקוב אחרי מחלקות. פרסום עדכונים
              רשמיים דורש הרשאה נפרדת ואישור אדמין.
            </p>
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
