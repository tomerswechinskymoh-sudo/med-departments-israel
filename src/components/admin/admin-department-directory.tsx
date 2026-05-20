"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type DepartmentListItem = {
  id: string;
  name: string;
  shortSummary?: string | null;
  institution: {
    name: string;
  };
  specialty: {
    id: string;
    name: string;
  };
};

type SpecialtyOption = {
  id: string;
  name: string;
};

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[׳']/g, "")
    .replace(/\s+/g, " ");
}

export function AdminDepartmentDirectory({
  departments,
  specialties
}: {
  departments: DepartmentListItem[];
  specialties: SpecialtyOption[];
}) {
  const defaultSpecialtyId =
    specialties.find((specialty) => specialty.name.includes("פנימית"))?.id ?? specialties[0]?.id ?? "";
  const [specialtyId, setSpecialtyId] = useState(defaultSpecialtyId);
  const [query, setQuery] = useState("");

  const selectedSpecialty = specialties.find((specialty) => specialty.id === specialtyId);

  const filteredDepartments = useMemo(() => {
    const normalizedQuery = normalize(query);

    return departments.filter((department) => {
      const inSpecialty = department.specialty.id === specialtyId;
      if (!inSpecialty) return false;

      if (!normalizedQuery) return true;

      const searchable = normalize(
        `${department.institution.name} ${department.name} ${department.shortSummary ?? ""}`
      );

      return searchable.includes(normalizedQuery);
    });
  }, [departments, query, specialtyId]);

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-[1.5rem] border border-brand-100 bg-gradient-to-l from-white to-brand-50/60 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(180px,260px)_1fr]">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">תחום התמחות</span>
            <select
              value={specialtyId}
              onChange={(event) => setSpecialtyId(event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-brand-100 bg-white px-4 text-sm font-semibold text-ink outline-none transition focus:border-brand-300"
            >
              {specialties.map((specialty) => (
                <option key={specialty.id} value={specialty.id}>
                  {specialty.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              חיפוש בתוך {selectedSpecialty?.name ?? "התחום שנבחר"}
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש לפי בית חולים או שם מחלקה"
              className="min-h-12 w-full rounded-2xl border border-brand-100 bg-white px-4 text-sm outline-none transition focus:border-brand-300"
            />
          </label>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          מוצגות {filteredDepartments.length} מחלקות מתוך התחום שנבחר.
        </p>
      </div>

      <div className="grid gap-3">
        {filteredDepartments.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
            לא נמצאו מחלקות בתחום הזה עבור החיפוש הנוכחי.
          </p>
        ) : (
          filteredDepartments.map((department) => (
            <div
              key={department.id}
              className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-bold text-ink">
                    {department.institution.name} · {department.name}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-brand-700">
                    {department.specialty.name}
                  </p>
                  {department.shortSummary ? (
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {department.shortSummary}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/admin/departments/${department.id}`}
                  className="inline-flex shrink-0 items-center justify-center rounded-full border border-brand-200 px-4 py-2 text-sm font-bold text-brand-800 transition hover:bg-brand-50"
                >
                  עריכת עמוד מחלקה
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
