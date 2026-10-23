"use client";


import Link from "next/link";
import { ProductIcon } from "@/components/ui/product-icon";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { safeInternalPath } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

type FormValues = z.infer<typeof loginSchema>;

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [devVerificationUrl, setDevVerificationUrl] = useState<string | null>(
    null,
  );
  const [emailForResend, setEmailForResend] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const invalidCredentialsMessage = "שם משתמש או סיסמא לא נכונים";
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(
    async (values) => {
      setFormError(null);
      setResendMessage(null);
      setDevVerificationUrl(null);
      setEmailForResend(null);

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });

        if (!response.ok) {

          const payload = (await response.json().catch(() => null)) as {
            error?: string;
            code?: string;
          } | null;

          if (response.status === 401 || payload?.code === "EMAIL_UNVERIFIED") {
            setFormError(
              payload?.error ?? "יש לאמת את כתובת המייל לפני התחברות.",
            );
            setEmailForResend(values.email);
            return;
          }

          setFormError(payload?.error ?? invalidCredentialsMessage);
          return;
        }


        router.push(safeInternalPath(nextPath, "/departments"));
        router.refresh();
      } catch {
        setFormError("לא ניתן להתחבר כרגע. בדקו את החיבור ונסו שוב.");

      }
    },
    () => {
      setFormError(invalidCredentialsMessage);
    },
  );

  async function resendVerificationEmail() {
    if (!emailForResend) {
      return;
    }

    setIsResending(true);
    setResendMessage(null);
    setDevVerificationUrl(null);

    try {
      const response = await fetch("/api/verification/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailForResend }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
        verificationUrl?: string;
      } | null;
      setResendMessage(
        payload?.message ??
          payload?.error ??
          "אם החשבון קיים, נשלח קישור אימות חדש.",
      );
      setDevVerificationUrl(payload?.verificationUrl ?? null);
    } catch {
      setResendMessage("השליחה נכשלה. נסו שוב.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <label
          htmlFor="login-email"
          className="mb-2 block text-sm font-semibold text-ink"
        >
          אימייל
        </label>
        <div className="field-with-icon"><ProductIcon name="mail"/>
        <input
          {...register("email")}
          id="login-email"
          autoComplete="email"
          dir="ltr"
          type="email"
          placeholder="name@domain.co.il"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        /></div>
        {errors.email && <p id="login-email-error" role="alert" className="mt-2 text-sm text-rose-700">{errors.email.message}</p>}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label
            htmlFor="login-password"
            className="block text-sm font-semibold text-ink"
          >
            סיסמה
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-bold text-brand-700"
          >
            שכחת סיסמה?
          </Link>
        </div>
        <div className="field-with-icon field-with-icon--password"><ProductIcon name="lock"/>
        <input
          {...register("password")}
          id="login-password"
          autoComplete="current-password"
          placeholder="הכניסו את הסיסמה שלכם"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          dir={showPassword ? "ltr" : "auto"}
          type={showPassword ? "text" : "password"}
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        />
        <button type="button" className="password-visibility" aria-label={showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}><ProductIcon name={showPassword ? "eye-off" : "eye"}/></button></div>
        {errors.password && <p id="login-password-error" role="alert" className="mt-2 text-sm text-rose-700">{errors.password.message}</p>}
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-rose-600">
          {formError}
        </p>
      ) : null}
      {emailForResend ? (
        <div className="rounded-2xl border border-brand-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          <button
            type="button"
            onClick={resendVerificationEmail}
            disabled={isResending}
            className="font-bold text-brand-800 underline underline-offset-4 disabled:opacity-60"
          >
            {isResending ? "שולח/ת קישור..." : "שליחת קישור אימות חדש"}
          </button>
          {resendMessage ? <p className="mt-2">{resendMessage}</p> : null}
          {devVerificationUrl ? (
            <a
              href={devVerificationUrl}
              className="mt-2 block break-all font-semibold text-brand-800 underline underline-offset-4"
            >
              {devVerificationUrl}
            </a>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="auth-submit w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        <ProductIcon name="login"/>{isSubmitting ? "מתחבר/ת..." : "התחברות"}
      </button>
      <p className="auth-security-note"><ProductIcon name="shield"/>גישה מאובטחת לחשבון</p>
    </form>
  );
}
