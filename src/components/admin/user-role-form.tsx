"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserRoleForm({
  userId,
  currentRole
}: {
  userId: string;
  currentRole: "STUDENT" | "RESIDENT" | "ADMIN";
}) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitRole() {
    setIsPending(true);
    setMessage(null);

    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ role })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    setMessage(payload?.message ?? payload?.error ?? null);
    router.refresh();
    setIsPending(false);
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as typeof currentRole)}
          className="rounded-2xl border border-brand-100 bg-white px-4 py-2 text-sm outline-none"
        >
          <option value="STUDENT">סטודנט/ית / סטאז'ר/ית</option>
          <option value="RESIDENT">מתמחה</option>
          <option value="ADMIN">אדמין</option>
        </select>
        <button
          type="button"
          onClick={submitRole}
          disabled={isPending}
          className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800 disabled:opacity-60"
        >
          {isPending ? "שומר..." : "עדכון תפקיד"}
        </button>
      </div>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
