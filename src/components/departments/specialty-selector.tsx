"use client";

import { useRouter } from "next/navigation";

export function SpecialtySelector({
  specialties,
  selectedSpecialtyId,
  preservedParams
}: {
  specialties: { id: string; name: string }[];
  selectedSpecialtyId?: string;
  preservedParams: Array<[string, string]>;
}) {
  const router = useRouter();

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-brand-800">בחירת תחום התמחות</span>
      <select
        value={selectedSpecialtyId ?? specialties[0]?.id ?? ""}
        onChange={(event) => {
          const params = new URLSearchParams(preservedParams);
          params.set("specialty", event.target.value);
          router.push(`/departments?${params.toString()}`);
        }}
        className="w-full rounded-2xl border border-brand-200 bg-white px-4 py-3 text-base font-bold text-ink shadow-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 md:max-w-md"
      >
        {specialties.map((specialty) => (
          <option key={specialty.id} value={specialty.id}>
            {specialty.name}
          </option>
        ))}
      </select>
    </label>
  );
}
