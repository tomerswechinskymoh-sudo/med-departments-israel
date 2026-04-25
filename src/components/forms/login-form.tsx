"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LinkedInAuthLink } from "@/components/auth/linkedin-auth-link";
import { SocialAuthLink } from "@/components/auth/social-auth-link";
import { loginSchema } from "@/lib/validation";

type FormValues = z.infer<typeof loginSchema>;

export function LoginForm({
  nextPath,
  linkedinError,
  socialError
}: {
  nextPath?: string;
  linkedinError?: string;
  socialError?: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
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

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        setFormError(invalidCredentialsMessage);
        return;
      }

      router.push(nextPath || "/dashboard");
      router.refresh();
    },
    () => {
      setFormError(invalidCredentialsMessage);
    }
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="rounded-[1.5rem] border border-brand-100 bg-brand-50/55 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">כניסה מהירה</p>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              Google, Facebook או LinkedIn. אדמין ממשיך עם אימייל וסיסמה.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SocialAuthLink provider="google" mode="login" nextPath={nextPath} iconOnly />
            <SocialAuthLink provider="facebook" mode="login" nextPath={nextPath} iconOnly />
            <LinkedInAuthLink mode="login" nextPath={nextPath} iconOnly />
          </div>
        </div>
        <div className="mt-4 text-center text-xs font-semibold text-slate-400">או התחברות עם אימייל וסיסמה</div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">אימייל</label>
        <input
          {...register("email")}
          type="email"
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">סיסמה</label>
        <input
          {...register("password")}
          type="password"
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        />
      </div>

      {socialError ? <p className="text-sm text-rose-600">{socialError}</p> : null}
      {linkedinError ? <p className="text-sm text-rose-600">{linkedinError}</p> : null}
      {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

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
