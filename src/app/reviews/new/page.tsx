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
        <Card className="overflow-hidden p-0">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="p-6 lg:p-8">
              <PlaceholderVisual
                label="החוויה שלך יכולה לעזור לבאים אחריך"
                caption="שיתוף ציבורי עם אימות פרטי ומלא moderation לפני פרסום"
                variant="hero"
                className="aspect-[1/1.08] w-full"
              />
            </div>

            <div className="p-6 lg:p-8">
              <p className="text-sm font-semibold text-brand-600">הגשת חוויה ציבורית</p>
              <h1 className="mt-2 text-3xl font-bold text-ink">רוצה לספר על החוויה שלך?</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                מתמחים, סטאז'רים וגם סטודנטים יכולים לשתף כאן חוויה ממחלקה, סבב או אלקטיב
                בלי לפתוח חשבון. פרטי הקשר נשמרים רק לצורך אימות, והחוויה עצמה לא תפורסם
                לפני בדיקה ואישור.
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
