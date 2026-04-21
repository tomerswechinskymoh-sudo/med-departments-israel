"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VerificationModerationForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("APPROVED");
  const [adminNote, setAdminNote] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitDecision() {
    setIsPending(true);
    setMessage(null);

    const response = await fetch(`/api/admin/verification-requests/${requestId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status, adminNote })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    setMessage(payload?.message ?? payload?.error ?? null);
    router.refresh();
    setIsPending(false);
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      >
        <option value="APPROVED">אישור</option>
        <option value="REJECTED">דחייה</option>
      </select>
      <textarea
        value={adminNote}
        onChange={(event) => setAdminNote(event.target.value)}
        placeholder="הערה פנימית"
        className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
      <button
        type="button"
        onClick={submitDecision}
        disabled={isPending}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "שומר..." : "שמירת החלטה"}
      </button>
    </div>
  );
}
