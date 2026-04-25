import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SignupForm } from "@/components/forms/signup-form";

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const linkedinError = typeof params.linkedinError === "string" ? params.linkedinError : undefined;
  const socialError = typeof params.socialError === "string" ? params.socialError : undefined;

  return (
    <PageShell className="py-10">
      <div className="mx-auto max-w-3xl">
        <Card>
          <p className="text-sm font-semibold text-brand-600">פתיחת חשבון</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">הצטרפות לפלטפורמת המחלקות</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            פתיחת חשבון מיועדת בעיקר לסטודנטים ולסטאז&apos;רים שרוצים לשמור מחלקות להשוואה
            ולעבוד בצורה מסודרת. חשבונות נציגי מחלקות נוצרים רק ע״י אדמין ומקבלים שיוך למחלקות
            באופן ידני.
          </p>
          <div className="mt-6">
            <SignupForm linkedinError={linkedinError} socialError={socialError} />
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
