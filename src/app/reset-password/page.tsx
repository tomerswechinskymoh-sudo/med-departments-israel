import Link from "next/link";
import { ResetPasswordForm } from "@/components/forms/password-reset-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <PageShell className="flex min-h-[72vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md rounded-2xl border border-white/80 bg-white/92 !p-6 shadow-2xl shadow-brand-900/10 backdrop-blur">
        <div className="text-center">
          <p className="text-sm font-bold text-brand-600">איפוס סיסמה</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">בחירת סיסמה חדשה</h1>
        </div>
        <div className="mt-5">
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="space-y-4 text-center text-sm leading-6 text-slate-600">
              <p>קישור האיפוס חסר או אינו תקין.</p>
              <Link href="/forgot-password" className="font-semibold text-brand-700">
                בקשת קישור חדש
              </Link>
            </div>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
