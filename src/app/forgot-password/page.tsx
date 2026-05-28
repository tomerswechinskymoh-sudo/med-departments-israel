import { ForgotPasswordForm } from "@/components/forms/password-reset-forms";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <PageShell className="flex min-h-[72vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md rounded-2xl border border-white/80 bg-white/92 !p-6 shadow-2xl shadow-brand-900/10 backdrop-blur">
        <div className="text-center">
          <p className="text-sm font-bold text-brand-600">איפוס סיסמה</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">קישור איפוס למייל</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            הזינו את כתובת המייל ונשלח קישור חד-פעמי לעדכון הסיסמה.
          </p>
        </div>
        <div className="mt-5">
          <ForgotPasswordForm />
        </div>
      </Card>
    </PageShell>
  );
}
