"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { QuestionSparkIcon } from "@/components/ui/med-icons";

type FaqItem = {
  title: string;
  body: readonly string[];
};

export function FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = index === openIndex;

        return (
          <Card
            key={item.title}
            id={`faq-${index + 1}`}
            className={`overflow-hidden rounded-[1.5rem] border transition ${isOpen ? "border-brand-200 shadow-panel" : "border-brand-100/80"}`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-right"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${index + 1}`}
            >
              <div className="flex items-center gap-4">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-900">
                  <QuestionSparkIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-lg font-bold text-ink">{item.title}</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    תשובה קצרה וברורה בלי טקסט מיותר.
                  </p>
                </div>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-100 bg-brand-50 text-lg font-semibold text-brand-900">
                {isOpen ? "−" : "+"}
              </span>
            </button>

            <div
              id={`faq-panel-${index + 1}`}
              className={`grid transition-[grid-template-rows,opacity] duration-200 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-80"}`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-brand-100/70 px-5 pb-5 pt-4">
                  <div className="space-y-3 text-sm leading-8 text-slate-700">
                    {item.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
