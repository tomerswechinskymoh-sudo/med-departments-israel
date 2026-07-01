"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

async function postJson(path: string, values: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(values)
  });
  const payload = (await response.json().catch(() => null)) as { message?: string; error?: string; applicationId?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "הגשה נכשלה.");
  }

  return payload ?? {};
}

export function ElectiveApplicationForm({ departmentSlug }: { departmentSlug: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsWorking(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const payload = await postJson("/api/electives/applications", {
        departmentSlug,
        requestedStartDate: String(form.get("requestedStartDate") ?? ""),
        requestedEndDate: String(form.get("requestedEndDate") ?? ""),
        studentNotes: String(form.get("studentNotes") ?? "")
      });
      setMessage(payload.message ?? "בקשת האלקטיב הוגשה.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "הגשה נכשלה.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-black text-slate-600">תאריך התחלה מבוקש</span>
          <input
            name="requestedStartDate"
            type="date"
            required
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-black text-slate-600">תאריך סיום מבוקש</span>
          <input
            name="requestedEndDate"
            type="date"
            required
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
          />
        </label>
      </div>
      <textarea
        name="studentNotes"
        placeholder="הערות למחלקה"
        className="min-h-28 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      {message ? <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{message}</p> : null}
      <button
        type="submit"
        disabled={isWorking}
        className="rounded-full bg-brand-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
      >
        הגשת בקשה לבדיקה
      </button>
    </form>
  );
}
