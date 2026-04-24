"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminRepresentativeCreateSchema } from "@/lib/validation";

type FormValues = z.infer<typeof adminRepresentativeCreateSchema>;

export function RepresentativeCreationForm({
  departments
}: {
  departments: Array<{
    id: string;
    name: string;
    institution: { name: string };
  }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(adminRepresentativeCreateSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      departmentIds: [],
      profile: {
        title: "",
        contactDetails: "",
        note: ""
      }
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);

    const response = await fetch("/api/admin/representatives", {
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
        <input
          {...register("fullName")}
          placeholder="שם מלא"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
        <input
          {...register("email")}
          type="email"
          placeholder="אימייל"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          {...register("phone")}
          placeholder="טלפון"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
        <input
          {...register("password")}
          type="password"
          placeholder="סיסמה זמנית"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          {...register("profile.title")}
          placeholder="טייטל / תפקיד"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
        <textarea
          {...register("profile.contactDetails")}
          placeholder="פרטי קשר ציבוריים"
          className="min-h-24 rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
        />
      </div>

      <textarea
        {...register("profile.note")}
        placeholder="כמה מילים על התפקיד או על תחום האחריות"
        className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none"
      />

      <div className="rounded-[1.75rem] border border-brand-100 bg-brand-50/70 p-5">
        <p className="text-sm font-semibold text-ink">שיוך למחלקות</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          נציג/ה חייב/ת להיות משויך/ת לפחות למחלקה אחת. רק המחלקות האלו יהיו זמינות לניהול תוכן.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {departments.map((department) => (
            <label
              key={department.id}
              className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700"
            >
              <input type="checkbox" value={department.id} {...register("departmentIds")} />
              <span>
                {department.institution.name} · {department.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1 text-xs text-rose-600">
        {errors.fullName ? <p>{errors.fullName.message}</p> : null}
        {errors.email ? <p>{errors.email.message}</p> : null}
        {errors.password ? <p>{errors.password.message}</p> : null}
        {errors.departmentIds ? <p>{errors.departmentIds.message as string}</p> : null}
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "יוצר/ת..." : "יצירת נציג/ת מחלקה"}
      </button>
    </form>
  );
}
