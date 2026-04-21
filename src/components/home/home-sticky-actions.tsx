"use client";

import { ExperienceCta } from "@/components/experience/experience-cta";

export function HomeStickyActions({
  departments
}: {
  departments: {
    id: string;
    slug: string;
    name: string;
    institution: { name: string };
  }[];
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/80 bg-white/92 px-4 py-3 shadow-[0_-16px_40px_-24px_rgba(22,48,67,0.4)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <a
          href="#home-search"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          חיפוש מחלקות
        </a>
        <ExperienceCta
          departments={departments}
          className="flex-1"
          buttonClassName="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-amber-200 bg-gradient-to-l from-amber-300 via-amber-200 to-orange-100 px-4 py-3 text-sm font-semibold text-amber-950 shadow-lg shadow-amber-200/40 transition hover:-translate-y-0.5"
        />
      </div>
    </div>
  );
}
