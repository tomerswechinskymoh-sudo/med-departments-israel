"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminDepartmentSchema } from "@/lib/validation";

type FormValues = z.infer<typeof adminDepartmentSchema>;

export function DepartmentManagementForm({
  institutions,
  specialties
}: {
  institutions: { id: string; name: string; type: "HOSPITAL" | "HMO" }[];
  specialties: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(adminDepartmentSchema),
    defaultValues: {
      institutionId: "",
      specialtyId: "",
      name: "",
      slug: "",
      shortSummary: "",
      about: "",
      practicalInfo: "",
      publicContactEmail: "",
      publicContactPhone: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);

    const response = await fetch("/api/admin/departments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

    if (!response.ok) {
      setMessage(payload?.error ?? "שמירת המחלקה נכשלה.");
      return;
    }

    setMessage(payload?.message ?? "המחלקה נוספה.");
    reset();
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl bg-brand-50 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <select
          {...register("institutionId")}
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="">בחירת מוסד</option>
          {institutions.map((institution) => (
            <option key={institution.id} value={institution.id}>
              {institution.name} · {institution.type === "HOSPITAL" ? "בית חולים" : "קופה / קהילה"}
            </option>
          ))}
        </select>
        <select
          {...register("specialtyId")}
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="">בחירת תחום</option>
          {specialties.map((specialty) => (
            <option key={specialty.id} value={specialty.id}>
              {specialty.name}
            </option>
          ))}
        </select>
        <input
          {...register("name")}
          placeholder="שם מחלקה"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
        />
        <input
          {...register("slug")}
          placeholder="slug לטיני"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
        />
        <input
          {...register("publicContactEmail")}
          placeholder="אימייל ציבורי (אופציונלי)"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
        />
        <input
          {...register("publicContactPhone")}
          placeholder="טלפון ציבורי (אופציונלי)"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
        />
      </div>
      <textarea
        {...register("shortSummary")}
        placeholder="תקציר קצר"
        className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      <textarea
        {...register("about")}
        placeholder="תיאור מלא של המחלקה"
        className="min-h-32 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      <textarea
        {...register("practicalInfo")}
        placeholder="מידע פרקטי לסטודנטים וסטאז'רים"
        className="min-h-28 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      <div className="space-y-1 text-xs text-rose-600">
        {Object.values(errors).map((error) =>
          error?.message ? <p key={error.message}>{error.message}</p> : null
        )}
      </div>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "שומר..." : "הוספת מחלקה"}
      </button>
    </form>
  );
}
