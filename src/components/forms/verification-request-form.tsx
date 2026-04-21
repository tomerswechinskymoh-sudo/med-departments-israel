"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { publisherRequestSchema } from "@/lib/validation";

type FormValues = z.infer<typeof publisherRequestSchema>;

export function VerificationRequestForm({
  departments,
  institutions
}: {
  departments: {
    id: string;
    name: string;
    institution: { name: string };
  }[];
  institutions: {
    id: string;
    name: string;
    type: "HOSPITAL" | "HMO";
  }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(publisherRequestSchema),
    defaultValues: {
      institutionId: "",
      departmentId: "",
      note: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);

    const response = await fetch("/api/verification-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

    if (!response.ok) {
      setMessage(payload?.error ?? "שליחת הבקשה נכשלה.");
      return;
    }

    setMessage(payload?.message ?? "הבקשה נשלחה.");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">מוסד</label>
        <select
          {...register("institutionId")}
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        >
          <option value="">בחירת מוסד</option>
          {institutions.map((institution) => (
            <option key={institution.id} value={institution.id}>
              {institution.name} · {institution.type === "HOSPITAL" ? "בית חולים" : "קופה / קהילה"}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">מחלקה / מסלול</label>
        <select
          {...register("departmentId")}
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
        >
          <option value="">בחירת מחלקה</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.institution.name} · {department.name}
            </option>
          ))}
        </select>
        {errors.departmentId ? (
          <p className="mt-2 text-xs text-rose-600">{errors.departmentId.message}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink">הסבר קצר לבקשה</label>
        <textarea
          {...register("note")}
          className="min-h-28 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 outline-none transition focus:border-brand-300"
          placeholder="תפקידך במחלקה, היקף האחריות, ולמה את/ה מבקש/ת לפרסם תוכן רשמי."
        />
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "שולח/ת..." : "שליחת בקשת הרשאת פרסום"}
      </button>
    </form>
  );
}
