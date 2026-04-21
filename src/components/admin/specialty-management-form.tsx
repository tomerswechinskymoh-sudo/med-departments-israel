"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminSpecialtySchema } from "@/lib/validation";

type FormValues = z.infer<typeof adminSpecialtySchema>;

export function SpecialtyManagementForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(adminSpecialtySchema),
    defaultValues: {
      name: "",
      slug: "",
      description: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);

    const response = await fetch("/api/admin/specialties", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

    if (!response.ok) {
      setMessage(payload?.error ?? "שמירת התחום נכשלה.");
      return;
    }

    setMessage(payload?.message ?? "התחום נוסף.");
    reset();
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl bg-brand-50 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          {...register("name")}
          placeholder="שם תחום"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
        />
        <input
          {...register("slug")}
          placeholder="slug לטיני"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
        />
      </div>
      <textarea
        {...register("description")}
        placeholder="תיאור התחום"
        className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
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
        {isSubmitting ? "שומר..." : "הוספת תחום"}
      </button>
    </form>
  );
}
