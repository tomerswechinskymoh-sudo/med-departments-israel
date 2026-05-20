"use client";

import { useState } from "react";

export function ReviewProofUploadForm({ token }: { token: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    formData.set("token", token);

    const response = await fetch("/api/reviews/verification-proof", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "העלאת הקובץ נכשלה.");
      setIsSubmitting(false);
      return;
    }

    setMessage(payload?.message ?? "האסמכתא נשמרה לבדיקה.");
    setIsSubmitting(false);
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="mb-2 block text-sm font-bold text-ink">מסמך אימות</label>
        <input
          type="file"
          name="verificationDocument"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.odt,.txt,application/pdf,image/*"
          required
          className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm"
        />
        <p className="mt-2 text-xs leading-6 text-slate-500">
          הקובץ נשמר בפרטיות ונגיש לאדמין בלבד לצורך אימות השיתוף.
        </p>
      </div>

      {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-brand-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-800 disabled:opacity-60"
      >
        {isSubmitting ? "מעלה..." : "העלאת אסמכתא"}
      </button>
    </form>
  );
}
