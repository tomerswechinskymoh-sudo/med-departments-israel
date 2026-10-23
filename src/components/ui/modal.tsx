"use client";

import { useEffect, useId, useState, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  className,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousFocus = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(
      () =>
        dialogRef.current
          ?.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex="0"]',
          )
          ?.focus(),
      0,
    );
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Tab") {
        const elements = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ) ?? [],
        ).filter((el) => el.getClientRects().length > 0);
        const first = elements[0],
          last = elements[elements.length - 1];
        if (!first) {
          event.preventDefault();
          dialogRef.current?.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first ||
            !dialogRef.current?.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !dialogRef.current?.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timer);
      previousFocus?.focus();
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !portalRoot) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-slate-950/90 p-4 backdrop-blur-md">
      <button
        type="button"
        aria-label="סגירה"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "relative z-10 flex max-h-[calc(100vh-32px)] w-full flex-col overflow-hidden rounded-[2rem] border border-white/90 bg-white shadow-2xl",
          className ?? "max-w-4xl",
        )}
      >
        <div className="flex flex-none items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <h2 id={titleId} className="text-2xl font-bold text-ink">
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-2 max-w-2xl text-sm leading-7 text-slate-600"
              >
                {description}
              </p>
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
          {children}
        </div>
      </div>
    </div>,
    portalRoot,
  );
}
