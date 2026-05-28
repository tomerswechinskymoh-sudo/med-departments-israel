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
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : undefined;
  const verificationError =
    typeof params.verificationError === "string" ? params.verificationError : undefined;
  const verified = params.verified === "1";
  const signupCheckEmail = params.signup === "checkEmail";
  const resetDone = params.reset === "1";

  return (
    <PageShell className="flex min-h-[76vh] items-center justify-center bg-[radial-gradient(circle_at_top_left,#dff4ff,transparent_34%),linear-gradient(180deg,#f8fbff_0%,#eef6f8_100%)] px-4 py-12">
      <Card className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/92 p-7 shadow-2xl shadow-brand-900/10 backdrop-blur md:p-9">
        <div className="text-center">
          <p className="text-sm font-bold text-brand-600">כניסה מאובטחת</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-ink">ברוכים הבאים</h1>
        </div>
        {signupCheckEmail ? (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            ההרשמה התקבלה. בדקו את המייל ולחצו על קישור האימות לפני התחברות.
          </p>
        ) : null}
        {verified ? (
          <p className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
            כתובת המייל אומתה. אפשר להתחבר; הגישה המלאה תיפתח לאחר אישור הסטטוס המקצועי.
          </p>
        ) : null}
        {resetDone ? (
          <p className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
            הסיסמה עודכנה. אפשר להתחבר עם הסיסמה החדשה.
          </p>
        ) : null}
        {verificationError ? (
          <p className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
            קישור האימות חסר או שפג תוקפו. אפשר להתחבר שוב ולבקש קישור חדש.
          </p>
        ) : null}
        <div className="mt-6">
          <LoginForm nextPath={nextPath} />
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">
          אין לכם חשבון?{" "}
          <Link href="/signup" className="font-semibold text-brand-700">
            הרשמה חדשה
          </Link>
        </p>
      </Card>
    </PageShell>
  );
}
