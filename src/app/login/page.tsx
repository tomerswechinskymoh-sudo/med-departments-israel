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
  const linkedinError = typeof params.linkedinError === "string" ? params.linkedinError : undefined;
  const socialError = typeof params.socialError === "string" ? params.socialError : undefined;

  return (
    <PageShell className="flex min-h-[76vh] items-center justify-center bg-[radial-gradient(circle_at_top_left,#dff4ff,transparent_34%),linear-gradient(180deg,#f8fbff_0%,#eef6f8_100%)] px-4 py-12">
      <Card className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/92 p-7 shadow-2xl shadow-brand-900/10 backdrop-blur md:p-9">
        <div className="text-center">
          <p className="text-sm font-bold text-brand-600">כניסה מאובטחת</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-ink">ברוכים הבאים</h1>
        </div>
        <div className="mt-6">
          <LoginForm nextPath={nextPath} linkedinError={linkedinError} socialError={socialError} />
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
