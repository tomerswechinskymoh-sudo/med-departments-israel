import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OpeningApplicationForm } from "@/components/openings/opening-application-form";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getSession } from "@/lib/auth";
import { getOpeningApplicationPageData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function OpeningApplyPage({
  params
}: {
  params: Promise<{ openingId: string }>;
}) {
  const { openingId } = await params;
  const [opening, session] = await Promise.all([
    getOpeningApplicationPageData(openingId),
    getSession()
  ]);

  if (!opening) {
    notFound();
  }

  if (!session) {
    redirect(`/login?next=/openings/${openingId}/apply`);
  }

  return (
    <PageShell className="py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="bg-brand-900 text-white">
          <p className="text-sm font-semibold text-brand-100">מועמדות פרטית לתקן פתוח</p>
          <h1 className="mt-2 text-3xl font-bold">{opening.title}</h1>
          <p className="mt-3 text-sm leading-7 text-brand-50">
            {opening.department.institution.name} · {opening.department.name} · {opening.department.specialty.name}
          </p>
        </Card>

        <Card>
          <SectionHeading
            title="שליחת מועמדות למחלקה"
            description="כדי לשמור על הגשה מסודרת וברורה, המועמדות נשלחת רק מתוך חשבון מחובר. החומרים נשארים פרטיים ונגישים רק לנציגים מורשים של המחלקה ולאדמינים."
          />
          <div className="mt-4 rounded-[1.5rem] border border-brand-100 bg-brand-50/70 px-5 py-4 text-sm leading-7 text-slate-700">
            <p>
              <span className="font-semibold text-ink">חשוב לדעת: </span>
              המועמדות לא מתפרסמת באתר. קורות החיים, התמונה והפרטים האישיים נשמרים בפרטיות
              ונשלחים רק למחלקה.
            </p>
            <p className="mt-2">
              אם תרצו, אפשר לחזור קודם ל־
              <Link href={`/openings/${opening.id}`} className="font-semibold text-brand-700">
                עמוד התקן
              </Link>
              {" "}
              ולבדוק שוב את המידע לפני ההגשה.
            </p>
          </div>
          <div className="mt-6">
            <OpeningApplicationForm
              openingId={opening.id}
              initialValues={{
                fullName: session.fullName,
                email: session.email,
                phone: ""
              }}
            />
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
