import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/forms/login-form";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : undefined;
  const linkedinError = typeof params.linkedinError === "string" ? params.linkedinError : undefined;

  return (
    <PageShell className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-lg">
        <p className="text-sm font-semibold text-brand-600">כניסה מאובטחת</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">ברוכים הבאים חזרה</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          התחברו כדי לשמור מחלקות להשוואה, לנהל את האזור האישי ולהגיש מועמדות פרטית לתקנים
          פתוחים. שיתוף חוויה מהמחלקה אפשרי גם בלי חשבון, וחשבונות נציגי מחלקות נוצרים רק ע״י
          אדמין.
        </p>
        <div className="mt-6">
          <LoginForm nextPath={nextPath} linkedinError={linkedinError} />
        </div>
        <p className="mt-6 text-sm text-slate-600">
          אין לכם חשבון?{" "}
          <Link href="/signup" className="font-semibold text-brand-700">
            הרשמה חדשה
          </Link>
        </p>
      </Card>
    </PageShell>
  );
}
