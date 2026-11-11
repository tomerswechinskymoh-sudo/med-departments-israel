"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserVerificationReviewForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("APPROVED");
  const [adminNote, setAdminNote] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitModeration() {
    setIsPending(true);
    setMessage(null);

    try {
    const response = await fetch(`/api/admin/user-verifications/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status, adminNote })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    setMessage(payload?.message ?? payload?.error ?? null);
    router.refresh();
    } catch { setMessage("השמירה נכשלה. לא התקבל אישור למחיקה; יש לנסות שוב."); }
    finally { setIsPending(false); }
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-brand-100 bg-white p-4">
      <p className="text-sm">אישור או חסימה מוחקים את מסמכי אימות ההרשמה באותה פעולה. אסמכתאות לחוויות נשמרות. כשל במחיקה מונע את שמירת ההחלטה.</p>
      <select
        aria-label="החלטה על אימות ההרשמה"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      >
        <option value="APPROVED">אישור סטטוס מקצועי</option>
        <option value="REJECTED">דחייה</option>
      </select>
      <textarea
        aria-label="הערת אדמין או סיבת דחייה"
        value={adminNote}
        onChange={(event) => setAdminNote(event.target.value)}
        placeholder="הערת אדמין או סיבת דחייה"
        className="min-h-24 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none"
      />
      {message ? <p role="status" className="text-sm text-slate-700">{message}</p> : null}
      <button
        type="button"
        onClick={submitModeration}
        disabled={isPending}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "שומר..." : "עדכון אימות"}
      </button>
    </div>
  );
}
