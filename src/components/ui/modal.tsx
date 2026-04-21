"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  className
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(19,179,154,0.16),transparent_24%),rgba(2,12,24,0.66)] p-4">
      <button
        type="button"
        aria-label="סגירה"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[2rem] border border-brand-100/80 bg-white/96 p-6 shadow-2xl backdrop-blur-xl",
          className
        )}
      >
        <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 flex items-start justify-between gap-4 border-b border-brand-100/70 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 className="text-2xl font-bold text-ink">{title}</h2>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-brand-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-brand-50"
          >
            סגירה
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
