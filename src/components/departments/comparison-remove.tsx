"use client";
import { useRouter } from "next/navigation";

export function ComparisonRemove({
  id,
  ids,
  specialtyId,
}: {
  id: string;
  slug?: string;
  ids: string[];
  specialtyId: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-link text-sm"
      aria-label="הסרת המחלקה מההשוואה"
      onClick={() => {
        const remaining = ids.filter((x) => x !== id);
        try {
          const key = `departmentCompare:${specialtyId}`;
          const stored = JSON.parse(localStorage.getItem(key) ?? "[]");
          if (Array.isArray(stored))
            localStorage.setItem(
              key,
              JSON.stringify(stored.filter((x) => x.id !== id)),
            );
        } catch {}

        router.push(
          `/compare?${new URLSearchParams({ specialty: specialtyId, departments: remaining.join(",") })}`,
        );
      }}
    >
      הסרה ×
    </button>
  );
}
