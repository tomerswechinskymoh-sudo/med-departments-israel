"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation";

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ForgotPasswordForm() {
  const formId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setMessage(null);
    setDevResetUrl(null);

    try {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      message?: string;
      resetUrl?: string;
    } | null;

    if (!response.ok) {
      setFormError(payload?.error ?? "לא הצלחנו לשלוח קישור איפוס כרגע.");
      return;
    }

    setMessage(payload?.message ?? "אם קיים חשבון עם האימייל הזה, נשלח קישור לאיפוס סיסמה.");
    setDevResetUrl(payload?.resetUrl ?? null);
    } catch { setFormError("החיבור נכשל. יש לנסות שוב."); }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor={`${formId}-email`} className="mb-2 block text-sm font-semibold text-ink">אימייל</label>
        <input
          {...register("email")}
          id={`${formId}-email`}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${formId}-email-error` : undefined}
          type="email"
          className="w-full rounded-xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        />
        {errors.email ? <p id={`${formId}-email-error`} role="alert" className="mt-2 text-sm text-rose-700">{errors.email.message}</p> : null}
      </div>

      {formError ? <p role="alert" className="text-sm text-rose-600">{formError}</p> : null}
      {message ? (
        <div role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
          <p>{message}</p>
          {devResetUrl ? (
            <a
              href={devResetUrl}
              className="mt-2 block break-all font-semibold text-brand-800 underline underline-offset-4"
            >
              {devResetUrl}
            </a>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "שולח/ת..." : "שליחת קישור איפוס"}
      </button>
      <Link href="/login" className="block text-center text-sm font-semibold text-brand-700">
        חזרה להתחברות
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const formId = useId();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setFormError(payload?.error ?? "לא הצלחנו לאפס את הסיסמה.");
      return;
    }

    router.push("/login?reset=1");
    router.refresh();
    } catch { setFormError("החיבור נכשל. יש לנסות שוב."); }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" {...register("token")} value={token} />
      <div>
        <label htmlFor={`${formId}-password`} className="mb-2 block text-sm font-semibold text-ink">סיסמה חדשה</label>
        <input
          {...register("password")}
          id={`${formId}-password`}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? `${formId}-password-error` : undefined}
          type="password"
          className="w-full rounded-xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        />
        {errors.password ? <p id={`${formId}-password-error`} role="alert" className="mt-2 text-xs text-rose-600">{errors.password.message}</p> : null}
      </div>
      <div>
        <label htmlFor={`${formId}-confirmPassword`} className="mb-2 block text-sm font-semibold text-ink">אימות סיסמה</label>
        <input
          {...register("confirmPassword")}
          id={`${formId}-confirmPassword`}
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? `${formId}-confirmPassword-error` : undefined}
          type="password"
          className="w-full rounded-xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        />
        {errors.confirmPassword ? (
          <p id={`${formId}-confirmPassword-error`} role="alert" className="mt-2 text-xs text-rose-600">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      {formError ? <p role="alert" className="text-sm text-rose-600">{formError}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "מעדכן/ת..." : "עדכון סיסמה"}
      </button>
    </form>
  );
}
