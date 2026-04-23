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
    <div className="fixed inset-x-0 bottom-0 z-30 bg-transparent px-4 py-3 md:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-3 rounded-[1.5rem] border border-white/80 bg-white/94 p-3 shadow-[0_-18px_46px_-30px_rgba(9,28,45,0.5)] backdrop-blur-xl">
        <a
          href="#home-search"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-gradient-to-l from-brand-700 to-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-brand-800 hover:to-teal-700"
        >
          חפש מחלקה
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
