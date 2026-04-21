"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);

    await fetch("/api/auth/logout", {
      method: "POST"
    });

    router.push("/");
    router.refresh();
    setIsPending(false);
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "מתנתק/ת..." : "התנתקות"}
    </button>
  );
}
