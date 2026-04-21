"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OpeningApplicationModerationForm({
  openingId,
  applicationId,
  currentStatus
}: {
  openingId: string;
  applicationId: string;
  currentStatus: "SUBMITTED" | "UNDER_REVIEW" | "CONTACTED" | "ARCHIVED";
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [reviewerNote, setReviewerNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submit() {
    setIsPending(true);
    setMessage(null);

    const response = await fetch(
      `/api/representative/openings/${openingId}/applications/${applicationId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status, reviewerNote })
      }
    );

    const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
    setMessage(payload?.message ?? payload?.error ?? null);
    router.refresh();
    setIsPending(false);
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as typeof currentStatus)}
        className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      >
        <option value="SUBMITTED">הוגש</option>
        <option value="UNDER_REVIEW">בבדיקה</option>
        <option value="CONTACTED">נוצר קשר</option>
        <option value="ARCHIVED">בארכיון</option>
      </select>
      <textarea
        value={reviewerNote}
        onChange={(event) => setReviewerNote(event.target.value)}
        placeholder="הערה פנימית לנציג/אדמין"
        className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "שומר..." : "עדכון סטטוס מועמדות"}
      </button>
    </div>
  );
}
