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
    default: "bg-brand-50 text-brand-800",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700"
  }[tone];

  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", toneClass)}>
      {children}
    </span>
  );
}
