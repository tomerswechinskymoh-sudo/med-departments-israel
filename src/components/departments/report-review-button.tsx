"use client";

import { useState } from "react";

export function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  async function submitReport() {
    const response = await fetch(`/api/reviews/${reviewId}/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ reason, details })
    });

    if (response.ok) {
      setMessage("הדיווח נשלח. נבדוק את זה בהקדם.");
      setReason("");
      setDetails("");
      setIsOpen(false);
      return;
    }

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setMessage(payload?.error ?? "לא ניתן היה לשלוח את הדיווח.");
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="text-xs font-semibold text-rose-700 transition hover:text-rose-800"
      >
        דיווח על תוכן
      </button>

      {isOpen ? (
        <div className="mt-3 space-y-3 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="מה הבעיה כאן?"
            className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm outline-none"
          />
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="אם צריך, אפשר להוסיף עוד כמה מילים"
            className="min-h-24 w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={submitReport}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
          >
            שליחה
          </button>
        </div>
      ) : null}

      {message ? <p className="mt-2 text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
