import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { SignupForm } from "@/components/forms/signup-form";

export default async function SignupPage() {
  return (
    <PageShell className="flex min-h-[76vh] items-center justify-center bg-[radial-gradient(circle_at_top_left,#dff4ff,transparent_34%),linear-gradient(180deg,#f8fbff_0%,#eef6f8_100%)] px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Card className="rounded-[2rem] border border-white/80 bg-white/92 p-7 shadow-2xl shadow-brand-900/10 backdrop-blur md:p-9">
          <div className="text-center">
            <p className="text-sm font-bold text-brand-600">פתיחת חשבון</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-ink">הצטרפות לפלטפורמה</h1>
          </div>
          <div className="mt-6">
            <SignupForm />
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
