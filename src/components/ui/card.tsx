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
        "rounded-xl border border-brand-100 bg-white p-4 shadow-panel md:p-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
