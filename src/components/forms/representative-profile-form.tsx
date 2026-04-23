"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { representativeAccountProfileSchema } from "@/lib/validation";

type FormValues = z.infer<typeof representativeAccountProfileSchema>;

export function RepresentativeProfileForm({
  initialValues
}: {
  initialValues: FormValues;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(representativeAccountProfileSchema),
    defaultValues: initialValues
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);

    const response = await fetch("/api/representative/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;

    setMessage(payload?.message ?? payload?.error ?? null);
    if (response.ok) {
      router.refresh();
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">שם מלא</label>
          <input
            {...register("fullName")}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">טייטל / תפקיד</label>
          <input
            {...register("profile.title")}
            placeholder="למשל רכזת סטודנטים במחלקה"
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">אימייל</label>
          <input
            {...register("email")}
            type="email"
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">טלפון</label>
          <input
            {...register("phone")}
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">פרטי קשר ציבוריים</label>
        <textarea
          {...register("profile.contactDetails")}
          placeholder="שעות מענה, דרך קשר מועדפת, או כל פרט קצר שעוזר להבין איך נכון לפנות."
          className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">כמה מילים עלייך</label>
        <textarea
          {...register("profile.note")}
          placeholder="למשל על מה את/ה אחראי/ת, למי נכון לפנות, ואיזה מידע אפשר לקבל ממך."
          className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
      </div>

      <div className="space-y-1 text-xs text-rose-600">
        {errors.fullName ? <p>{errors.fullName.message}</p> : null}
        {errors.email ? <p>{errors.email.message}</p> : null}
        {errors.phone ? <p>{errors.phone.message}</p> : null}
        {errors.profile?.title ? <p>{errors.profile.title.message}</p> : null}
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "שומר/ת..." : "שמירת פרופיל נציג/ה"}
      </button>
    </form>
  );
}

