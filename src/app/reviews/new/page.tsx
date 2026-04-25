import { getReviewFormContext } from "@/lib/queries";
import { ReviewForm } from "@/components/forms/review-form";
import { PlaceholderVisual } from "@/components/media/placeholder-visual";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SubmitReviewPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const departmentSlug = typeof params.department === "string" ? params.department : undefined;
  const { departments, selectedDepartment } = await getReviewFormContext(departmentSlug);

  return (
    <PageShell className="py-10">
      <div className="mx-auto max-w-5xl">
        <Card className="overflow-hidden border-brand-100/80 bg-white/94 p-0">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-5 p-6 lg:p-8">
              <PlaceholderVisual
                label="מהשטח, כמו שזה באמת הרגיש"
                caption="שיתוף קצר שלך יכול לעזור למישהו אחר להבין אם זה מתאים לו"
                variant="hero"
                className="aspect-[1/1.08] w-full"
              />
              <div className="grid gap-4">
                <div className="rounded-[1.5rem] border border-brand-100 bg-brand-50/75 p-4">
                  <p className="text-sm font-semibold text-brand-700">לא צריך חשבון</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    אפשר לשתף חוויה גם בלי להירשם. כמה דקות, וזהו.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/90 p-4">
                  <p className="text-sm font-semibold text-amber-900">שומרים עלייך</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    אפשר לאמת עם טלפון או מסמך הוכחה רשמי. אם בוחרים בעילום שם, לא מציגים
                    שום פרט מזהה באתר.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 lg:p-8">
              <p className="text-sm font-semibold text-brand-600">שיתוף חוויה מהמחלקה</p>
              <h1 className="mt-2 text-3xl font-bold text-ink">רוצה לספר על החוויה שלך?</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                אם היית שם כסטודנט, סטאז׳ר או מתמחה, זה המקום לשתף איך החוויה במחלקה
                נראתה בפועל. קצר, אישי, ועוזר למי שבודק עכשיו את הצעד הבא.
              </p>
              {selectedDepartment ? (
                <p className="mt-3 text-sm font-medium text-brand-700">
                  המחלקה שנבחרה מראש: {selectedDepartment.institution.name} ·{" "}
                  {selectedDepartment.name}
                </p>
              ) : null}
              <div className="mt-6">
                <ReviewForm
                  departments={departments}
                  selectedDepartmentId={selectedDepartment?.id}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
