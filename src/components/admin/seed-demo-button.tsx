"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SeedDemoButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSeed() {
    setIsPending(true);
    setMessage(null);

    const response = await fetch("/api/admin/seed-demo", {
      method: "POST"
    });

    const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

    if (response.ok) {
      setMessage(payload?.message ?? "הדגמה נטענה מחדש.");
      router.refresh();
    } else {
      setMessage(payload?.error ?? "טעינת הדמו נכשלה.");
    }

    setIsPending(false);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleSeed}
        disabled={isPending}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "טוען נתוני דמו..." : "טעינת נתוני דמו מחדש"}
      </button>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
