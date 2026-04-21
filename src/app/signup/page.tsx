import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SignupForm } from "@/components/forms/signup-form";

export default function SignupPage() {
  return (
    <PageShell className="py-10">
      <div className="mx-auto max-w-3xl">
        <Card>
          <p className="text-sm font-semibold text-brand-600">פתיחת חשבון</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">הצטרפות לפלטפורמת המחלקות</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
            פתיחת חשבון מיועדת בעיקר לסטודנטים ולסטאז'רים שרוצים לשמור מועדפים ולעבוד בצורה
            מסודרת. נציגי מחלקות יכולים להגיש אחר כך בקשת הרשאת פרסום רשמי.
        </p>
          <div className="mt-6">
            <SignupForm />
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
