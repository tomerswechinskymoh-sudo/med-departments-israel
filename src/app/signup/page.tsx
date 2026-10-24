import { getMaxUploadMbLabel } from "@/lib/uploads";
import Link from "next/link";
import { ApprovedBrand } from "@/components/layout/approved-brand";
import { PageShell } from "@/components/layout/page-shell";
import { AuthAside } from "@/components/layout/auth-aside";
import { SignupForm } from "@/components/forms/signup-form";
import { getDepartmentOptions } from "@/lib/queries";
export const metadata = {
  title: "הרשמה | hitmachut.org",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: true },
};
export default async function SignupPage() {
  const departments = await getDepartmentOptions();
  return (
    <PageShell className="account-page">
      <div className="auth-shell auth-shell--signup">
        <section className="auth-panel">
          <ApprovedBrand placement="account" />
          <p className="eyebrow">פתיחת חשבון</p>
          <h1>מצטרפים לדרך להתמחות</h1>
          <p>
            פרטי חשבון, רקע מקצועי ואימות. סטודנטים בשנים הקליניות, סטאז׳רים ומתמחים משלימים גם שיתוף חוויה על מחלקה כחלק מההרשמה. הגישה לפרטים מוגנים כפופה לאישור.
          </p>
          <div className="mt-6">
            <SignupForm
              departments={departments}
              maxUploadMb={Math.min(5, getMaxUploadMbLabel())}
            />
          </div>
          <p className="mt-6 text-sm">
            כבר יש חשבון?{" "}
            <Link className="text-link" href="/login">
              התחברות
            </Link>
          </p>
        </section>
        <AuthAside variant="signup" />
      </div>
    </PageShell>
  );
}
