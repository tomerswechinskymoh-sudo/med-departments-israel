import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PlaceholderVisual } from "@/components/media/placeholder-visual";
import { OpeningCriteriaGrid } from "@/components/openings/opening-criteria-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getOpeningPageData, openingTypeLabel } from "@/lib/queries";
import { formatDate, getDepartmentHref } from "@/lib/utils";

export const dynamic = "force-dynamic";

function statusLabel(status: "OPEN" | "UPCOMING" | "CLOSED") {
  if (status === "OPEN") {
    return { label: "פתוח להגשה", tone: "success" as const };
  }

  if (status === "UPCOMING") {
    return { label: "צפוי להיפתח", tone: "warning" as const };
  }

  return { label: "סגור כרגע", tone: "default" as const };
}

export default async function OpeningDetailsPage({
  params
}: {
  params: Promise<{ openingId: string }>;
}) {
  const { openingId } = await params;
  const [opening, session] = await Promise.all([getOpeningPageData(openingId), getSession()]);

  if (!opening) {
    notFound();
  }

  const deadline = opening.applicationDeadline ? new Date(opening.applicationDeadline) : null;
  const deadlinePassed = Boolean(deadline && deadline < new Date());
  const status =
    deadlinePassed && opening.status !== "CLOSED"
      ? { label: "הדדליין עבר", tone: "default" as const }
      : statusLabel(opening.status);
  const canApply = opening.status !== "CLOSED" && !deadlinePassed;
  const showApplicationCount = session?.role === "admin";

  return (
    <PageShell className="space-y-8 py-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-panel">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="p-5 lg:p-6">
            <PlaceholderVisual
              label={opening.title}
              caption={`${opening.department.institution.name} · ${opening.department.name}`}
              variant="department"
              className="aspect-[1/1.08] w-full"
            />
          </div>
          <div className="p-6 lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={status.tone}>{status.label}</Badge>
              <Badge>{openingTypeLabel(opening.openingType)}</Badge>
              {opening.isImmediate ? <Badge tone="warning">זמינות מיידית</Badge> : null}
              {opening.openingsCount ? <Badge>{opening.openingsCount} תקנים</Badge> : null}
            </div>

            <h1 className="mt-5 text-4xl font-bold text-ink">{opening.title}</h1>
            <p className="mt-3 text-lg leading-8 text-slate-700">{opening.summary}</p>
            <p className="mt-4 text-sm text-slate-600">
              {opening.department.institution.name} · {opening.department.name} · {opening.department.specialty.name}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="text-xs text-slate-500">ועדה קרובה</p>
                <p className="mt-2 font-semibold text-ink">{formatDate(opening.committeeDate)}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="text-xs text-slate-500">דדליין להגשה</p>
                <p className="mt-2 font-semibold text-ink">{formatDate(opening.applicationDeadline)}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="text-xs text-slate-500">מועד התחלה צפוי</p>
                <p className="mt-2 font-semibold text-ink">{formatDate(opening.expectedStartDate)}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {canApply ? (
                <Link
                  href={
                    session ? `/openings/${opening.id}/apply` : `/login?next=/openings/${opening.id}/apply`
                  }
                  className="rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white"
                >
                  {session ? "הגשת מועמדות פרטית" : "התחברות להגשת מועמדות"}
                </Link>
              ) : null}
              <Link
                href={getDepartmentHref(opening.department)}
                className="rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-800"
              >
                לעמוד המחלקה
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <SectionHeading
            title="מה המחלקה פרסמה על התקן"
            description="מידע רשמי שמגיע מאזור נציגים מאושר בלבד."
          />
          <div className="mt-5 space-y-4 text-sm leading-8 text-slate-700">
            {opening.notes ? (
              <p>
                <span className="font-semibold text-ink">הערות: </span>
                {opening.notes}
              </p>
            ) : null}
            {opening.supportingInfo ? (
              <p>
                <span className="font-semibold text-ink">מידע משלים: </span>
                {opening.supportingInfo}
              </p>
            ) : null}
            {showApplicationCount ? (
              <p>
                <span className="font-semibold text-ink">מספר מועמדויות שנקלטו עד כה: </span>
                {opening._count.applications}
              </p>
            ) : null}
          </div>
        </Card>

        <Card>
          <SectionHeading
            title="חומר למחשבה לפני הגשה"
            description="המועמדות נשלחת ישירות למחלקה מתוך חשבון מחובר. קורות חיים ותמונה לא מופיעים באתר."
          />
          <div className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
            <p>שווה להיעזר בשדות הייעודיים כדי להסביר אם עשית אלקטיב, סטאז' או מחקר רלוונטי.</p>
            <p>אם אין עדיין ניסיון קודם במחלקה, אפשר לכתוב בכנות מה מושך אותך ולמה זה מתאים למסלול שלך.</p>
            <p>המחלקה לא רואה כאן פוסט, אלא מועמדות פרטית מסודרת.</p>
          </div>
        </Card>
      </section>

      <section className="space-y-6">
        <SectionHeading
          title="מה חשוב למחלקה בבחירה"
          description="השקיפות הזו נועדה לעזור להבין מה באמת משפיע בתקן הספציפי הזה."
        />
        <Card>
          <OpeningCriteriaGrid criteria={opening.acceptanceCriteria} />
        </Card>
      </section>

      <section className="space-y-6">
        <SectionHeading title="ראשי המחלקה" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {opening.department.heads.map((head) => (
            <Card key={head.id}>
              <p className="text-lg font-bold text-ink">{head.name}</p>
              <p className="mt-1 text-sm font-semibold text-brand-700">{head.title}</p>
              {head.role ? <p className="mt-1 text-sm text-slate-600">{head.role}</p> : null}
              <p className="mt-3 text-sm leading-7 text-slate-700">{head.bio}</p>
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
