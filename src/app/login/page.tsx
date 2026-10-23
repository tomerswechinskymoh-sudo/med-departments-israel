import { ProductIcon } from "@/components/ui/product-icon";
import { AuthAside } from "@/components/layout/auth-aside";
import Link from "next/link";
import { ApprovedBrand } from "@/components/layout/approved-brand";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/forms/login-form";
import { siteIdentity } from "@/lib/brand-copy";

export const metadata = {
  title: "התחברות | hitmachut.org",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" &&
    params.next.startsWith("/") &&
    !params.next.startsWith("//")
      ? params.next
      : undefined;
  const verificationError =
    typeof params.verificationError === "string"
      ? params.verificationError
      : undefined;
  const verified = params.verified === "1";
  const signupCheckEmail = params.signup === "checkEmail";
  const resetDone = params.reset === "1";

  return (
    <PageShell className="account-page">
      <div className="auth-shell auth-shell--login">
        <section className="auth-panel">
          <ApprovedBrand placement="account" />
          <div>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-ink">
              ברוכים הבאים בחזרה
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              התחברו לחשבון שלכם כדי להמשיך לחקור, להשוות ולתכנן את ההתמחות שלכם בישראל.
            </p>
          </div>
          {signupCheckEmail ? (
            <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              ההרשמה התקבלה. בדקו את המייל ולחצו על קישור האימות לפני התחברות.
            </p>
          ) : null}
          {verified ? (
            <p className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
              כתובת המייל אומתה. אפשר להתחבר; הגישה המלאה תיפתח לאחר אישור
              הסטטוס המקצועי.
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
          <p className="account-signup-link mt-6 text-center text-sm text-slate-600">
            אין לכם חשבון?{" "}
            <Link href="/signup" className="font-semibold text-brand-700">
              הרשמה חדשה ←
            </Link>
          </p>
        </section>
        <AuthAside variant="login" />
      </div>
      <section className="account-benefits">
        <div className="section-intro">
          <h2>מה תוכלו לעשות אחרי ההתחברות?</h2>
          <p>הכלים שיעזרו לכם להמשיך את בירור ההתמחות.</p>
        </div>
        <div>
          {(
            [
              [
                "bookmark",
                "לשמור מחלקות",
                "לרכז את המחלקות שמעניינות אתכם ברשימה אישית.",
              ],
              [
                "compare",
                "להשוות נתונים",
                "לבחון מחלקות באותו תחום ולהעמיק במקורות.",
              ],
              [
                "document",
                "לחזור למידע",
                "להמשיך לפרטים הזמינים בהתאם להרשאות החשבון.",
              ],
            ] as const
          ).map(([icon, title, text]) => (
            <article key={title}>
              <span className="icon-tile">
                <ProductIcon name={icon} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
