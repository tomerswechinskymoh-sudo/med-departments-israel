"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

async function postJson(path: string, values: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values)
  });
  const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "הפעולה נכשלה.");
  }

  return payload?.message ?? "עודכן.";
}

export function RepresentativeApplicationActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function decision(path: "approve" | "reject" | "waitlist", form?: HTMLFormElement) {
    setIsWorking(true);
    setMessage(null);
    const formData = form ? new FormData(form) : null;

    try {
      const saved = await postJson(`/api/electives/department/applications/${applicationId}/${path}`, {
        applicationId,
        representativeNotes: String(formData?.get("representativeNotes") ?? "")
      });
      setMessage(saved);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "הפעולה נכשלה.");
    } finally {
      setIsWorking(false);
    }
  }

  async function onSuggestAlternative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsWorking(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);

    try {
      const saved = await postJson(`/api/electives/department/applications/${applicationId}/suggest-alternative`, {
        applicationId,
        proposedStartDate: String(form.get("proposedStartDate") ?? ""),
        proposedEndDate: String(form.get("proposedEndDate") ?? ""),
        representativeNotes: String(form.get("representativeNotes") ?? "")
      });
      setMessage(saved);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "הפעולה נכשלה.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-brand-100 bg-white p-4 shadow-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void decision("approve", event.currentTarget);
        }}
        className="space-y-3"
      >
        <textarea
          name="representativeNotes"
          placeholder="הערה לסטודנט/ית או לאדמין"
          className="min-h-20 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={isWorking} className="rounded-full bg-green-700 px-4 py-2 text-xs font-black text-white disabled:opacity-60">
            אישור
          </button>
          <button type="button" onClick={() => void decision("reject")} disabled={isWorking} className="rounded-full bg-red-700 px-4 py-2 text-xs font-black text-white disabled:opacity-60">
            דחייה
          </button>
          <button type="button" onClick={() => void decision("waitlist")} disabled={isWorking} className="rounded-full bg-amber-600 px-4 py-2 text-xs font-black text-white disabled:opacity-60">
            רשימת המתנה
          </button>
        </div>
      </form>

      <form onSubmit={onSuggestAlternative} className="space-y-3 rounded-2xl bg-brand-50 p-3">
        <p className="text-xs font-black text-slate-600">הצעת תאריכים חלופיים</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input name="proposedStartDate" type="date" required className="rounded-2xl border border-brand-100 px-4 py-3 text-sm outline-none" />
          <input name="proposedEndDate" type="date" required className="rounded-2xl border border-brand-100 px-4 py-3 text-sm outline-none" />
        </div>
        <textarea
          name="representativeNotes"
          placeholder="הסבר קצר לסטודנט/ית"
          className="min-h-16 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
        />
        <button type="submit" disabled={isWorking} className="rounded-full bg-brand-700 px-4 py-2 text-xs font-black text-white disabled:opacity-60">
          שליחת חלופה
        </button>
      </form>

      {message ? <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{message}</p> : null}
    </div>
  );
}
