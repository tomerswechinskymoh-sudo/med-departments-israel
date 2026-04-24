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
    institution: { id: string; name: string };
  }>;
}) {
  const router = useRouter();
  const institutions = Array.from(
    new Map(
      departments.map((department) => [
        department.institution.id,
        {
          id: department.institution.id,
          name: department.institution.name
        }
      ])
    ).values()
  );
  const initialInstitutionId =
    departments.find((department) => initialDepartmentIds.includes(department.id))?.institution.id ??
    institutions[0]?.id ??
    "";
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(initialInstitutionId);
  const [selected, setSelected] = useState<string[]>(initialDepartmentIds);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const departmentsInInstitution = departments.filter(
    (department) => department.institution.id === selectedInstitutionId
  );
  const departmentIdsInInstitution = departmentsInInstitution.map((department) => department.id);
  const selectedDepartmentIds = selected.filter((departmentId) =>
    departmentIdsInInstitution.includes(departmentId)
  );

  function toggleDepartment(departmentId: string) {
    setSelected((current) =>
      current.includes(departmentId)
        ? current.filter((value) => value !== departmentId)
        : [...current, departmentId]
    );
  }

  async function submit() {
    if (!selectedInstitutionId) {
      setMessage("יש לבחור מוסד לפני שבוחרים מחלקות.");
      return;
    }

    setIsPending(true);
    setMessage(null);

    const response = await fetch(`/api/admin/representatives/${userId}/assignments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        institutionId: selectedInstitutionId,
        departmentIds: selectedDepartmentIds
      })
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
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.5rem] border border-brand-100 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">שלב 1</p>
          <label className="mt-2 block text-sm font-semibold text-ink">בחירת מוסד</label>
          <select
            value={selectedInstitutionId}
            onChange={(event) => setSelectedInstitutionId(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-300"
          >
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name}
              </option>
            ))}
          </select>
          <p className="mt-3 text-xs leading-6 text-slate-500">
            בחירת המחלקות בשלב הבא תוצג רק מתוך המוסד שנבחר.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-brand-100 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">שלב 2</p>
          <p className="mt-2 text-sm font-semibold text-ink">בחירת מחלקות מתוך המוסד</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {departmentsInInstitution.map((department) => (
              <label
                key={department.id}
                className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(department.id)}
                  onChange={() => toggleDepartment(department.id)}
                />
                <span>{department.name}</span>
              </label>
            ))}
          </div>
          {departmentsInInstitution.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">לא נמצאו מחלקות לשיוך במוסד הזה.</p>
          ) : null}
        </div>
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
