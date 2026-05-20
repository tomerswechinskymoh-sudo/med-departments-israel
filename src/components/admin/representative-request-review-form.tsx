"use client";

import { useState, type FormEvent } from "react";

export function RepresentativeRequestReviewForm({ requestId }: { requestId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nativeEvent = event.nativeEvent as SubmitEvent;
    const submitter = nativeEvent.submitter as HTMLButtonElement | null;
    const action = submitter?.value === "reject" ? "reject" : "approve";
    setMessage(null);
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/department-representative-requests/${requestId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action,
        adminNotes: formData.get("adminNotes")
      })
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "הפעולה נכשלה.");
      return;
    }

    setMessage(action === "approve" ? "הבקשה אושרה והשיוך נוצר." : "הבקשה נדחתה.");
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3">
      {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{message}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{error}</p> : null}
      <textarea
        name="adminNotes"
        rows={2}
        placeholder="הערת מנהל, לא חובה"
        className="w-full rounded-2xl border border-brand-100 px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="action"
          value="approve"
          disabled={loading}
          className="rounded-full bg-brand-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          אישור נציגות
        </button>
        <button
          type="submit"
          name="action"
          value="reject"
          disabled={loading}
          className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-60"
        >
          דחייה
        </button>
      </div>
    </form>
  );
}
