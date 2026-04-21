import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "default"
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "border border-brand-100 bg-brand-50/90 text-brand-800",
    success: "border border-emerald-100 bg-emerald-50/95 text-emerald-800",
    warning: "border border-amber-200 bg-amber-50/95 text-amber-800",
    danger: "border border-rose-100 bg-rose-50/95 text-rose-800"
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3.5 py-1.5 text-[0.72rem] font-semibold tracking-wide",
        toneClass
      )}
    >
      {children}
    </span>
  );
}
