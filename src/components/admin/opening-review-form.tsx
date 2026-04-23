"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OpeningReviewForm({ openingId }: { openingId: string }) {
  const router = useRouter();
  const [adminNote, setAdminNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit(decision: "APPROVE" | "REJECT") {
    setIsPending(true);
    setMessage(null);

    const response = await fetch(`/api/admin/openings/${openingId}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ decision, adminNote })
    });

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;

    setMessage(payload?.message ?? payload?.error ?? null);
    setIsPending(false);
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <textarea
        value={adminNote}
        onChange={(event) => setAdminNote(event.target.value)}
        placeholder="הערה לאישור או דחייה"
        className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit("APPROVE")}
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          אישור לפרסום
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit("REJECT")}
          className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60"
        >
          דחייה
        </button>
      </div>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}

