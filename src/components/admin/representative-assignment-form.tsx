"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RepresentativeAssignmentForm({
  userId,
  initialDepartmentIds,
  departments
}: {
  userId: string;
  initialDepartmentIds: string[];
  departments: Array<{
    id: string;
    name: string;
    institution: { name: string };
  }>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialDepartmentIds);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function toggleDepartment(departmentId: string) {
    setSelected((current) =>
      current.includes(departmentId)
        ? current.filter((value) => value !== departmentId)
        : [...current, departmentId]
    );
  }

  async function submit() {
    setIsPending(true);
    setMessage(null);

    const response = await fetch(`/api/admin/representatives/${userId}/assignments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ departmentIds: selected })
    });

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;

    setMessage(payload?.message ?? payload?.error ?? null);
    setIsPending(false);
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {departments.map((department) => (
          <label
            key={department.id}
            className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              checked={selected.includes(department.id)}
              onChange={() => toggleDepartment(department.id)}
            />
            <span>
              {department.institution.name} · {department.name}
            </span>
          </label>
        ))}
      </div>

      {message ? <p className="text-xs text-slate-500">{message}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800 disabled:opacity-60"
      >
        {isPending ? "שומר..." : "שמירת שיוכים"}
      </button>
    </div>
  );
}

