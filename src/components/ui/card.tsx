import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-brand-100/70 bg-white/92 p-4 shadow-panel backdrop-blur-xl md:p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
