"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signupSchema } from "@/lib/validation";

type FormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      accountIntent: "student"
    }
  });

  const accountIntent = watch("accountIntent");

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setFormError(payload?.error ?? "ההרשמה נכשלה.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">שם מלא</label>
        <input
          {...register("fullName")}
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        />
        {errors.fullName ? (
          <p className="mt-2 text-xs text-rose-600">{errors.fullName.message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">אימייל</label>
          <input
            {...register("email")}
            type="email"
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
          />
          {errors.email ? <p className="mt-2 text-xs text-rose-600">{errors.email.message}</p> : null}
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">טלפון</label>
          <input
            {...register("phone")}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
          />
          {errors.phone ? <p className="mt-2 text-xs text-rose-600">{errors.phone.message}</p> : null}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">סוג חשבון ראשוני</label>
        <select
          {...register("accountIntent")}
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        >
          <option value="student">סטודנט/ית או סטאז'ר/ית</option>
          <option value="resident">מתמחה</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">סיסמה</label>
          <input
            {...register("password")}
            type="password"
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
          />
          {errors.password ? (
            <p className="mt-2 text-xs text-rose-600">{errors.password.message}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">אימות סיסמה</label>
          <input
            {...register("confirmPassword")}
            type="password"
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
          />
          {errors.confirmPassword ? (
            <p className="mt-2 text-xs text-rose-600">{errors.confirmPassword.message}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl bg-brand-50 p-4 text-sm leading-7 text-slate-600">
        {accountIntent === "resident"
            ? "החשבון מאפשר לשמור מחלקות להשוואה ולעקוב אחרי מחלקות. שיתוף חוויה פתוח גם בלי הרשמה, ויאומת בנפרד מול צוות האתר."
            : "החשבון מיועד לגלישה נוחה, שמירת מחלקות להשוואה, והגשת מועמדות פרטית לתקנים פתוחים מתוך אזור אישי מסודר."}
      </div>

      {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "יוצר/ת חשבון..." : "יצירת חשבון"}
      </button>
    </form>
  );
}
