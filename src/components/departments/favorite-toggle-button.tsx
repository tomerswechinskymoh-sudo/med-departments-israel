"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function FavoriteToggleButton({
  departmentId,
  initialFavorite,
  variant = "text",
  className
}: {
  departmentId: string;
  initialFavorite: boolean;
  variant?: "text" | "icon";
  className?: string;
}) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isPending, setIsPending] = useState(false);

  async function toggleFavorite() {
    setIsPending(true);

    const response = await fetch("/api/favorites/toggle", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ departmentId })
    });

    if (response.ok) {
      const payload = (await response.json()) as { isFavorite: boolean };
      setIsFavorite(payload.isFavorite);
      router.refresh();
    }

    setIsPending(false);
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={isPending}
        aria-label={isFavorite ? "הסרה מהשמורים" : "שמירת מחלקה להשוואה"}
        title={isFavorite ? "הסרה מהשמורים" : "שמירת מחלקה להשוואה"}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-100 bg-white/95 text-brand-800 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 disabled:opacity-50",
          isFavorite ? "border-amber-300 bg-amber-50 text-amber-700" : null,
          className
        )}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={cn("h-5 w-5", isFavorite ? "fill-current" : "fill-none")}
        >
          <path
            d="M7 4.75A2.25 2.25 0 0 1 9.25 2.5h5.5A2.25 2.25 0 0 1 17 4.75v16l-5-3.1-5 3.1v-16Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={isPending}
      className={cn(
        "rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 disabled:opacity-50",
        className
      )}
    >
      {isPending ? "מעדכן..." : isFavorite ? "הסרה מהרשימה" : "שמור להשוואה"}
    </button>
  );
}

export function LoginRequiredBookmarkButton({ className }: { className?: string }) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMessage("שמירה אפשרית רק למשתמשים רשומים")}
        aria-label="שמירת מחלקה להשוואה"
        title="שמירת מחלקה להשוואה"
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-100 bg-white/95 text-brand-800 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50",
          className
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none">
          <path
            d="M7 4.75A2.25 2.25 0 0 1 9.25 2.5h5.5A2.25 2.25 0 0 1 17 4.75v16l-5-3.1-5 3.1v-16Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {message ? (
        <p className="absolute left-0 top-12 z-20 w-56 rounded-2xl border border-brand-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-panel">
          {message}
        </p>
      ) : null}
    </div>
  );
}
