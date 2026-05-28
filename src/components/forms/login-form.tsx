"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { safeInternalPath } from "@/lib/security";
import { loginSchema } from "@/lib/validation";

type FormValues = z.infer<typeof loginSchema>;

export function LoginForm({
  nextPath
}: {
  nextPath?: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [devVerificationUrl, setDevVerificationUrl] = useState<string | null>(null);
  const [emailForResend, setEmailForResend] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const invalidCredentialsMessage = "שם משתמש או סיסמא לא נכונים";
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = handleSubmit(
    async (values) => {
      setFormError(null);
      setResendMessage(null);
      setDevVerificationUrl(null);
      setEmailForResend(null);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          code?: string;
        } | null;

        if (payload?.code === "EMAIL_UNVERIFIED") {
          setFormError(payload.error ?? "יש לאמת את כתובת המייל לפני התחברות.");
          setEmailForResend(values.email);
          return;
        }

        setFormError(payload?.error ?? invalidCredentialsMessage);
        return;
      }

      router.push(safeInternalPath(nextPath, "/departments"));
      router.refresh();
    },
    () => {
      setFormError(invalidCredentialsMessage);
    }
  );

  async function resendVerificationEmail() {
    if (!emailForResend) {
      return;
    }

    setIsResending(true);
    setResendMessage(null);
    setDevVerificationUrl(null);

    const response = await fetch("/api/verification/resend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: emailForResend })
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      message?: string;
      verificationUrl?: string;
    } | null;
    setResendMessage(payload?.message ?? payload?.error ?? "אם החשבון קיים, נשלח קישור אימות חדש.");
    setDevVerificationUrl(payload?.verificationUrl ?? null);
    setIsResending(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">אימייל</label>
        <input
          {...register("email")}
          type="email"
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="block text-sm font-semibold text-ink">סיסמה</label>
          <Link href="/forgot-password" className="text-xs font-bold text-brand-700">
            שכחת סיסמה?
          </Link>
        </div>
        <input
          {...register("password")}
          type="password"
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        />
      </div>

      {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
      {emailForResend ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          <button
            type="button"
            onClick={resendVerificationEmail}
            disabled={isResending}
            className="font-bold text-amber-950 underline underline-offset-4 disabled:opacity-60"
          >
            {isResending ? "שולח/ת קישור..." : "שליחת קישור אימות חדש"}
          </button>
          {resendMessage ? <p className="mt-2">{resendMessage}</p> : null}
          {devVerificationUrl ? (
            <a
              href={devVerificationUrl}
              className="mt-2 block break-all font-semibold text-amber-950 underline underline-offset-4"
            >
              {devVerificationUrl}
            </a>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "מתחבר/ת..." : "התחברות"}
      </button>
    </form>
  );
}
