"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FavoriteToggleButton({
  departmentId,
  initialFavorite
}: {
  departmentId: string;
  initialFavorite: boolean;
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

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={isPending}
      className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 disabled:opacity-50"
    >
      {isPending ? "מעדכן..." : isFavorite ? "הסרה מהרשימה" : "שמור להשוואה"}
    </button>
  );
}
